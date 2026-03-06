import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
  nominator_email?: string
  nominator_anonymous: boolean
  competition: {
    id: string
    season: number
    nomination_end?: string
    city: { name: string } | null
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { nominee_id, force_resend } = body
    console.log('send-nomination-invite called with:', JSON.stringify(body))

    if (!nominee_id) {
      console.error('Missing nominee_id in request body')
      return new Response(
        JSON.stringify({ error: 'nominee_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const appUrl = Deno.env.get('APP_URL') || 'https://eliterank.co'

    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not set')
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Config:', { supabaseUrl, appUrl, hasServiceKey: !!supabaseServiceKey, hasResendKey: !!resendApiKey })

    // Create Supabase client with service role (required for auth.admin)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Fetch nominee with competition data
    console.log('Fetching nominee:', nominee_id)
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
        nominator_email,
        nominator_anonymous,
        invite_sent_at,
        competition:competitions(id, season, nomination_end, city:cities(name))
      `)
      .eq('id', nominee_id)
      .single()

    if (fetchError || !nominee) {
      console.error('Nominee query failed:', JSON.stringify({ fetchError, nominee_id, hasNominee: !!nominee }))
      return new Response(
        JSON.stringify({ error: 'Nominee not found', details: fetchError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found nominee:', JSON.stringify({ id: nominee.id, name: (nominee as any).name, email: (nominee as any).email }))

    // Build URLs for the nomination flow
    const nomineeDataPrelim = nominee as unknown as NomineeData
    const claimUrl = `${appUrl}/claim/${nomineeDataPrelim.invite_token}`

    // Check if already sent (unless force_resend is true)
    if (nominee.invite_sent_at && !force_resend) {
      return new Response(
        JSON.stringify({
          message: 'Invite already sent',
          sent_at: nominee.invite_sent_at,
          claim_url: claimUrl, // Include for manual sharing
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const nomineeData = nominee as unknown as NomineeData

    // Resolve the nominee's email: use the email on the nominee record,
    // or fall back to looking up their profile by phone/instagram when the
    // nominator only provided a phone number.
    let nomineeEmail = nomineeData.email || null

    if (!nomineeEmail && nomineeData.phone) {
      const { data: profileByPhone } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('phone', nomineeData.phone)
        .maybeSingle()

      if (profileByPhone?.email) {
        nomineeEmail = profileByPhone.email
        // Backfill the nominee record so future lookups don't need this fallback
        await supabase
          .from('nominees')
          .update({ email: profileByPhone.email })
          .eq('id', nomineeData.id)
      }
    }

    // Last resort: if nominator provided their email and it matches the
    // nominee (same person nominating themselves via the third-party form),
    // use the nominator_email as the nominee's email.
    if (!nomineeEmail && nomineeData.nominator_email) {
      nomineeEmail = nomineeData.nominator_email
      // Backfill so future lookups use the email directly
      await supabase
        .from('nominees')
        .update({ email: nomineeData.nominator_email })
        .eq('id', nomineeData.id)
      console.log('Using nominator_email as nominee email:', nomineeEmail)
    }

    if (!nomineeEmail) {
      return new Response(
        JSON.stringify({ error: 'Nominee does not have an email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const competition = nomineeData.competition
    const cityName = competition.city?.name || 'Unknown'
    const competitionName = `Most Eligible ${cityName} ${competition.season}`

    // Check if user already exists by querying profiles table
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .ilike('email', nomineeEmail)
      .maybeSingle()

    let existingUser = existingProfile
      ? { id: existingProfile.id, email: existingProfile.email }
      : null

    console.log('User lookup result:', JSON.stringify({ nomineeEmail, existingUser, hasProfile: !!existingProfile }))

    // Link nominee to existing user if not already linked
    if (existingUser) {
      const { error: linkError } = await supabase
        .from('nominees')
        .update({ user_id: existingUser.id })
        .eq('id', nominee_id)

      if (linkError) {
        console.warn('Failed to link nominee to existing user:', linkError.message)
      }
    }

    // Pre-create auth user if they don't exist yet.
    // This ensures the user, profile (via handle_new_user trigger), and
    // nominee linkage all exist before the nominee clicks the claim link.
    if (!existingUser) {
      console.log('Pre-creating auth user for:', nomineeEmail)
      const { data: newUserData, error: createError } = await supabase.auth.admin.createUser({
        email: nomineeEmail,
        email_confirm: true,
        user_metadata: {
          first_name: nomineeData.name.split(' ')[0] || '',
          last_name: nomineeData.name.split(' ').slice(1).join(' ') || '',
        },
      })

      if (createError) {
        console.warn('Pre-create user failed (may already exist):', createError.message)
      } else if (newUserData?.user) {
        existingUser = { id: newUserData.user.id, email: newUserData.user.email! }
        console.log('Created auth user:', existingUser.id)

        // Link nominee to the new user
        const { error: linkError } = await supabase
          .from('nominees')
          .update({ user_id: newUserData.user.id })
          .eq('id', nomineeData.id)

        if (linkError) {
          console.warn('Failed to link nominee to new user:', linkError.message)
        }
      }
    }

    // --- Send nomination email via Resend ---
    const firstName = nomineeData.name.split(' ')[0] || 'there'
    const nominatorLine = nomineeData.nominator_anonymous
      ? 'Someone'
      : (nomineeData.nominator_name || 'Someone')
    const reasonLine = nomineeData.nomination_reason
      ? `<p style="margin:0 0 24px;color:#a0a0a0;font-size:14px;font-style:italic;">"${nomineeData.nomination_reason}"</p>`
      : ''

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#131318;border:1px solid rgba(212,175,55,0.3);border-radius:16px;overflow:hidden;">

        <!-- Gold header bar -->
        <tr><td style="background:linear-gradient(135deg,#d4af37,#c9a227);padding:32px 32px 24px;text-align:center;">
          <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#0a0a0f;">EliteRank</h1>
          <p style="margin:0;font-size:13px;color:rgba(10,10,15,0.7);">${competitionName}</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#ffffff;">
            You've been nominated!
          </h2>
          <p style="margin:0 0 8px;color:#d0d0d0;font-size:15px;line-height:1.6;">
            Hey ${firstName}, ${nominatorLine} nominated you for <strong style="color:#d4af37;">${competitionName}</strong>.
          </p>
          ${reasonLine}
          <p style="margin:0 0 28px;color:#d0d0d0;font-size:15px;line-height:1.6;">
            Accept your nomination to build your card and get in the running.
          </p>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${claimUrl}" style="display:inline-block;background:linear-gradient(135deg,#d4af37,#c9a227);color:#0a0a0f;font-size:16px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:10px;">
                Accept Nomination
              </a>
            </td></tr>
          </table>

          <p style="margin:24px 0 0;color:#707070;font-size:13px;line-height:1.5;text-align:center;">
            Or copy this link:<br/>
            <a href="${claimUrl}" style="color:#d4af37;word-break:break-all;">${claimUrl}</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
          <p style="margin:0;color:#505050;font-size:12px;">
            &copy; ${new Date().getFullYear()} EliteRank &middot; <a href="${appUrl}" style="color:#707070;text-decoration:none;">eliterank.co</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    console.log('Sending nomination email via Resend to:', nomineeEmail)
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'EliteRank <onboarding@resend.dev>',
        to: [nomineeEmail],
        subject: `You've been nominated for ${competitionName}!`,
        html: emailHtml,
      }),
    })

    const resendResult = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error('Resend API error:', JSON.stringify(resendResult))
      return new Response(
        JSON.stringify({ error: 'Failed to send nomination email', details: resendResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Resend email sent:', JSON.stringify(resendResult))

    // Create in-app notification if user already has an account
    if (existingUser) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: existingUser.id,
          type: 'nominated',
          title: "You've been nominated!",
          body: `Someone nominated you for ${competitionName}`,
          competition_id: competition.id,
          action_url: `/claim/${nomineeData.invite_token}`,
          metadata: {
            nominator_name: nomineeData.nominator_anonymous ? null : nomineeData.nominator_name,
            nomination_reason: nomineeData.nomination_reason,
          },
        })

      if (notifError) {
        console.error('Failed to create nomination notification:', notifError)
      }
    }

    // Update nominee with invite_sent_at
    const { error: updateError } = await supabase
      .from('nominees')
      .update({ invite_sent_at: new Date().toISOString() })
      .eq('id', nominee_id)

    if (updateError) {
      console.error('Failed to update invite_sent_at:', updateError)
    }

    console.log('send-nomination-invite completed successfully:', JSON.stringify({
      nominee_id,
      nomineeEmail,
      resend_id: resendResult.id,
      claim_url: claimUrl,
    }))

    return new Response(
      JSON.stringify({
        success: true,
        sent_via: 'resend',
        resend_id: resendResult.id,
        nominee_id: nominee_id,
        claim_url: claimUrl,
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
