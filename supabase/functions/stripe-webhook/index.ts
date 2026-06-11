import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

/**
 * Send a vote receipt email to the paid voter.
 * Fetches contestant/competition details and current rank, then fires the email.
 */
async function sendVoteReceiptEmail(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceKey: string,
  params: {
    voterEmail: string
    contestantId: string
    competitionId: string
    voteCount: number
    purchasedVoteCount: number
    wasDoubled: boolean
    amountPaid: number
    hasAccount: boolean
  }
) {
  const { voterEmail, contestantId, competitionId, voteCount, purchasedVoteCount, wasDoubled, amountPaid, hasAccount } = params
  const appUrl = Deno.env.get('APP_URL') || 'https://eliterank.co'

  // Fetch contestant with competition details
  const { data: contestant, error: contestantError } = await supabase
    .from('contestants')
    .select(`
      id, name, user_id, rank,
      competition:competitions(
        id, name, slug,
        organization:organizations(slug)
      )
    `)
    .eq('id', contestantId)
    .maybeSingle()

  if (contestantError || !contestant) {
    console.warn('Could not fetch contestant for receipt email:', contestantError?.message)
    return
  }

  const competition = contestant.competition as {
    id: string
    name: string | null
    slug: string | null
    organization: { slug: string | null } | null
  } | null

  // Get current voting round end date
  const nowIso = new Date().toISOString()
  const { data: currentRound } = await supabase
    .from('voting_rounds')
    .select('end_date')
    .eq('competition_id', competitionId)
    .in('round_type', ['voting', 'finale'])
    .lte('start_date', nowIso)
    .gt('end_date', nowIso)
    .limit(1)
    .maybeSingle()

  // Build URLs
  const orgSlug = competition?.organization?.slug || 'most-eligible'
  const competitionSlug = competition?.slug
  const competitionUrl = competitionSlug
    ? `${appUrl}/${orgSlug}/${competitionSlug}`
    : appUrl
  const profileUrl = contestant.user_id
    ? `${appUrl}/profile/${contestant.user_id}`
    : competitionUrl
  const signupUrl = `${appUrl}/signup?returnTo=${encodeURIComponent(profileUrl)}`

  // Send the email
  const emailPayload = {
    type: 'vote_receipt',
    to_email: voterEmail,
    contestant_name: contestant.name,
    competition_name: competition?.name || 'Most Eligible',
    competition_id: competition?.id,
    competition_url: competitionUrl,
    profile_url: profileUrl,
    rank: contestant.rank,
    vote_count: voteCount,
    purchased_vote_count: purchasedVoteCount,
    was_doubled: wasDoubled,
    amount_paid: amountPaid,
    voting_round_end: currentRound?.end_date || null,
    signup_url: signupUrl,
    is_anonymous: !hasAccount,
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/send-onesignal-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify(emailPayload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Email send failed: ${res.status} ${text.slice(0, 200)}`)
  }

  console.log(`Vote receipt email sent to ${voterEmail} for ${voteCount} votes`)
}

/**
 * Returns true if the payer (by billing email or card fingerprint) is on the
 * blocked_payers list from a prior chargeback. Uses separate equality lookups
 * rather than a built .or() filter so an attacker-controlled billing email
 * can't inject PostgREST filter syntax.
 */
async function isBlockedPayer(
  supabase: ReturnType<typeof createClient>,
  email: string,
  cardFingerprint: string
): Promise<boolean> {
  if (email) {
    const { data } = await supabase
      .from('blocked_payers')
      .select('id')
      .eq('email', email.toLowerCase())
      .limit(1)
      .maybeSingle()
    if (data) return true
  }
  if (cardFingerprint) {
    const { data } = await supabase
      .from('blocked_payers')
      .select('id')
      .eq('card_fingerprint', cardFingerprint)
      .limit(1)
      .maybeSingle()
    if (data) return true
  }
  return false
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!stripeSecretKey || !webhookSecret) {
      console.error('Stripe configuration missing')
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Get the signature from headers
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the raw body for signature verification
    const body = await req.text()

    // Verify the webhook signature.
    // Deno's Web Crypto is async-only, so we must use constructEventAsync.
    // The synchronous constructEvent throws under Deno and is the root cause
    // of the 100% 400 rate observed on this endpoint.
    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err instanceof Error ? err.message : err)
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('Payment succeeded:', paymentIntent.id)

        // Extract metadata
        const {
          competition_id,
          contestant_id,
          vote_count,
          voter_email,
        } = paymentIntent.metadata

        if (!competition_id || !contestant_id || !vote_count) {
          console.error('Missing metadata in payment intent:', paymentIntent.id)
          return new Response(
            JSON.stringify({ error: 'Missing payment metadata' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // For anonymous paid votes the client doesn't collect an email — the
        // buyer enters it in the Stripe PaymentElement instead. Fall back to
        // the charge's billing_details.email so the vote can still be
        // attributed (and later claimed via magic link). We also grab the
        // card fingerprint here for the blocked-payer check below.
        let resolvedVoterEmail = voter_email || ''
        let cardFingerprint = ''
        if (paymentIntent.latest_charge) {
          try {
            const chargeId = typeof paymentIntent.latest_charge === 'string'
              ? paymentIntent.latest_charge
              : paymentIntent.latest_charge.id
            const charge = await stripe.charges.retrieve(chargeId)
            if (!resolvedVoterEmail) {
              resolvedVoterEmail = charge.billing_details?.email || ''
            }
            cardFingerprint = charge.payment_method_details?.card?.fingerprint || ''
          } catch (err) {
            console.warn('Could not retrieve charge for billing email/fingerprint:', err)
          }
        }
        // Syntax validation — reject anything obviously malformed.
        if (resolvedVoterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(resolvedVoterEmail)) {
          console.warn('Discarding malformed voter email:', resolvedVoterEmail)
          resolvedVoterEmail = ''
        }

        const purchasedVoteCount = parseInt(vote_count, 10)
        const amountPaid = paymentIntent.amount / 100 // Convert from cents to dollars

        // Check if this payment has already been processed (idempotency).
        // Runs before the blocked-payer refund below so a re-delivered
        // succeeded event for an already-credited payment is a clean no-op
        // rather than triggering a spurious refund.
        const { data: existingVote } = await supabase
          .from('votes')
          .select('id')
          .eq('payment_intent_id', paymentIntent.id)
          .single()

        if (existingVote) {
          console.log('Payment already processed:', paymentIntent.id)
          return new Response(
            JSON.stringify({ received: true, status: 'already_processed' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Refuse + auto-refund purchases from payers we've blocked for a prior
        // chargeback. We check both the billing email and the card fingerprint
        // so a blocked payer can't get around it with a fresh email address.
        if (await isBlockedPayer(supabase, resolvedVoterEmail, cardFingerprint)) {
          console.warn(`Blocked payer attempted purchase; auto-refunding ${paymentIntent.id}`)
          try {
            await stripe.refunds.create({ payment_intent: paymentIntent.id })
          } catch (refundErr) {
            console.error('Failed to auto-refund blocked payer:', refundErr)
          }
          return new Response(
            JSON.stringify({ received: true, status: 'blocked_payer_refunded' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check if today is a host-scheduled double vote day for this competition.
        // is_double_vote_day uses the competition's stored timezone, so a host
        // in LA picking April 28 gets activation across the LA calendar day,
        // not UTC's. See migration 051_competition_timezone_and_helpers.sql.
        const { data: isDoubleRpc } = await supabase.rpc('is_double_vote_day', {
          p_competition_id: competition_id,
        })
        const isDoubleVoteDay = isDoubleRpc === true
        const voteCount = isDoubleVoteDay ? purchasedVoteCount * 2 : purchasedVoteCount

        // Record the paid votes
        const { error: voteError } = await supabase
          .from('votes')
          .insert({
            competition_id,
            contestant_id,
            voter_email: resolvedVoterEmail || null,
            vote_count: voteCount,
            amount_paid: amountPaid,
            payment_intent_id: paymentIntent.id,
            is_double_vote: isDoubleVoteDay,
          })

        if (voteError) {
          console.error('Failed to record vote:', voteError)
          return new Response(
            JSON.stringify({ error: 'Failed to record vote', details: voteError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // The on_vote_insert DB trigger updates contestants.votes and
        // competitions.total_votes atomically with the insert above.

        console.log(`Recorded ${voteCount} paid votes for contestant ${contestant_id}`)

        // Send vote receipt email (fire-and-forget — don't block the webhook response)
        if (resolvedVoterEmail) {
          sendVoteReceiptEmail(supabase, supabaseUrl, supabaseServiceKey, {
            voterEmail: resolvedVoterEmail,
            contestantId: contestant_id,
            competitionId: competition_id,
            voteCount,
            purchasedVoteCount,
            wasDoubled: isDoubleVoteDay,
            amountPaid,
            hasAccount: !!voter_email, // If voter_email was in metadata, they were logged in
          }).catch(err => {
            console.warn('Vote receipt email failed (non-fatal):', err?.message || err)
          })
        }

        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('Payment failed:', paymentIntent.id, paymentIntent.last_payment_error?.message)
        // Could log this for analytics, but no action needed
        break
      }

      case 'charge.dispute.created': {
        // A cardholder disputed a charge — almost always "friendly fraud"
        // (buyer's remorse after their contestant lost). Record the payer so
        // they can't buy more votes: future purchases are refused up front in
        // create-payment-intent and auto-refunded in payment_intent.succeeded.
        const dispute = event.data.object as Stripe.Dispute
        console.log('Dispute created:', dispute.id, 'for charge', dispute.charge)

        // Idempotency — Stripe may re-deliver this event.
        const { data: existingBlock } = await supabase
          .from('blocked_payers')
          .select('id')
          .eq('dispute_id', dispute.id)
          .limit(1)
          .maybeSingle()
        if (existingBlock) {
          console.log('Dispute already recorded:', dispute.id)
          break
        }

        let email = ''
        let fingerprint = ''
        try {
          const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id
          if (chargeId) {
            const charge = await stripe.charges.retrieve(chargeId)
            email = charge.billing_details?.email || ''
            fingerprint = charge.payment_method_details?.card?.fingerprint || ''
          }
        } catch (err) {
          console.warn('Could not retrieve disputed charge:', err)
        }

        // Attribute the block to a competition via the PaymentIntent metadata.
        const piId = typeof dispute.payment_intent === 'string'
          ? dispute.payment_intent
          : dispute.payment_intent?.id
        let competitionId: string | null = null
        if (piId) {
          try {
            const pi = await stripe.paymentIntents.retrieve(piId)
            competitionId = pi.metadata?.competition_id || null
          } catch (err) {
            console.warn('Could not retrieve disputed payment intent:', err)
          }
        }

        if (!email && !fingerprint) {
          console.warn('Dispute', dispute.id, 'had no email or fingerprint to block')
          break
        }

        const { error: blockErr } = await supabase
          .from('blocked_payers')
          .insert({
            email: email ? email.toLowerCase() : null,
            card_fingerprint: fingerprint || null,
            reason: 'chargeback',
            dispute_id: dispute.id,
            payment_intent_id: piId || null,
            competition_id: competitionId,
          })
        if (blockErr) {
          console.error('Failed to record blocked payer:', blockErr)
        } else {
          console.log(`Blocked payer recorded from dispute ${dispute.id} (email=${!!email}, fingerprint=${!!fingerprint})`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: 'Webhook handler failed', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
