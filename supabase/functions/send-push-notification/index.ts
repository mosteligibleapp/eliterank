import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * send-push-notification — Sends push notifications via OneSignal.
 *
 * Uses `include_aliases` with external_id (= Supabase user UUID) to target
 * the correct device. The frontend OneSignal SDK must call
 * `OneSignal.login(user.id)` after auth so that the external_id is set.
 *
 * Supported notification types:
 *   - nominee_invite:     "You've been nominated!" push to the nominee
 *   - nominee_accepted:   "Your nominee accepted!" push to the nominator
 *   - nominee_declined:   "Your nominee declined" push to the nominator
 *   - vote_received:      "You got new votes!" push to contestant
 *   - rank_change:        "Your rank changed!" push to contestant
 *   - new_reward:         "You have a new reward!" push to contestant
 *   - generic:            Custom title/body push
 *
 * Required Supabase secrets:
 *   ONESIGNAL_APP_ID   — OneSignal App ID
 *   ONESIGNAL_API_KEY  — OneSignal REST API Key
 *
 * Body: {
 *   user_id: string,           // Supabase user UUID (used as OneSignal external_id)
 *   type: string,              // Notification type
 *   title?: string,            // Override title
 *   body?: string,             // Override body
 *   url?: string,              // Deep link / action URL
 *   data?: Record<string,any>, // Custom data payload
 *   // Context fields for template rendering:
 *   nominee_name?: string,
 *   nominator_name?: string,
 *   competition_name?: string,
 *   vote_count?: number,
 *   old_rank?: number,
 *   new_rank?: number,
 * }
 */

interface PushRequest {
  user_id: string
  type: string
  title?: string
  body?: string
  url?: string
  data?: Record<string, unknown>
  nominee_name?: string
  nominator_name?: string
  competition_name?: string
  vote_count?: number
  old_rank?: number
  new_rank?: number
}

function getNotificationContent(req: PushRequest): { title: string; body: string } {
  // If caller provides explicit title/body, use those
  if (req.title && req.body) {
    return { title: req.title, body: req.body }
  }

  switch (req.type) {
    case 'nominee_invite':
      return {
        title: "You've been nominated!",
        body: req.nominator_name
          ? `${req.nominator_name} nominated you for ${req.competition_name || 'Most Eligible'}. Tap to accept!`
          : `Someone nominated you for ${req.competition_name || 'Most Eligible'}. Tap to accept!`,
      }

    case 'nominee_accepted':
      return {
        title: `${req.nominee_name || 'Your nominee'} is in!`,
        body: `${req.nominee_name || 'Your nominee'} accepted their nomination for ${req.competition_name || 'Most Eligible'}!`,
      }

    case 'nominee_declined':
      return {
        title: 'Nomination update',
        body: `${req.nominee_name || 'Your nominee'} declined their nomination for ${req.competition_name || 'Most Eligible'}.`,
      }

    case 'vote_received':
      return {
        title: 'New votes!',
        body: req.vote_count
          ? `You received ${req.vote_count} vote${req.vote_count > 1 ? 's' : ''}!`
          : 'You received new votes!',
      }

    case 'rank_change':
      if (req.old_rank && req.new_rank && req.new_rank < req.old_rank) {
        return {
          title: 'You moved up!',
          body: `You went from #${req.old_rank} to #${req.new_rank} in ${req.competition_name || 'the competition'}!`,
        }
      }
      return {
        title: 'Ranking update',
        body: req.old_rank && req.new_rank
          ? `You moved from #${req.old_rank} to #${req.new_rank}.`
          : 'Your ranking has changed.',
      }

    case 'new_reward':
      return {
        title: 'You have a new reward!',
        body: 'A brand sent you a reward. Tap to check it out!',
      }

    default:
      return {
        title: req.title || 'EliteRank',
        body: req.body || 'You have a new notification.',
      }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const appId = Deno.env.get('ONESIGNAL_APP_ID')
    const apiKey = Deno.env.get('ONESIGNAL_API_KEY')
    const appUrl = Deno.env.get('APP_URL') || 'https://eliterank.co'

    if (!appId || !apiKey) {
      console.error('OneSignal credentials not configured')
      return new Response(
        JSON.stringify({ error: 'Push service not configured', details: 'Missing ONESIGNAL_APP_ID or ONESIGNAL_API_KEY' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: PushRequest = await req.json()
    console.log('send-push-notification called:', JSON.stringify({ type: body.type, user_id: body.user_id }))

    if (!body.user_id || !body.type) {
      return new Response(
        JSON.stringify({ error: 'user_id and type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { title, body: messageBody } = getNotificationContent(body)

    // Build the deep link URL
    const actionUrl = body.url ? `${appUrl}${body.url.startsWith('/') ? '' : '/'}${body.url}` : appUrl

    // OneSignal Create Notification (Push channel)
    // Target by external_id which is the Supabase user UUID
    const oneSignalPayload = {
      app_id: appId,
      // Target specific user by their external_id (Supabase UUID)
      include_aliases: {
        external_id: [body.user_id],
      },
      target_channel: 'push',
      headings: { en: title },
      contents: { en: messageBody },
      // Deep link
      url: actionUrl,
      // iOS
      ios_badgeType: 'Increase',
      ios_badgeCount: 1,
      // Android
      android_channel_id: undefined, // Uses default channel
      // Web push
      web_url: actionUrl,
      // Custom data
      data: {
        type: body.type,
        ...(body.data || {}),
      },
    }

    console.log('Sending OneSignal push:', JSON.stringify({ title, to_user: body.user_id }))

    const osResponse = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`,
      },
      body: JSON.stringify(oneSignalPayload),
    })

    const osResult = await osResponse.json()

    if (!osResponse.ok) {
      console.error('OneSignal push API error:', JSON.stringify(osResult))

      // If user doesn't have a push subscription yet, log but don't fail hard.
      // This is expected for users who haven't enabled push notifications yet.
      if (JSON.stringify(osResult).includes('not subscribed') ||
          JSON.stringify(osResult).includes('No subscriptions')) {
        console.log('User has no push subscription (expected for new users):', body.user_id)
        return new Response(
          JSON.stringify({
            success: false,
            skipped: true,
            reason: 'no_push_subscription',
            message: 'User has not enabled push notifications yet',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ error: 'OneSignal push failed', details: osResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('OneSignal push sent successfully:', JSON.stringify(osResult))

    return new Response(
      JSON.stringify({ success: true, onesignal_id: osResult.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-push-notification:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
