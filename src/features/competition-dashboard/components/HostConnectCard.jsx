import React, { useEffect, useRef } from 'react';
import { Landmark, CheckCircle, Clock, AlertTriangle, ExternalLink, Loader, RefreshCw } from 'lucide-react';
import { Panel, Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { useToast } from '../../../contexts/ToastContext';
import { useStripeConnect } from '../hooks/useStripeConnect';

// Stripe verifies KYC in the background, so a host returning from onboarding
// usually lands on `pending`, not `verified`. The stripe-webhook keeps the org
// row fresh, but a host sitting on this card wouldn't see the flip without a
// reload — so while pending we re-pull the authoritative status from Stripe on
// an interval, bounded so an abandoned tab doesn't poll forever.
const POLL_INTERVAL_MS = 10000; // 10s
const MAX_POLLS = 30; // ~5 minutes

/**
 * HostConnectCard — Stripe Connect (payouts) status + onboarding entry point
 * for the host organization (§5.1).
 *
 * Shows the org's current KYC/connection state and a CTA to start or finish
 * Stripe's hosted onboarding. Identity (SSN/EIN) is entered into Stripe, never
 * here (Invariant 15). While KYC is `pending` it auto-polls (and offers a
 * manual re-check) so the host sees verification complete without reloading.
 *
 * Props:
 *   - connect: { hasAccount, kycStatus, chargesEnabled, payoutsEnabled, detailsSubmitted }
 *   - organizationId: string
 *   - onSynced: () => void — called after a status re-sync so the parent can
 *     refresh the dashboard (which re-renders this card and the launch gates).
 */
export default function HostConnectCard({ connect, organizationId, locked = false, onSynced }) {
  const { startOnboarding, syncStatus, starting, syncing, error } = useStripeConnect();
  const toast = useToast();

  const status = connect?.kycStatus || 'not_started';
  const verified = status === 'verified';
  const pending = status === 'pending';
  const failed = status === 'failed';
  const notStarted = status === 'not_started';

  // Keep the latest callbacks in refs so the polling effect doesn't tear down
  // and rebuild its interval when the parent passes new (unmemoized) props.
  const onSyncedRef = useRef(onSynced);
  onSyncedRef.current = onSynced;
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const announceTransition = (kyc) => {
    if (kyc === 'verified') {
      toastRef.current?.success?.('Stripe account connected — payouts are enabled.');
    } else if (kyc === 'failed') {
      toastRef.current?.error?.('Stripe needs more information before payouts can be enabled.');
    }
  };

  // Auto-poll Stripe while verification is pending.
  useEffect(() => {
    if (!pending || !organizationId) return;
    let cancelled = false;
    let polls = 0;
    let intervalId;
    const tick = async () => {
      polls += 1;
      const result = await syncStatus(organizationId);
      if (cancelled) return;
      const next = result?.kyc_status;
      if (next && next !== 'pending') {
        clearInterval(intervalId);
        announceTransition(next);
        onSyncedRef.current?.();
      } else if (polls >= MAX_POLLS) {
        clearInterval(intervalId);
      }
    };
    intervalId = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
    // announceTransition/onSynced are read via refs, so they needn't be deps.
  }, [pending, organizationId, syncStatus]);

  // Manual "Check status now" — same authoritative Stripe pull, on demand.
  const handleManualSync = async () => {
    const result = await syncStatus(organizationId);
    if (result?.kyc_status && result.kyc_status !== 'pending') {
      announceTransition(result.kyc_status);
    }
    onSyncedRef.current?.();
  };

  // Status presentation (status colors are used for genuine status here — OK
  // per the brand rules).
  const meta = verified
    ? { color: colors.status.success, Icon: CheckCircle, label: 'Connected', tint: 'rgba(34,197,94,0.1)' }
    : pending
    ? { color: colors.status.warning, Icon: Clock, label: 'Verifying', tint: 'rgba(234,179,8,0.1)' }
    : failed
    ? { color: colors.status.error, Icon: AlertTriangle, label: 'Action needed', tint: 'rgba(239,68,68,0.1)' }
    : { color: colors.text.muted, Icon: Landmark, label: 'Not connected', tint: colors.background.secondary };

  const description = locked
    ? 'Accept the Host Agreement above first, then connect a Stripe account to receive your share of vote revenue.'
    : verified
    ? 'Your Stripe account is verified. Payouts to your bank are enabled.'
    : pending
    ? 'Stripe is verifying your details. This usually takes a few minutes; we’ll update this automatically.'
    : failed
    ? 'Stripe needs more information before payouts can be enabled. Continue onboarding to resolve it.'
    : 'Connect a Stripe account to receive your share of vote revenue. You’ll enter your details securely on Stripe — we never see or store your SSN/EIN.';

  const ctaLabel = notStarted
    ? 'Connect with Stripe'
    : verified
    ? 'Manage on Stripe'
    : 'Finish verification';

  return (
    <Panel
      title="Payouts"
      icon={Landmark}
      style={{ marginBottom: 0 }}
      action={
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.xs,
            padding: `${spacing.xs} ${spacing.sm}`,
            borderRadius: borderRadius.pill,
            background: meta.tint,
            color: meta.color,
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.semibold,
          }}
        >
          <meta.Icon size={12} />
          {meta.label}
        </span>
      }
    >
      <div style={{ padding: spacing.xl }}>
        <p
          style={{
            color: colors.text.secondary,
            fontSize: typography.fontSize.sm,
            lineHeight: 1.5,
            marginBottom: spacing.lg,
          }}
        >
          {description}
        </p>

        {verified && (
          <div
            style={{
              display: 'flex',
              gap: spacing.lg,
              marginBottom: spacing.lg,
              fontSize: typography.fontSize.sm,
            }}
          >
            <CapabilityFlag label="Charges" enabled={connect?.chargesEnabled} />
            <CapabilityFlag label="Payouts" enabled={connect?.payoutsEnabled} />
          </div>
        )}

        {error && (
          <p
            style={{
              color: colors.status.error,
              fontSize: typography.fontSize.xs,
              marginBottom: spacing.md,
            }}
          >
            {error}
          </p>
        )}

        <Button
          onClick={() => startOnboarding(organizationId)}
          disabled={starting || !organizationId || locked}
          icon={starting ? Loader : ExternalLink}
          variant={verified ? 'secondary' : 'primary'}
        >
          {starting ? 'Opening Stripe…' : ctaLabel}
        </Button>

        {pending && (
          <div style={{ marginTop: spacing.md }}>
            <Button
              onClick={handleManualSync}
              disabled={syncing || !organizationId}
              icon={syncing ? Loader : RefreshCw}
              variant="ghost"
            >
              {syncing ? 'Checking…' : 'Check status now'}
            </Button>
            <p
              style={{
                color: colors.text.muted,
                fontSize: typography.fontSize.xs,
                marginTop: spacing.sm,
              }}
            >
              We’re checking automatically every few seconds — no need to reload.
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
}

function CapabilityFlag({ label, enabled }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        color: enabled ? colors.status.success : colors.text.muted,
      }}
    >
      <CheckCircle size={14} style={{ opacity: enabled ? 1 : 0.4 }} />
      {label} {enabled ? 'enabled' : 'off'}
    </span>
  );
}
