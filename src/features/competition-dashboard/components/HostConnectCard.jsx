import React from 'react';
import { Landmark, CheckCircle, Clock, AlertTriangle, ExternalLink, Loader } from 'lucide-react';
import { Panel, Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { useStripeConnect } from '../hooks/useStripeConnect';

/**
 * HostConnectCard — Stripe Connect (payouts) status + onboarding entry point
 * for the host organization (§5.1).
 *
 * Shows the org's current KYC/connection state and a CTA to start or finish
 * Stripe's hosted onboarding. Identity (SSN/EIN) is entered into Stripe, never
 * here (Invariant 15).
 *
 * Props:
 *   - connect: { hasAccount, kycStatus, chargesEnabled, payoutsEnabled, detailsSubmitted }
 *   - organizationId: string
 */
export default function HostConnectCard({ connect, organizationId, locked = false }) {
  const { startOnboarding, starting, error } = useStripeConnect();

  const status = connect?.kycStatus || 'not_started';
  const verified = status === 'verified';
  const pending = status === 'pending';
  const failed = status === 'failed';
  const notStarted = status === 'not_started';

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
