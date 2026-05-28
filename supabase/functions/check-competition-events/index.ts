import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// =============================================================================
// check-competition-events
// -----------------------------------------------------------------------------
// Detects competitions whose nomination_start has just passed and emails
// everyone in competition_subscribers. Designed to run hourly via pg_cron
// (the 24h detection window means cron can run every hour or every day —
// subscriber_blast_events.unique(competition_id, event_type) ensures the
// blast goes out at most once.
// =============================================================================

interface Competition {
  id: string
  season: number
  status: string
  nomination_start: string | null
  nomination_end: string | null
}

async function sendNominationsOpenBlast(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  supabaseServiceKey: string,
  competition: Competition,
): Promise<{ reserved: boolean; sent: number; total: number }> {
  const EVENT_TYPE = 'nominations_open'

  // Reserve the blast first via insert. The unique(competition_id, event_type)
  // constraint guarantees at-most-once delivery even across overlapping cron
  // runs — if another invocation already inserted a row, this errors with
  // 23505 and we bail out without sending.
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
    if (reserveError.code === '23505') {
      console.log(`Subscriber blast already sent for ${competition.id}/${EVENT_TYPE}`)
      return { reserved: false, sent: 0, total: 0 }
    }
    throw reserveError
  }
  if (!reserved) return { reserved: false, sent: 0, total: 0 }

  const { data: subscribers, error: subsError } = await supabase
    .from('competition_subscribers')
    .select('id, user_id, profile:profiles!user_id(email, first_name, last_name)')
    .eq('competition_id', competition.id)

  if (subsError) {
    console.error(`Failed to load subscribers for ${competition.id}:`, subsError)
    return { reserved: true, sent: 0, total: 0 }
  }

  const { data: compDetails } = await supabase
    .from('competitions')
    .select('name, slug, nomination_end, organization:organizations(slug), city:cities(name)')
    .eq('id', competition.id)
    .single()

  const appUrl = Deno.env.get('APP_URL') || 'https://eliterank.co'
  const orgSlug = (compDetails?.organization as { slug?: string } | null)?.slug
  const competitionUrl = orgSlug
    ? `${appUrl}/${orgSlug}/${compDetails?.slug || `id/${competition.id}`}`
    : `${appUrl}/c/${competition.id}`

  const cityName = (compDetails?.city as { name?: string } | null)?.name || null
  const competitionName = compDetails?.name || `Most Eligible ${cityName || ''}`.trim()

  let sent = 0
  const total = (subscribers || []).length
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

  await supabase
    .from('subscriber_blast_events')
    .update({ recipients: sent })
    .eq('id', reserved.id)

  console.log(`Subscriber blast for ${competition.id}/${EVENT_TYPE}: sent=${sent}/${total}`)
  return { reserved: true, sent, total }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const now = new Date()
    const results: {
      competition: string
      event: string
      status: string
      sent?: number
      total?: number
    }[] = []

    const { data: competitions, error: compError } = await supabase
      .from('competitions')
      .select('id, season, status, nomination_start, nomination_end')
      .neq('status', 'draft')

    if (compError) {
      throw new Error(`Failed to fetch competitions: ${compError.message}`)
    }

    for (const competition of (competitions || []) as Competition[]) {
      if (!competition.nomination_start) continue
      const nomStart = new Date(competition.nomination_start)
      const hoursSinceOpen = (now.getTime() - nomStart.getTime()) / (1000 * 60 * 60)
      // Window: trigger if nominations opened in the last 24h. Combined with
      // subscriber_blast_events dedup, this means safe to run as often as
      // hourly without risk of duplicate sends.
      if (hoursSinceOpen < 0 || hoursSinceOpen > 24) continue

      try {
        const blastResult = await sendNominationsOpenBlast(
          supabase,
          supabaseUrl,
          supabaseServiceKey,
          competition,
        )
        results.push({
          competition: `Competition ${competition.id}`,
          event: 'nominations_open',
          status: blastResult.reserved ? 'sent' : 'already_sent',
          sent: blastResult.sent,
          total: blastResult.total,
        })
      } catch (err) {
        console.error(`Blast failed for ${competition.id}:`, err)
        results.push({
          competition: `Competition ${competition.id}`,
          event: 'nominations_open',
          status: `error: ${(err as Error).message}`,
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${(competitions || []).length} competitions`,
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
