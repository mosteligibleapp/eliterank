import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

/**
 * useStripeConnect
 *
 * Thin client for the `connect-onboard` edge function (§5.1). Handles starting
 * Stripe Connect Express onboarding for a host organization and syncing the
 * KYC/capability status back after the host returns from Stripe.
 *
 * The platform never sees the host's SSN/EIN — Stripe collects it in its hosted
 * onboarding (Invariant 15). We only ever read back `kyc_status` + flags.
 */
export function useStripeConnect() {
  const [starting, setStarting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Create (or reuse) the org's Express account and redirect the browser to
   * Stripe's hosted onboarding. Returns nothing — it navigates away on success.
   */
  const startOnboarding = useCallback(async (organizationId) => {
    if (!organizationId) {
      setError('No organization to connect.');
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const base = window.location.origin + window.location.pathname;
      const { data, error: fnError } = await supabase.functions.invoke('connect-onboard', {
        body: {
          action: 'create_account_link',
          organization_id: organizationId,
          return_url: `${base}?connect=return&org=${organizationId}`,
          refresh_url: `${base}?connect=refresh&org=${organizationId}`,
        },
      });
      if (fnError) throw fnError;
      if (!data?.url) throw new Error('No onboarding URL returned.');
      window.location.href = data.url;
    } catch (err) {
      console.error('Failed to start Stripe onboarding:', err);
      setError(err.message || 'Could not start onboarding.');
      setStarting(false);
    }
  }, []);

  /**
   * Pull the latest account status from Stripe and persist it. Returns the
   * status payload (or null on failure).
   */
  const syncStatus = useCallback(async (organizationId) => {
    if (!organizationId) return null;
    setSyncing(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('connect-onboard', {
        body: { action: 'sync_status', organization_id: organizationId },
      });
      if (fnError) throw fnError;
      return data;
    } catch (err) {
      console.error('Failed to sync Stripe status:', err);
      setError(err.message || 'Could not refresh status.');
      return null;
    } finally {
      setSyncing(false);
    }
  }, []);

  return { startOnboarding, syncStatus, starting, syncing, error };
}

export default useStripeConnect;
