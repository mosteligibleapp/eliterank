import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * send-judge-invite
 *
 * Sends (or resends) the branded "you've been invited to judge X" email.
 * Mirrors send-nomination-invite but simpler — judges have no nominator,
 * no flow_stage, and a single email type.
 *
 * Accepts: { judge_id: string, force_resend?: boolean }
 * Returns: { success: true, claim_url, method } | { error }
 */
interface JudgeData {
  id: string
  name: string
  email: string | null
  user_id: string | null
  invite_token: string
  invite_sent_at: string | null
  claimed_at: string | null
  competition: {
    id: string
    name: string | null
    season: number | null
    host_id: string | null
    city: { name: string } | null
    organization: { slug: string } | null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { judge_id, force_resend } = body

    if (!judge_id) {
      return new Response(
        JSON.stringify({ error: 'judge_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const appUrl = Deno.env.get('APP_URL') || 'https://eliterank.co'

    // Identify the caller from the JWT. Refuse anonymous callers.
    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.replace(/^Bearer\s+/i, '')
    if (!jwt) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const callerId = userData.user.id

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: judgeRow, error: fetchError } = await supabase
      .from('judges')
      .select(`
        id,
        name,
        email,
        user_id,
        invite_token,
        invite_sent_at,
        claimed_at,
        competition:competitions(id, name, season, host_id, city:cities(name), organization:organizations(slug))
      `)
      .eq('id', judge_id)
      .single()

    if (fetchError || !judgeRow) {
      console.error('Judge query failed:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Judge not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Authorize: caller must be the host, a co-host, or a super-admin.
    const competition = judgeRow.competition as unknown as {
      id: string
      host_id: string | null
    }
    let authorized = competition?.host_id === callerId
    if (!authorized) {
      const { data: cohost } = await supabase
        .from('competition_co_hosts')
        .select('user_id')
        .eq('competition_id', competition.id)
        .eq('user_id', callerId)
        .maybeSingle()
      authorized = !!cohost
    }
    if (!authorized) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', callerId)
        .maybeSingle()
      authorized = profile?.is_super_admin === true
    }
    if (!authorized) {
      return new Response(
        JSON.stringify({ error: 'Only the host of this competition can send judge invites.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const judge = judgeRow as unknown as JudgeData
    const claimUrl = `${appUrl}/claim-judge/${judge.invite_token}`

    if (!judge.email) {
      return new Response(
        JSON.stringify({
          success: true,
          method: 'no_email',
          message: 'Judge has no email address. Share the claim link manually.',
          claim_url: claimUrl,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (judge.invite_sent_at && !force_resend) {
      return new Response(
        JSON.stringify({
          message: 'Invite already sent',
          sent_at: judge.invite_sent_at,
          claim_url: claimUrl,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If a profile already exists for this email, link the judge row and
    // generate a magic link so they bypass the password step entirely.
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .ilike('email', judge.email)
      .maybeSingle()

    let magicLinkUrl: string | null = null
    if (existingProfile?.id) {
      if (!judge.user_id || judge.user_id !== existingProfile.id) {
        await supabase
          .from('judges')
          .update({ user_id: existingProfile.id })
          .eq('id', judge.id)
      }

      try {
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: judge.email,
          options: {
            redirectTo: claimUrl,
            data: {
              judge_invite: true,
              judge_id: judge.id,
              competition_id: judge.competition.id,
            },
          },
        })
        if (!linkError && linkData?.properties?.action_link) {
          magicLinkUrl = linkData.properties.action_link
        } else if (linkError) {
          console.error('generateLink failed:', linkError)
        }
      } catch (linkErr) {
        console.error('Magic link generation error:', linkErr)
      }
    }

    const cityName = judge.competition.city?.name || ''
    const competitionName =
      judge.competition.name ||
      (cityName && judge.competition.season
        ? `Most Eligible ${cityName} ${judge.competition.season}`
        : 'Most Eligible')

    const judgeCtaUrl = magicLinkUrl || claimUrl

    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-onesignal-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        type: 'judge_invite',
        to_email: judge.email,
        to_name: judge.name,
        competition_id: judge.competition.id,
        competition_name: competitionName,
        city_name: cityName,
        claim_url: judgeCtaUrl,
      }),
    })
    const emailResult = await emailResponse.json()

    if (!emailResponse.ok) {
      console.error('OneSignal email failed:', emailResult)
      return new Response(
        JSON.stringify({
          error: 'Failed to send judge invite email',
          details: emailResult,
          claim_url: claimUrl,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    await supabase
      .from('judges')
      .update({ invite_sent_at: new Date().toISOString() })
      .eq('id', judge.id)

    // In-app notification if they already have an account
    if (existingProfile?.id) {
      await supabase
        .from('notifications')
        .insert({
          user_id: existingProfile.id,
          type: 'judge_invite',
          title: "You've been invited to judge!",
          body: `You've been invited to judge ${competitionName}`,
          competition_id: judge.competition.id,
          action_url: '/judge',
          metadata: { judge_id: judge.id },
        })
        .then(({ error }) => {
          if (error) console.warn('Judge notification insert failed (non-blocking):', error)
        })
    }

    return new Response(
      JSON.stringify({
        success: true,
        method: magicLinkUrl ? 'magic_link' : 'claim_link',
        claim_url: claimUrl,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('send-judge-invite error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
