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
    const appUrl = Deno.env.get('APP_URL') || 'https://eliterank.co'

    console.log('Config:', { supabaseUrl, appUrl, hasServiceKey: !!supabaseServiceKey })

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
    // Redirect directly to the claim page after auth so the nominee
    // lands on accept/decline immediately. Requires adding
    // https://eliterank.co/claim/** to Supabase's redirect allowlist.
    const authRedirectUrl = claimUrl

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
    // (profiles.id references auth.users.id and email is unique)
    // Note: listUsers() only returns the first page (~50 users) so it
    // silently missed existing users once the user-base grew.
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', nomineeEmail)
      .maybeSingle()

    const existingUser = existingProfile
      ? { id: existingProfile.id, email: existingProfile.email }
      : null

    console.log('User lookup result:', JSON.stringify({ nomineeEmail, existingUser, hasProfile: !!existingProfile }))

    let inviteResult

    // Helper: send a magic link to an existing user
    const sendMagicLink = async () => {
      console.log('Sending magic link to:', nomineeEmail, 'redirectTo:', authRedirectUrl)
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: nomineeEmail,
        options: {
          emailRedirectTo: authRedirectUrl,
          data: {
            nomination_invite: true,
            nominee_name: nomineeData.name,
            competition_name: competitionName,
          },
        },
      })
      if (otpError) {
        console.error('signInWithOtp failed:', JSON.stringify(otpError))
        throw otpError
      }
      console.log('Magic link sent successfully to:', nomineeEmail)
      return { method: 'magic_link' }
    }

    // Always send a magic link — works for both existing and new users.
    // Previously we used admin.inviteUserByEmail() for new users, but that
    // sends Supabase's generic "You have been invited to create a user"
    // email instead of the nomination-branded magic link template.
    // signInWithOtp() will auto-create the auth user if they don't exist.
    try {
      inviteResult = await sendMagicLink()
    } catch (otpError) {
      console.error('Magic link failed:', otpError)
      return new Response(
        JSON.stringify({ error: 'Failed to send nomination email', details: (otpError as Error).message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
      ...inviteResult,
      claim_url: claimUrl,
    }))

    return new Response(
      JSON.stringify({
        success: true,
        sent_via: 'supabase_auth',
        ...inviteResult,
        nominee_id: nominee_id,
        claim_url: claimUrl, // Direct link for manual sharing if email fails
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
