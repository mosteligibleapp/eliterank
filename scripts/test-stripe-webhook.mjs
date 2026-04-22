// scripts/test-stripe-webhook.mjs
//
// Simulates a real Stripe payment_intent.succeeded webhook delivery —
// constructs a properly-signed event (using your STRIPE_WEBHOOK_SECRET)
// with real test-contestant metadata, POSTs it to the deployed webhook,
// and reports whether everything wired up.
//
// Validates:
//   1. STRIPE_WEBHOOK_SECRET in Supabase matches what Stripe Dashboard issues
//   2. The webhook function processes payment_intent metadata correctly
//   3. A vote row gets inserted into the votes table
//   4. The on_vote_insert DB trigger increments contestants.votes
//
// USAGE:
//   STRIPE_WEBHOOK_SECRET=whsec_xxx node scripts/test-stripe-webhook.mjs
//
// AFTER RUNNING:
//   Check the votes table in Supabase SQL Editor:
//     SELECT * FROM votes WHERE payment_intent_id LIKE 'pi_test_%' ORDER BY created_at DESC LIMIT 5;
//   Check the contestant's vote count incremented:
//     SELECT name, votes FROM contestants WHERE slug = 'test-contestant';
//   When done, clean up the test rows:
//     DELETE FROM votes WHERE payment_intent_id LIKE 'pi_test_%';

import crypto from 'crypto';

const WEBHOOK_URL = 'https://jioblcflgpqcfdmzjnto.supabase.co/functions/v1/stripe-webhook';
const SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// IDs from the stripe-test-2026 seed competition
const COMPETITION_ID = '8dba6302-7b38-4f73-bb22-8f11afda4bbe';
const CONTESTANT_ID = '0842fb58-4dc2-4f24-b2b3-21bb9a84ff78';

if (!SECRET) {
  console.error('ERROR: Set STRIPE_WEBHOOK_SECRET env var');
  console.error('Example: STRIPE_WEBHOOK_SECRET=whsec_xxx node scripts/test-stripe-webhook.mjs');
  process.exit(1);
}

const fakePaymentIntentId = `pi_test_${Date.now()}`;
const event = {
  id: `evt_test_${Date.now()}`,
  object: 'event',
  api_version: '2023-10-16',
  created: Math.floor(Date.now() / 1000),
  type: 'payment_intent.succeeded',
  livemode: false,
  data: {
    object: {
      id: fakePaymentIntentId,
      object: 'payment_intent',
      amount: 100,
      currency: 'usd',
      status: 'succeeded',
      latest_charge: null,
      metadata: {
        competition_id: COMPETITION_ID,
        contestant_id: CONTESTANT_ID,
        vote_count: '1',
        voter_email: 'webhook-test@example.com',
      },
    },
  },
};

const payload = JSON.stringify(event);
const timestamp = Math.floor(Date.now() / 1000);
const signedPayload = `${timestamp}.${payload}`;
const signature = crypto.createHmac('sha256', SECRET).update(signedPayload).digest('hex');
const stripeSignature = `t=${timestamp},v1=${signature}`;

console.log('Sending simulated payment_intent.succeeded to webhook...');
console.log(`URL: ${WEBHOOK_URL}`);
console.log(`Fake PaymentIntent ID: ${fakePaymentIntentId}\n`);

const response = await fetch(WEBHOOK_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'stripe-signature': stripeSignature,
  },
  body: payload,
});

const responseBody = await response.text();
console.log(`Response status: ${response.status}`);
console.log(`Response body:   ${responseBody}\n`);

if (response.status === 200) {
  console.log('SUCCESS: Webhook accepted the event.');
  console.log('Next: confirm a vote row landed in the DB. Run this in SQL Editor:\n');
  console.log(`  SELECT * FROM votes WHERE payment_intent_id = '${fakePaymentIntentId}';`);
  console.log(`  SELECT name, votes FROM contestants WHERE id = '${CONTESTANT_ID}';\n`);
  console.log('If the vote row exists and contestant.votes is 1 (or higher), Stripe → vote');
  console.log('flow is fully wired. Clean up the test rows when done:\n');
  console.log(`  DELETE FROM votes WHERE payment_intent_id LIKE 'pi_test_%';`);
} else if (response.status === 400 && responseBody.includes('signature')) {
  console.log('FAILED: Signature verification rejected.');
  console.log('=> STRIPE_WEBHOOK_SECRET in Supabase does NOT match the one passed here.');
  console.log('=> Re-set it: supabase secrets set STRIPE_WEBHOOK_SECRET=<value-from-stripe>');
} else {
  console.log('FAILED: See response body above for details.');
}
