import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * notify-round-results — Round-end notification emails.
 *
 * When a voting round finalizes, finalize_voting_round() writes a
 * finalized_snapshot tagging every active contestant 'advanced' or
 * 'eliminated' (or 'winner'/'runner_up' for finale rounds — those are out of
 * scope here and ignored). This function reads those snapshots and emails:
 *   - each advancing contestant         -> 'contestant_advanced'
 *   - each eliminated contestant        -> 'contestant_eliminated'
 *   - fans of advancing contestants     -> 'fan_contestant_advanced'
 *     (only fans with contestant_fans.email_weekly_updates = true, matching
 *      the weekly-digest opt-in)
 *
 * At-most-once delivery is enforced by the round_result_notifications ledger
 * (UNIQUE on voting_round_id): the round is reserved before sending, so a
 * second invocation is a no-op. Safe to run repeatedly / on a cron.
 *
 * Invocation (POST with the service role key):
 *   { round_id?: string }        process just this round
 *   { competition_id?: string }  limit the scan to one competition
 *   { dry_run?: true }           compute + report recipients, send nothing,
 *                                reserve nothing
 * With no body, scans every finalized-but-unnotified round.
 *
 * Required Supabase secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_URL.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SnapshotElem {
  contestant_id: string
  status: string
  rank?: number | null
}

interface RoundRow {
  id: string
  competition_id: string
  round_order: number
  title: string | null
  tier_label: string | null
  round_type: string
  finalized_at: string | null
  finalized_snapshot: SnapshotElem[] | null
}

interface SendResult {
  round_id: string
  contestant_id: string
  contestant_name: string
  recipient: 'advanced' | 'eliminated' | 'fan'
  to_email: string
  status: 'sent' | 'skipped' | 'failed'
  reason?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const appUrl = Deno.env.get('APP_URL') || 'https://eliterank.co'

    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ error: 'Service not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    let roundId: string | undefined
    let competitionId: string | undefined
    let dryRun = false
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        roundId = body?.round_id || undefined
        competitionId = body?.competition_id || undefined
        dryRun = !!body?.dry_run
      } catch {
        // Empty / non-JSON body — full scan, real send.
      }
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 1. Resolve the candidate rounds: finalized, and not already notified.
    let query = supabase
      .from('voting_rounds')
      .select('id, competition_id, round_order, title, tier_label, round_type, finalized_at, finalized_snapshot')
      .not('finalized_at', 'is', null)
    if (roundId) query = query.eq('id', roundId)
    if (competitionId) query = query.eq('competition_id', competitionId)

    const { data: rounds, error: roundsErr } = await query
    if (roundsErr) throw new Error(`voting_rounds fetch: ${roundsErr.message}`)

    // Drop rounds we've already notified (unless dry_run, which still previews).
    const { data: already, error: ledgerErr } = await supabase
      .from('round_result_notifications')
      .select('voting_round_id')
    if (ledgerErr) throw new Error(`ledger fetch: ${ledgerErr.message}`)
    const alreadySent = new Set((already || []).map((r: { voting_round_id: string }) => r.voting_round_id))

    const results: SendResult[] = []
    const processed: Record<string, unknown>[] = []

    const sendOne = async (payload: Record<string, unknown>, label: SendResult) => {
      if (dryRun) {
        results.push({ ...label, status: 'sent', reason: 'dry_run' })
        return
      }
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/send-onesignal-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const text = await res.text()
          results.push({ ...label, status: 'failed', reason: `${res.status} ${text.slice(0, 200)}` })
          return
        }
        results.push({ ...label, status: 'sent' })
      } catch (err) {
        results.push({ ...label, status: 'failed', reason: String(err).slice(0, 200) })
      }
    }

    for (const round of (rounds || []) as RoundRow[]) {
      const snapshot = Array.isArray(round.finalized_snapshot) ? round.finalized_snapshot : []
      const advanced = snapshot.filter(e => e.status === 'advanced')
      const eliminated = snapshot.filter(e => e.status === 'eliminated')

      // Nothing actionable (empty snapshot, judging round, or finale winner/runner_up).
      if (advanced.length === 0 && eliminated.length === 0) continue

      if (alreadySent.has(round.id)) {
        processed.push({ round_id: round.id, skipped: 'already_notified' })
        continue
      }

      // Reserve the round before sending so a concurrent / repeat run can't
      // double-send. dry_run reserves nothing.
      if (!dryRun) {
        const { error: reserveErr } = await supabase
          .from('round_result_notifications')
          .insert({ competition_id: round.competition_id, voting_round_id: round.id })
        if (reserveErr) {
          if (reserveErr.code === '23505') {
            processed.push({ round_id: round.id, skipped: 'already_notified_race' })
            continue
          }
          throw new Error(`reserve ledger for ${round.id}: ${reserveErr.message}`)
        }
      }

      const rankByContestant = new Map<string, number | null>(
        snapshot.map(e => [e.contestant_id, e.rank ?? null]),
      )
      const advancedIds = advanced.map(e => e.contestant_id)
      const eliminatedIds = eliminated.map(e => e.contestant_id)
      const allIds = [...advancedIds, ...eliminatedIds]

      // Competition (name + URL pieces).
      const { data: competition } = await supabase
        .from('competitions')
        .select('id, name, slug, organization:organizations(slug)')
        .eq('id', round.competition_id)
        .single()

      const orgSlug = (competition?.organization as { slug?: string } | null)?.slug || 'most-eligible'
      const competitionUrl = competition?.slug
        ? `${appUrl}/${orgSlug}/${competition.slug}`
        : appUrl
      const competitionName = competition?.name || 'Most Eligible'
      const roundName = round.tier_label || round.title || null

      // Next round (for "voting is open now and ends ...").
      const { data: nextRound } = await supabase
        .from('voting_rounds')
        .select('title, tier_label, end_date')
        .eq('competition_id', round.competition_id)
        .eq('round_order', round.round_order + 1)
        .maybeSingle()
      const nextRoundName = nextRound ? (nextRound.tier_label || nextRound.title || null) : null
      const nextRoundEnd = nextRound?.end_date || null

      // Contestants in this snapshot.
      const { data: contestants, error: cErr } = await supabase
        .from('contestants')
        .select('id, name, email, user_id')
        .in('id', allIds)
      if (cErr) throw new Error(`contestants fetch for ${round.id}: ${cErr.message}`)
      const contestantById = new Map((contestants || []).map(c => [c.id, c]))

      // Fans of advancing contestants (opt-in only).
      const { data: fans, error: fErr } = advancedIds.length
        ? await supabase
            .from('contestant_fans')
            .select('id, user_id, contestant_id, email_weekly_updates')
            .in('contestant_id', advancedIds)
            .eq('email_weekly_updates', true)
        : { data: [], error: null }
      if (fErr) throw new Error(`contestant_fans fetch for ${round.id}: ${fErr.message}`)

      // Bulk profile emails: contestant fallbacks + all fans.
      const userIds = new Set<string>()
      for (const c of contestants || []) if (c.user_id) userIds.add(c.user_id)
      for (const f of fans || []) userIds.add(f.user_id)
      const emailByUserId = new Map<string, string>()
      if (userIds.size) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', Array.from(userIds))
        for (const p of profiles || []) if (p.email) emailByUserId.set(p.id, p.email)
      }

      const contestantEmail = (c: { email: string | null; user_id: string | null }) =>
        c.email || (c.user_id ? emailByUserId.get(c.user_id) || null : null)

      const profileUrlFor = (c: { user_id: string | null }) =>
        c.user_id ? `${appUrl}/profile/${c.user_id}` : competitionUrl

      const shared = {
        competition_id: round.competition_id,
        competition_name: competitionName,
        competition_url: competitionUrl,
        round_name: roundName,
        next_round_name: nextRoundName,
        voting_round_end: nextRoundEnd,
      }

      // Advancing contestants.
      for (const id of advancedIds) {
        const c = contestantById.get(id)
        if (!c) continue
        const to = contestantEmail(c)
        const label: SendResult = { round_id: round.id, contestant_id: id, contestant_name: c.name, recipient: 'advanced', to_email: to || '', status: 'sent' }
        if (!to) { results.push({ ...label, status: 'skipped', reason: 'no email on file' }); continue }
        await sendOne({ ...shared, type: 'contestant_advanced', to_email: to, contestant_name: c.name, profile_url: profileUrlFor(c), rank: rankByContestant.get(id) ?? null }, label)
      }

      // Eliminated contestants.
      for (const id of eliminatedIds) {
        const c = contestantById.get(id)
        if (!c) continue
        const to = contestantEmail(c)
        const label: SendResult = { round_id: round.id, contestant_id: id, contestant_name: c.name, recipient: 'eliminated', to_email: to || '', status: 'sent' }
        if (!to) { results.push({ ...label, status: 'skipped', reason: 'no email on file' }); continue }
        await sendOne({ ...shared, type: 'contestant_eliminated', to_email: to, contestant_name: c.name, profile_url: profileUrlFor(c), rank: rankByContestant.get(id) ?? null }, label)
      }

      // Fans of advancing contestants.
      for (const f of fans || []) {
        const c = contestantById.get(f.contestant_id)
        if (!c) continue
        const to = emailByUserId.get(f.user_id) || null
        const label: SendResult = { round_id: round.id, contestant_id: f.contestant_id, contestant_name: c.name, recipient: 'fan', to_email: to || '', status: 'sent' }
        if (!to) { results.push({ ...label, status: 'skipped', reason: 'fan has no profile email' }); continue }
        await sendOne({ ...shared, type: 'fan_contestant_advanced', to_email: to, contestant_name: c.name, profile_url: profileUrlFor(c), rank: rankByContestant.get(f.contestant_id) ?? null, fan_id: f.id }, label)
      }

      // Backfill the per-bucket counts on the ledger row.
      if (!dryRun) {
        const roundResults = results.filter(r => r.round_id === round.id && r.status === 'sent')
        await supabase
          .from('round_result_notifications')
          .update({
            advanced_emailed: roundResults.filter(r => r.recipient === 'advanced').length,
            eliminated_emailed: roundResults.filter(r => r.recipient === 'eliminated').length,
            fans_emailed: roundResults.filter(r => r.recipient === 'fan').length,
          })
          .eq('voting_round_id', round.id)
      }

      processed.push({
        round_id: round.id,
        round_name: roundName,
        competition: competitionName,
        advanced: advancedIds.length,
        eliminated: eliminatedIds.length,
        fans: (fans || []).length,
      })
    }

    const summary = {
      rounds_processed: processed.length,
      sent: results.filter(r => r.status === 'sent').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      failed: results.filter(r => r.status === 'failed').length,
    }

    return new Response(
      JSON.stringify({ success: true, dry_run: dryRun, summary, processed, results, timestamp: new Date().toISOString() }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('notify-round-results error:', error)
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
