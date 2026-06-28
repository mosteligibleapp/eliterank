import React from 'react';
import { Lock, Users, ArrowRight, Sparkles, CheckCircle2, ClipboardCheck } from 'lucide-react';
import { Panel } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';

/**
 * LaunchRoadmap — the "what happens next" guide shown on the Status page once a
 * host has submitted for approval. It conveys three things, in order:
 *
 *   1. Locked in (done) — the competition's definition, fixed the moment you
 *      submitted. Nothing to do; shown so the host knows what can't change.
 *   2. Before you publish — what the host must review, set & SAVE before going
 *      public: nomination/voting/judging timeline, judging criteria + weight,
 *      nomination form, rules, site & branding, and Stripe payout verification.
 *      The dated/rule items lock at publish, so they have to be right first.
 *   3. Fill in now (editable after publish) — sponsors, prizes, judges, hosts:
 *      add as much as possible now, but these stay adjustable after launch.
 *
 * Closing: the publish flow — once the must-haves are ready, the host submits to
 * publish, EliteRank does a final review, then the page goes live to the public.
 */
export default function LaunchRoadmap({ competition, onNavigateToTab }) {
  const status = competition?.status || 'draft';
  // Only relevant after the host has submitted and is heading toward live.
  if (!['pending_approval', 'approved', 'publish'].includes(status)) return null;

  const published = status === 'publish';
  // Company-run ("house") competitions handle payouts off-platform, so the
  // Stripe payout-verification step doesn't apply to them.
  const managed = !!competition?.managed;

  // The single most relevant "next move" line, by phase — also frames the flow.
  const nextStep = status === 'pending_approval'
    ? `EliteRank is reviewing your competition. While you wait, get everything below ready. Once you’re approved, you’ll submit your page to publish${managed ? '' : ' (after verifying payouts)'}.`
    : status === 'approved'
      ? `You’re approved! Finish the must-haves below${managed ? '' : ' and verify payouts'}, then submit your page to publish for a final review.`
      : 'Your page is live to the public. Entry opens on your nomination start date, then voting begins.';

  // Closing flow note — what "publish" actually does.
  const flowNote = status === 'pending_approval'
    ? `Once EliteRank approves you, finish the must-haves above${managed ? '' : ' and verify payouts with Stripe'} — then you’ll publish your page to take it live to the public.`
    : status === 'approved'
      ? `When the must-haves above are ready${managed ? '' : ' and your payouts are verified'}, hit Publish to take your competition live to the public.`
      : null;

  const cardStyle = {
    padding: spacing.lg,
    background: colors.background.secondary,
    border: `1px solid ${colors.border.lighter}`,
    borderRadius: borderRadius.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  };
  const headRow = (Icon, title, tint) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
      <div style={{
        width: 30, height: 30, borderRadius: borderRadius.md, flexShrink: 0,
        background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={16} style={{ color: colors.gold.primary }} />
      </div>
      <span style={{ fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.base }}>{title}</span>
    </div>
  );
  const mutedNote = (children) => (
    <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs, margin: 0, lineHeight: 1.5 }}>
      {children}
    </p>
  );
  const itemList = (items) => (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
      {items.map((it) => (
        <li key={it} style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, lineHeight: 1.5, display: 'flex', gap: spacing.xs }}>
          <span style={{ color: colors.gold.primary }}>·</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
  const linkBtn = (label, tab, section) => onNavigateToTab ? (
    <button
      onClick={() => onNavigateToTab(tab, section)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs,
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        color: colors.gold.primary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium,
      }}
    >
      {label} <ArrowRight size={14} />
    </button>
  ) : null;

  // Card 2 — "must-haves" content shifts once published (the dated/rule items
  // are then locked, and there's nothing to "review before publish").
  const mustDoItems = published
    ? [
        'Nomination, voting & judging dates',
        'Judging criteria & weighting',
        'Your nomination form',
        'Your competition rules',
      ]
    : [
        'Nomination, voting & judging timeline — your dates',
        'Judging criteria & weighting — how much judges count',
        'Your nomination form questions',
        'Your competition rules',
        'Site & branding — logo, About & theme',
        ...(managed ? [] : ['Verify payouts with Stripe (identity check)']),
      ];

  return (
    <Panel title="What happens next" icon={Sparkles} style={{ marginBottom: 0 }}>
      <div style={{ padding: spacing.xl }}>
        <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, lineHeight: 1.6, margin: `0 0 ${spacing.lg}` }}>
          {nextStep}
        </p>

        <div style={{ display: 'grid', gap: spacing.md }}>
          {/* 1 — Locked in (done) */}
          <div style={cardStyle}>
            {headRow(CheckCircle2, 'Locked in — done while we review', 'rgba(212,175,55,0.12)')}
            {mutedNote(
              <>
                Set the moment you submitted — contestants and voters rely on these, so they can’t
                change. Need a correction? Email{' '}
                <a href="mailto:info@eliterank.co" style={{ color: colors.gold.primary }}>info@eliterank.co</a>.
              </>
            )}
            {itemList([
              'Who can enter — gender, location/territory, and the 18+ age requirement',
              'How winners are chosen, and how many winners',
              'Entry type (nomination or application)',
              'Your competition name and organization',
            ])}
          </div>

          {/* 2 — Before you publish: review, set & save */}
          <div style={cardStyle}>
            {headRow(
              published ? Lock : ClipboardCheck,
              published ? 'Set at publish — now locked' : 'Before you publish — review, set & save',
              'rgba(212,175,55,0.12)'
            )}
            {mutedNote(
              published
                ? 'These locked when you published. Need a correction? Email info@eliterank.co.'
                : 'Get these right and Save them before you go public. The dates, judging, form and rules lock the moment you publish — so don’t rush it.'
            )}
            {itemList(mustDoItems)}
            {!published && (
              <div style={{ display: 'flex', gap: spacing.lg, flexWrap: 'wrap' }}>
                {linkBtn('Set these up in Setup', 'setup', 'nominationForm')}
                {linkBtn('Edit your public page', 'site')}
              </div>
            )}
          </div>

          {/* 3 — Fill in now, still editable after publish */}
          <div style={cardStyle}>
            {headRow(Users, 'Fill in now — you can still edit after publish', 'rgba(212,175,55,0.12)')}
            {mutedNote(
              'Add as much as you can before launch. Unlike the items above, you can keep adjusting these even after you’re live — though we recommend minimal changes once public.'
            )}
            {itemList([
              'Sponsors & prizes — add more reward for contestants',
              'Judges — add or swap them in if one steps down',
              'Hosts & co-hosts — update who runs the competition',
            ])}
            {linkBtn('Manage in Setup', 'setup')}
          </div>
        </div>

        {/* Closing — the publish flow */}
        {flowNote && (
          <div style={{
            marginTop: spacing.lg, padding: spacing.md, borderRadius: borderRadius.md,
            background: 'rgba(212,175,55,0.06)', border: `1px solid ${colors.border.lighter}`,
            display: 'flex', gap: spacing.sm, alignItems: 'flex-start',
          }}>
            <Sparkles size={14} style={{ color: colors.gold.primary, flexShrink: 0, marginTop: 2 }} />
            <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.xs, lineHeight: 1.5 }}>
              {flowNote}
            </span>
          </div>
        )}
      </div>
    </Panel>
  );
}
