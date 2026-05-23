import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// =============================================================================
// EVENT DETECTION LOGIC
// This function checks for competition phase transitions and creates auto-posts
// Designed to run on a 24-hour schedule via Supabase cron
// =============================================================================

interface Competition {
  id: string
  city: string
  season: number
  status: string
  phase: string
  nomination_start: string | null
  nomination_end: string | null
  voting_start: string | null
  voting_end: string | null
  finale_date: string | null
  total_contestants: number
  total_votes: number
  winners: string[] | null
  created_at: string
}

interface EventCheck {
  eventType: string
  shouldTrigger: (comp: Competition, now: Date) => boolean
}

// Define the events we check for
const EVENT_CHECKS: EventCheck[] = [
  {
    eventType: 'competition_launched',
    shouldTrigger: (comp, now) => {
      // Trigger if competition was created in the last 24 hours
      // and is in an active status (not draft)
      if (comp.status === 'draft') return false
      const createdAt = new Date(comp.created_at)
      const hoursSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
      return hoursSinceCreated <= 24
    },
  },
  {
    eventType: 'nominations_open',
    shouldTrigger: (comp, now) => {
      if (!comp.nomination_start) return false
      const nomStart = new Date(comp.nomination_start)
      const hoursSinceOpen = (now.getTime() - nomStart.getTime()) / (1000 * 60 * 60)
      // Trigger if nominations opened in the last 24 hours
      return hoursSinceOpen >= 0 && hoursSinceOpen <= 24
    },
  },
  {
    eventType: 'nominations_close',
    shouldTrigger: (comp, now) => {
      if (!comp.nomination_end) return false
      const nomEnd = new Date(comp.nomination_end)
      const hoursSinceClose = (now.getTime() - nomEnd.getTime()) / (1000 * 60 * 60)
      // Trigger if nominations closed in the last 24 hours
      return hoursSinceClose >= 0 && hoursSinceClose <= 24
    },
  },
  {
    eventType: 'voting_open',
    shouldTrigger: (comp, now) => {
      if (!comp.voting_start) return false
      const votingStart = new Date(comp.voting_start)
      const hoursSinceOpen = (now.getTime() - votingStart.getTime()) / (1000 * 60 * 60)
      // Trigger if voting opened in the last 24 hours
      return hoursSinceOpen >= 0 && hoursSinceOpen <= 24
    },
  },
  {
    eventType: 'voting_close',
    shouldTrigger: (comp, now) => {
      if (!comp.voting_end) return false
      const votingEnd = new Date(comp.voting_end)
      const hoursSinceClose = (now.getTime() - votingEnd.getTime()) / (1000 * 60 * 60)
      // Trigger if voting closed in the last 24 hours
      return hoursSinceClose >= 0 && hoursSinceClose <= 24
    },
  },
  {
    eventType: 'results_announced',
    shouldTrigger: (comp, now) => {
      // Trigger if competition has winners and status just changed to completed
      if (comp.status !== 'completed') return false
      if (!comp.winners || comp.winners.length === 0) return false
      // Check if finale_date was in the last 24 hours
      if (comp.finale_date) {
        const finalsDate = new Date(comp.finale_date)
        const hoursSinceFinals = (now.getTime() - finalsDate.getTime()) / (1000 * 60 * 60)
        return hoursSinceFinals >= 0 && hoursSinceFinals <= 48 // Give a bit more buffer for results
      }
      return false
    },
  },
]

async function sendNominationsOpenBlast(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  supabaseServiceKey: string,
  competition: Competition,
) {
  const EVENT_TYPE = 'nominations_open'

  // Reserve the blast first via upsert with onConflict do-nothing semantics.
  // If a row already exists for (competition_id, event_type), insert is a
  // no-op and we bail out — guarantees at-most-once delivery even across
  // overlapping cron runs.
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
      return
    }
    throw reserveError
  }
  if (!reserved) return

  // Load subscribers with profile email + name. id is needed so each
  // recipient gets a signed one-click unsubscribe link in their footer.
  const { data: subscribers, error: subsError } = await supabase
    .from('competition_subscribers')
    .select('id, user_id, profile:profiles!user_id(email, first_name, last_name)')
    .eq('competition_id', competition.id)

  if (subsError) {
    console.error(`Failed to load subscribers for ${competition.id}:`, subsError)
    return
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

  const competitionName = compDetails?.name || `Most Eligible ${competition.city || ''}`.trim()
  const cityName = compDetails?.city?.name || competition.city || null

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

    // Fetch all active competitions (not draft, not archived long ago)
    const { data: competitions, error: compError } = await supabase
      .from('competitions')
      .select('*')
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

    // Fetch all existing event records to avoid duplicates
    const { data: existingEvents, error: eventsError } = await supabase
      .from('ai_post_events')
      .select('competition_id, event_type')

    if (eventsError) {
      throw new Error(`Failed to fetch existing events: ${eventsError.message}`)
    }

    // Create a set of existing events for quick lookup
    const existingEventSet = new Set(
      (existingEvents || []).map(e => `${e.competition_id}:${e.event_type}`)
    )

    // Check each competition for triggerable events
    for (const competition of competitions as Competition[]) {
      for (const check of EVENT_CHECKS) {
        const eventKey = `${competition.id}:${check.eventType}`

        // Skip if we've already created a post for this event
        if (existingEventSet.has(eventKey)) {
          continue
        }

        // Check if this event should trigger
        if (!check.shouldTrigger(competition, now)) {
          continue
        }

        // Generate the post using our generate-ai-post function
        try {
          const generateResponse = await fetch(`${supabaseUrl}/functions/v1/generate-ai-post`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              mode: 'event',
              eventType: check.eventType,
              competitionId: competition.id,
            }),
          })

          if (!generateResponse.ok) {
            const error = await generateResponse.text()
            console.error(`Failed to generate post for ${eventKey}:`, error)
            results.push({
              competition: `${competition.city} ${competition.season}`,
              event: check.eventType,
              status: `failed: ${error}`,
            })
            continue
          }

          const generatedPost = await generateResponse.json()

          if (!generatedPost.success) {
            results.push({
              competition: `${competition.city} ${competition.season}`,
              event: check.eventType,
              status: `failed: ${generatedPost.error}`,
            })
            continue
          }

          // Create the announcement
          const { data: announcement, error: announcementError } = await supabase
            .from('announcements')
            .insert({
              competition_id: competition.id,
              title: generatedPost.title,
              content: generatedPost.content,
              type: 'announcement',
              pinned: false,
              is_ai_generated: true,
              published_at: new Date().toISOString(),
            })
            .select()
            .single()

          if (announcementError) {
            console.error(`Failed to create announcement for ${eventKey}:`, announcementError)
            results.push({
              competition: `${competition.city} ${competition.season}`,
              event: check.eventType,
              status: `failed to save: ${announcementError.message}`,
            })
            continue
          }

          // Record that we've processed this event
          const { error: eventRecordError } = await supabase
            .from('ai_post_events')
            .insert({
              competition_id: competition.id,
              event_type: check.eventType,
              announcement_id: announcement.id,
            })

          if (eventRecordError) {
            console.error(`Failed to record event for ${eventKey}:`, eventRecordError)
            // Don't fail the whole operation, the post was created
          }

          // Create in-app notifications for all contestants + host
          const { error: notifError } = await supabase.rpc('create_competition_notification', {
            p_competition_id: competition.id,
            p_type: 'event_posted',
            p_title: generatedPost.title,
            p_body: `${competition.city} ${competition.season}: ${check.eventType.replace(/_/g, ' ')}`,
            p_action_url: null,
            p_metadata: JSON.stringify({ event_type: check.eventType }),
          })

          if (notifError) {
            console.error(`Failed to create notifications for ${eventKey}:`, notifError)
          }

          // Email blast to coming-soon subscribers — currently only fires on
          // nominations_open. Dedup'd via subscriber_blast_events so a single
          // competition + event sends at most once.
          if (check.eventType === 'nominations_open') {
            await sendNominationsOpenBlast(supabase, supabaseUrl, supabaseServiceKey, competition).catch((err) => {
              console.error(`Subscriber blast failed for ${eventKey}:`, err)
            })
          }

          results.push({
            competition: `${competition.city} ${competition.season}`,
            event: check.eventType,
            status: 'success',
          })

        } catch (error) {
          console.error(`Error processing ${eventKey}:`, error)
          results.push({
            competition: `${competition.city} ${competition.season}`,
            event: check.eventType,
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
