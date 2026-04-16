import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * accept-nomination
 *
 * Marks a third-party nominee as having accepted their nomination. Uses the
 * service role to bypass RLS so it works regardless of whether the nominee
 * arrived with a session (magic link, no session, or an existing pre-linked
 * user_id). Knowledge of the invite_token (or nominee_id) is treated as the
 * auth signal — the token is already a secret URL param.
 *
 * Accepts: { invite_token?: string, nominee_id?: string }
 * Returns: { success: true, nominee_id: string, flow_stage: string }
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { invite_token, nominee_id } = await req.json()

    if (!invite_token && !nominee_id) {
      return new Response(
        JSON.stringify({ error: 'invite_token or nominee_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Look up the nominee — invite_token first (the canonical identifier in
    // the claim URL), then nominee_id as a fallback.
    let nominee: {
      id: string
      status: string | null
      claimed_at: string | null
      flow_stage: string | null
      converted_to_contestant: boolean | null
      competition: { nomination_end: string | null } | null
    } | null = null

    if (invite_token) {
      const { data } = await supabase
        .from('nominees')
        .select('id, status, claimed_at, flow_stage, converted_to_contestant, competition:competitions(nomination_end)')
        .eq('invite_token', invite_token)
        .maybeSingle()
      nominee = data as typeof nominee
    }

    if (!nominee && nominee_id) {
      const { data } = await supabase
        .from('nominees')
        .select('id, status, claimed_at, flow_stage, converted_to_contestant, competition:competitions(nomination_end)')
        .eq('id', nominee_id)
        .maybeSingle()
      nominee = data as typeof nominee
    }

    if (!nominee) {
      return new Response(
        JSON.stringify({ error: 'Nomination not found. This link may be invalid or expired.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (nominee.status === 'declined' || nominee.status === 'rejected') {
      return new Response(
        JSON.stringify({ error: 'This nomination was previously declined.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (nominee.converted_to_contestant) {
      return new Response(
        JSON.stringify({ error: 'This nomination has already been fully processed.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (nominee.competition?.nomination_end) {
      const endDate = new Date(nominee.competition.nomination_end)
      if (new Date() > endDate) {
        return new Response(
          JSON.stringify({ error: 'Sorry, the nomination period for this competition has ended.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('nominees')
      .update({ flow_stage: 'accepted' })
      .eq('id', nominee.id)
      .select('id, flow_stage')
      .single()

    if (updateError || !updated) {
      console.error('Failed to update nominee flow_stage:', updateError?.message)
      return new Response(
        JSON.stringify({ error: 'Failed to accept nomination', details: updateError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, nominee_id: updated.id, flow_stage: updated.flow_stage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in accept-nomination:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
