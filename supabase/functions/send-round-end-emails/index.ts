import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * send-round-end-emails — Round finalization notifications.
 *
 * Given a finalized voting round, reads its finalized_snapshot and emails:
 *   - each advancing contestant (incl. finale winners) -> 'round_advanced'
 *   - each eliminated contestant (incl. finale runners-up) -> 'round_eliminated'
 *   - each opt-in fan of an advancing/winning contestant -> 'round_fan_advanced'
 *
 * Idempotency: voting_rounds.round_end_emails_sent_at is stamped once at least
 * one send succeeds, so the driving cron (round-end-emails) never double-sends.
 * Total failure leaves the row unstamped for retry.
 *
 * Invocation (POST, service role key):
 *   { round_id }                process this round
 *   { round_id, verify_only }   count recipients, send nothing, stamp nothing
 *
 * Required Supabase secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_URL.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    const { round_id, verify_only } = await req.json()
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

    if (round.round_end_emails_sent_at && !verify_only) {
      return new Response(JSON.stringify({ ok: true, already_sent: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const snapshot = (round.finalized_snapshot || []) as SnapshotEntry[]
    if (!Array.isArray(snapshot) || snapshot.length === 0) {
      if (!verify_only) {
        await supabase
          .from('voting_rounds')
          .update({ round_end_emails_sent_at: new Date().toISOString() })
          .eq('id', round_id)
      }
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

    const appUrl = Deno.env.get('APP_URL') || 'https://eliterank.co'
    const competitionUrl = competition?.slug && competition?.organization?.slug
      ? `${appUrl}/${competition.organization.slug}/${competition.slug}`
      : appUrl

    const contestantIds = snapshot.map((s) => s.contestant_id)
    const { data: contestants } = await supabase
      .from('contestants')
      .select('id, email, name, user_id')
      .in('id', contestantIds)

    const byId = new Map<string, { id: string; email: string; name: string; user_id: string | null }>()
    for (const c of contestants || []) byId.set(c.id, c)

    // Pull the current service-role key from vault rather than trusting the
    // injected env key. The May 17 incident: the runtime SUPABASE_SERVICE_ROLE_KEY
    // env was stale and rejected by verify_jwt on the sibling send-onesignal-email
    // call, silently dropping all 50 round-end emails. Vault stays in sync; env can
    // drift across rotations.
    const { data: vaultKey, error: keyErr } = await supabase.rpc('get_email_service_key')
    if (keyErr || !vaultKey) {
      console.error('get_email_service_key failed', keyErr)
      return new Response(JSON.stringify({ error: 'service key fetch failed', detail: keyErr?.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const emailFnUrl = `${supabaseUrl}/functions/v1/send-onesignal-email`
    const emailAuthHeader = `Bearer ${vaultKey}`

    let sent = 0
    let skipped = 0
    let failed = 0
    let fansSent = 0

    // --- Contestants ---------------------------------------------------------
    for (const entry of snapshot) {
      const contestant = byId.get(entry.contestant_id)
      if (!contestant?.email) {
        skipped++
        continue
      }

      const profileUrl = contestant.user_id ? `${appUrl}/profile/${contestant.user_id}` : null

      let payload: Record<string, unknown> | null = null

      if (entry.status === 'advanced' || entry.status === 'winner') {
        payload = {
          type: 'round_advanced',
          to_email: contestant.email,
          to_name: contestant.name,
          contestant_name: contestant.name,
          competition_id: round.competition_id,
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
          competition_id: round.competition_id,
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

      if (verify_only) {
        sent++
        continue
      }

      try {
        const res = await fetch(emailFnUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: emailAuthHeader,
          },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          console.error('send-onesignal-email failed for contestant', entry.contestant_id, res.status, text)
          failed++
        } else {
          sent++
        }
      } catch (err) {
        console.error('send-onesignal-email threw for contestant', entry.contestant_id, err)
        failed++
      }
    }

    // --- Fans of advancers ---------------------------------------------------
    // Opt-in fans (contestant_fans.email_weekly_updates) of contestants who
    // advanced or won. Sent in the same run so round_end_emails_sent_at also
    // covers fan notifications. contestant_fans.user_id references auth.users,
    // so fan emails are read from profiles.
    const advancerEntries = snapshot.filter((e) => e.status === 'advanced' || e.status === 'winner')
    const advancerIds = advancerEntries.map((e) => e.contestant_id)
    if (advancerIds.length > 0) {
      const { data: fans } = await supabase
        .from('contestant_fans')
        .select('id, user_id, contestant_id, email_weekly_updates')
        .in('contestant_id', advancerIds)
        .eq('email_weekly_updates', true)

      const fanUserIds = Array.from(new Set((fans || []).map((f) => f.user_id)))
      const fanEmailByUserId = new Map<string, string>()
      if (fanUserIds.length > 0) {
        const { data: fanProfiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', fanUserIds)
        for (const p of fanProfiles || []) if (p.email) fanEmailByUserId.set(p.id, p.email)
      }

      const entryByContestant = new Map(advancerEntries.map((e) => [e.contestant_id, e]))

      for (const fan of fans || []) {
        const fanEmail = fanEmailByUserId.get(fan.user_id)
        const contestant = byId.get(fan.contestant_id)
        const entry = entryByContestant.get(fan.contestant_id)
        if (!fanEmail || !contestant || !entry) {
          skipped++
          continue
        }

        const profileUrl = contestant.user_id ? `${appUrl}/profile/${contestant.user_id}` : null

        if (verify_only) {
          fansSent++
          sent++
          continue
        }

        try {
          const res = await fetch(emailFnUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: emailAuthHeader,
            },
            body: JSON.stringify({
              type: 'round_fan_advanced',
              to_email: fanEmail,
              competition_id: round.competition_id,
              contestant_name: contestant.name,
              competition_name: competition?.name || 'EliteRank',
              round_label: roundLabel,
              next_round_label: nextRoundLabel,
              next_round_end: nextRound?.end_date || null,
              final_rank: entry.rank,
              profile_url: profileUrl,
              competition_url: competitionUrl,
              fan_id: fan.id,
              is_winner: entry.status === 'winner',
            }),
          })
          if (!res.ok) {
            const text = await res.text().catch(() => '')
            console.error('round_fan_advanced failed for fan', fan.id, res.status, text)
            failed++
          } else {
            fansSent++
            sent++
          }
        } catch (err) {
          console.error('round_fan_advanced threw for fan', fan.id, err)
          failed++
        }
      }
    }

    // Only stamp round_end_emails_sent_at when at least one send succeeded.
    // Total failure (sent === 0 && failed > 0) leaves the row unstamped so
    // the every-5-min cron retries.
    // Partial failures still stamp as done to avoid duplicate blasts to
    // the contestants/fans who already received their email; the `failed`
    // count is logged above for manual follow-up.
    const allFailed = failed > 0 && sent === 0
    if (!verify_only && !allFailed) {
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
        fans_sent: fansSent,
        skipped,
        failed,
        stamped: !verify_only && !allFailed,
        verify_only: !!verify_only,
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
