import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// =============================================================================
// EVENT DETECTION LOGIC
// This function checks for competition phase transitions and creates auto-posts.
// It also checks for upcoming dates (day-before reminders) and sends push/email.
// Designed to run on a 24-hour schedule via Supabase cron.
// =============================================================================

interface Competition {
  id: string
  city: string
  name: string
  season: number
  status: string
  phase: string
  nomination_start: string | null
  nomination_end: string | null
  voting_start: string | null
  voting_end: string | null
  finale_date: string | null
  finals_date: string | null
  total_contestants: number
  total_votes: number
  winners: string[] | null
  created_at: string
  organization?: { slug?: string } | null
  slug?: string
}

interface EventCheck {
  eventType: string
  shouldTrigger: (comp: Competition, now: Date) => boolean
}

// Helper: check if a date is 24-48 hours in the future (i.e., "tomorrow")
function isTomorrow(dateStr: string | null, now: Date): boolean {
  if (!dateStr) return false
  const date = new Date(dateStr)
  const hoursUntil = (date.getTime() - now.getTime()) / (1000 * 60 * 60)
  return hoursUntil > 0 && hoursUntil <= 48
}

// Helper: send push + email to all contestants in a competition (fire-and-forget)
async function sendContestantNotifications(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  supabaseServiceKey: string,
  competitionId: string,
  competition: Competition,
  title: string,
  body: string,
  eventDate?: string | null,
) {
  // Fetch contestant user_ids and emails
  const { data: contestants } = await supabase
    .from('contestants')
    .select('user_id, email')
    .eq('competition_id', competitionId)
    .not('user_id', 'is', null)

  if (!contestants || contestants.length === 0) return

  const competitionName = competition.name || `${competition.city || ''} ${competition.season || ''}`.trim()
  const orgSlug = (competition as any).organization?.slug || 'most-eligible'
  const compSlug = competition.slug || competition.id
  const competitionUrl = `https://eliterank.co/${orgSlug}/${compSlug}`

  for (const contestant of contestants) {
    // Push notification (fire-and-forget)
    fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        user_id: contestant.user_id,
        type: 'date_reminder',
        title,
        body,
        url: competitionUrl,
      }),
    }).catch(err => console.warn('Push notification failed:', err))

    // Email notification (fire-and-forget)
    if (contestant.email) {
      fetch(`${supabaseUrl}/functions/v1/send-onesignal-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          type: 'date_reminder',
          to_email: contestant.email,
          competition_name: competitionName,
          competition_url: competitionUrl,
          reminder_title: title,
          reminder_body: body,
          event_date: eventDate || null,
        }),
      }).catch(err => console.warn('Email notification failed:', err))
    }
  }
}

// Define the events we check for (when-it-happens)
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
      .select('*, organization:organizations(slug)')
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

    // Build competition lookup map
    const competitionMap = new Map<string, Competition>()
    for (const c of competitions) {
      competitionMap.set(c.id, c as Competition)
    }

    // =========================================================================
    // PART 1: When-it-happens events (existing logic + push/email)
    // =========================================================================
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

          // Send push + email to all contestants (fire-and-forget)
          const compName = competition.name || `${competition.city || ''} ${competition.season || ''}`.trim()
          const eventLabel = check.eventType.replace(/_/g, ' ')
          sendContestantNotifications(
            supabase, supabaseUrl, supabaseServiceKey,
            competition.id, competition,
            generatedPost.title,
            `${compName}: ${eventLabel}`,
          ).catch(err => console.warn('Failed to send contestant notifications:', err))

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
            status: `error: ${(error as Error).message}`,
          })
        }
      }
    }

    // =========================================================================
    // PART 2: Day-before reminders (voting rounds, events, finals)
    // =========================================================================
    const activeCompetitionIds = competitions
      .filter((c: any) => c.status === 'live' || c.status === 'publish')
      .map((c: any) => c.id)

    if (activeCompetitionIds.length > 0) {
      // Fetch voting rounds starting or ending tomorrow
      const { data: upcomingRounds } = await supabase
        .from('voting_rounds')
        .select('id, competition_id, round_type, round_order, title, start_date, end_date')
        .in('competition_id', activeCompetitionIds)

      // Fetch events happening tomorrow
      const { data: upcomingEvents } = await supabase
        .from('events')
        .select('id, competition_id, name, date, time')
        .in('competition_id', activeCompetitionIds)
        .neq('status', 'completed')

      // Check voting round start reminders
      for (const round of (upcomingRounds || [])) {
        if (!isTomorrow(round.start_date, now)) continue

        const eventKey = `${round.competition_id}:voting_starts_reminder:${round.id}`
        if (existingEventSet.has(eventKey)) continue

        const comp = competitionMap.get(round.competition_id)
        if (!comp) continue

        const compName = comp.name || `${comp.city || ''} ${comp.season || ''}`.trim()
        const roundLabel = round.title || `Round ${round.round_order || 1}`
        const isJudging = round.round_type === 'judging'
        const title = isJudging ? 'Judging starts tomorrow!' : 'Voting starts tomorrow!'
        const body = `${roundLabel} ${isJudging ? 'judging' : 'voting'} in ${compName} begins tomorrow. Make sure your supporters are ready!`

        try {
          // Record the reminder
          await supabase.from('ai_post_events').insert({
            competition_id: round.competition_id,
            event_type: 'voting_starts_reminder',
          })

          // In-app notification
          await supabase.rpc('create_competition_notification', {
            p_competition_id: round.competition_id,
            p_type: 'event_posted',
            p_title: title,
            p_body: body,
            p_action_url: null,
            p_metadata: JSON.stringify({ event_type: 'voting_starts_reminder', round_id: round.id }),
          })

          // Push + email
          await sendContestantNotifications(
            supabase, supabaseUrl, supabaseServiceKey,
            round.competition_id, comp, title, body, round.start_date,
          )

          results.push({ competition: compName, event: 'voting_starts_reminder', status: 'success' })
        } catch (err) {
          console.error(`Reminder error for ${eventKey}:`, err)
          results.push({ competition: compName, event: 'voting_starts_reminder', status: `error: ${(err as Error).message}` })
        }
      }

      // Check voting round end reminders
      for (const round of (upcomingRounds || [])) {
        if (!isTomorrow(round.end_date, now)) continue

        const eventKey = `${round.competition_id}:voting_ends_reminder:${round.id}`
        if (existingEventSet.has(eventKey)) continue

        const comp = competitionMap.get(round.competition_id)
        if (!comp) continue

        const compName = comp.name || `${comp.city || ''} ${comp.season || ''}`.trim()
        const roundLabel = round.title || `Round ${round.round_order || 1}`
        const isJudging = round.round_type === 'judging'
        const title = isJudging ? 'Last day for judging!' : 'Last day to vote!'
        const body = `${roundLabel} ${isJudging ? 'judging' : 'voting'} in ${compName} ends tomorrow. Rally your supporters!`

        try {
          await supabase.from('ai_post_events').insert({
            competition_id: round.competition_id,
            event_type: 'voting_ends_reminder',
          })

          await supabase.rpc('create_competition_notification', {
            p_competition_id: round.competition_id,
            p_type: 'event_posted',
            p_title: title,
            p_body: body,
            p_action_url: null,
            p_metadata: JSON.stringify({ event_type: 'voting_ends_reminder', round_id: round.id }),
          })

          await sendContestantNotifications(
            supabase, supabaseUrl, supabaseServiceKey,
            round.competition_id, comp, title, body, round.end_date,
          )

          results.push({ competition: compName, event: 'voting_ends_reminder', status: 'success' })
        } catch (err) {
          console.error(`Reminder error:`, err)
          results.push({ competition: compName, event: 'voting_ends_reminder', status: `error: ${(err as Error).message}` })
        }
      }

      // Check event reminders
      for (const event of (upcomingEvents || [])) {
        if (!isTomorrow(event.date, now)) continue

        const eventKey = `${event.competition_id}:event_reminder:${event.id}`
        if (existingEventSet.has(eventKey)) continue

        const comp = competitionMap.get(event.competition_id)
        if (!comp) continue

        const compName = comp.name || `${comp.city || ''} ${comp.season || ''}`.trim()
        const title = 'Event tomorrow!'
        const body = `${event.name || 'An event'} for ${compName} is happening tomorrow. Don't miss it!`

        try {
          await supabase.from('ai_post_events').insert({
            competition_id: event.competition_id,
            event_type: 'event_reminder',
          })

          await supabase.rpc('create_competition_notification', {
            p_competition_id: event.competition_id,
            p_type: 'event_posted',
            p_title: title,
            p_body: body,
            p_action_url: null,
            p_metadata: JSON.stringify({ event_type: 'event_reminder', event_id: event.id }),
          })

          await sendContestantNotifications(
            supabase, supabaseUrl, supabaseServiceKey,
            event.competition_id, comp, title, body, event.date,
          )

          results.push({ competition: compName, event: 'event_reminder', status: 'success' })
        } catch (err) {
          console.error(`Reminder error:`, err)
          results.push({ competition: compName, event: 'event_reminder', status: `error: ${(err as Error).message}` })
        }
      }

      // Check finals reminders
      for (const competition of competitions as Competition[]) {
        const finalsDate = competition.finals_date || competition.finale_date
        if (!isTomorrow(finalsDate, now)) continue
        if (competition.status === 'completed' || competition.status === 'archive') continue

        const eventKey = `${competition.id}:finals_reminder`
        if (existingEventSet.has(eventKey)) continue

        const compName = competition.name || `${competition.city || ''} ${competition.season || ''}`.trim()
        const title = 'Finals tomorrow!'
        const body = `The finals for ${compName} are tomorrow! Get ready for the big day!`

        try {
          await supabase.from('ai_post_events').insert({
            competition_id: competition.id,
            event_type: 'finals_reminder',
          })

          await supabase.rpc('create_competition_notification', {
            p_competition_id: competition.id,
            p_type: 'event_posted',
            p_title: title,
            p_body: body,
            p_action_url: null,
            p_metadata: JSON.stringify({ event_type: 'finals_reminder' }),
          })

          await sendContestantNotifications(
            supabase, supabaseUrl, supabaseServiceKey,
            competition.id, competition, title, body, finalsDate,
          )

          results.push({ competition: compName, event: 'finals_reminder', status: 'success' })
        } catch (err) {
          console.error(`Reminder error:`, err)
          results.push({ competition: compName, event: 'finals_reminder', status: `error: ${(err as Error).message}` })
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
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
