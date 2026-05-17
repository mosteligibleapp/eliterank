import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * send-round-end-emails — Sends per-contestant email after a voting round
 * finalizes (lazy round-end pipeline, see migration 053).
 *
 * Triggered by the pg_cron job `round-end-emails` once a round's
 * finalized_at is at least the configured delay old (currently 3 hours).
 *
 * Eliminated contestants get a gracious "thanks for competing" email.
 * Advancers get a "you advanced" email with the next round's name + end.
 *
 * Idempotent — refuses to act on rounds whose round_end_emails_sent_at is
 * already set, so duplicate cron triggers are harmless. We only stamp
 * round_end_emails_sent_at when at least one send succeeded; if every
 * send failed (e.g. transient OneSignal credential issue) the row stays
 * unstamped so the every-5-min cron retries. Partial failures are
 * stamped as done to avoid duplicate sends to the contestants who did
 * receive the email — failed sends are logged for manual follow-up.
 */

interface SnapshotEntry {
  contestant_id: string
  name: string
  votes: number
  rank: number
  status: 'advanced' | 'eliminated' | 'winner' | 'runner_up'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const { round_id } = await req.json()
    if (!round_id) {
      return new Response(JSON.stringify({ error: 'round_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: round, error: roundErr } = await supabase
      .from('voting_rounds')
      .select('id, competition_id, round_order, title, tier_label, contestants_advance, finalized_at, finalized_snapshot, round_end_emails_sent_at')
      .eq('id', round_id)
      .single()

    if (roundErr || !round) {
      return new Response(JSON.stringify({ error: 'round not found', detail: roundErr?.message }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!round.finalized_at) {
      return new Response(JSON.stringify({ error: 'round not finalized' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (round.round_end_emails_sent_at) {
      return new Response(JSON.stringify({ ok: true, already_sent: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const snapshot = (round.finalized_snapshot || []) as SnapshotEntry[]
    if (!Array.isArray(snapshot) || snapshot.length === 0) {
      // Empty snapshot is a terminal state — mark as sent so cron stops.
      await supabase
        .from('voting_rounds')
        .update({ round_end_emails_sent_at: new Date().toISOString() })
        .eq('id', round_id)
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'empty snapshot' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: competition } = await supabase
      .from('competitions')
      .select('id, name, slug, organization:organizations(name, slug, logo_url)')
      .eq('id', round.competition_id)
      .single()

    const { data: rounds } = await supabase
      .from('voting_rounds')
      .select('id, round_order, title, tier_label, start_date, end_date, contestants_advance')
      .eq('competition_id', round.competition_id)
      .order('round_order', { ascending: true })

    const nextRound = (rounds || []).find((r) => r.round_order === round.round_order + 1)
    const prevRound = (rounds || []).find((r) => r.round_order === round.round_order - 1)

    // Prefer title over tier_label so user-facing copy reads "Top 50"
    // rather than the internal "Round 1" tier label. Applies to both the
    // current and next round.
    const roundLabel = round.title || round.tier_label || `Round ${round.round_order}`
    const nextRoundLabel = nextRound
      ? (nextRound.title || nextRound.tier_label || `Round ${nextRound.round_order}`)
      : null

    const eliminatedTierCount = prevRound?.contestants_advance ?? null
    const advancerTierCount = round.contestants_advance ?? null

    const contestantIds = snapshot.map((s) => s.contestant_id)
    const { data: contestants } = await supabase
      .from('contestants')
      .select('id, email, name, user_id')
      .in('id', contestantIds)

    const byId = new Map<string, { id: string; email: string; name: string; user_id: string | null }>()
    for (const c of contestants || []) byId.set(c.id, c)

    const appUrl = Deno.env.get('APP_URL') || 'https://eliterank.co'

    let sent = 0
    let skipped = 0
    let failed = 0

    for (const entry of snapshot) {
      const contestant = byId.get(entry.contestant_id)
      if (!contestant?.email) {
        skipped++
        continue
      }

      const profileUrl = contestant.user_id ? `${appUrl}/profile/${contestant.user_id}` : null
      const competitionUrl = competition?.slug && competition?.organization?.slug
        ? `${appUrl}/${competition.organization.slug}/${competition.slug}`
        : appUrl

      let payload: Record<string, unknown> | null = null

      if (entry.status === 'advanced' || entry.status === 'winner') {
        payload = {
          type: 'round_advanced',
          to_email: contestant.email,
          to_name: contestant.name,
          contestant_name: contestant.name,
          competition_name: competition?.name || 'EliteRank',
          round_label: roundLabel,
          next_round_label: nextRoundLabel,
          next_round_end: nextRound?.end_date || null,
          next_round_advance_count: nextRound?.contestants_advance ?? null,
          tier_count: advancerTierCount,
          final_rank: entry.rank,
          profile_url: profileUrl,
          competition_url: competitionUrl,
          is_winner: entry.status === 'winner',
        }
      } else if (entry.status === 'eliminated' || entry.status === 'runner_up') {
        payload = {
          type: 'round_eliminated',
          to_email: contestant.email,
          to_name: contestant.name,
          contestant_name: contestant.name,
          competition_name: competition?.name || 'EliteRank',
          round_label: roundLabel,
          tier_count: eliminatedTierCount,
          final_rank: entry.rank,
          profile_url: profileUrl,
          competition_url: competitionUrl,
        }
      }

      if (!payload) {
        skipped++
        continue
      }

      try {
        // Explicit Authorization header — supabase.functions.invoke() from
        // inside an edge function does not auto-attach the service-role JWT,
        // and send-onesignal-email has verify_jwt: true. Without this the
        // call returns 401 before reaching any handler logic.
        const { error: invokeErr } = await supabase.functions.invoke('send-onesignal-email', {
          body: payload,
          headers: { Authorization: `Bearer ${serviceKey}` },
        })
        if (invokeErr) {
          console.error('send-onesignal-email failed for contestant', entry.contestant_id, invokeErr)
          failed++
        } else {
          sent++
        }
      } catch (err) {
        console.error('send-onesignal-email threw for contestant', entry.contestant_id, err)
        failed++
      }
    }

    // Only stamp round_end_emails_sent_at when at least one send succeeded.
    // Total failure (sent === 0 && failed > 0) leaves the row unstamped so
    // the every-5-min cron retries — this catches the May 15 case where
    // OneSignal credentials were transiently broken and the original
    // fail-open behavior silently swallowed 50 undelivered emails.
    // Partial failures still stamp as done to avoid duplicate blasts to
    // the contestants who already received their email; the `failed`
    // count is logged above for manual follow-up.
    const allFailed = failed > 0 && sent === 0
    if (!allFailed) {
      await supabase
        .from('voting_rounds')
        .update({ round_end_emails_sent_at: new Date().toISOString() })
        .eq('id', round_id)
    }

    return new Response(
      JSON.stringify({
        ok: !allFailed,
        round_id,
        round_label: roundLabel,
        snapshot_size: snapshot.length,
        sent,
        skipped,
        failed,
        stamped: !allFailed,
      }),
      { status: allFailed ? 500 : 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('send-round-end-emails error:', err)
    return new Response(JSON.stringify({ error: 'internal error', detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
