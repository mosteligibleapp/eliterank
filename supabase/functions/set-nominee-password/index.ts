import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * set-nominee-password
 *
 * Creates or finds an auth user for a nominee and sets their password.
 * Used in the nominee claim flow when:
 * - Phone nominees who never got a magic link
 * - Email nominees who opened the claim link directly (not via magic link)
 * - Any nominee without an active session at password step
 *
 * This uses the admin API which bypasses the handle_new_user trigger issues
 * and gives us full control over user creation and password setting.
 *
 * Accepts: { invite_token: string, password: string, email?: string }
 * Returns: { success: true, user_id: string } on success
 *
 * The optional email param is used when the nominee record doesn't have an
 * email yet (e.g. phone-only nomination where the nominee entered their email
 * during the claim flow).
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
      .select('id, email, phone, name, user_id, status, flow_stage')
      .eq('invite_token', invite_token)
      .single()

    if (fetchError || !nominee) {
      console.error('Nominee lookup failed:', fetchError?.message, fetchError?.code)
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invite token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found nominee:', JSON.stringify({ 
      id: nominee.id, 
      email: nominee.email, 
      phone: nominee.phone,
      user_id: nominee.user_id,
      status: nominee.status,
      flow_stage: nominee.flow_stage
    }))

    // Use the email from the client if the nominee record doesn't have one
    // (happens for phone-only nominations or when RLS blocks updates)
    const nomineeEmail = nominee.email || clientEmail?.trim() || null

    if (!nomineeEmail) {
      return new Response(
        JSON.stringify({ error: 'Email address is required to create an account. Please go back and enter your email.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Backfill the email on the nominee record if it was missing
    if (!nominee.email && nomineeEmail) {
      console.log('Backfilling email on nominee record:', nomineeEmail)
      await supabase
        .from('nominees')
        .update({ email: nomineeEmail })
        .eq('id', nominee.id)
    }

    // =========================================================================
    // FIND EXISTING AUTH USER
    // =========================================================================
    let authUser: { id: string; email?: string } | null = null

    // Method 1: Direct lookup via user_id on nominee record
    if (nominee.user_id) {
      console.log('Trying getUserById for user_id:', nominee.user_id)
      const { data: userData, error: getUserError } = await supabase.auth.admin.getUserById(
        nominee.user_id
      )
      if (!getUserError && userData?.user) {
        authUser = userData.user
        console.log('Found auth user via user_id:', authUser.id)
      } else {
        console.warn('getUserById failed:', getUserError?.message)
      }
    }

    // Method 2: Look up via profiles table (email is unique there)
    if (!authUser && nomineeEmail) {
      console.log('Trying profile lookup for email:', nomineeEmail)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', nomineeEmail)
        .maybeSingle()

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

    // Method 3: Search auth users by email (fallback)
    if (!authUser && nomineeEmail) {
      console.log('Trying listUsers search for email:', nomineeEmail)
      const listResult = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      })

      if (!listResult.error && listResult.data?.users?.length) {
        authUser = listResult.data.users.find(
          (u: { email?: string }) => u.email?.toLowerCase() === nomineeEmail.toLowerCase()
        ) || null
        if (authUser) {
          console.log('Found auth user via listUsers:', authUser.id)
        }
      }
    }

    // =========================================================================
    // CREATE AUTH USER IF NOT FOUND
    // =========================================================================
    if (!authUser) {
      console.log('No auth user found, creating one for:', nomineeEmail)
      
      // Parse name for user metadata
      const nameParts = (nominee.name || '').split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: nomineeEmail,
        password,
        email_confirm: true, // Skip email verification since they're claiming via invite
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          full_name: nominee.name,
          nominee_id: nominee.id,
        },
      })

      if (createError) {
        // If creation failed because user already exists, try one more lookup
        if (createError.message?.includes('already been registered') || 
            createError.message?.includes('already exists')) {
          console.warn('createUser failed (user exists), attempting final lookup')
          
          const retryList = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
          if (!retryList.error && retryList.data?.users?.length) {
            authUser = retryList.data.users.find(
              (u: { email?: string }) => u.email?.toLowerCase() === nomineeEmail.toLowerCase()
            ) || null
          }

          if (!authUser) {
            console.error('Failed to find user after createUser conflict:', createError)
            return new Response(
              JSON.stringify({ 
                error: 'An account with this email already exists. Please try logging in instead.',
                code: 'EMAIL_EXISTS'
              }),
              { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          console.log('Found existing auth user after create conflict:', authUser.id)
        } else {
          console.error('Failed to create auth user:', createError)
          return new Response(
            JSON.stringify({ error: 'Failed to create account. Please try again.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else if (newUser?.user) {
        authUser = newUser.user
        console.log('Created new auth user:', authUser.id)

        // Link nominee to the new user and mark as claimed
        await supabase
          .from('nominees')
          .update({ 
            user_id: authUser.id,
            claimed_at: new Date().toISOString()
          })
          .eq('id', nominee.id)

        return new Response(
          JSON.stringify({ success: true, user_id: authUser.id, created: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // =========================================================================
    // SET PASSWORD FOR EXISTING USER
    // =========================================================================
    if (!authUser) {
      return new Response(
        JSON.stringify({ error: 'Failed to find or create account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Setting password for existing user:', authUser.id)
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      authUser.id,
      { password, email_confirm: true }
    )

    if (updateError) {
      console.error('Failed to set password:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to set password. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Backfill user_id and claimed_at on nominee if not already set
    if (!nominee.user_id || !nominee.claimed_at) {
      await supabase
        .from('nominees')
        .update({ 
          user_id: authUser.id,
          claimed_at: nominee.claimed_at || new Date().toISOString()
        })
        .eq('id', nominee.id)
    }

    console.log('Password set successfully for user:', authUser.id)
    return new Response(
      JSON.stringify({ success: true, user_id: authUser.id, created: false }),
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
