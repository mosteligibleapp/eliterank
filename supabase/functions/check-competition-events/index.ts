import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// =============================================================================
// COMPETITION EVENT NOTIFICATIONS
// Detects competition phase transitions and notifies subscribers.
// Currently the only event we act on is "nominations open": when a competition
// enters its nomination window we email everyone on its coming-soon subscriber
// list. Designed to run on a 24-hour schedule via Supabase cron.
//
// Delivery is deduped via the subscriber_blast_events ledger (one row per
// competition + event_type), so this is safe to run repeatedly and is not
// sensitive to exact cron timing — a competition gets at most one blast even
// if the cron fires many times while nominations are open.
// =============================================================================

interface Competition {
  id: string
  name: string | null
  slug: string | null
  season: number | null
  status: string
  nomination_start: string | null
  nomination_end: string | null
}

// Nominations are "open" once we've passed nomination_start and haven't yet
// passed nomination_end. We intentionally do NOT use a narrow "opened in the
// last 24h" window: the blast ledger handles dedup, and a window-based trigger
// silently misses competitions if the cron is down during that window.
function nominationsAreOpen(comp: Competition, now: Date): boolean {
  if (!comp.nomination_start) return false
  const start = new Date(comp.nomination_start)
  if (now.getTime() < start.getTime()) return false
  if (comp.nomination_end) {
    const end = new Date(comp.nomination_end)
    if (now.getTime() > end.getTime()) return false
  }
  return true
}

async function sendNominationsOpenBlast(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  supabaseServiceKey: string,
  competition: Competition,
): Promise<number | null> {
  const EVENT_TYPE = 'nominations_open'

  // Reserve the blast first via an insert that will hit the unique constraint
  // on (competition_id, event_type) if it already ran. If a row already exists,
  // insert is a no-op and we bail out — guarantees at-most-once delivery even
  // across overlapping cron runs.
  const { data: reserved, error: reserveError } = await supabase
    .from('subscriber_blast_events')
    .insert({
      competition_id: competition.id,
      event_type: EVENT_TYPE,
      recipients: 0,
    })
    .select('id')
    .maybeSingle()

  if (reserveError) {
    // Unique violation = already sent. Anything else is a real error.
    if (reserveError.code === '23505') {
      console.log(`Subscriber blast already sent for competition ${competition.id}/${EVENT_TYPE}`)
      return null
    }
    throw reserveError
  }
  if (!reserved) return null

  // Load subscribers with profile email + name. id is needed so each
  // recipient gets a signed one-click unsubscribe link in their footer.
  const { data: subscribers, error: subsError } = await supabase
    .from('competition_subscribers')
    .select('id, user_id, profile:profiles!user_id(email, first_name, last_name)')
    .eq('competition_id', competition.id)

  if (subsError) {
    console.error(`Failed to load subscribers for ${competition.id}:`, subsError)
    return null
  }

  // Look up competition + organization details for the email subject and CTA URL
  const { data: compDetails } = await supabase
    .from('competitions')
    .select('name, slug, nomination_end, organization:organizations(slug), city:cities(name)')
    .eq('id', competition.id)
    .single()

  const appUrl = Deno.env.get('APP_URL') || 'https://eliterank.co'
  const orgSlug = compDetails?.organization?.slug
  const competitionUrl = orgSlug
    ? `${appUrl}/${orgSlug}/${compDetails?.slug || `id/${competition.id}`}`
    : `${appUrl}/c/${competition.id}`

  const competitionName = compDetails?.name || competition.name || 'EliteRank'
  const cityName = compDetails?.city?.name || null

  let sent = 0
  for (const row of subscribers || []) {
    const profile = row.profile as { email?: string; first_name?: string; last_name?: string } | null
    if (!profile?.email) continue
    const toName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() || undefined

    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/send-onesignal-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          type: 'nominations_open_subscriber',
          to_email: profile.email,
          to_name: toName,
          competition_id: competition.id,
          competition_name: competitionName,
          city_name: cityName,
          competition_url: competitionUrl,
          nomination_end: compDetails?.nomination_end || competition.nomination_end || null,
          subscriber_id: row.id,
        }),
      })
      if (resp.ok) {
        sent += 1
      } else {
        const text = await resp.text()
        console.error(`Failed to send blast to ${profile.email}:`, text)
      }
    } catch (err) {
      console.error(`Error sending blast to ${profile.email}:`, err)
    }
  }

  // Update the ledger row with the actual delivered count
  await supabase
    .from('subscriber_blast_events')
    .update({ recipients: sent })
    .eq('id', reserved.id)

  console.log(`Subscriber blast for ${competition.id}/${EVENT_TYPE}: sent=${sent} of ${(subscribers || []).length}`)
  return sent
}

/**
 * Email everyone who voted in a finalized round a results recap (their
 * contestant's final rank + movement + charity mention). Deduped per
 * (round, recipient) via results_recap_emails so the cron is safe to re-run.
 */
async function sendRoundRecapEmails(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  supabaseServiceKey: string,
  round: { id: string; competition_id: string; title: string | null },
): Promise<number> {
  const appUrl = Deno.env.get('APP_URL') || 'https://eliterank.co'

  const { data: comp } = await supabase
    .from('competitions')
    .select('id, name, slug, charity_name, organization:organizations(slug)')
    .eq('id', round.competition_id)
    .single()

  const orgSlug = (comp?.organization as { slug?: string } | null)?.slug || 'most-eligible'
  const competitionUrl = comp?.slug ? `${appUrl}/${orgSlug}/${comp.slug}` : appUrl
  const competitionName = comp?.name || 'Most Eligible'

  const { data: recipients, error: rpcError } = await supabase
    .rpc('get_round_recap_recipients', { p_round_id: round.id })
  if (rpcError) {
    console.error(`Recap recipients RPC failed for round ${round.id}:`, rpcError)
    return 0
  }

  let sent = 0
  for (const r of (recipients || []) as Array<{
    recipient_email: string
    contestant_name: string | null
    final_rank: number | null
    final_status: string | null
    prev_rank: number | null
    voter_vote_count: number | null
  }>) {
    if (!r.recipient_email) continue

    // Claim per (round, email) so re-runs / overlapping cron never double-send.
    const { data: claimed, error: claimErr } = await supabase
      .from('results_recap_emails')
      .insert({
        voting_round_id: round.id,
        competition_id: round.competition_id,
        recipient_email: r.recipient_email,
      })
      .select('id')
      .maybeSingle()
    if (claimErr) {
      if (claimErr.code === '23505') continue // already sent
      console.error(`Recap claim failed for ${r.recipient_email}:`, claimErr)
      continue
    }
    if (!claimed) continue

    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/send-onesignal-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          type: 'vote_results_recap',
          to_email: r.recipient_email,
          contestant_name: r.contestant_name,
          competition_id: round.competition_id,
          competition_name: competitionName,
          competition_url: competitionUrl,
          profile_url: competitionUrl,
          round_title: round.title,
          final_rank: r.final_rank,
          final_status: r.final_status,
          prev_rank: r.prev_rank,
          vote_count: Number(r.voter_vote_count) || 0,
          charity_name: comp?.charity_name || null,
        }),
      })
      if (resp.ok) {
        sent += 1
      } else {
        const text = await resp.text()
        console.error(`Recap email failed for ${r.recipient_email}:`, text)
        // Roll back the claim so a transient failure can retry next run.
        await supabase.from('results_recap_emails').delete().eq('id', claimed.id)
      }
    } catch (err) {
      console.error(`Recap email error for ${r.recipient_email}:`, err)
      await supabase.from('results_recap_emails').delete().eq('id', claimed.id)
    }
  }

  console.log(`Round recap for ${round.id}: sent=${sent}`)
  return sent
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const now = new Date()
    const results: { competition: string; event: string; status: string }[] = []

    // Fetch all active competitions (not draft)
    const { data: competitions, error: compError } = await supabase
      .from('competitions')
      .select('id, name, slug, season, status, nomination_start, nomination_end')
      .neq('status', 'draft')

    if (compError) {
      throw new Error(`Failed to fetch competitions: ${compError.message}`)
    }

    if (!competitions || competitions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active competitions found', results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    for (const competition of competitions as Competition[]) {
      if (!nominationsAreOpen(competition, now)) continue

      try {
        const sent = await sendNominationsOpenBlast(supabase, supabaseUrl, supabaseServiceKey, competition)
        results.push({
          competition: competition.name || competition.id,
          event: 'nominations_open',
          status: sent === null ? 'skipped (already sent)' : `sent ${sent}`,
        })
      } catch (error) {
        console.error(`Error processing nominations_open for ${competition.id}:`, error)
        results.push({
          competition: competition.name || competition.id,
          event: 'nominations_open',
          status: `error: ${error.message}`,
        })
      }
    }

    // ── Results recap blasts ────────────────────────────────────────────
    // Email voters of any public round finalized in the last few days. The
    // per-recipient ledger dedups, and the recent-window guard keeps a first
    // deploy from retroactively blasting voters of long-finished rounds. The
    // ~24h cron cadence fits comfortably inside the window.
    const recapWindowIso = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const { data: finalizedRounds, error: roundsError } = await supabase
      .from('voting_rounds')
      .select('id, competition_id, title, round_type, finalized_at')
      .in('round_type', ['voting', 'finale'])
      .not('finalized_at', 'is', null)
      .gte('finalized_at', recapWindowIso)

    if (roundsError) {
      console.error('Failed to fetch finalized rounds for recap:', roundsError)
    } else {
      for (const round of finalizedRounds || []) {
        try {
          const sent = await sendRoundRecapEmails(supabase, supabaseUrl, supabaseServiceKey, round)
          results.push({
            competition: round.competition_id,
            event: `results_recap:${round.id}`,
            status: `sent ${sent}`,
          })
        } catch (error) {
          console.error(`Error processing results_recap for round ${round.id}:`, error)
          results.push({
            competition: round.competition_id,
            event: `results_recap:${round.id}`,
            status: `error: ${error.message}`,
          })
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${competitions.length} competitions`,
        results,
        timestamp: now.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in check-competition-events:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
