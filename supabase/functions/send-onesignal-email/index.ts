import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * send-onesignal-email — Sends branded transactional emails via OneSignal.
 *
 * Supports multiple email types:
 *   - nominee_invite:       Branded "You've been nominated!" email to the nominee
 *   - nominator_confirm:    "Your nomination was submitted" confirmation to the nominator
 *   - nominee_accepted:     "Your nominee accepted!" notification to the nominator
 *   - nominee_declined:     "Your nominee declined" notification to the nominator
 *
 * Required Supabase secrets:
 *   ONESIGNAL_APP_ID     — OneSignal App ID
 *   ONESIGNAL_API_KEY    — OneSignal REST API Key
 *   APP_URL              — e.g. https://eliterank.co
 */

interface EmailRequest {
  type: 'nominee_invite' | 'nominator_confirm' | 'nominee_accepted' | 'nominee_declined'
  to_email: string
  to_name?: string
  nominee_name?: string
  nominator_name?: string
  competition_name?: string
  city_name?: string
  claim_url?: string
  competition_url?: string
  reason?: string
}

// HTML email templates
function getEmailContent(req: EmailRequest): { subject: string; body: string } {
  const appUrl = Deno.env.get('APP_URL') || 'https://eliterank.co'

  const header = `
    <div style="text-align:center;padding:32px 0 16px;">
      <span style="font-size:12px;letter-spacing:0.3em;color:#999;font-family:Arial,sans-serif;">ELITERANK</span>
    </div>
  `

  const footer = `
    <div style="text-align:center;padding:24px 0;border-top:1px solid #333;margin-top:32px;">
      <a href="${appUrl}" style="color:#d4a843;font-size:12px;text-decoration:none;font-family:Arial,sans-serif;">eliterank.co</a>
      <p style="color:#666;font-size:11px;margin-top:8px;font-family:Arial,sans-serif;">
        You're receiving this because of activity on EliteRank.
      </p>
    </div>
  `

  const goldButton = (text: string, url: string) => `
    <div style="text-align:center;margin:24px 0;">
      <a href="${url}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#d4a843,#f4d03f);color:#000;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;font-family:Arial,sans-serif;">
        ${text}
      </a>
    </div>
  `

  const wrapper = (content: string) => `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#0a0a0a;color:#fff;">
      <div style="max-width:480px;margin:0 auto;padding:16px;font-family:Arial,Helvetica,sans-serif;">
        ${header}
        ${content}
        ${footer}
      </div>
    </body>
    </html>
  `

  switch (req.type) {
    case 'nominee_invite': {
      const nominatorLine = req.nominator_name
        ? `<p style="color:#ccc;font-size:15px;">Nominated by <strong>${req.nominator_name}</strong></p>`
        : `<p style="color:#ccc;font-size:15px;">Someone thinks you're one of the most eligible people in ${req.city_name || 'the city'}!</p>`

      const reasonLine = req.reason
        ? `<div style="background:#1a1a1a;border-left:3px solid #d4a843;padding:12px 16px;margin:16px 0;border-radius:4px;">
            <p style="color:#999;font-size:12px;margin:0 0 4px;">Why you were nominated:</p>
            <p style="color:#eee;font-size:14px;margin:0;font-style:italic;">"${req.reason}"</p>
          </div>`
        : ''

      return {
        subject: `You've been nominated for ${req.competition_name || 'Most Eligible'}!`,
        body: wrapper(`
          <div style="text-align:center;">
            <h1 style="color:#d4a843;font-size:28px;margin:0 0 8px;">You've Been Nominated!</h1>
            <p style="color:#fff;font-size:18px;font-weight:bold;margin:8px 0;">${req.competition_name || 'Most Eligible'}</p>
            ${nominatorLine}
            ${reasonLine}
            <p style="color:#999;font-size:14px;margin-top:16px;">
              Accept your nomination to build your card and enter the competition.
            </p>
            ${goldButton('Accept Your Nomination', req.claim_url || appUrl)}
            <p style="color:#666;font-size:12px;">
              Not interested? Simply ignore this email.
            </p>
          </div>
        `),
      }
    }

    case 'nominator_confirm': {
      return {
        subject: `Your nomination for ${req.competition_name || 'Most Eligible'} was submitted!`,
        body: wrapper(`
          <div style="text-align:center;">
            <h1 style="color:#d4a843;font-size:28px;margin:0 0 8px;">Nomination Submitted!</h1>
            <p style="color:#fff;font-size:18px;font-weight:bold;margin:8px 0;">${req.competition_name || 'Most Eligible'}</p>
            <p style="color:#ccc;font-size:15px;">
              You nominated <strong>${req.nominee_name || 'someone special'}</strong>.
            </p>
            <p style="color:#999;font-size:14px;margin-top:16px;">
              We'll reach out to them and let them know they've been nominated. We'll keep you updated on their status.
            </p>
            ${req.competition_url ? goldButton('View Competition', req.competition_url) : ''}
            <p style="color:#999;font-size:13px;margin-top:16px;">
              Know someone else who should enter? Share the competition page with them!
            </p>
          </div>
        `),
      }
    }

    case 'nominee_accepted': {
      return {
        subject: `${req.nominee_name || 'Your nominee'} accepted their nomination!`,
        body: wrapper(`
          <div style="text-align:center;">
            <h1 style="color:#d4a843;font-size:28px;margin:0 0 8px;">They're In!</h1>
            <p style="color:#fff;font-size:18px;font-weight:bold;margin:8px 0;">${req.competition_name || 'Most Eligible'}</p>
            <p style="color:#ccc;font-size:15px;">
              <strong>${req.nominee_name || 'Your nominee'}</strong> accepted their nomination and is now a contestant!
            </p>
            <p style="color:#999;font-size:14px;margin-top:16px;">
              Thanks for nominating them. When voting opens, make sure to cast your votes!
            </p>
            ${req.competition_url ? goldButton('View Competition', req.competition_url) : ''}
          </div>
        `),
      }
    }

    case 'nominee_declined': {
      return {
        subject: `Update on your nomination for ${req.competition_name || 'Most Eligible'}`,
        body: wrapper(`
          <div style="text-align:center;">
            <h1 style="color:#999;font-size:28px;margin:0 0 8px;">Nomination Update</h1>
            <p style="color:#fff;font-size:18px;font-weight:bold;margin:8px 0;">${req.competition_name || 'Most Eligible'}</p>
            <p style="color:#ccc;font-size:15px;">
              Unfortunately, <strong>${req.nominee_name || 'your nominee'}</strong> has decided not to enter the competition at this time.
            </p>
            <p style="color:#999;font-size:14px;margin-top:16px;">
              Know someone else who'd be a great fit? You can still nominate more people!
            </p>
            ${req.competition_url ? goldButton('Nominate Someone Else', req.competition_url) : ''}
          </div>
        `),
      }
    }

    default:
      return {
        subject: 'EliteRank Notification',
        body: wrapper(`<p style="text-align:center;color:#ccc;">You have a new notification from EliteRank.</p>`),
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

    if (!appId || !apiKey) {
      console.error('OneSignal credentials not configured')
      return new Response(
        JSON.stringify({ error: 'Email service not configured', details: 'Missing ONESIGNAL_APP_ID or ONESIGNAL_API_KEY' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: EmailRequest = await req.json()
    console.log('send-onesignal-email called:', JSON.stringify({ type: body.type, to_email: body.to_email }))

    if (!body.to_email || !body.type) {
      return new Response(
        JSON.stringify({ error: 'to_email and type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { subject, body: htmlBody } = getEmailContent(body)

    // OneSignal Create Notification (Email channel)
    // https://documentation.onesignal.com/reference/create-notification
    const oneSignalPayload = {
      app_id: appId,
      // Target by email address using include_email_tokens
      include_email_tokens: [body.to_email],
      // Email content
      email_subject: subject,
      email_body: htmlBody,
      email_from_name: 'EliteRank',
      email_from_address: 'info@eliterank.co',
      // Custom data for tracking
      data: {
        type: body.type,
        to_email: body.to_email,
      },
    }

    console.log('Sending OneSignal email:', JSON.stringify({ subject, to: body.to_email }))

    const osResponse = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`,
      },
      body: JSON.stringify(oneSignalPayload),
    })

    const osResult = await osResponse.json()
    console.log('OneSignal API response:', JSON.stringify({
      status: osResponse.status,
      id: osResult?.id,
      recipients: osResult?.recipients,
      external_id: osResult?.external_id,
      errors: osResult?.errors,
    }))

    if (!osResponse.ok || osResult?.recipients === 0) {
      console.error('OneSignal API error or 0 recipients:', JSON.stringify(osResult))

      // If OneSignal fails because the email isn't subscribed, try creating the
      // email subscription first and then retry.
      if (osResult?.errors?.includes?.('All included players are not subscribed') ||
          JSON.stringify(osResult).includes('not subscribed') ||
          osResult?.recipients === 0) {
        console.log('Email not subscribed, creating subscription and retrying...')

        // Create email subscription via OneSignal API
        const subPayload = {
          properties: {
            tags: { type: body.type },
          },
          identity: {
            external_id: body.to_email,
          },
          subscriptions: [{
            type: 'Email',
            token: body.to_email,
            enabled: true,
          }],
        }

        const subResponse = await fetch(`https://api.onesignal.com/apps/${appId}/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Key ${apiKey}`,
          },
          body: JSON.stringify(subPayload),
        })

        const subResult = await subResponse.json()
        console.log('Subscription creation result:', JSON.stringify(subResult))

        // Wait for OneSignal to propagate the new subscription before retrying.
        // Without this delay the retry often hits a race condition where the
        // subscription hasn't been indexed yet.
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Retry sending the email
        const retryResponse = await fetch('https://api.onesignal.com/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Key ${apiKey}`,
          },
          body: JSON.stringify(oneSignalPayload),
        })

        const retryResult = await retryResponse.json()
        if (!retryResponse.ok || retryResult?.recipients === 0) {
          console.error('OneSignal retry failed:', JSON.stringify(retryResult))
          return new Response(
            JSON.stringify({
              error: 'Failed to send email after retry',
              details: retryResult,
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('OneSignal email sent on retry:', JSON.stringify(retryResult))
        return new Response(
          JSON.stringify({ success: true, onesignal_id: retryResult.id, retried: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ error: 'OneSignal API error', details: osResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('OneSignal email sent successfully:', JSON.stringify({ id: osResult.id, recipients: osResult.recipients }))

    return new Response(
      JSON.stringify({ success: true, onesignal_id: osResult.id, recipients: osResult.recipients }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-onesignal-email:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
