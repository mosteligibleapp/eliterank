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
  type: 'nominee_invite' | 'nominator_confirm' | 'nominee_accepted' | 'nominee_declined' | 'nominee_welcome'
  to_email: string
  to_name?: string
  nominee_name?: string
  nominator_name?: string
  competition_name?: string
  city_name?: string
  claim_url?: string
  competition_url?: string
  reason?: string
  gender?: string | null
  nomination_end?: string | null
  nominee_email?: string
  // Welcome email fields
  host_name?: string
  org_name?: string
  welcome_message?: string
  // Optional sender overrides (e.g. host's name)
  from_name?: string
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
      // Gender-specific language
      const genderNoun = req.gender === 'female' ? 'women' : req.gender === 'male' ? 'men' : 'people'

      const nominatorLine = req.nominator_name
        ? `<p style="color:#ccc;font-size:15px;">Nominated by <strong>${req.nominator_name}</strong></p>`
        : `<p style="color:#ccc;font-size:15px;">Someone thinks you're one of the most eligible ${genderNoun} in ${req.city_name || 'the city'}!</p>`

      const reasonLine = req.reason
        ? `<div style="background:#1a1a1a;border-left:3px solid #d4a843;padding:12px 16px;margin:16px 0;border-radius:4px;">
            <p style="color:#999;font-size:12px;margin:0 0 4px;">Why you were nominated:</p>
            <p style="color:#eee;font-size:14px;margin:0;font-style:italic;">"${req.reason}"</p>
          </div>`
        : ''

      // Format deadline if available
      const deadlineLine = req.nomination_end
        ? (() => {
            const d = new Date(req.nomination_end)
            const formatted = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            return `Accept your nomination by <strong>${formatted}</strong> to be considered.`
          })()
        : 'Accept your nomination to be considered.'

      return {
        subject: `You've been nominated for ${req.competition_name || 'Most Eligible'}!`,
        body: wrapper(`
          <div style="text-align:center;">
            <h1 style="color:#d4a843;font-size:28px;margin:0 0 8px;">You've Been Nominated!</h1>
            <p style="color:#fff;font-size:18px;font-weight:bold;margin:8px 0;">${req.competition_name || 'Most Eligible'}</p>
            ${nominatorLine}
            ${reasonLine}
            <p style="color:#999;font-size:14px;margin-top:16px;">
              ${deadlineLine}
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
      const nomineeEmailLine = req.nominee_email
        ? `<p style="color:#999;font-size:13px;margin-top:4px;">We'll send the invite to <strong style="color:#ccc;">${req.nominee_email}</strong></p>`
        : ''

      return {
        subject: `Your nomination for ${req.competition_name || 'Most Eligible'} was submitted!`,
        body: wrapper(`
          <div style="text-align:center;">
            <h1 style="color:#d4a843;font-size:28px;margin:0 0 8px;">Nomination Submitted!</h1>
            <p style="color:#fff;font-size:18px;font-weight:bold;margin:8px 0;">${req.competition_name || 'Most Eligible'}</p>
            <p style="color:#ccc;font-size:15px;">
              You nominated <strong>${req.nominee_name || 'someone special'}</strong>.
            </p>
            ${nomineeEmailLine}
            <p style="color:#999;font-size:14px;margin-top:16px;">
              We'll reach out to them and let them know they've been nominated. We'll keep you updated on their status.
            </p>
            ${req.competition_url ? goldButton('View Competition', req.competition_url) : ''}
            <p style="color:#999;font-size:13px;margin-top:16px;">
              Share the competition page with your nominee so they know what's at stake!
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

    case 'nominee_welcome': {
      const hostLine = req.host_name
        ? `<p style="color:#ccc;font-size:15px;margin-top:16px;">— <strong>${req.host_name}</strong>${req.org_name ? `, ${req.org_name}` : ''}</p>`
        : ''

      const messageLine = req.welcome_message
        ? `<div style="background:#1a1a1a;border-left:3px solid #d4a843;padding:12px 16px;margin:16px 0;border-radius:4px;">
            <p style="color:#eee;font-size:14px;margin:0;line-height:1.5;">${req.welcome_message}</p>
          </div>`
        : ''

      return {
        subject: `Welcome to ${req.competition_name || 'the competition'}!`,
        body: wrapper(`
          <div style="text-align:center;">
            <h1 style="color:#d4a843;font-size:28px;margin:0 0 8px;">Welcome, ${req.nominee_name || 'Contestant'}!</h1>
            <p style="color:#fff;font-size:18px;font-weight:bold;margin:8px 0;">${req.competition_name || 'Most Eligible'}</p>
            <p style="color:#ccc;font-size:15px;margin-top:16px;">
              You've officially accepted your nomination — congratulations! Here's what happens next:
            </p>
            ${messageLine}
            <div style="text-align:left;margin:24px 0;padding:0 8px;">
              <div style="display:flex;align-items:flex-start;margin:12px 0;">
                <span style="color:#d4a843;font-weight:bold;margin-right:8px;">1.</span>
                <span style="color:#ccc;font-size:14px;"><strong style="color:#fff;">Build your card</strong> — Complete your profile with a photo and bio so voters can get to know you.</span>
              </div>
              <div style="display:flex;align-items:flex-start;margin:12px 0;">
                <span style="color:#d4a843;font-weight:bold;margin-right:8px;">2.</span>
                <span style="color:#ccc;font-size:14px;"><strong style="color:#fff;">Get approved</strong> — The host will review and approve your entry into the competition.</span>
              </div>
              <div style="display:flex;align-items:flex-start;margin:12px 0;">
                <span style="color:#d4a843;font-weight:bold;margin-right:8px;">3.</span>
                <span style="color:#ccc;font-size:14px;"><strong style="color:#fff;">Rally your votes</strong> — Once voting opens, share your card and get your friends to vote for you!</span>
              </div>
            </div>
            ${hostLine}
            ${req.competition_url ? goldButton('View Competition', req.competition_url) : ''}
            <p style="color:#999;font-size:13px;margin-top:16px;">
              Questions? Reply to this email and we'll help you out.
            </p>
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

/**
 * Ensure the email address has a OneSignal subscription and return its
 * subscription ID. Creates the user+subscription if it doesn't exist.
 */
async function ensureEmailSubscription(
  appId: string,
  apiKey: string,
  email: string,
): Promise<{ subscriptionId: string | null; error?: string }> {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Key ${apiKey}`,
  }

  // 1. Try to look up existing user by external_id (we use email as external_id)
  try {
    const lookupRes = await fetch(
      `https://api.onesignal.com/apps/${appId}/users/by/external_id/${encodeURIComponent(email)}`,
      { headers },
    )

    if (lookupRes.ok) {
      const userData = await lookupRes.json()
      const emailSub = userData?.subscriptions?.find(
        (s: { type?: string; token?: string }) =>
          s.type === 'Email' && s.token?.toLowerCase() === email.toLowerCase()
      )
      if (emailSub?.id) {
        console.log('Found existing OneSignal subscription:', emailSub.id)
        return { subscriptionId: emailSub.id }
      }
      // User exists but no email subscription — fall through to create one
      console.log('OneSignal user exists but no email subscription, will add one')
    }
  } catch (lookupErr) {
    console.warn('OneSignal user lookup failed:', lookupErr)
  }

  // 2. Create user with email subscription
  const createPayload = {
    properties: {
      tags: { source: 'eliterank' },
    },
    identity: {
      external_id: email,
    },
    subscriptions: [{
      type: 'Email',
      token: email,
      enabled: true,
    }],
  }

  try {
    const createRes = await fetch(`https://api.onesignal.com/apps/${appId}/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify(createPayload),
    })

    const createResult = await createRes.json()
    console.log('OneSignal user creation result:', JSON.stringify({
      status: createRes.status,
      hasSubscriptions: !!createResult?.subscriptions?.length,
    }))

    // Extract the email subscription ID from the response
    const emailSub = createResult?.subscriptions?.find(
      (s: { type?: string; token?: string }) =>
        s.type === 'Email' && s.token?.toLowerCase() === email.toLowerCase()
    )

    if (emailSub?.id) {
      console.log('Created OneSignal subscription:', emailSub.id)
      return { subscriptionId: emailSub.id }
    }

    // If creation returned 409 (conflict/already exists), try lookup again
    if (createRes.status === 409) {
      console.log('User already exists (409), retrying lookup...')
      const retryLookup = await fetch(
        `https://api.onesignal.com/apps/${appId}/users/by/external_id/${encodeURIComponent(email)}`,
        { headers },
      )
      if (retryLookup.ok) {
        const retryData = await retryLookup.json()
        const retrySub = retryData?.subscriptions?.find(
          (s: { type?: string; token?: string }) =>
            s.type === 'Email' && s.token?.toLowerCase() === email.toLowerCase()
        )
        if (retrySub?.id) {
          return { subscriptionId: retrySub.id }
        }
      }
    }

    return { subscriptionId: null, error: `No subscription ID in response: ${JSON.stringify(createResult)}` }
  } catch (createErr) {
    return { subscriptionId: null, error: String(createErr) }
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

    // Step 1: Ensure the recipient has a OneSignal email subscription.
    // This is critical — include_email_tokens silently fails for unknown
    // emails. By ensuring the subscription exists first and targeting by
    // subscription ID, we guarantee delivery.
    const { subscriptionId, error: subError } = await ensureEmailSubscription(
      appId,
      apiKey,
      body.to_email,
    )

    // Build the notification payload — prefer targeting by subscription ID
    // (guaranteed to work) with fallback to email token (works for existing
    // subscriptions that may have a different external_id).
    const oneSignalPayload: Record<string, unknown> = {
      app_id: appId,
      email_subject: subject,
      email_body: htmlBody,
      email_from_name: body.from_name || 'EliteRank',
      email_from_address: 'info@eliterank.co',
      data: {
        type: body.type,
        to_email: body.to_email,
      },
    }

    if (subscriptionId) {
      // Target by subscription ID — deterministic, no indexing delay
      oneSignalPayload.include_subscription_ids = [subscriptionId]
      console.log('Targeting by subscription ID:', subscriptionId)
    } else {
      // Fallback to email token if we couldn't get a subscription ID
      console.warn('No subscription ID available, falling back to include_email_tokens. Error:', subError)
      oneSignalPayload.include_email_tokens = [body.to_email]
    }

    console.log('Sending OneSignal email:', JSON.stringify({ subject, to: body.to_email, method: subscriptionId ? 'subscription_id' : 'email_token' }))

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
      errors: osResult?.errors,
    }))

    if (!osResponse.ok || osResult?.recipients === 0) {
      console.error('OneSignal send failed:', JSON.stringify(osResult))

      // If we used subscription_id and it still failed, try email_token as last resort
      if (subscriptionId) {
        console.log('Subscription ID send failed, retrying with email_token...')
        const fallbackPayload = {
          ...oneSignalPayload,
          include_email_tokens: [body.to_email],
        }
        delete fallbackPayload.include_subscription_ids

        const fallbackRes = await fetch('https://api.onesignal.com/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Key ${apiKey}`,
          },
          body: JSON.stringify(fallbackPayload),
        })

        const fallbackResult = await fallbackRes.json()
        console.log('Fallback email_token result:', JSON.stringify({
          status: fallbackRes.status,
          recipients: fallbackResult?.recipients,
          errors: fallbackResult?.errors,
        }))

        if (fallbackRes.ok && fallbackResult?.recipients > 0) {
          return new Response(
            JSON.stringify({ success: true, onesignal_id: fallbackResult.id, recipients: fallbackResult.recipients, method: 'email_token_fallback' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      return new Response(
        JSON.stringify({ error: 'OneSignal email delivery failed', details: osResult, subscription_id: subscriptionId }),
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
