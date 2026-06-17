import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Channel mapping per trigger type.
 * Defines which channels each notification trigger should use.
 * User preferences are checked on top of this — if a user disabled push,
 * they won't get push even if the trigger supports it.
 */
const TRIGGER_CHANNELS: Record<string, { push: boolean; email: boolean; sms: boolean }> = {
  vote_received:      { push: true,  email: false, sms: false },
  contestant_added:   { push: true,  email: true,  sms: true  },
  round_advanced:     { push: true,  email: true,  sms: true  },
  nominated:          { push: true,  email: true,  sms: false },
  voting_opened:      { push: true,  email: true,  sms: true  },
  voting_closing:     { push: true,  email: true,  sms: true  },
  event_reminder:     { push: true,  email: true,  sms: false },
  voting_receipt:     { push: true,  email: true,  sms: false },
  nomination_receipt: { push: true,  email: true,  sms: false },
  reward_available:   { push: true,  email: true,  sms: false },
  winner:             { push: true,  email: true,  sms: true  },
}

// Default: push only
const DEFAULT_CHANNELS = { push: true, email: false, sms: false }

interface NotificationPreferences {
  push_enabled: boolean
  email_enabled: boolean
  sms_enabled: boolean
  sms_consent_at: string | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, trigger_type, title, body, data } = await req.json()

    if (!user_id || !trigger_type) {
      return new Response(
        JSON.stringify({ error: 'user_id and trigger_type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const onesignalAppId = Deno.env.get('ONESIGNAL_APP_ID')
    const onesignalApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY')

    if (!onesignalAppId || !onesignalApiKey) {
      console.error('send-notification: Missing ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY')
      return new Response(
        JSON.stringify({ error: 'OneSignal not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Look up user's notification preferences and email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, phone, notification_preferences')
      .eq('id', user_id)
      .maybeSingle()

    if (profileError || !profile) {
      console.error('send-notification: Profile not found', { user_id, profileError })
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const prefs: NotificationPreferences = profile.notification_preferences || {
      push_enabled: true,
      email_enabled: true,
      sms_enabled: false,
      sms_consent_at: null,
    }

    const triggerChannels = TRIGGER_CHANNELS[trigger_type] || DEFAULT_CHANNELS

    // Determine which channels to actually use (trigger supports + user enabled)
    const sendPush = triggerChannels.push && prefs.push_enabled
    const sendEmail = triggerChannels.email && prefs.email_enabled && !!profile.email
    const sendSms = triggerChannels.sms && prefs.sms_enabled && !!profile.phone && !!prefs.sms_consent_at

    if (!sendPush && !sendEmail && !sendSms) {
      console.log('send-notification: No channels enabled for', { user_id, trigger_type })
      return new Response(
        JSON.stringify({ sent: false, reason: 'No enabled channels for this trigger' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build OneSignal notification payload
    // Uses external_id targeting (user_id = auth.uid = OneSignal external_id)
    const notifPayload: Record<string, unknown> = {
      app_id: onesignalAppId,
      include_aliases: { external_id: [user_id] },
      target_channel: 'push', // Default channel
      contents: { en: body || `You have a new notification` },
      headings: { en: title || 'EliteRank' },
      data: data || {},
    }

    // Send push notification
    const results: string[] = []

    if (sendPush) {
      const pushPayload = {
        ...notifPayload,
        target_channel: 'push',
      }

      const pushRes = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${onesignalApiKey}`,
        },
        body: JSON.stringify(pushPayload),
      })

      const pushData = await pushRes.json()
      console.log('OneSignal push response:', JSON.stringify(pushData))
      results.push('push')
    }

    // Send email notification
    if (sendEmail) {
      const emailPayload = {
        app_id: onesignalAppId,
        include_aliases: { external_id: [user_id] },
        target_channel: 'email',
        email_subject: title || 'EliteRank Notification',
        email_body: buildEmailHtml(title || 'EliteRank', body || ''),
      }

      const emailRes = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${onesignalApiKey}`,
        },
        body: JSON.stringify(emailPayload),
      })

      const emailData = await emailRes.json()
      console.log('OneSignal email response:', JSON.stringify(emailData))
      results.push('email')
    }

    // Send SMS notification
    if (sendSms) {
      const smsPayload = {
        app_id: onesignalAppId,
        include_aliases: { external_id: [user_id] },
        target_channel: 'sms',
        contents: { en: `${title}: ${body}` },
        name: `sms_${trigger_type}_${user_id.slice(0, 8)}`,
      }

      const smsRes = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${onesignalApiKey}`,
        },
        body: JSON.stringify(smsPayload),
      })

      const smsData = await smsRes.json()
      console.log('OneSignal SMS response:', JSON.stringify(smsData))
      results.push('sms')
    }

    return new Response(
      JSON.stringify({ sent: true, channels: results, trigger_type, user_id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('send-notification error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Build a simple branded HTML email body.
 */
function buildEmailHtml(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0c;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1c1c1f;border-radius:16px;border:1px solid #2a2a2e;">
        <tr><td style="padding:32px 32px 24px;text-align:center;">
          <h1 style="color:#d4af37;font-size:24px;margin:0 0 8px;">EliteRank</h1>
        </td></tr>
        <tr><td style="padding:0 32px 24px;">
          <h2 style="color:#ffffff;font-size:20px;margin:0 0 12px;">${escapeHtml(title)}</h2>
          <p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0;">${escapeHtml(body)}</p>
        </td></tr>
        <tr><td style="padding:24px 32px;text-align:center;border-top:1px solid #2a2a2e;">
          <a href="https://eliterank.co" style="display:inline-block;background:#d4af37;color:#0a0a0c;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">Open EliteRank</a>
        </td></tr>
        <tr><td style="padding:16px 32px 24px;text-align:center;">
          <p style="color:#52525b;font-size:12px;margin:0;">You received this because you have email notifications enabled on EliteRank.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
