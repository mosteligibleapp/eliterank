/**
 * POST /api/cast-anonymous-vote
 *
 * Lets a logged-out visitor cast a free daily vote for a contestant by
 * providing email + first/last name. We create (or reuse) a lightweight
 * Supabase auth user so votes dedup on voter_id like authenticated voting,
 * then fire a magic-link "claim" email so the voter can log in later to
 * see their vote history.
 *
 * Bot protection is layered:
 *   1. Honeypot field (`company`) — bots fill hidden fields
 *   2. Min-submit-time check — bots submit in <1s
 *   3. Per-IP rate limit — max 10 distinct emails per 24h
 *   4. Vercel BotID — invisible bot detection (optional, enabled when
 *      @vercel/botid is installed and BOTID_ENABLED=true)
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

// In-memory per-instance rate limit tracker. Vercel functions have multiple
// cold instances so this is best-effort — sufficient for MVP traffic but
// swap for Vercel KV or a Supabase table if abuse becomes a problem.
// Map<ipHash, Array<{ email, ts }>>
const ipBuckets = new Map();

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

function checkIpRateLimit(ipHash, email, limit) {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const entries = (ipBuckets.get(ipHash) || []).filter(e => e.ts >= cutoff);

  const distinctEmails = new Set(entries.map(e => e.email));
  if (distinctEmails.size >= limit && !distinctEmails.has(email)) {
    return { allowed: false, reason: 'Too many distinct voters from this network. Please try again later.' };
  }

  entries.push({ email, ts: now });
  ipBuckets.set(ipHash, entries);
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

  // ─── IP rate limit ─────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const ipHash = await hashIp(ip);
  const rateCheck = checkIpRateLimit(ipHash, normalizedEmail, ipLimit);
  if (!rateCheck.allowed) {
    return response.status(429).json({ error: rateCheck.reason });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

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
      return response.status(409).json({ error: 'You\u2019ve already used your free vote for this competition today.' });
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
        return response.status(409).json({ error: 'You\u2019ve already used your free vote today.' });
      }
      return response.status(500).json({ error: 'Could not record your vote.' });
    }

    // ─── Fire claim email (fire-and-forget) ──────────────────────────────
    // Magic link so the voter can log in later and claim their profile.
    // Not awaited — vote succeeds even if the email fails.
    (async () => {
      try {
        const { data: linkData } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: normalizedEmail,
          options: { redirectTo: `${appUrl}/profile` },
        });
        const claimUrl = linkData?.properties?.action_link;
        if (!claimUrl) return;

        await supabase.functions.invoke('send-onesignal-email', {
          body: {
            type: 'voter_claim',
            to_email: normalizedEmail,
            first_name: cleanFirst,
            claim_url: claimUrl,
          },
        });
      } catch (err) {
        console.warn('Claim email send failed (non-fatal):', err?.message);
      }
    })();

    return response.status(200).json({
      success: true,
      votesAdded: 1,
      botIdSkipped: botCheck.skipped,
    });
  } catch (err) {
    console.error('Unexpected error casting anonymous vote:', err);
    return response.status(500).json({ error: 'An unexpected error occurred.' });
  }
}
