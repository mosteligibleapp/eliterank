import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * set-judge-password
 *
 * Sets a password for a judge's auth account. The judge arrives at
 * /claim-judge/:token, enters their email + a password, and this function
 * creates (or updates) the auth user and links it to the judge row.
 *
 * Accepts: { invite_token: string, password: string, email?: string }
 * Returns: { success: true, user_id }
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { invite_token, password, email: clientEmail } = await req.json()

    if (!invite_token) {
      return new Response(
        JSON.stringify({ error: 'invite_token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!password || password.length < 6) {
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

    const { data: judge, error: judgeError } = await supabase
      .from('judges')
      .select('id, name, email, user_id')
      .eq('invite_token', invite_token)
      .single()

    if (judgeError || !judge) {
      return new Response(
        JSON.stringify({ error: 'Invalid invite token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prefer the email the user typed (clientEmail) — that's the email they
    // will sign in with. Backfill to judges.email so the rows stay in sync.
    const email = (clientEmail || judge.email || '').trim()
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email address required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (email.toLowerCase() !== (judge.email || '').toLowerCase()) {
      await supabase.from('judges').update({ email }).eq('id', judge.id)
    }

    // ── Find existing auth user ──
    let authUserId: string | null = null

    if (judge.user_id) {
      const { data, error } = await supabase.auth.admin.getUserById(judge.user_id)
      if (!error && data?.user) authUserId = data.user.id
    }

    if (!authUserId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', email)
        .maybeSingle()
      if (profile?.id) {
        const { data, error } = await supabase.auth.admin.getUserById(profile.id)
        if (!error && data?.user) {
          authUserId = data.user.id
        } else {
          // Orphan profile — drop it so createUser won't conflict
          await supabase.from('profiles').delete().eq('id', profile.id)
        }
      }
    }

    if (!authUserId) {
      const { data: listData } = await supabase.auth.admin.listUsers({
        filter: email,
        page: 1,
        perPage: 50,
      })
      const match = listData?.users?.find(
        (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
      )
      if (match) authUserId = match.id
    }

    // ── Create or update ──
    if (authUserId) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        authUserId,
        { password, email_confirm: true }
      )
      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Failed to set password', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      const nameParts = (judge.name || '').split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      // Pre-clean any orphan profiles with this email to avoid the
      // handle_new_user trigger crashing on the unique constraint.
      const { data: orphans } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', email)
      if (orphans?.length) {
        for (const p of orphans) {
          await supabase.from('profiles').delete().eq('id', p.id)
        }
      }

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName },
      })

      if (createError || !newUser?.user) {
        console.error('createUser failed:', createError?.message)
        return new Response(
          JSON.stringify({ error: 'Failed to create account', details: createError?.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      authUserId = newUser.user.id
    }

    // ── Link judge row + stamp claimed_at ──
    await supabase
      .from('judges')
      .update({ user_id: authUserId, claimed_at: new Date().toISOString() })
      .eq('id', judge.id)

    // Ensure profile exists (handle_new_user may not have fired)
    await supabase.from('profiles').upsert(
      {
        id: authUserId,
        email,
        first_name: (judge.name || '').split(' ')[0] || '',
        last_name: (judge.name || '').split(' ').slice(1).join(' ') || '',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

    return new Response(
      JSON.stringify({ success: true, user_id: authUserId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('set-judge-password error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
