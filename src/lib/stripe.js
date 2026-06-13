import { loadStripe } from '@stripe/stripe-js';

// Load Stripe with the publishable key from environment
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

let stripePromise = null;

/**
 * Get the Stripe promise (singleton pattern)
 * @returns {Promise<Stripe|null>}
 */
export function getStripe() {
  if (!stripePublishableKey) {
    console.warn('Stripe publishable key not configured');
    return null;
  }

  if (!stripePromise) {
    // Clear the singleton on failure so the next caller (e.g. user actually
    // opening the payment modal) retries instead of reusing a rejected promise.
    stripePromise = loadStripe(stripePublishableKey).catch((err) => {
      stripePromise = null;
      throw err;
    });
  }

  return stripePromise;
}

// Per-connected-account Stripe instances. With Connect DIRECT charges the
// PaymentIntent lives on the host's connected account, so Stripe.js must be
// initialized with that account (`stripeAccount`) to confirm/retrieve it.
// Cached per account id so we don't reload Stripe.js on every render.
const stripeAccountPromises = {};

/**
 * Get a Stripe instance scoped to a host's connected account (for Connect
 * direct charges). Falls back to the platform instance when no account id is
 * given.
 * @param {string|null} connectedAccountId - acct_… of the host, or null
 * @returns {Promise<Stripe|null>}
 */
export function getStripeForAccount(connectedAccountId) {
  if (!connectedAccountId) return getStripe();

  if (!stripePublishableKey) {
    console.warn('Stripe publishable key not configured');
    return null;
  }

  if (!stripeAccountPromises[connectedAccountId]) {
    stripeAccountPromises[connectedAccountId] = loadStripe(stripePublishableKey, {
      stripeAccount: connectedAccountId,
    }).catch((err) => {
      // Clear on failure so the next attempt retries instead of reusing a
      // rejected promise.
      delete stripeAccountPromises[connectedAccountId];
      throw err;
    });
  }

  return stripeAccountPromises[connectedAccountId];
}

/**
 * Check if Stripe is configured
 * @returns {boolean}
 */
export function isStripeConfigured() {
  return !!stripePublishableKey;
}

export default getStripe;
