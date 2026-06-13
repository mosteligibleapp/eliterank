import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentRequest {
  competitionId: string
  contestantId: string
  voteCount: number
  voterEmail?: string
}

// Mirror of PRICE_BUNDLER_TIERS in src/types/competition.js. Kept inline
// because this Deno edge function can't import from the frontend bundle.
// If you edit the tiers, edit both places.
const PRICE_BUNDLER_TIERS = [
  { minVotes: 1,   maxVotes: 9,    pricePerVote: 1.00 },
  { minVotes: 10,  maxVotes: 19,   pricePerVote: 0.90 },
  { minVotes: 20,  maxVotes: 49,   pricePerVote: 0.85 },
  { minVotes: 50,  maxVotes: 99,   pricePerVote: 0.80 },
  { minVotes: 100, maxVotes: 249,  pricePerVote: 0.70 },
  { minVotes: 250, maxVotes: 499,  pricePerVote: 0.50 },
  { minVotes: 500, maxVotes: 1000, pricePerVote: 0.40 },
]

function bundledPricePerVote(voteCount: number, basePrice: number): number {
  const tier =
    PRICE_BUNDLER_TIERS.find((t) => voteCount >= t.minVotes && voteCount <= t.maxVotes) ||
    PRICE_BUNDLER_TIERS[PRICE_BUNDLER_TIERS.length - 1]
  return basePrice * tier.pricePerVote
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get request body
    const { competitionId, contestantId, voteCount, voterEmail }: PaymentRequest = await req.json()

    // Validate required fields
    if (!competitionId || !contestantId || !voteCount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: competitionId, contestantId, voteCount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (voteCount < 1 || voteCount > 1000) {
      return new Response(
        JSON.stringify({ error: 'Invalid vote count. Must be between 1 and 1000.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get environment variables
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Payment system not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Fetch competition to get vote price.
    const { data: competition, error: compError } = await supabase
      .from('competitions')
      .select('id, name, season, price_per_vote, use_price_bundler, status, host_id, host_payout_percentage')
      .eq('id', competitionId)
      .single()

    if (compError || !competition) {
      return new Response(
        JSON.stringify({ error: 'Competition not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Binding round-open check (incident #573). The client calls
    // checkActiveVotingRound() before invoking us, but that's advisory — a
    // server-side gate keeps us from minting a PaymentIntent for a round that
    // has already closed. ensure_round_state() finalizes any due rounds and
    // returns the currently active votable round (voting or finale), if any.
    // The webhook re-checks at credit time, since a round can still close in
    // the seconds between intent creation and payment confirmation.
    const { data: roundState, error: roundError } = await supabase.rpc('ensure_round_state', {
      p_competition_id: competitionId,
    })

    if (roundError) {
      console.error('Round-state check failed:', roundError.message)
      return new Response(
        JSON.stringify({ error: 'Could not verify voting status. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!roundState?.active) {
      return new Response(
        JSON.stringify({ error: 'Voting is not currently open for this competition.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch contestant to verify they exist and belong to this competition
    const { data: contestant, error: contestantError } = await supabase
      .from('contestants')
      .select('id, name, competition_id')
      .eq('id', contestantId)
      .eq('competition_id', competitionId)
      .single()

    if (contestantError || !contestant) {
      return new Response(
        JSON.stringify({ error: 'Contestant not found in this competition' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Server is the source of truth for the Stripe amount. If the bundler is
    // on, apply the tier multiplier against the competition's base price.
    const basePrice = parseFloat(competition.price_per_vote) || 1.00
    const perVotePrice = competition.use_price_bundler
      ? bundledPricePerVote(voteCount, basePrice)
      : basePrice
    const totalAmount = Math.round(perVotePrice * voteCount * 100) // cents

    // Resolve double-vote-day status so the Stripe description and receipt
    // reflect what the contestant actually gets credited (e.g. "200 votes
    // (2× Double Vote Day)") instead of the raw purchase count. Without
    // this, customers paying $70 for 100 votes on a double day saw "100
    // votes" on their statement while their contestant got 200 credited —
    // confusing and looks like short-changing.
    //
    // Important: metadata.vote_count stays as the raw purchase count.
    // stripe-webhook reads it and applies its own doubling at insert time;
    // doubling it here would compound to 4×.
    const { data: isDoubleRpc } = await supabase.rpc('is_double_vote_day', {
      p_competition_id: competitionId,
    })
    const isDoubleVoteDay = isDoubleRpc === true
    const creditedVoteCount = isDoubleVoteDay ? voteCount * 2 : voteCount
    const compName = competition.name || `Season ${competition.season}`
    const description = isDoubleVoteDay
      ? `${creditedVoteCount} votes (2× Double Vote Day) for ${contestant.name} in ${compName}`
      : `${creditedVoteCount} vote${creditedVoteCount > 1 ? 's' : ''} for ${contestant.name} in ${compName}`

    // Stripe Connect — DIRECT charge model. The host is the merchant of
    // record: the PaymentIntent is created ON the host's connected account
    // (via the Stripe-Account header), the host's bank receives the funds, the
    // host bears Stripe's processing fees + refunds + disputes, and EliteRank
    // takes its cut as the application fee. There is NO platform fallback —
    // the platform isn't the one charging — so a host must be fully onboarded
    // (stripe_charges_enabled) before any paid vote can be taken. Free voting
    // and nominations are unaffected; only this paid path is gated.
    let connectedAccountId: string | null = null
    // Host keeps host_payout_percentage; EliteRank's platform fee is the
    // remainder (15% by default → host 85%).
    const hostPayoutPct = Number(competition.host_payout_percentage ?? 85)
    if (competition.host_id) {
      const { data: hostProfile } = await supabase
        .from('profiles')
        .select('stripe_account_id, stripe_charges_enabled')
        .eq('id', competition.host_id)
        .maybeSingle()
      if (hostProfile?.stripe_account_id && hostProfile.stripe_charges_enabled) {
        connectedAccountId = hostProfile.stripe_account_id
      }
    }

    if (!connectedAccountId) {
      // Host payouts aren't set up — refuse rather than collect money we can't
      // route. The client surfaces this as a "paid voting not available yet"
      // state (code: host_not_onboarded).
      return new Response(
        JSON.stringify({
          error: 'Paid voting isn’t available for this competition yet. Please try again later.',
          code: 'host_not_onboarded',
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Application fee = EliteRank's share (15% when host is 85%). Omitted only
    // in the degenerate 100%-to-host case, where Stripe rejects a zero fee.
    const applicationFeeAmount = Math.round(totalAmount * (1 - hostPayoutPct / 100))

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: totalAmount,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        competition_id: competitionId,
        contestant_id: contestantId,
        vote_count: voteCount.toString(),
        voter_email: voterEmail || '',
        competition_name: compName,
        contestant_name: contestant.name,
        is_double_vote_day: isDoubleVoteDay ? 'true' : 'false',
        credited_vote_count: creditedVoteCount.toString(),
        connected_account_id: connectedAccountId,
        application_fee_amount: applicationFeeAmount.toString(),
      },
      description,
    }
    if (applicationFeeAmount > 0) {
      paymentIntentParams.application_fee_amount = applicationFeeAmount
    }

    // DIRECT charge: create the PaymentIntent on the connected account.
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams, {
      stripeAccount: connectedAccountId,
    })

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: totalAmount,
        voteCount,
        contestantName: contestant.name,
        // The client must init Stripe.js with this account to confirm a direct
        // charge.
        connectedAccountId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating payment intent:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create payment', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
