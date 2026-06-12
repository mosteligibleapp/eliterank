import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Host-facing Stripe Connect (Express) onboarding.
 *
 * Actions:
 *   - 'start'  : ensure the caller's profile has an Express connected account,
 *                then return a fresh Account Link the client redirects to so
 *                the host can finish Stripe-hosted onboarding.
 *   - 'status' : retrieve the connected account, sync charges/payouts/details
 *                flags onto the caller's profile, and return them.
 *
 * The connected account always belongs to the authenticated caller — a host
 * onboards their own payout account. EliteRank's STRIPE_SECRET_KEY is the
 * platform account; the created accounts are connected under it.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const appUrl = Deno.env.get('APP_URL') || 'https://eliterank.co'

    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Payment system not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Identify the caller from their JWT. Refuse anonymous callers — this
    // function creates/links a real payout account.
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
    const caller = userData.user

    const body = await req.json().catch(() => ({}))
    const action: string = body.action || 'start'
    const returnUrl: string = body.returnUrl || `${appUrl}/dashboard?stripe=return`
    const refreshUrl: string = body.refreshUrl || `${appUrl}/dashboard?stripe=refresh`

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Load the caller's current connect state.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, stripe_account_id')
      .eq('id', caller.id)
      .maybeSingle()

    if (profileError) {
      console.error('Profile lookup failed:', profileError.message)
      return new Response(
        JSON.stringify({ error: 'Could not load your profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let accountId = profile?.stripe_account_id || null

    // -----------------------------------------------------------------------
    // status: report (and sync) the connected account's current state.
    // -----------------------------------------------------------------------
    if (action === 'status') {
      if (!accountId) {
        return new Response(
          JSON.stringify({ connected: false, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const account = await stripe.accounts.retrieve(accountId)
      await syncAccountToProfile(supabase, caller.id, account)

      return new Response(
        JSON.stringify({
          connected: true,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // -----------------------------------------------------------------------
    // start: create the account if needed, then mint an onboarding link.
    // -----------------------------------------------------------------------
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: caller.email ?? undefined,
        // Destination charges with on_behalf_of need both capabilities on the
        // connected account: card_payments (to be the settlement merchant) and
        // transfers (to receive the host-share transfer).
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { eliterank_profile_id: caller.id },
      })
      accountId = account.id

      const { error: saveError } = await supabase
        .from('profiles')
        .update({ stripe_account_id: accountId })
        .eq('id', caller.id)

      if (saveError) {
        console.error('Failed to persist stripe_account_id:', saveError.message)
        // Don't strand an orphaned Stripe account the profile doesn't know
        // about — surface the failure so the client can retry.
        return new Response(
          JSON.stringify({ error: 'Could not save your payout account. Please try again.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    })

    return new Response(
      JSON.stringify({ url: accountLink.url, accountId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('stripe-connect-onboard error:', error)
    return new Response(
      JSON.stringify({ error: 'Onboarding failed', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Project a Stripe account's onboarding state onto the host's profile row.
 * Shared by the 'status' action here and the stripe-connect-webhook.
 */
async function syncAccountToProfile(
  supabase: ReturnType<typeof createClient>,
  profileId: string,
  account: Stripe.Account
) {
  const update: Record<string, unknown> = {
    stripe_charges_enabled: account.charges_enabled,
    stripe_payouts_enabled: account.payouts_enabled,
    stripe_details_submitted: account.details_submitted,
  }
  if (account.details_submitted) {
    update.stripe_onboarded_at = new Date().toISOString()
  }
  const { error } = await supabase.from('profiles').update(update).eq('id', profileId)
  if (error) {
    console.warn('Could not sync account state to profile:', error.message)
  }
}
