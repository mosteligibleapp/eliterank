import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NomineeData {
  id: string
  name: string
  email?: string
  phone?: string
  invite_token: string
  nomination_reason?: string
  nominator_name?: string
  nominator_anonymous: boolean
  competition: {
    id: string
    city: string
    season: number
    nomination_end?: string
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { nominee_id, force_resend } = await req.json()

    if (!nominee_id) {
      return new Response(
        JSON.stringify({ error: 'nominee_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const appUrl = Deno.env.get('APP_URL') || 'https://eliterank.co'

    // SMTP Configuration (uses Supabase SMTP settings)
    const smtpHost = Deno.env.get('SMTP_HOST')
    const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '587')
    const smtpUser = Deno.env.get('SMTP_USER')
    const smtpPass = Deno.env.get('SMTP_PASS')
    const smtpFrom = Deno.env.get('SMTP_FROM') || 'info@eliterank.co'
    const smtpFromName = Deno.env.get('SMTP_FROM_NAME') || 'EliteRank'

    if (!smtpHost || !smtpUser || !smtpPass) {
      return new Response(
        JSON.stringify({ error: 'SMTP not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch nominee with competition data
    const { data: nominee, error: fetchError } = await supabase
      .from('nominees')
      .select(`
        id,
        name,
        email,
        phone,
        invite_token,
        nomination_reason,
        nominator_name,
        nominator_anonymous,
        invite_sent_at,
        competition:competitions(id, city, season, nomination_end)
      `)
      .eq('id', nominee_id)
      .single()

    if (fetchError || !nominee) {
      return new Response(
        JSON.stringify({ error: 'Nominee not found', details: fetchError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if already sent (unless force_resend is true)
    if (nominee.invite_sent_at && !force_resend) {
      return new Response(
        JSON.stringify({ message: 'Invite already sent', sent_at: nominee.invite_sent_at }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const nomineeData = nominee as unknown as NomineeData

    // Must have email to send invite
    if (!nomineeData.email) {
      return new Response(
        JSON.stringify({ error: 'Nominee does not have an email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const claimUrl = `${appUrl}/claim/${nomineeData.invite_token}`
    const competition = nomineeData.competition
    const competitionName = `Most Eligible ${competition.city} ${competition.season}`

    // Build nominator attribution
    const nominatorText = nomineeData.nominator_anonymous
      ? 'Someone'
      : (nomineeData.nominator_name || 'Someone')

    // Create SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: smtpPort === 465,
        auth: {
          username: smtpUser,
          password: smtpPass,
        },
      },
    })

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 480px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1a2e, #0a0a0f); border: 1px solid #2a2a3e; border-radius: 16px; overflow: hidden;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05)); padding: 32px; text-align: center; border-bottom: 1px solid #2a2a3e;">
        <div style="font-size: 48px; margin-bottom: 16px;">👑</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">You've Been Nominated!</h1>
        <p style="margin: 8px 0 0; color: #d4af37; font-size: 16px;">${competitionName}</p>
      </div>

      <!-- Content -->
      <div style="padding: 32px;">
        <p style="color: #9ca3af; font-size: 14px; margin: 0 0 8px;">
          ${nominatorText} thinks you're Most Eligible material
        </p>
        ${nomineeData.nomination_reason ? `
        <div style="background: #1a1a2e; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="color: #ffffff; font-size: 16px; font-style: italic; margin: 0; line-height: 1.5;">
            "${nomineeData.nomination_reason}"
          </p>
        </div>
        ` : ''}

        <a href="${claimUrl}" style="display: block; background: linear-gradient(135deg, #d4af37, #f4d03f); color: #0a0a0f; text-decoration: none; padding: 16px 24px; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; margin-bottom: 24px;">
          Claim My Spot →
        </a>

        <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
          Not interested? Simply ignore this email.
        </p>
      </div>
    </div>

    <p style="color: #4b5563; font-size: 11px; text-align: center; margin-top: 24px;">
      © ${new Date().getFullYear()} EliteRank. All rights reserved.
    </p>
  </div>
</body>
</html>
    `

    try {
      // Send email via SMTP
      await client.send({
        from: `${smtpFromName} <${smtpFrom}>`,
        to: nomineeData.email,
        subject: `👑 You've been nominated for ${competitionName}!`,
        html: emailHtml,
      })

      await client.close()
    } catch (smtpError) {
      console.error('SMTP error:', smtpError)
      return new Response(
        JSON.stringify({ error: 'Failed to send email via SMTP', details: String(smtpError) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update nominee with invite_sent_at
    const { error: updateError } = await supabase
      .from('nominees')
      .update({ invite_sent_at: new Date().toISOString() })
      .eq('id', nominee_id)

    if (updateError) {
      console.error('Failed to update invite_sent_at:', updateError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent_via: 'email',
        nominee_id: nominee_id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-nomination-invite:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
