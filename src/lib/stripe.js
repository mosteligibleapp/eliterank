import { loadStripe } from '@stripe/stripe-js';

// Load Stripe with the publishable key from environment
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// One Stripe.js instance per context. Direct charges (Stripe Connect) live on
// the host's connected account, so the client must initialize Stripe with that
// account's id (`stripeAccount`) to confirm/retrieve those PaymentIntents.
// Platform-context instances (no account) are keyed under '__platform__'.
const stripePromises = new Map();

/**
 * Get the Stripe promise (one cached instance per connected account).
 *
 * @param {string} [stripeAccount] - Connected account id (acct_...) for direct
 *   charges. Omit for platform-context operations.
 * @returns {Promise<Stripe|null>}
 */
export function getStripe(stripeAccount) {
  if (!stripePublishableKey) {
    console.warn('Stripe publishable key not configured');
    return null;
  }

  const key = stripeAccount || '__platform__';

  if (!stripePromises.has(key)) {
    const options = stripeAccount ? { stripeAccount } : undefined;
    // Clear the cached entry on failure so the next caller (e.g. user actually
    // opening the payment modal) retries instead of reusing a rejected promise.
    const promise = loadStripe(stripePublishableKey, options).catch((err) => {
      stripePromises.delete(key);
      throw err;
    });
    stripePromises.set(key, promise);
  }

  return stripePromises.get(key);
}

/**
 * Check if Stripe is configured
 * @returns {boolean}
 */
export function isStripeConfigured() {
  return !!stripePublishableKey;
}

export default getStripe;
