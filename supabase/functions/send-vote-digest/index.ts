import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * send-vote-digest — Daily roll-up of votes received per contestant.
 *
 * Replaces the per-vote bell ping. For every active contestant in every
 * non-draft / non-completed competition, sums vote_count from the votes table
 * over the last 24 hours and (if > 0) inserts a single `vote_digest`
 * notification + fires a OneSignal push.
 *
 * Designed for a daily cron at 23:00 UTC — the peak vote hour in prod, which
 * lands the digest right at the start of the evening engagement window.
 *
 * Manual invocation accepts:
 *   { dry_run?: boolean, window_hours?: number }
 *
 * Required Supabase secrets:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   APP_URL              (optional, defaults to https://eliterank.co)
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Competition {
  id: string
  name: string | null
  slug: string | null
  status: string
  organization: { slug: string | null } | null
}

interface Contestant {
  id: string
  name: string
  user_id: string | null
  competition_id: string
  status: string
}

interface VoteRow {
  contestant_id: string
  vote_count: number | null
}

interface PerContestantResult {
  contestant_id: string
  contestant_name: string
  competition_id: string
  vote_total: number
  notified: boolean
  pushed: boolean
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

    let dryRun = false
    let windowHours = 24
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        dryRun = !!body?.dry_run
        if (typeof body?.window_hours === 'number' && body.window_hours > 0) {
          windowHours = body.window_hours
        }
      } catch {
        // empty body — defaults
      }
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const now = new Date()
    const since = new Date(now.getTime() - windowHours * 60 * 60 * 1000).toISOString()

    // Active competitions only.
    const { data: competitions, error: compErr } = await supabase
      .from('competitions')
      .select('id, name, slug, status, organization:organizations(slug)')
      .not('status', 'in', '(draft,archive,completed)')

    if (compErr) throw new Error(`competitions fetch: ${compErr.message}`)
    if (!competitions || competitions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active competitions', results: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const compIds = (competitions as Competition[]).map(c => c.id)
    const compById = new Map<string, Competition>(
      (competitions as Competition[]).map(c => [c.id, c]),
    )

    // Active contestants with a user account (no user_id = no notification target).
    const { data: contestants, error: cErr } = await supabase
      .from('contestants')
      .select('id, name, user_id, competition_id, status')
      .in('competition_id', compIds)
      .eq('status', 'active')
      .not('user_id', 'is', null)

    if (cErr) throw new Error(`contestants fetch: ${cErr.message}`)
    if (!contestants || contestants.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active contestants', results: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const contestantIds = (contestants as Contestant[]).map(c => c.id)

    // Pull all votes in the window for these contestants and aggregate in JS.
    // Single query with .in() rather than per-contestant SQL — far fewer round trips.
    const { data: voteRows, error: vErr } = await supabase
      .from('votes')
      .select('contestant_id, vote_count')
      .in('contestant_id', contestantIds)
      .gte('created_at', since)

    if (vErr) throw new Error(`votes fetch: ${vErr.message}`)

    const totalsByContestant = new Map<string, number>()
    for (const v of (voteRows || []) as VoteRow[]) {
      const prev = totalsByContestant.get(v.contestant_id) || 0
      totalsByContestant.set(v.contestant_id, prev + (v.vote_count || 1))
    }

    const results: PerContestantResult[] = []

    for (const contestant of contestants as Contestant[]) {
      const total = totalsByContestant.get(contestant.id) || 0
      if (total === 0) continue // no notification when no activity

      const competition = compById.get(contestant.competition_id)
      const compName = competition?.name || 'your competition'
      const orgSlug = competition?.organization?.slug || 'most-eligible'
      const profilePath = contestant.user_id ? `/profile/${contestant.user_id}` : '/'

      const title = total === 1 ? 'You got a new vote!' : `You got ${total} new votes!`
      const body = total === 1
        ? `1 vote in ${compName} since yesterday.`
        : `${total} votes in ${compName} since yesterday.`

      const result: PerContestantResult = {
        contestant_id: contestant.id,
        contestant_name: contestant.name,
        competition_id: contestant.competition_id,
        vote_total: total,
        notified: false,
        pushed: false,
      }

      if (dryRun) {
        result.notified = true
        result.pushed = true
        result.reason = 'dry_run'
        results.push(result)
        continue
      }

      // 1. In-app notification.
      const { error: insertErr } = await supabase
        .from('notifications')
        .insert({
          user_id: contestant.user_id,
          type: 'vote_digest',
          title,
          body,
          competition_id: contestant.competition_id,
          contestant_id: contestant.id,
          action_url: profilePath,
          metadata: {
            vote_total: total,
            window_hours: windowHours,
            org_slug: orgSlug,
          },
        })

      if (insertErr) {
        result.reason = `notification insert: ${insertErr.message}`
        results.push(result)
        continue
      }
      result.notified = true

      // 2. Push (fire-and-forget — failures shouldn't block the loop).
      try {
        const pushRes = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            user_id: contestant.user_id,
            type: 'vote_digest',
            title,
            body,
            url: profilePath,
            vote_count: total,
            competition_name: compName,
            data: {
              competition_id: contestant.competition_id,
              contestant_id: contestant.id,
            },
          }),
        })
        result.pushed = pushRes.ok
        if (!pushRes.ok) {
          const text = await pushRes.text()
          result.reason = `push: ${pushRes.status} ${text.slice(0, 120)}`
        }
      } catch (err) {
        result.reason = `push error: ${String(err).slice(0, 120)}`
      }

      results.push(result)
    }

    const summary = {
      contestants_scanned: contestants.length,
      contestants_with_votes: results.length,
      notifications_sent: results.filter(r => r.notified).length,
      pushes_sent: results.filter(r => r.pushed).length,
      failures: results.filter(r => r.notified === false || (r.notified && !r.pushed && !dryRun)).length,
    }

    return new Response(
      JSON.stringify({
        success: true,
        dry_run: dryRun,
        window_hours: windowHours,
        since,
        timestamp: now.toISOString(),
        summary,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('send-vote-digest error:', error)
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
