import React from 'react';
import { Lock, Palette, Users, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import { Panel } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';

/**
 * LaunchRoadmap — the "what happens next & what can I still change" guide shown
 * on the Status page once a host has submitted for approval.
 *
 * It orients the host around the path to going live and, crucially, what they
 * can vs. can't still touch — grouped into three plain-language tiers:
 *   1. Locked in   — the competition's definition + (at publish) its public
 *                    rules/dates. Fixed because contestants and voters rely on
 *                    them. (SUBMIT_LOCK / PUBLISH_LOCK)
 *   2. Brand & experience — the host's presentation, editable as they polish.
 *   3. People & rewards   — contestants, judges, sponsors & prizes: managed any
 *                    time, even after going live (e.g. a judge steps down, a new
 *                    sponsor comes aboard).
 */
export default function LaunchRoadmap({ competition, onNavigateToTab }) {
  const status = competition?.status || 'draft';
  // Only relevant after the host has submitted and is heading toward live.
  if (!['pending_approval', 'approved', 'publish'].includes(status)) return null;

  const published = status === 'publish';

  // The single most relevant "next move" line, by phase.
  const nextStep = status === 'pending_approval'
    ? 'EliteRank is reviewing your competition. Next, you’ll verify payouts with Stripe, then publish your page to the public.'
    : status === 'approved'
      ? 'You’re approved. Verify payouts with Stripe, then publish your page — entry opens on your nomination start date.'
      : 'Your page is live to the public. Entry opens on your nomination start date, then voting begins.';

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
  const linkBtn = (label, tab) => onNavigateToTab ? (
    <button
      onClick={() => onNavigateToTab(tab)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs,
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        color: colors.gold.primary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium,
      }}
    >
      {label} <ArrowRight size={14} />
    </button>
  ) : null;

  return (
    <Panel title="What happens next" icon={Sparkles} style={{ marginBottom: 0 }}>
      <div style={{ padding: spacing.xl }}>
        <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, lineHeight: 1.6, margin: `0 0 ${spacing.lg}` }}>
          {nextStep} Here’s what’s set in stone now and what you can still shape as you go.
        </p>

        <div style={{ display: 'grid', gap: spacing.md }}>
          {/* 1 — Locked in */}
          <div style={cardStyle}>
            {headRow(Lock, 'Locked in — the rules of your competition', 'rgba(212,175,55,0.12)')}
            <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs, margin: 0, lineHeight: 1.5 }}>
              These are fixed because contestants and voters rely on them. Need a correction? Email{' '}
              <a href="mailto:info@eliterank.co" style={{ color: colors.gold.primary }}>info@eliterank.co</a>.
            </p>
            {itemList([
              'Who can enter — gender, location/territory, and the 18+ age requirement',
              'How winners are chosen, and how many winners',
              'Entry type (nomination or application)',
              'Your competition name and organization',
            ])}
            <div style={{
              marginTop: spacing.xs, padding: spacing.sm, borderRadius: borderRadius.md,
              background: published ? 'rgba(212,175,55,0.06)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${colors.border.lighter}`,
              display: 'flex', gap: spacing.xs, alignItems: 'flex-start',
            }}>
              <ShieldCheck size={14} style={{ color: colors.gold.primary, flexShrink: 0, marginTop: 2 }} />
              <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.xs, lineHeight: 1.5 }}>
                {published
                  ? 'Now that you’re published, these are also locked: nomination & voting dates, judging criteria, the nomination form, and your rules.'
                  : 'Still editable until you publish — then they lock too: nomination & voting dates, judging criteria, the nomination form, and your rules. Get them right before you publish.'}
              </span>
            </div>
          </div>

          {/* 2 — Brand & experience */}
          <div style={cardStyle}>
            {headRow(Palette, 'Your brand & experience — make it yours', 'rgba(212,175,55,0.12)')}
            <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs, margin: 0, lineHeight: 1.5 }}>
              Polish how your competition looks and feels — adjust these any time.
            </p>
            {itemList([
              'Organization logo & branding',
              'Theme color',
              'Your About / story section',
              'Events and announcements',
            ])}
            {linkBtn('Edit your public page', 'site')}
          </div>

          {/* 3 — People & rewards */}
          <div style={cardStyle}>
            {headRow(Users, 'People & rewards — manage any time', 'rgba(212,175,55,0.12)')}
            <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs, margin: 0, lineHeight: 1.5 }}>
              These stay in your hands throughout — even after you go live.
            </p>
            {itemList([
              'Contestants & nominees — approve, add, and manage your lineup',
              'Judges — swap in a replacement if one steps down',
              'Sponsors & prizes — add more reward for contestants any time',
            ])}
            {linkBtn('Go to People', 'people')}
          </div>
        </div>
      </div>
    </Panel>
  );
}
