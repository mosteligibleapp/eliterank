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
 * finalized_at is at least the configured delay old (60 min for tonight's
 * Entry Round; intent is to drop to 30 min for subsequent rounds).
 *
 * Eliminated contestants get a gracious "thanks for competing" email with
 * a link to their downloadable card (which now reads "TOP N CONTESTANT"
 * if they survived a prior round). Advancers get a "you advanced" email
 * with the next round's name + start date.
 *
 * Idempotent — refuses to act on rounds whose round_end_emails_sent_at is
 * already set, so duplicate cron triggers are harmless.
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

    // Load the round, the surrounding rounds for next/prev tier lookup,
    // the competition, and the org.
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
      // Nothing to send — still mark as sent so the cron stops retrying.
      await supabase
        .from('voting_rounds')
        .update({ round_end_emails_sent_at: new Date().toISOString() })
        .eq('id', round_id)
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'empty snapshot' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Pull the competition + sibling rounds in one shot.
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

    const roundLabel = round.tier_label || round.title || `Round ${round.round_order}`
    const nextRoundLabel = nextRound
      ? (nextRound.tier_label || nextRound.title || `Round ${nextRound.round_order}`)
      : null

    // Tier reached for eliminated contestants = contestants_advance of the
    // round BEFORE the one they were eliminated in. For Entry Round
    // eliminations there's no prior round, so no tier — falls back to the
    // generic CONTESTANT framing.
    const eliminatedTierCount = prevRound?.contestants_advance ?? null

    // Tier reached for advancers = contestants_advance of THIS round —
    // they survived this round's cut.
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
        const { error: invokeErr } = await supabase.functions.invoke('send-onesignal-email', {
          body: payload,
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

    // Mark the round as emailed so the cron job stops considering it.
    // We mark even on partial failure to avoid retry storms — failed sends
    // are logged above for follow-up. A future improvement could be to
    // only mark when sent + skipped == snapshot.length, but for the
    // initial rollout idempotency of the cron is more important than
    // per-recipient retry.
    await supabase
      .from('voting_rounds')
      .update({ round_end_emails_sent_at: new Date().toISOString() })
      .eq('id', round_id)

    return new Response(
      JSON.stringify({
        ok: true,
        round_id,
        round_label: roundLabel,
        snapshot_size: snapshot.length,
        sent,
        skipped,
        failed,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('send-round-end-emails error:', err)
    return new Response(JSON.stringify({ error: 'internal error', detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
