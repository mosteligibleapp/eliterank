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
      .select('id, email, user_id')
      .eq('invite_token', invite_token)
      .single()

    if (fetchError || !nominee) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invite token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find the auth user — prefer direct lookup via user_id (set by
    // send-nomination-invite when it pre-creates the auth user), fall back to
    // email search if user_id is not available.
    let authUser: { id: string; email?: string } | null = null

    if (nominee.user_id) {
      const { data: userData, error: getUserError } = await supabase.auth.admin.getUserById(
        nominee.user_id
      )
      if (!getUserError && userData?.user) {
        authUser = userData.user
      } else {
        console.warn('getUserById failed for user_id:', nominee.user_id, getUserError?.message)
      }
    }

    // Fallback: search by email if direct lookup didn't work
    if (!authUser && nominee.email) {
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
        filter: nominee.email,
        page: 1,
        perPage: 50,
      })

      if (!listError && users?.length) {
        authUser = users.find(
          (u: { email?: string }) => u.email?.toLowerCase() === nominee.email.toLowerCase()
        ) || null
      }
    }

    // Last resort: create the auth user if neither lookup found one
    if (!authUser && nominee.email) {
      console.log('No auth user found, creating one for:', nominee.email)
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: nominee.email,
        password,
        email_confirm: true,
      })

      if (createError) {
        console.error('Failed to create auth user:', createError)
        return new Response(
          JSON.stringify({ error: 'Failed to create account. Please try again.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Link nominee to the new user
      if (newUser?.user) {
        await supabase
          .from('nominees')
          .update({ user_id: newUser.user.id })
          .eq('id', nominee.id)

        return new Response(
          JSON.stringify({ success: true, user_id: newUser.user.id }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (!authUser) {
      return new Response(
        JSON.stringify({ error: 'No account found for this nominee and no email to create one' }),
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
