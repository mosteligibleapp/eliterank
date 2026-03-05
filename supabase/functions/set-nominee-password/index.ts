import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * set-nominee-password
 *
 * Sets a password for a nominee's auth account using the admin API.
 * Used when the auth user was auto-created by the invite system (signInWithOtp)
 * but the nominee arrives at the claim page without a session (e.g. opened the
 * claim link directly instead of via the magic link email).
 *
 * Accepts: { invite_token: string, password: string }
 * Returns: { success: true, user_id: string }
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { invite_token, password } = await req.json()

    if (!invite_token || !password) {
      return new Response(
        JSON.stringify({ error: 'invite_token and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Look up the nominee by invite_token
    const { data: nominee, error: fetchError } = await supabase
      .from('nominees')
      .select('id, email')
      .eq('invite_token', invite_token)
      .single()

    if (fetchError || !nominee?.email) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invite token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find the auth user by email
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
      filter: nominee.email,
      page: 1,
      perPage: 1,
    })

    // listUsers filter is a substring match — verify exact email
    const authUser = users?.find(
      (u: { email?: string }) => u.email?.toLowerCase() === nominee.email.toLowerCase()
    )

    if (listError || !authUser) {
      return new Response(
        JSON.stringify({ error: 'No account found for this nominee' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Set the password via admin API and confirm email (pre-created users
    // may have email_confirm: false if they never clicked the magic link)
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      authUser.id,
      { password, email_confirm: true }
    )

    if (updateError) {
      console.error('Failed to set password:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to set password' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, user_id: authUser.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in set-nominee-password:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
