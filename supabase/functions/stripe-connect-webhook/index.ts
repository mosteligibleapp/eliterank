import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

/**
 * Stripe Connect webhook — separate endpoint from the payments webhook.
 *
 * Connect events carry an `account` (the connected account) and are signed
 * with a DISTINCT signing secret (STRIPE_CONNECT_WEBHOOK_SECRET), configured
 * on the platform's "Connected accounts" webhook endpoint in the Stripe
 * Dashboard.
 *
 * We handle `account.updated` to keep each host profile's cached onboarding
 * flags (charges/payouts/details) in sync as the host completes Express
 * onboarding or as Stripe enables/disables capabilities. create-payment-intent
 * reads stripe_charges_enabled to decide whether to route the host-share
 * transfer, so this sync is what flips routing on once a host is ready.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const webhookSecret = Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!stripeSecretKey || !webhookSecret) {
      console.error('Stripe Connect webhook not configured')
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const rawBody = await req.text()

    // Deno's Web Crypto is async-only — must use constructEventAsync.
    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret)
    } catch (err) {
      console.error('Connect webhook signature verification failed:', err instanceof Error ? err.message : err)
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account

        const update: Record<string, unknown> = {
          stripe_charges_enabled: account.charges_enabled,
          stripe_payouts_enabled: account.payouts_enabled,
          stripe_details_submitted: account.details_submitted,
        }
        if (account.details_submitted) {
          update.stripe_onboarded_at = new Date().toISOString()
        }

        const { error } = await supabase
          .from('profiles')
          .update(update)
          .eq('stripe_account_id', account.id)

        if (error) {
          console.error('Failed to sync account.updated for', account.id, error.message)
          // 500 so Stripe retries rather than dropping the state change.
          return new Response(
            JSON.stringify({ error: 'Sync failed', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(
          `Synced account ${account.id}: charges=${account.charges_enabled} payouts=${account.payouts_enabled} details=${account.details_submitted}`
        )
        break
      }

      default:
        console.log(`Unhandled connect event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Connect webhook error:', error)
    return new Response(
      JSON.stringify({ error: 'Webhook handler failed', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
