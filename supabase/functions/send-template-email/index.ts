import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Recipient {
  id?: string
  email: string
  name: string
  type: 'nominee' | 'contestant' | 'custom'
  invite_token?: string
}

interface SendRequest {
  template_id?: string
  custom_subject?: string
  custom_body?: string
  recipients: Recipient[]
  competition_id?: string
  sender_id?: string
}

/**
 * Replace template placeholders with actual values.
 */
function interpolate(
  text: string,
  recipient: Recipient,
  competition?: { name?: string; city?: string; season?: number },
  appUrl?: string,
): string {
  let result = text
  result = result.replace(/\{\{name\}\}/g, recipient.name || 'there')
  result = result.replace(/\{\{email\}\}/g, recipient.email || '')
  if (competition) {
    result = result.replace(/\{\{competition_name\}\}/g, competition.name || '')
    result = result.replace(/\{\{city\}\}/g, competition.city || '')
    result = result.replace(/\{\{season\}\}/g, String(competition.season || ''))
  }
  if (recipient.invite_token && appUrl) {
    result = result.replace(/\{\{claim_link\}\}/g, `${appUrl}/claim/${recipient.invite_token}`)
  } else {
    result = result.replace(/\{\{claim_link\}\}/g, '')
  }
  return result
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: SendRequest = await req.json()
    const { template_id, custom_subject, custom_body, recipients, competition_id, sender_id } = body

    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No recipients provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const appUrl = Deno.env.get('APP_URL') || 'https://eliterank.co'
    const fromEmail = Deno.env.get('EMAIL_FROM') || 'EliteRank <noreply@eliterank.co>'

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Resolve subject/body from template or custom
    let subjectTemplate: string
    let bodyTemplate: string

    if (template_id) {
      const { data: template, error: tmplError } = await supabase
        .from('email_templates')
        .select('subject, body')
        .eq('id', template_id)
        .single()

      if (tmplError || !template) {
        return new Response(
          JSON.stringify({ error: 'Template not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      subjectTemplate = template.subject
      bodyTemplate = template.body
    } else if (custom_subject && custom_body) {
      subjectTemplate = custom_subject
      bodyTemplate = custom_body
    } else {
      return new Response(
        JSON.stringify({ error: 'Either template_id or custom_subject+custom_body required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Fetch competition data for placeholders
    let competition: { name?: string; city?: string; season?: number } | undefined
    if (competition_id) {
      const { data: comp } = await supabase
        .from('competitions')
        .select('id, season, city:cities(name)')
        .eq('id', competition_id)
        .single()

      if (comp) {
        const cityName = (comp.city as any)?.name || ''
        competition = {
          name: `Most Eligible ${cityName} ${comp.season}`,
          city: cityName,
          season: comp.season,
        }
      }
    }

    const results: { email: string; status: string; error?: string }[] = []

    for (const recipient of recipients) {
      const subject = interpolate(subjectTemplate, recipient, competition, appUrl)
      const textBody = interpolate(bodyTemplate, recipient, competition, appUrl)

      // Convert plain text body to simple HTML
      const htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1a1a2e; line-height: 1.6;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h2 style="color: #d4af37; margin: 0; font-size: 24px;">EliteRank</h2>
          </div>
          <div style="white-space: pre-wrap; font-size: 16px;">${textBody.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            Sent via EliteRank &bull; <a href="${appUrl}" style="color: #d4af37;">eliterank.co</a>
          </p>
        </div>
      `

      let sendStatus = 'sent'
      let errorMsg: string | undefined

      if (resendApiKey) {
        // Send via Resend API
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [recipient.email],
              subject,
              html: htmlBody,
              text: textBody,
            }),
          })

          if (!res.ok) {
            const errBody = await res.text()
            console.error('Resend API error:', errBody)
            sendStatus = 'failed'
            errorMsg = errBody
          }
        } catch (err) {
          console.error('Resend send error:', err)
          sendStatus = 'failed'
          errorMsg = (err as Error).message
        }
      } else {
        // Fallback: use Supabase Auth magic link (sends Supabase-branded email)
        // This works but with less control over the template
        try {
          const { error: otpError } = await supabase.auth.signInWithOtp({
            email: recipient.email,
            options: {
              shouldCreateUser: false,
              data: {
                email_template: true,
                subject,
              },
            },
          })
          if (otpError) {
            // If OTP fails (user doesn't exist), just log it; the email may not be deliverable via this method
            console.warn('OTP fallback failed for', recipient.email, otpError.message)
            sendStatus = 'failed'
            errorMsg = `No Resend API key configured. OTP fallback failed: ${otpError.message}`
          }
        } catch (err) {
          sendStatus = 'failed'
          errorMsg = (err as Error).message
        }
      }

      // Log the send
      await supabase.from('email_log').insert({
        template_id: template_id || null,
        competition_id: competition_id || null,
        recipient_type: recipient.type,
        recipient_id: recipient.id || null,
        recipient_email: recipient.email,
        recipient_name: recipient.name,
        subject,
        status: sendStatus,
        error_message: errorMsg || null,
        sent_by: sender_id || null,
      })

      results.push({
        email: recipient.email,
        status: sendStatus,
        ...(errorMsg ? { error: errorMsg } : {}),
      })
    }

    const successCount = results.filter((r) => r.status === 'sent').length
    const failCount = results.filter((r) => r.status === 'failed').length

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failCount,
        total: recipients.length,
        results,
        ...(resendApiKey ? {} : { warning: 'No RESEND_API_KEY configured. Set it in Supabase secrets for reliable email delivery.' }),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Error in send-template-email:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
