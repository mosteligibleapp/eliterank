import { supabase } from './supabase';

/**
 * Stripe Connect (host payout) helpers.
 *
 * These call the `stripe-connect-onboard` edge function, which always operates
 * on the authenticated caller's own connected account. EliteRank is the
 * platform; hosts onboard an Express account so their share of vote revenue is
 * paid out to them.
 */

/**
 * Fetch the caller's current Stripe Connect onboarding status.
 * @returns {Promise<{connected: boolean, chargesEnabled: boolean, payoutsEnabled: boolean, detailsSubmitted: boolean, error?: string}>}
 */
export async function getStripeConnectStatus() {
  if (!supabase) {
    return { connected: false, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false, error: 'Not configured' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('stripe-connect-onboard', {
      body: { action: 'status' },
    });

    if (error) {
      return { connected: false, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false, error: error.message };
    }

    return {
      connected: !!data?.connected,
      chargesEnabled: !!data?.chargesEnabled,
      payoutsEnabled: !!data?.payoutsEnabled,
      detailsSubmitted: !!data?.detailsSubmitted,
    };
  } catch (err) {
    console.error('getStripeConnectStatus failed:', err);
    return { connected: false, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false, error: 'Unexpected error' };
  }
}

/**
 * Begin (or resume) Stripe Express onboarding. Returns a Stripe-hosted URL the
 * caller should be redirected to. After onboarding, Stripe returns the host to
 * `returnUrl`.
 * @param {Object} [opts]
 * @param {string} [opts.returnUrl] - Where Stripe sends the host when done.
 * @param {string} [opts.refreshUrl] - Where Stripe sends the host if the link expires.
 * @returns {Promise<{url?: string, error?: string}>}
 */
export async function startStripeConnectOnboarding({ returnUrl, refreshUrl } = {}) {
  if (!supabase) {
    return { error: 'Not configured' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('stripe-connect-onboard', {
      body: {
        action: 'start',
        returnUrl: returnUrl || `${window.location.origin}/dashboard?stripe=return`,
        refreshUrl: refreshUrl || `${window.location.origin}/dashboard?stripe=refresh`,
      },
    });

    if (error) {
      return { error: error.message || 'Could not start onboarding' };
    }
    if (!data?.url) {
      return { error: 'No onboarding link returned' };
    }
    return { url: data.url };
  } catch (err) {
    console.error('startStripeConnectOnboarding failed:', err);
    return { error: 'Unexpected error' };
  }
}
