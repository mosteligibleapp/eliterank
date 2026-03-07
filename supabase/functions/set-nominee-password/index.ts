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
 * Used when the nominee arrives at the claim page without a session and
 * client-side signUp fails (e.g. handle_new_user trigger crash).
 *
 * Accepts: { invite_token: string, password: string, email?: string }
 * Returns: { success: true, user_id: string }
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

    // ── 1. Look up the nominee ──────────────────────────────────────────
    console.log('Looking up nominee by invite_token')
    const { data: nominee, error: fetchError } = await supabase
      .from('nominees')
      .select('id, email, user_id, name')
      .eq('invite_token', invite_token)
      .single()

    if (fetchError || !nominee) {
      console.error('Nominee lookup failed:', fetchError?.message)
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invite token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found nominee:', JSON.stringify({ id: nominee.id, email: nominee.email, user_id: nominee.user_id }))

    // ── 2. Determine the email to use ───────────────────────────────────
    // IMPORTANT: prefer clientEmail (what the user typed on the form) over
    // nominee.email (what the nominator entered). The client will sign in
    // with clientEmail after this function returns — if we create the auth
    // account with a different email, signInWithPassword will fail.
    const email = clientEmail?.trim() || nominee.email
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'No email address available to create an account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Using email:', email)

    // Backfill / update email on nominee record so it stays in sync
    if (email !== nominee.email) {
      await supabase
        .from('nominees')
        .update({ email })
        .eq('id', nominee.id)
    }

    // ── 3. Find existing auth user ──────────────────────────────────────
    let authUserId: string | null = null

    // 3a. Via nominee.user_id (set by send-nomination-invite for existing users)
    if (nominee.user_id) {
      const { data, error } = await supabase.auth.admin.getUserById(nominee.user_id)
      if (!error && data?.user) {
        authUserId = data.user.id
        console.log('Found auth user via nominee.user_id:', authUserId)
      }
    }

    // 3b. Via profiles table (exact email match)
    if (!authUserId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', email)
        .maybeSingle()

      if (profile?.id) {
        // Verify this profile maps to a real auth user
        const { data, error } = await supabase.auth.admin.getUserById(profile.id)
        if (!error && data?.user) {
          authUserId = data.user.id
          console.log('Found auth user via profile:', authUserId)
        } else {
          // Orphaned profile — delete it so createUser trigger won't conflict
          console.log('Deleting orphaned profile:', profile.id)
          await supabase.from('profiles').delete().eq('id', profile.id)
        }
      }
    }

    // 3c. Via auth admin listUsers (with email filter)
    if (!authUserId) {
      const { data: listData } = await supabase.auth.admin.listUsers({
        filter: email,
        page: 1,
        perPage: 50,
      })
      const match = listData?.users?.find(
        (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
      )
      if (match) {
        authUserId = match.id
        console.log('Found auth user via listUsers:', authUserId)
      }
    }

    // ── 4. Create or update the auth user ───────────────────────────────
    if (authUserId) {
      // User exists — just set the password
      console.log('Setting password on existing user:', authUserId)
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        authUserId,
        { password, email_confirm: true }
      )
      if (updateError) {
        console.error('Failed to set password:', updateError.message)
        return new Response(
          JSON.stringify({ error: 'Failed to set password', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // No existing user — create one
      console.log('Creating new auth user for:', email)

      // Clean up any orphaned profiles with this email first (prevents
      // handle_new_user trigger conflicts on the email unique constraint)
      const { data: orphanProfiles } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', email)
      if (orphanProfiles?.length) {
        for (const p of orphanProfiles) {
          console.log('Pre-cleanup: deleting orphan profile:', p.id)
          await supabase.from('profiles').delete().eq('id', p.id)
        }
      }

      const nameParts = nominee.name?.split(' ') || []
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName },
      })

      if (createError) {
        console.error('createUser failed:', createError.message)

        // createUser can fail even if the user was partially created (trigger
        // crash). Search for the user one more time.
        const { data: retryList } = await supabase.auth.admin.listUsers({
          filter: email,
          page: 1,
          perPage: 50,
        })
        const found = retryList?.users?.find(
          (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
        )

        if (found) {
          console.log('Found partially-created user after createUser failure:', found.id)
          authUserId = found.id

          // Set password + confirm email
          await supabase.auth.admin.updateUserById(found.id, {
            password,
            email_confirm: true,
          })

          // Ensure profile exists (trigger may have crashed before creating it)
          await supabase.from('profiles').upsert({
            id: found.id,
            email,
            first_name: firstName,
            last_name: lastName,
          }, { onConflict: 'id' })
        } else {
          // Truly failed — try one more time after cleaning up
          console.log('Retrying createUser after cleanup...')
          const { data: orphans2 } = await supabase
            .from('profiles')
            .select('id')
            .ilike('email', email)
          if (orphans2?.length) {
            for (const p of orphans2) {
              await supabase.from('profiles').delete().eq('id', p.id)
            }
          }

          const { data: retryUser, error: retryError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { first_name: firstName, last_name: lastName },
          })

          if (retryError || !retryUser?.user) {
            console.error('createUser retry failed:', retryError?.message)
            return new Response(
              JSON.stringify({ error: 'Failed to create account', details: retryError?.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          authUserId = retryUser.user.id
          console.log('createUser succeeded on retry:', authUserId)
        }
      } else if (newUser?.user) {
        authUserId = newUser.user.id
        console.log('Created new auth user:', authUserId)
      }
    }

    if (!authUserId) {
      return new Response(
        JSON.stringify({ error: 'Failed to find or create account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 5. Link nominee to the auth user ────────────────────────────────
    if (!nominee.user_id || nominee.user_id !== authUserId) {
      await supabase
        .from('nominees')
        .update({ user_id: authUserId, claimed_at: new Date().toISOString() })
        .eq('id', nominee.id)
      console.log('Linked nominee to user:', authUserId)
    }

    console.log('set-nominee-password completed successfully for user:', authUserId)
    return new Response(
      JSON.stringify({ success: true, user_id: authUserId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in set-nominee-password:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
