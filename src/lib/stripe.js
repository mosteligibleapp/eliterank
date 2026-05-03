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

/**
 * Check if Stripe is configured
 * @returns {boolean}
 */
export function isStripeConfigured() {
  return !!stripePublishableKey;
}

export default getStripe;
