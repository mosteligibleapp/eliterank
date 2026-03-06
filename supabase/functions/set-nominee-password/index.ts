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
 * Accepts: { invite_token: string, password: string, email?: string }
 * Returns: { success: true, user_id: string }
 *
 * The optional email param is used when the nominee record doesn't have an
 * email yet (e.g. phone-only nomination where the nominee entered their email
 * during the claim flow but RLS prevented saving it).
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { invite_token, password, email: clientEmail } = await req.json()

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
    console.log('Looking up nominee by invite_token')
    const { data: nominee, error: fetchError } = await supabase
      .from('nominees')
      .select('id, email, user_id')
      .eq('invite_token', invite_token)
      .single()

    if (fetchError || !nominee) {
      console.error('Nominee lookup failed:', fetchError?.message, fetchError?.code)
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invite token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found nominee:', JSON.stringify({ id: nominee.id, email: nominee.email, user_id: nominee.user_id }))

    // Use the email from the client if the nominee record doesn't have one
    // (happens when RLS blocks the persistProgress update for unauthenticated users)
    const nomineeEmail = nominee.email || clientEmail?.trim() || null

    // Backfill the email on the nominee record if it was missing
    if (!nominee.email && nomineeEmail) {
      await supabase
        .from('nominees')
        .update({ email: nomineeEmail })
        .eq('id', nominee.id)
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

    // Fallback 1: look up via profiles table (reliable exact-match on email)
    if (!authUser && nomineeEmail) {
      console.log('Trying profile lookup for:', nomineeEmail)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', nomineeEmail)
        .single()

      if (profile?.id) {
        const { data: userData, error: getUserError } = await supabase.auth.admin.getUserById(
          profile.id
        )
        if (!getUserError && userData?.user) {
          authUser = userData.user
          console.log('Found auth user via profile lookup:', authUser.id)

          // Backfill user_id on nominee if it was missing
          if (!nominee.user_id) {
            await supabase
              .from('nominees')
              .update({ user_id: authUser.id })
              .eq('id', nominee.id)
          }
        }
      }
    }

    // Fallback 2: search auth users by email (fuzzy filter — less reliable)
    if (!authUser && nomineeEmail) {
      const listResult = await supabase.auth.admin.listUsers({
        filter: nomineeEmail,
        page: 1,
        perPage: 50,
      })

      if (listResult.error) {
        console.warn('listUsers failed:', listResult.error.message)
      } else if (listResult.data?.users?.length) {
        authUser = listResult.data.users.find(
          (u: { email?: string }) => u.email?.toLowerCase() === nomineeEmail!.toLowerCase()
        ) || null
        if (authUser) {
          console.log('Found auth user via listUsers:', authUser.id)
        }
      }
    }

    // Last resort: create the auth user if no lookup found one
    if (!authUser && nomineeEmail) {
      console.log('No auth user found, creating one for:', nomineeEmail)
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: nomineeEmail,
        password,
        email_confirm: true,
      })

      if (createError) {
        // If creation failed because user already exists, try one more lookup.
        // This handles race conditions and cases where listUsers filter missed them.
        console.warn('createUser failed, attempting final lookup:', createError.message)

        const retryList = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
        if (!retryList.error && retryList.data?.users?.length) {
          authUser = retryList.data.users.find(
            (u: { email?: string }) => u.email?.toLowerCase() === nomineeEmail!.toLowerCase()
          ) || null
        }

        if (!authUser) {
          console.error('Failed to create or find auth user:', createError)
          return new Response(
            JSON.stringify({ error: 'Failed to create account. Please try again.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        console.log('Found existing auth user after createUser failed:', authUser.id)
      } else if (newUser?.user) {
        // Link nominee to the new user
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
        JSON.stringify({ error: nomineeEmail ? 'Failed to find or create account' : 'No email address available to create an account' }),
        { status: nomineeEmail ? 500 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Backfill user_id on nominee if it was missing
    if (!nominee.user_id) {
      await supabase
        .from('nominees')
        .update({ user_id: authUser.id })
        .eq('id', nominee.id)
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
