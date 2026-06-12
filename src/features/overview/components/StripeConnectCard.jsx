import React, { useEffect, useState } from 'react';
import { CreditCard, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { getStripeConnectStatus, startStripeConnectOnboarding } from '../../../lib/stripeConnect';
import { HOST_PAYOUT_PERCENTAGE } from '../../../constants';

/**
 * Host-facing Stripe Connect onboarding card. Shows the host's payout-account
 * status and a CTA to start/continue Stripe Express onboarding so their share
 * of vote revenue can be paid out to them.
 */
export default function StripeConnectCard() {
  const [status, setStatus] = useState(null); // null = loading
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getStripeConnectStatus().then((s) => {
      if (!cancelled) setStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleConnect = async () => {
    setRedirecting(true);
    setError(null);
    const { url, error: err } = await startStripeConnectOnboarding();
    if (url) {
      window.location.href = url;
      return;
    }
    setError(err || 'Could not start onboarding');
    setRedirecting(false);
  };

  const isActive = status?.chargesEnabled;
  const isPending = status?.connected && !status?.chargesEnabled;

  // Status-driven accent: green when payouts are live, gold for setup/pending.
  const accent = isActive ? colors.status.success : colors.gold.primary;
  const Icon = isActive ? CheckCircle2 : isPending ? AlertCircle : CreditCard;

  let heading = 'Set up payouts';
  let body = `Connect a payout account to receive your ${HOST_PAYOUT_PERCENTAGE * 100}% share of vote revenue.`;
  let cta = 'Connect Stripe';
  if (isActive) {
    heading = 'Payouts active';
    body = 'Your Stripe account is connected and ready to receive payouts.';
    cta = null;
  } else if (isPending) {
    heading = 'Finish payout setup';
    body = 'Your account needs a few more details before Stripe can pay you out.';
    cta = 'Continue setup';
  }

  return (
    <div
      style={{
        background: colors.background.card,
        border: `1px solid ${colors.border.light}`,
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: borderRadius.md,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isActive ? 'rgba(34,197,94,0.1)' : 'rgba(212,175,55,0.1)',
            color: accent,
            flexShrink: 0,
          }}
        >
          {status === null ? (
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Icon size={20} />
          )}
        </div>
        <div>
          <div
            style={{
              fontSize: typography.fontSize.md,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
            }}
          >
            {status === null ? 'Checking payout status…' : heading}
          </div>
          <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: '2px' }}>
            {status === null ? '' : body}
          </div>
        </div>
      </div>

      {error && (
        <p style={{ fontSize: typography.fontSize.xs, color: colors.status.error, marginBottom: spacing.sm }}>
          {error}
        </p>
      )}

      {status !== null && cta && (
        <button
          onClick={handleConnect}
          disabled={redirecting}
          style={{
            width: '100%',
            padding: spacing.md,
            background: 'transparent',
            border: `1px solid ${colors.gold.primary}`,
            borderRadius: borderRadius.md,
            color: colors.gold.primary,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            cursor: redirecting ? 'default' : 'pointer',
            opacity: redirecting ? 0.6 : 1,
          }}
        >
          {redirecting ? 'Opening Stripe…' : cta}
        </button>
      )}
    </div>
  );
}
