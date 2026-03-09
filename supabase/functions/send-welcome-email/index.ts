import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * send-welcome-email — Sends a branded welcome email to a nominee after they
 * accept their nomination.
 *
 * The email comes from the host's name and gives the nominee an overview of
 * the competition and what to expect next.
 *
 * Body: { nominee_id: string }
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { nominee_id } = await req.json()
    console.log('send-welcome-email called:', JSON.stringify({ nominee_id }))

    if (!nominee_id) {
      return new Response(
        JSON.stringify({ error: 'nominee_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const appUrl = Deno.env.get('APP_URL') || 'https://eliterank.co'

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Fetch nominee with competition, organization, and host data
    const { data: nominee, error: fetchError } = await supabase
      .from('nominees')
      .select(`
        id,
        name,
        email,
        competition:competitions(
          id,
          name,
          slug,
          season,
          host_id,
          city:cities(name),
          organization:organizations(name, slug)
        )
      `)
      .eq('id', nominee_id)
      .single()

    if (fetchError || !nominee) {
      console.error('Nominee not found:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Nominee not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!nominee.email) {
      console.log('Nominee has no email, skipping welcome email')
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'no_email' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const competition = nominee.competition as any
    const cityName = competition?.city?.name || 'Unknown'
    const competitionName = competition?.name || `Most Eligible ${cityName} ${competition?.season || ''}`
    const orgName = competition?.organization?.name || null
    const orgSlug = competition?.organization?.slug || null

    // Build competition URL
    const competitionUrl = orgSlug
      ? `${appUrl}/${orgSlug}/${competition.slug || `id/${competition.id}`}`
      : `${appUrl}`

    // Fetch host profile for sender name
    let hostName: string | null = null
    if (competition?.host_id) {
      const { data: hostProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', competition.host_id)
        .single()

      if (hostProfile) {
        hostName = [hostProfile.first_name, hostProfile.last_name].filter(Boolean).join(' ') || null
      }
    }

    // Compose sender display name
    const fromName = hostName
      ? `${hostName} via EliteRank`
      : orgName
        ? `${orgName} via EliteRank`
        : 'EliteRank'

    console.log('Sending welcome email:', JSON.stringify({
      to: nominee.email,
      competition: competitionName,
      host: hostName,
      org: orgName,
    }))

    // Send via OneSignal email function
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-onesignal-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        type: 'nominee_welcome',
        to_email: nominee.email,
        to_name: nominee.name,
        nominee_name: nominee.name,
        competition_name: competitionName,
        city_name: cityName,
        competition_url: competitionUrl,
        host_name: hostName,
        org_name: orgName,
        from_name: fromName,
      }),
    })

    const emailResult = await emailResponse.json()
    if (!emailResponse.ok) {
      console.warn('Welcome email send failed:', JSON.stringify(emailResult))
    } else {
      console.log('Welcome email sent successfully')
    }

    return new Response(
      JSON.stringify({ success: true, nominee_email: nominee.email }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-welcome-email:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
