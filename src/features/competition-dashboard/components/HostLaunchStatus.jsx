import React, { useState } from 'react';
import { CheckCircle, Circle, Loader, Landmark, FileText, ClipboardList, Send, Rocket, Lock, ChevronRight, CalendarClock } from 'lucide-react';
import { Panel, Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { supabase } from '../../../lib/supabase';
import { hasAcceptedCurrentAgreement } from '../../../lib/hostAgreement';
import { CALENDLY_URL } from '../../../lib/scheduling';

/**
 * HostLaunchStatus — the competition lifecycle tracker on the host dashboard.
 *
 * draft → pending_approval → approved → publish (entry) → live → completed.
 * In Draft it shows the gates (Stripe KYC, Host Agreement, rules entered) and a
 * Submit-for-approval action; once EliteRank approves, the host can Publish.
 */
const PHASES = [
  { key: 'draft', label: 'Draft' },
  { key: 'pending_approval', label: 'Submitted' },
  { key: 'approved', label: 'Approved' },
  { key: 'publish', label: 'Entry open' },
  { key: 'live', label: 'Live' },
  { key: 'completed', label: 'Completed' },
];

function phaseIndex(status) {
  if (status === 'nomination') return 3;
  if (status === 'voting' || status === 'finals') return 4;
  const i = PHASES.findIndex((p) => p.key === status);
  return i === -1 ? 0 : i;
}

export default function HostLaunchStatus({ competition, rulesComplete, onRefresh, onNavigateToTab }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  if (!competition) return null;

  const status = competition.status || 'draft';
  const current = phaseIndex(status);

  const goTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const agreementOk = hasAcceptedCurrentAgreement(competition.agreement);
  const stripeOk = competition.connect?.kycStatus === 'verified' && !!competition.connect?.chargesEnabled;
  const rulesOk = !!rulesComplete;
  const gates = [
    { ok: agreementOk, Icon: FileText, label: 'Review & sign the Host Agreement', action: () => goTo('host-agreement-card') },
    { ok: stripeOk, Icon: Landmark, label: 'Complete Stripe identity verification (KYC)', action: () => goTo('host-connect-card') },
    {
      ok: rulesOk,
      Icon: ClipboardList,
      label: 'Make any adjustments to your competition before submitting',
      hint: 'After submission you can only change these by contacting customer support — make sure they’re accurate.',
      action: () => onNavigateToTab?.('setup'),
    },
  ];
  const allGates = agreementOk && stripeOk && rulesOk;

  const callRpc = async (fn) => {
    setBusy(true); setError(null);
    try {
      const { error: e } = await supabase.rpc(fn, { p_competition_id: competition.id });
      if (e) throw e;
      onRefresh?.();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally { setBusy(false); }
  };

  return (
    <Panel title="Launch status" icon={Rocket} style={{ marginBottom: spacing.xl }}>
      <div style={{ padding: spacing.xl }}>
        {/* Phase stepper */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: spacing.xl }}>
          {PHASES.map((p, i) => (
            <React.Fragment key={p.key}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.xs, flexShrink: 0 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: i < current ? colors.gold.primary : i === current ? 'rgba(212,175,55,0.15)' : colors.background.secondary,
                  border: `1px solid ${i <= current ? colors.gold.primary : colors.border.primary}`,
                  color: i < current ? '#0a0a0c' : i === current ? colors.gold.primary : colors.text.muted,
                  fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold,
                }}>
                  {i < current ? <CheckCircle size={14} /> : i + 1}
                </div>
                <span style={{ fontSize: 10, color: i === current ? colors.gold.primary : colors.text.muted, textAlign: 'center', whiteSpace: 'nowrap' }}>{p.label}</span>
              </div>
              {i < PHASES.length - 1 && (
                <div style={{ flex: 1, height: 2, background: i < current ? colors.gold.primary : colors.border.primary, margin: `0 ${spacing.xs}`, marginBottom: 16 }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Phase-specific body */}
        {status === 'draft' && (
          <>
            <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, marginBottom: spacing.lg }}>
              Finish these to submit for approval. <strong>Some details lock once you submit.</strong>
            </p>
            {gates.map((g) => (
              <button
                key={g.label}
                onClick={g.ok ? undefined : g.action}
                disabled={g.ok}
                style={{
                  display: 'flex', alignItems: 'center', gap: spacing.sm, width: '100%', textAlign: 'left',
                  padding: `${spacing.sm} ${spacing.md}`, marginBottom: spacing.xs,
                  background: g.ok ? 'transparent' : colors.background.secondary,
                  border: `1px solid ${g.ok ? 'transparent' : colors.border.primary}`,
                  borderRadius: borderRadius.md,
                  color: g.ok ? colors.text.primary : colors.text.secondary,
                  fontSize: typography.fontSize.sm, cursor: g.ok ? 'default' : 'pointer',
                }}
              >
                {g.ok ? <CheckCircle size={16} style={{ color: colors.status.success, flexShrink: 0 }} /> : <Circle size={16} style={{ color: colors.text.muted, flexShrink: 0 }} />}
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span>{g.label}</span>
                  {g.hint && <span style={{ color: colors.text.muted, fontSize: typography.fontSize.xs, lineHeight: 1.4 }}>{g.hint}</span>}
                </span>
                {!g.ok && <ChevronRight size={16} style={{ color: colors.gold.primary, flexShrink: 0 }} />}
              </button>
            ))}
            <Button onClick={() => callRpc('submit_for_approval')} disabled={!allGates || busy} icon={busy ? Loader : Send} style={{ marginTop: spacing.lg }}>
              {busy ? 'Submitting…' : 'Submit for approval'}
            </Button>
            {!allGates && <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs, marginTop: spacing.sm }}>Complete all three above to submit.</p>}
          </>
        )}

        {status === 'pending_approval' && (
          <>
            <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
              ⏳ Submitted — EliteRank is reviewing your competition. Core rules are locked while it's under review. We'll let you know when it's approved.
            </p>
            {competition.prizeReviewRequired && (
              <div style={{
                marginTop: spacing.lg, padding: spacing.lg, borderRadius: borderRadius.md,
                background: colors.gold.muted, border: `1px solid ${colors.gold.primary}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs }}>
                  <CalendarClock size={16} style={{ color: colors.gold.primary }} />
                  <span style={{ color: colors.text.primary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>
                    Required: book your review call
                  </span>
                </div>
                <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, margin: `0 0 ${spacing.md}` }}>
                  Your cash prize is over $1,999, so we need a quick call before we can approve. Book a time and we’ll get you approved right after.
                </p>
                <Button icon={CalendarClock} onClick={() => window.open(CALENDLY_URL, '_blank', 'noopener,noreferrer')} style={{ width: 'auto' }}>
                  Book your review call
                </Button>
              </div>
            )}
          </>
        )}

        {status === 'approved' && (
          <>
            <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, marginBottom: spacing.lg }}>
              ✅ Approved! Finish any remaining specifics, then publish to the public. <strong>More details lock once you publish.</strong>
            </p>
            <Button onClick={() => callRpc('publish_to_public')} disabled={busy} icon={busy ? Loader : Rocket}>
              {busy ? 'Publishing…' : 'Publish to public'}
            </Button>
          </>
        )}

        {(status === 'publish' || status === 'nomination') && (
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
            🎉 Live to the public — you're in the <strong>entry period</strong> (applications / nominations open).
          </p>
        )}
        {(status === 'live' || status === 'voting' || status === 'finals') && (
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
            🔥 In the <strong>live phase</strong> — judges are reviewing and votes are being cast.
          </p>
        )}
        {status === 'completed' && (
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
            🏆 Completed — confirm your winners and celebrate them.
          </p>
        )}

        {(status === 'pending_approval' || status === 'publish' || status === 'live') && (
          <p style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, color: colors.text.muted, fontSize: typography.fontSize.xs, marginTop: spacing.lg }}>
            <Lock size={12} /> Locked fields can't be changed in this phase.
          </p>
        )}

        {error && <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.md }}>{error}</p>}
      </div>
    </Panel>
  );
}
