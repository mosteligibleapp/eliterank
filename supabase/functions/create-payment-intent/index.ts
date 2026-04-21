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
  { minVotes: 1,   maxVotes: 10,  pricePerVote: 1.00 },
  { minVotes: 11,  maxVotes: 25,  pricePerVote: 0.90 },
  { minVotes: 26,  maxVotes: 50,  pricePerVote: 0.85 },
  { minVotes: 51,  maxVotes: 100, pricePerVote: 0.80 },
  { minVotes: 101, maxVotes: 250, pricePerVote: 0.70 },
  { minVotes: 251, maxVotes: 500, pricePerVote: 0.50 },
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

    // Fetch competition to get vote price. price_per_vote is the column the
    // admin UI writes to; vote_price is a legacy duplicate we fall back to.
    const { data: competition, error: compError } = await supabase
      .from('competitions')
      .select('id, city, season, price_per_vote, vote_price, use_price_bundler, status')
      .eq('id', competitionId)
      .single()

    if (compError || !competition) {
      return new Response(
        JSON.stringify({ error: 'Competition not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    const basePrice = parseFloat(competition.price_per_vote ?? competition.vote_price) || 1.00
    const perVotePrice = competition.use_price_bundler
      ? bundledPricePerVote(voteCount, basePrice)
      : basePrice
    const totalAmount = Math.round(perVotePrice * voteCount * 100) // cents

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
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
        competition_name: `${competition.city} ${competition.season}`,
        contestant_name: contestant.name,
      },
      description: `${voteCount} vote${voteCount > 1 ? 's' : ''} for ${contestant.name} in ${competition.city} ${competition.season}`,
    })

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: totalAmount,
        voteCount,
        contestantName: contestant.name,
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
