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
 * /claim-judge/:token, enters a password, and this function creates (or
 * updates) the auth user for the email already on the judge row.
 *
 * Accepts: { invite_token: string, password: string }
 * Returns: { success: true, user_id, email }
 *
 * Security: we deliberately do NOT accept a client-supplied email. The email
 * is always read from judges.email (set by the host when inviting). Allowing
 * the client to pass an arbitrary email enables account hijack — an attacker
 * with any valid invite_token could pass a victim's email and overwrite that
 * victim's auth password via auth.admin.updateUserById.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { invite_token, password } = await req.json()

    if (!invite_token) {
      return new Response(
        JSON.stringify({ error: 'invite_token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!password || password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters' }),
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

    const email = (judge.email || '').trim()
    if (!email) {
      return new Response(
        JSON.stringify({
          error: 'This judge has no email on file. Ask the host to add an email to the invite before claiming.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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

    await supabase
      .from('judges')
      .update({ user_id: authUserId, claimed_at: new Date().toISOString() })
      .eq('id', judge.id)

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
      JSON.stringify({ success: true, user_id: authUserId, email }),
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
