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

    // Create Supabase client with service role (required for auth.admin)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

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

    const competition = nomineeData.competition
    const competitionName = `Most Eligible ${competition.city} ${competition.season}`

    // Build the redirect URL to the claim page with the invite token
    const redirectUrl = `${appUrl}/claim/${nomineeData.invite_token}`

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === nomineeData.email)

    let inviteResult

    if (existingUser) {
      // User already has an account - send a magic link instead
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: nomineeData.email,
        options: {
          redirectTo: redirectUrl,
        },
      })

      if (error) {
        console.error('Magic link error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to send magic link', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Send the magic link email using Supabase's built-in email
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: nomineeData.email,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            nomination_invite: true,
            nominee_name: nomineeData.name,
            competition_name: competitionName,
          },
        },
      })

      if (otpError) {
        console.error('OTP error:', otpError)
        return new Response(
          JSON.stringify({ error: 'Failed to send login email', details: otpError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      inviteResult = { method: 'magic_link' }
    } else {
      // New user - send invite email
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(nomineeData.email, {
        redirectTo: redirectUrl,
        data: {
          full_name: nomineeData.name,
          nomination_invite: true,
          nominee_id: nomineeData.id,
          competition_id: competition.id,
          competition_name: competitionName,
        },
      })

      if (error) {
        console.error('Invite error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to send invite', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      inviteResult = { method: 'invite', user_id: data.user?.id }
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
        sent_via: 'supabase_auth',
        ...inviteResult,
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
