/**
 * POST /api/cast-anonymous-vote
 *
 * Lets a logged-out visitor cast a free daily vote for a contestant by
 * providing email + first/last name. We create (or reuse) a lightweight
 * Supabase auth user so votes dedup on voter_id like authenticated voting,
 * then fire a magic-link "claim" email so the voter can log in later to
 * see their vote history.
 *
 * Bot/fraud protection is layered:
 *   1. Honeypot field (`company`) — bots fill hidden fields
 *   2. Min-submit-time check — bots submit in <1s
 *   3. Browser fingerprint — 1 free vote per device per competition per day
 *   4. Per-IP rate limit — max 10 distinct emails per 24h (backup)
 *   5. Vercel BotID — invisible bot detection (optional)
 *
 * Env vars required:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   APP_URL
 *   BOTID_ENABLED              (optional, "true" to enforce Vercel BotID)
 *   ANONYMOUS_VOTE_IP_LIMIT    (optional, defaults to 10)
 */

import { createClient } from '@supabase/supabase-js';

const MIN_SUBMIT_MS = 1500;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const DEFAULT_IP_LIMIT = 10;

function getClientIp(request) {
  const fwd = request.headers['x-forwarded-for'] || request.headers['x-real-ip'];
  if (typeof fwd === 'string') return fwd.split(',')[0].trim();
  if (Array.isArray(fwd)) return fwd[0];
  return request.socket?.remoteAddress || 'unknown';
}

async function hashIp(ip) {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + '|eliterank-vote-salt');
  const buf = await (globalThis.crypto?.subtle?.digest('SHA-256', data));
  if (!buf) return ip; // fallback — still rate-limits, just not hashed
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function checkIpRateLimit(supabase, ipHash, email, limit) {
  const cutoffIso = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

  const { data, error } = await supabase
    .from('anonymous_vote_rate_limits')
    .select('email')
    .eq('ip_hash', ipHash)
    .gte('created_at', cutoffIso);

  if (error) {
    // Fail-open on lookup errors so a DB hiccup doesn't block all anonymous
    // voting, but log loudly so it's visible in monitoring.
    console.error('Rate limit lookup failed (allowing vote):', error);
    return { allowed: true, skipped: true };
  }

  const distinctEmails = new Set((data || []).map((r) => r.email));
  if (distinctEmails.size >= limit && !distinctEmails.has(email)) {
    // Limit is set high enough (default 10) that small friend groups on the
    // same WiFi all get through — this only fires for unusually large bursts.
    return {
      allowed: false,
      reason: 'A lot of people have voted from this network in the last 24h. Try again later, or send paid votes anytime.',
    };
  }
  return { allowed: true };
}

async function recordIpRateLimit(supabase, ipHash, email, fingerprint, competitionId) {
  const { error } = await supabase
    .from('anonymous_vote_rate_limits')
    .insert({ ip_hash: ipHash, email, fingerprint, competition_id: competitionId });
  if (error) {
    // Non-fatal — the vote already succeeded.
    console.warn('Rate limit insert failed (non-fatal):', error);
  }
}

/**
 * Check if this browser fingerprint has already voted in this competition today.
 * This is the primary fraud prevention — stops same device from voting with
 * multiple fake emails.
 */
async function checkFingerprintLimit(supabase, fingerprint, competitionId) {
  if (!fingerprint) {
    // No fingerprint provided — fall back to IP-only checks
    return { allowed: true, skipped: true };
  }

  const cutoffIso = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

  const { data, error } = await supabase
    .from('anonymous_vote_rate_limits')
    .select('id')
    .eq('fingerprint', fingerprint)
    .eq('competition_id', competitionId)
    .gte('created_at', cutoffIso)
    .limit(1);

  if (error) {
    console.error('Fingerprint rate limit lookup failed (allowing vote):', error);
    return { allowed: true, skipped: true };
  }

  if (data && data.length > 0) {
    return { 
      allowed: false, 
      reason: "You've already cast your free daily vote from this device. Come back tomorrow!" 
    };
  }

  return { allowed: true };
}

function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  // Intentionally conservative — reject obviously malformed addresses.
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

function sanitizeName(name, maxLen = 60) {
  if (typeof name !== 'string') return '';
  return name.trim().slice(0, maxLen);
}

async function checkBotId(request) {
  // Optional Vercel BotID check. Only runs when explicitly enabled so the
  // route still works in dev without the dep installed.
  if (process.env.BOTID_ENABLED !== 'true') return { passed: true, skipped: true };
  try {
    const { checkBotId } = await import('@vercel/botid');
    const result = await checkBotId(request);
    return { passed: !!result?.passed, skipped: false };
  } catch (err) {
    console.warn('BotID check skipped — package not installed or failed:', err.message);
    return { passed: true, skipped: true };
  }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = process.env.APP_URL || 'https://eliterank.co';
  const ipLimit = Number(process.env.ANONYMOUS_VOTE_IP_LIMIT) || DEFAULT_IP_LIMIT;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return response.status(500).json({ error: 'Server not configured' });
  }

  let body;
  try {
    body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
  } catch {
    return response.status(400).json({ error: 'Invalid JSON body' });
  }

  const {
    email,
    firstName,
    lastName,
    competitionId,
    contestantId,
    mountedAt,     // client timestamp when form mounted
    company,       // honeypot — must be empty
    fingerprint,   // browser fingerprint for fraud prevention
  } = body || {};

  // ─── Bot traps ─────────────────────────────────────────────────────────
  if (company) {
    return response.status(400).json({ error: 'Invalid submission' });
  }

  if (mountedAt && Number.isFinite(mountedAt) && Date.now() - Number(mountedAt) < MIN_SUBMIT_MS) {
    return response.status(400).json({ error: 'Submitted too fast — please try again.' });
  }

  const botCheck = await checkBotId(request);
  if (!botCheck.passed) {
    return response.status(403).json({ error: 'Automated traffic detected.' });
  }

  // ─── Input validation ──────────────────────────────────────────────────
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanFirst = sanitizeName(firstName);
  const cleanLast = sanitizeName(lastName);

  if (!isValidEmail(normalizedEmail)) {
    return response.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (!cleanFirst || !cleanLast) {
    return response.status(400).json({ error: 'First and last name are required.' });
  }
  if (!competitionId || !contestantId) {
    return response.status(400).json({ error: 'Missing competition or contestant.' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ─── Fingerprint rate limit (primary fraud prevention) ───────────────
  const fpCheck = await checkFingerprintLimit(supabase, fingerprint, competitionId);
  if (!fpCheck.allowed) {
    return response.status(429).json({ error: fpCheck.reason, code: 'ALREADY_VOTED' });
  }

  // ─── IP rate limit (backup) ────────────────────────────────────────────
  const ip = getClientIp(request);
  const ipHash = await hashIp(ip);
  const rateCheck = await checkIpRateLimit(supabase, ipHash, normalizedEmail, ipLimit);
  if (!rateCheck.allowed) {
    return response.status(429).json({ error: rateCheck.reason });
  }

  try {
    // ─── Verify active voting round ─────────────────────────────────────
    const nowIso = new Date().toISOString();
    const { data: rounds, error: roundErr } = await supabase
      .from('voting_rounds')
      .select('id, start_date, end_date, round_type')
      .eq('competition_id', competitionId)
      .eq('round_type', 'voting')
      .lte('start_date', nowIso)
      .gt('end_date', nowIso)
      .limit(1);

    if (roundErr) {
      console.error('Round lookup failed:', roundErr);
      return response.status(500).json({ error: 'Could not verify voting round.' });
    }
    if (!rounds || rounds.length === 0) {
      return response.status(400).json({ error: 'Voting is not currently open.' });
    }

    // ─── Find or create the auth user ────────────────────────────────────
    let voterId = null;
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (existingProfile?.id) {
      voterId = existingProfile.id;
      // Backfill name only when missing — don't overwrite a claimed profile.
      if (!existingProfile.first_name && !existingProfile.last_name) {
        await supabase
          .from('profiles')
          .update({ first_name: cleanFirst, last_name: cleanLast })
          .eq('id', voterId);
      }
    } else {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: false,
        user_metadata: { first_name: cleanFirst, last_name: cleanLast },
      });
      if (createErr || !created?.user?.id) {
        console.error('Auth user create failed:', createErr);
        return response.status(500).json({ error: 'Could not create voter record.' });
      }
      voterId = created.user.id;

      // The handle_new_user trigger may have failed silently (it catches exceptions
      // to avoid blocking auth.users inserts). Ensure the profile exists so the
      // vote INSERT doesn't hit a FK violation.
      const { data: profileCheck } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', voterId)
        .maybeSingle();

      if (!profileCheck) {
        console.warn('Profile missing after user creation — creating manually for', voterId);
        const { error: profileErr } = await supabase
          .from('profiles')
          .insert({
            id: voterId,
            email: normalizedEmail,
            first_name: cleanFirst,
            last_name: cleanLast,
          });
        if (profileErr) {
          console.error('Manual profile creation failed:', profileErr);
          return response.status(500).json({ error: 'Could not create voter profile.' });
        }
      }
    }

    // ─── Daily vote dedup ────────────────────────────────────────────────
    const dayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentVote } = await supabase
      .from('votes')
      .select('id')
      .eq('voter_id', voterId)
      .eq('competition_id', competitionId)
      .is('payment_intent_id', null)
      .gte('created_at', dayAgoIso)
      .limit(1)
      .maybeSingle();

    if (recentVote?.id) {
      return response.status(409).json({ error: 'You\u2019ve already used your free vote for this competition today.', code: 'ALREADY_VOTED' });
    }

    // ─── Insert the vote ─────────────────────────────────────────────────
    const { error: voteErr } = await supabase
      .from('votes')
      .insert({
        voter_id: voterId,
        voter_email: normalizedEmail,
        competition_id: competitionId,
        contestant_id: contestantId,
        vote_count: 1,
        amount_paid: 0,
        payment_intent_id: null,
        is_double_vote: false,
      });

    if (voteErr) {
      console.error('Vote insert failed:', voteErr);
      if (voteErr.code === '23505') {
        return response.status(409).json({ error: "You've already used your free vote today.", code: 'ALREADY_VOTED' });
      }
      // Include error details in non-production for debugging
      const isDev = process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview';
      const errorPayload = isDev
        ? { error: 'Could not record your vote.', code: voteErr.code, detail: voteErr.message }
        : { error: 'Could not record your vote.' };
      return response.status(500).json(errorPayload);
    }

    // Record rate-limit entry only after a successful vote so failed
    // attempts don't count against the IP/fingerprint.
    await recordIpRateLimit(supabase, ipHash, normalizedEmail, fingerprint, competitionId);

    // Return voter info so the client can prompt "Become a Fan" post-vote.
    // No email sent — conversion happens in-context on the success screen.
    return response.status(200).json({
      success: true,
      votesAdded: 1,
      visitorId: voterId,
      botIdSkipped: botCheck.skipped,
    });
  } catch (err) {
    console.error('Unexpected error casting anonymous vote:', err);
    return response.status(500).json({ error: 'An unexpected error occurred.' });
  }
}
