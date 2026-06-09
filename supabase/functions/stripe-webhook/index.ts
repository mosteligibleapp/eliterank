import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

interface VoteEmailParams {
  voterEmail: string
  contestantId: string
  competitionId: string
  voteCount: number
  purchasedVoteCount: number
  wasDoubled: boolean
  amountPaid: number
  hasAccount: boolean
}

/**
 * Send a vote receipt email to the paid voter.
 * Fetches contestant/competition details and current rank, then fires the email.
 */
async function sendVoteReceiptEmail(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceKey: string,
  params: VoteEmailParams
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
 * Capture an authorized (manual-capture) PaymentIntent — i.e. actually take
 * the money once we've confirmed the vote is valid. Idempotent: re-reads the
 * current status so a redelivered webhook never double-captures.
 */
async function captureIntent(stripe: Stripe, paymentIntentId: string) {
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
  if (pi.status === 'succeeded') {
    // Already captured (e.g. webhook redelivery) — nothing to do.
    return
  }
  if (pi.status === 'requires_capture') {
    await stripe.paymentIntents.capture(paymentIntentId)
    console.log(`Captured PaymentIntent ${paymentIntentId}`)
    return
  }
  throw new Error(`Cannot capture PaymentIntent ${paymentIntentId} in status ${pi.status}`)
}

/**
 * Refund a captured PaymentIntent in full, idempotently. This is the LAST
 * RESORT: it's only reached when money has somehow already been captured and
 * the votes can't be recorded (e.g. a legacy automatic-capture intent). The
 * normal post-cutoff path voids the authorization before any charge, so no
 * refund is needed there.
 */
async function refundPaymentIntent(
  stripe: Stripe,
  paymentIntentId: string,
  metadata: Record<string, string>
) {
  const existing = await stripe.refunds.list({ payment_intent: paymentIntentId, limit: 1 })
  if (existing.data.length > 0) {
    console.log(`PaymentIntent ${paymentIntentId} already refunded — skipping`)
    return
  }
  await stripe.refunds.create({
    payment_intent: paymentIntentId,
    reason: 'requested_by_customer',
    metadata,
  })
  console.log(`Refunded PaymentIntent ${paymentIntentId} (${JSON.stringify(metadata)})`)
}

/**
 * Reject a payment whose votes can't be recorded (the round closed). Prefer to
 * VOID the authorization — for a manual-capture intent that's `requires_capture`
 * the funds were only held, never charged, so cancelling makes the hold vanish
 * with no charge and no refund. If the intent was already captured (the legacy
 * automatic-capture case), fall back to a refund as the last resort.
 */
async function voidOrRefundIntent(
  stripe: Stripe,
  paymentIntentId: string,
  metadata: Record<string, string>
) {
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
  if (pi.status === 'requires_capture') {
    await stripe.paymentIntents.cancel(paymentIntentId, { cancellation_reason: 'abandoned' })
    console.log(`Voided authorization ${paymentIntentId} — round closed, customer not charged`)
    return
  }
  if (pi.status === 'canceled') {
    // Already voided (redelivery) — nothing to do.
    return
  }
  if (pi.status === 'succeeded') {
    // Money already captured — the only way to make the customer whole is a refund.
    await refundPaymentIntent(stripe, paymentIntentId, metadata)
    return
  }
  console.warn(`voidOrRefundIntent: ${paymentIntentId} in status ${pi.status} — no action taken`)
}

type RecordResult =
  | { kind: 'invalid' }
  | { kind: 'already_recorded' }
  | { kind: 'recorded'; emailParams: VoteEmailParams | null }
  | { kind: 'round_closed' }
  | { kind: 'error'; message: string }

/**
 * Resolve the voter email, dedup on payment_intent_id, and attempt to insert
 * the paid votes. The validate_paid_vote_round DB trigger (migration 080) is
 * the binding gate: it rejects the insert once the votable round has closed.
 * This function performs NO money movement — the caller decides whether to
 * capture (votes recorded) or void/refund (round closed) based on the result.
 */
async function recordVoteForIntent(
  supabase: ReturnType<typeof createClient>,
  stripe: Stripe,
  paymentIntent: Stripe.PaymentIntent
): Promise<RecordResult> {
  const { competition_id, contestant_id, vote_count, voter_email } = paymentIntent.metadata

  if (!competition_id || !contestant_id || !vote_count) {
    console.error('Missing metadata in payment intent:', paymentIntent.id)
    return { kind: 'invalid' }
  }

  // For anonymous paid votes the client doesn't collect an email — the buyer
  // enters it in the Stripe PaymentElement instead. Fall back to the charge's
  // billing_details.email so the vote can still be attributed (and later
  // claimed via magic link).
  let resolvedVoterEmail = voter_email || ''
  if (!resolvedVoterEmail && paymentIntent.latest_charge) {
    try {
      const chargeId = typeof paymentIntent.latest_charge === 'string'
        ? paymentIntent.latest_charge
        : paymentIntent.latest_charge.id
      const charge = await stripe.charges.retrieve(chargeId)
      resolvedVoterEmail = charge.billing_details?.email || ''
    } catch (err) {
      console.warn('Could not retrieve charge for billing email:', err)
    }
  }
  // Syntax validation — reject anything obviously malformed.
  if (resolvedVoterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(resolvedVoterEmail)) {
    console.warn('Discarding malformed voter email:', resolvedVoterEmail)
    resolvedVoterEmail = ''
  }

  const purchasedVoteCount = parseInt(vote_count, 10)
  const amountPaid = paymentIntent.amount / 100 // Convert from cents to dollars

  // Idempotency: if a vote row already exists for this PaymentIntent the votes
  // are recorded (often by the client's optimistic recordPaidVote write, which
  // usually wins the race). The caller still needs to capture the held funds.
  const { data: existingVote } = await supabase
    .from('votes')
    .select('id')
    .eq('payment_intent_id', paymentIntent.id)
    .maybeSingle()

  if (existingVote) {
    return { kind: 'already_recorded' }
  }

  // Check if today is a host-scheduled double vote day for this competition.
  // is_double_vote_day uses the competition's stored timezone, so a host in LA
  // picking April 28 gets activation across the LA calendar day, not UTC's.
  // See migration 051_competition_timezone_and_helpers.sql.
  const { data: isDoubleRpc } = await supabase.rpc('is_double_vote_day', {
    p_competition_id: competition_id,
  })
  const isDoubleVoteDay = isDoubleRpc === true
  const voteCount = isDoubleVoteDay ? purchasedVoteCount * 2 : purchasedVoteCount

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
    // A concurrent writer (the client's optimistic insert, or a redelivered
    // event) won the unique payment_intent_id constraint — votes are recorded.
    if ((voteError as { code?: string }).code === '23505') {
      return { kind: 'already_recorded' }
    }
    // validate_paid_vote_round (migration 080) rejects the insert once the
    // votable round has closed. Surface that distinctly so the caller voids the
    // authorization instead of capturing.
    const roundClosed =
      (voteError as { hint?: string }).hint === 'voting_round_closed' ||
      /voting is closed/i.test(voteError.message || '')
    if (roundClosed) {
      return { kind: 'round_closed' }
    }
    console.error('Failed to record vote:', voteError)
    return { kind: 'error', message: voteError.message }
  }

  // The on_vote_insert DB trigger updates contestants.votes and
  // competitions.total_votes atomically with the insert above.
  console.log(`Recorded ${voteCount} paid votes for contestant ${contestant_id}`)

  const emailParams: VoteEmailParams | null = resolvedVoterEmail
    ? {
        voterEmail: resolvedVoterEmail,
        contestantId: contestant_id,
        competitionId: competition_id,
        voteCount,
        purchasedVoteCount,
        wasDoubled: isDoubleVoteDay,
        amountPaid,
        hasAccount: !!voter_email, // If voter_email was in metadata, they were logged in
      }
    : null

  return { kind: 'recorded', emailParams }
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

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
      return json({ error: 'Webhook not configured' }, 500)
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Get the signature from headers
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return json({ error: 'Missing stripe-signature header' }, 400)
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
      return json({ error: 'Invalid signature' }, 400)
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
      // Primary path under manual capture: the buyer's funds are AUTHORIZED
      // (held) but not yet charged. We record the votes — gated by the
      // round-open DB trigger — and only then CAPTURE the money. If the round
      // has closed we VOID the hold, so the customer is never charged at all.
      case 'payment_intent.amount_capturable_updated': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('Payment authorized (capturable):', paymentIntent.id)

        const result = await recordVoteForIntent(supabase, stripe, paymentIntent)
        const { competition_id, contestant_id, vote_count } = paymentIntent.metadata

        switch (result.kind) {
          case 'invalid':
            return json({ error: 'Missing payment metadata' }, 400)

          case 'error':
            return json({ error: 'Failed to record vote', details: result.message }, 500)

          case 'round_closed': {
            // Votes can't count — void the authorization (no charge). Refund is
            // only used as a fallback inside voidOrRefundIntent if, against
            // expectation, the funds were already captured.
            console.error(
              `Voting closed before authorization ${paymentIntent.id} could be ` +
              `captured (competition ${competition_id}, contestant ${contestant_id}) — voiding.`
            )
            try {
              await voidOrRefundIntent(stripe, paymentIntent.id, {
                reject_reason: 'voting_round_closed',
                competition_id,
                contestant_id,
                vote_count,
              })
            } catch (voidErr) {
              console.error(`Void/refund failed for ${paymentIntent.id}:`, voidErr)
              return json({ error: 'Void failed', details: String(voidErr) }, 500)
            }
            return json({ received: true, status: 'rejected_round_closed' }, 200)
          }

          case 'already_recorded':
          case 'recorded': {
            // Votes are recorded (either we just inserted them, or the client's
            // optimistic write did). Take the money.
            try {
              await captureIntent(stripe, paymentIntent.id)
            } catch (captureErr) {
              // Return 500 so Stripe redelivers; the vote row already exists, so
              // the retry hits 'already_recorded' and re-attempts the capture.
              console.error(`Capture failed for ${paymentIntent.id}:`, captureErr)
              return json({ error: 'Capture failed', details: String(captureErr) }, 500)
            }
            if (result.kind === 'recorded' && result.emailParams) {
              sendVoteReceiptEmail(supabase, supabaseUrl, supabaseServiceKey, result.emailParams)
                .catch(err => console.warn('Vote receipt email failed (non-fatal):', err?.message || err))
            }
            return json({ received: true, status: 'captured' }, 200)
          }
        }
        break
      }

      // Fires after we capture (manual flow) or directly for any legacy
      // automatic-capture intent. Normally a no-op because the votes already
      // exist. The round_closed branch here is the LAST-RESORT refund: it only
      // triggers if money was captured without recordable votes.
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('Payment succeeded:', paymentIntent.id)

        const result = await recordVoteForIntent(supabase, stripe, paymentIntent)
        const { competition_id, contestant_id, vote_count } = paymentIntent.metadata

        switch (result.kind) {
          case 'invalid':
            return json({ error: 'Missing payment metadata' }, 400)

          case 'error':
            return json({ error: 'Failed to record vote', details: result.message }, 500)

          case 'already_recorded':
            return json({ received: true, status: 'already_processed' }, 200)

          case 'round_closed': {
            // We're in `succeeded`, so the money is already captured. Voiding is
            // impossible; refund is the only remedy (last resort).
            console.error(
              `Voting closed but payment ${paymentIntent.id} was already captured ` +
              `(competition ${competition_id}, contestant ${contestant_id}) — refunding.`
            )
            try {
              await refundPaymentIntent(stripe, paymentIntent.id, {
                refund_reason: 'voting_round_closed',
                competition_id,
                contestant_id,
                vote_count,
              })
            } catch (refundErr) {
              console.error(`Refund failed for ${paymentIntent.id}:`, refundErr)
              return json({ error: 'Refund failed', details: String(refundErr) }, 500)
            }
            return json({ received: true, status: 'refunded_round_closed' }, 200)
          }

          case 'recorded':
            if (result.emailParams) {
              sendVoteReceiptEmail(supabase, supabaseUrl, supabaseServiceKey, result.emailParams)
                .catch(err => console.warn('Vote receipt email failed (non-fatal):', err?.message || err))
            }
            return json({ received: true, status: 'recorded' }, 200)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('Payment failed:', paymentIntent.id, paymentIntent.last_payment_error?.message)
        // Could log this for analytics, but no action needed
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return json({ received: true }, 200)

  } catch (error) {
    console.error('Webhook error:', error)
    return json({ error: 'Webhook handler failed', details: String(error) }, 500)
  }
})
