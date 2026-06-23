import React, { useState } from 'react';
import { FileText, CheckCircle, ExternalLink, Loader } from 'lucide-react';
import { Panel, Button, Modal } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import {
  HOST_AGREEMENT_TITLE,
  HOST_AGREEMENT_BODY,
  HOST_AGREEMENT_VERSION,
  hasAcceptedCurrentAgreement,
  acceptHostAgreement,
} from '../../../lib/hostAgreement';

/**
 * HostAgreementCard — the Promoter/Master Agreement acceptance step.
 *
 * Comes BEFORE the Payouts (Stripe Connect) card in the onboarding flow: the
 * host org must accept the current agreement before it can connect Stripe, and
 * acceptance is a requirement for publishing.
 *
 * Props:
 *   - agreement: { version, acceptedAt }  (from competition.agreement)
 *   - organizationId: string
 *   - onAccepted: () => void  (refresh dashboard data after acceptance)
 */
export default function HostAgreementCard({ agreement, organizationId, onAccepted }) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState(null);

  const accepted = hasAcceptedCurrentAgreement(agreement);

  const handleAccept = async () => {
    if (!organizationId || !checked) return;
    setAccepting(true);
    setError(null);
    try {
      await acceptHostAgreement(organizationId);
      setOpen(false);
      setChecked(false);
      onAccepted?.();
    } catch (err) {
      console.error('Failed to accept host agreement:', err);
      setError(err?.message || 'Could not record your acceptance. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const meta = accepted
    ? { color: colors.status.success, Icon: CheckCircle, label: 'Accepted', tint: 'rgba(34,197,94,0.1)' }
    : { color: colors.text.muted, Icon: FileText, label: 'Not signed', tint: colors.background.secondary };

  return (
    <>
      <Panel
        title="Host Agreement"
        icon={FileText}
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
            {accepted
              ? `You've accepted the ${HOST_AGREEMENT_TITLE}. This is required before connecting payouts and publishing your competition.`
              : `Review and accept the ${HOST_AGREEMENT_TITLE} to continue. You'll need to accept it before you can connect payouts and publish your competition.`}
          </p>

          {accepted && agreement?.acceptedAt && (
            <p
              style={{
                color: colors.text.muted,
                fontSize: typography.fontSize.xs,
                marginBottom: spacing.lg,
              }}
            >
              Accepted {new Date(agreement.acceptedAt).toLocaleDateString()} · version {agreement.version}
            </p>
          )}

          <Button
            onClick={() => { setError(null); setOpen(true); }}
            disabled={!organizationId}
            icon={accepted ? FileText : ExternalLink}
            variant={accepted ? 'secondary' : 'primary'}
          >
            {accepted ? 'View agreement' : 'Review & accept agreement'}
          </Button>
        </div>
      </Panel>

      <Modal
        isOpen={open}
        onClose={() => !accepting && setOpen(false)}
        title={HOST_AGREEMENT_TITLE}
        maxWidth="640px"
        footer={
          accepted ? (
            <Button variant="secondary" onClick={() => setOpen(false)} style={{ width: 'auto' }}>
              Close
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={accepting} style={{ width: 'auto' }}>
                Cancel
              </Button>
              <Button onClick={handleAccept} disabled={!checked || accepting} icon={accepting ? Loader : CheckCircle}>
                {accepting ? 'Recording…' : 'Accept agreement'}
              </Button>
            </>
          )
        }
      >
        <div
          style={{
            maxHeight: '46vh',
            overflowY: 'auto',
            padding: spacing.lg,
            background: colors.background.secondary,
            border: `1px solid ${colors.border.light}`,
            borderRadius: borderRadius.lg,
            color: colors.text.secondary,
            fontSize: typography.fontSize.sm,
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
          }}
        >
          {HOST_AGREEMENT_BODY}
        </div>

        <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs, marginTop: spacing.sm }}>
          Version {HOST_AGREEMENT_VERSION}
        </p>

        {error && (
          <p style={{ color: colors.status.error, fontSize: typography.fontSize.xs, marginTop: spacing.sm }}>
            {error}
          </p>
        )}

        {!accepted && (
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: spacing.sm,
              marginTop: spacing.lg,
              cursor: 'pointer',
              color: colors.text.primary,
              fontSize: typography.fontSize.sm,
            }}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              style={{ marginTop: 3, accentColor: colors.gold.primary, width: 16, height: 16 }}
            />
            <span>
              I have read and agree to the {HOST_AGREEMENT_TITLE} on behalf of this organization.
            </span>
          </label>
        )}
      </Modal>
    </>
  );
}
