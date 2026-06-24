import React, { useState } from 'react';
import { CheckCircle, Circle, Loader, Landmark, FileText, ClipboardList, Send, Rocket, Lock, ChevronRight, CalendarClock, Milestone, Globe } from 'lucide-react';
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
  { key: 'publish', label: 'Published' },
  { key: 'nomination', label: 'Entry open' },
  { key: 'live', label: 'Live' },
  { key: 'completed', label: 'Completed' },
];

function phaseIndex(status) {
  if (status === 'voting' || status === 'finals') return 5; // Live
  const i = PHASES.findIndex((p) => p.key === status);
  return i === -1 ? 0 : i;
}

export default function HostLaunchStatus({ competition, rulesComplete, onRefresh, onNavigateToTab }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  // Host must explicitly confirm they've reviewed Setup + their public page
  // before they can publish (the approved-phase gate below).
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  if (!competition) return null;

  const status = competition.status || 'draft';
  const current = phaseIndex(status);

  const goTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const agreementOk = hasAcceptedCurrentAgreement(competition.agreement);
  const stripeOk = competition.connect?.kycStatus === 'verified' && !!competition.connect?.chargesEnabled;
  const rulesOk = !!rulesComplete;
  // Submit-for-approval gate: sign the Host Agreement. Hosts review/edit their
  // competition in the summary right below this card (no separate page), and
  // Stripe KYC comes later at publish.
  const gates = [
    { ok: agreementOk, Icon: FileText, label: 'Review & sign the Host Agreement', action: () => goTo('host-agreement-card') },
  ];
  const allGates = agreementOk;

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
    <Panel title="Competition phase" icon={Milestone} style={{ marginBottom: 0 }}>
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
              Sign the Host Agreement and review your competition summary below, then submit for approval. <strong>Some details lock once you submit.</strong>
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
            {!confirming ? (
              <>
                <Button onClick={() => setConfirming(true)} disabled={!allGates || busy} icon={Send} style={{ marginTop: spacing.lg }}>
                  Submit for approval
                </Button>
                {!allGates && <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs, marginTop: spacing.sm }}>Sign the Host Agreement to submit. You’ll verify payouts with Stripe after approval, before going live.</p>}
              </>
            ) : (
              <div style={{ marginTop: spacing.lg, padding: spacing.lg, borderRadius: borderRadius.md, background: colors.background.secondary, border: `1px solid ${colors.border.primary}` }}>
                <p style={{ color: colors.text.primary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.xs}` }}>
                  Ready to submit for approval?
                </p>
                <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, margin: `0 0 ${spacing.md}` }}>
                  Double-check your competition summary below — once you submit, the core details lock and can only be changed by contacting support. Not sure about something? Shoot us an email at{' '}
                  <a href="mailto:info@eliterank.co" style={{ color: colors.gold.primary }}>info@eliterank.co</a>.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
                  <Button onClick={() => callRpc('submit_for_approval')} disabled={busy} icon={busy ? Loader : Send} style={{ width: 'auto' }}>
                    {busy ? 'Submitting…' : 'Confirm & submit'}
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy} style={{ width: 'auto' }}>
                    Back
                  </Button>
                </div>
              </div>
            )}
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
            {!competition.prizeReviewRequired && (
              <div style={{ marginTop: spacing.md }}>
                <Button variant="outline" icon={CalendarClock} onClick={() => window.open(CALENDLY_URL, '_blank', 'noopener,noreferrer')} style={{ width: 'auto' }}>
                  Have questions? Schedule a call
                </Button>
              </div>
            )}
          </>
        )}

        {status === 'approved' && (() => {
          const rowStyle = (clickable = true) => ({
            display: 'flex', alignItems: 'center', gap: spacing.sm, width: '100%', textAlign: 'left',
            padding: `${spacing.sm} ${spacing.md}`,
            background: colors.background.secondary,
            border: `1px solid ${colors.border.primary}`,
            borderRadius: borderRadius.md,
            color: colors.text.secondary, fontSize: typography.fontSize.sm,
            cursor: clickable ? 'pointer' : 'default',
          });
          const publishHint = !rulesOk
            ? 'Enter your required details in Setup (name, dates & voting rounds) before publishing.'
            : !stripeOk
              ? 'Verify payouts with Stripe to publish — it can take a little time, so start it now.'
              : !reviewConfirmed
                ? 'Confirm you’ve reviewed everything above to publish.'
                : null;
          return (
            <>
              <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, marginBottom: spacing.lg }}>
                ✅ Approved! Before you publish, finish and review everything below — <strong>some details lock the moment you go public.</strong>
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, marginBottom: spacing.lg }}>
                {/* Required details + review Setup */}
                <button onClick={() => onNavigateToTab?.('setup', 'timeline')} style={rowStyle()}>
                  {rulesOk
                    ? <CheckCircle size={16} style={{ color: colors.status.success, flexShrink: 0 }} />
                    : <Circle size={16} style={{ color: colors.text.muted, flexShrink: 0 }} />}
                  <span style={{ flex: 1 }}>
                    {rulesOk
                      ? 'Review your Setup — timeline, nomination form & judging (these lock at publish)'
                      : 'Enter required details in Setup — name, dates & voting rounds'}
                  </span>
                  <ChevronRight size={16} style={{ color: colors.gold.primary, flexShrink: 0 }} />
                </button>

                {/* Review public page */}
                <button onClick={() => onNavigateToTab?.('site')} style={rowStyle()}>
                  <Globe size={16} style={{ color: colors.gold.primary, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>Review your public page — branding &amp; About</span>
                  <ChevronRight size={16} style={{ color: colors.gold.primary, flexShrink: 0 }} />
                </button>

                {/* Stripe KYC */}
                <button
                  onClick={stripeOk ? undefined : () => goTo('host-connect-card')}
                  disabled={stripeOk}
                  style={{ ...rowStyle(!stripeOk), ...(stripeOk ? { background: 'transparent', border: '1px solid transparent', color: colors.text.primary } : {}) }}
                >
                  {stripeOk ? <CheckCircle size={16} style={{ color: colors.status.success, flexShrink: 0 }} /> : <Circle size={16} style={{ color: colors.text.muted, flexShrink: 0 }} />}
                  <span style={{ flex: 1 }}>Complete Stripe identity verification (KYC)</span>
                  {!stripeOk && <ChevronRight size={16} style={{ color: colors.gold.primary, flexShrink: 0 }} />}
                </button>
              </div>

              {/* Reviewed-and-ready confirmation */}
              <label style={{
                display: 'flex', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.lg,
                cursor: 'pointer', color: colors.text.secondary, fontSize: typography.fontSize.sm, lineHeight: 1.5,
              }}>
                <input
                  type="checkbox"
                  checked={reviewConfirmed}
                  onChange={(e) => setReviewConfirmed(e.target.checked)}
                  style={{ marginTop: 3, accentColor: colors.gold.primary, flexShrink: 0 }}
                />
                <span>I’ve entered everything required and reviewed my Setup and public page. I understand the locked details can’t change after I publish.</span>
              </label>

              <Button onClick={() => callRpc('publish_to_public')} disabled={!stripeOk || !rulesOk || !reviewConfirmed || busy} icon={busy ? Loader : Rocket}>
                {busy ? 'Publishing…' : 'Publish to public'}
              </Button>
              {publishHint && <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs, marginTop: spacing.sm }}>{publishHint}</p>}
            </>
          );
        })()}

        {status === 'publish' && (
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
            🎉 <strong>Published</strong> — your competition page is live to the public. Entry opens on your nomination start date.
          </p>
        )}
        {status === 'nomination' && (
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
            📝 <strong>Entry period open</strong> — applications / nominations are being collected.
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
