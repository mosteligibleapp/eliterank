import React from 'react';
import { ArrowLeft, Sparkles, Info, Trophy, Users, Megaphone, ShieldCheck } from 'lucide-react';
import { Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';

/**
 * HostLandingEmptyState — the first thing a brand-new host sees before they have
 * a competition. It's intentionally aspirational + explanatory: what a social
 * competition is, who hosts them, and what it takes to run one — then a clear
 * "Create a competition" / "Learn more" choice, plus a way back.
 */

const WHAT_IT_TAKES = [
  {
    Icon: Sparkles,
    title: 'Set it up',
    body: 'Pick a category, who can enter, and how winners are chosen. We handle vote pricing and the public site.',
  },
  {
    Icon: ShieldCheck,
    title: 'Get approved',
    body: 'Sign the Host Agreement and verify payouts with Stripe. EliteRank reviews and approves before anything goes public.',
  },
  {
    Icon: Trophy,
    title: 'Go live & crown a winner',
    body: 'Entries open, the public votes, and you celebrate your winner. Paid voting funds the prizes and your payout.',
  },
];

const WONT_GO_LIVE_UNTIL = [
  'The EliteRank team approves your competition',
  'Your Stripe identity verification (KYC) is approved',
  'You’ve signed the Host Agreement',
];

const cardStyle = {
  background: colors.background.secondary,
  border: `1px solid ${colors.border.primary}`,
  borderRadius: borderRadius.lg,
  padding: spacing.xl,
  textAlign: 'left',
};

function ExplainerCard({ Icon, eyebrow, title, children }) {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
        <div style={{ width: 36, height: 36, borderRadius: borderRadius.md, background: colors.gold.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={18} style={{ color: colors.gold.primary }} />
        </div>
        {eyebrow && (
          <span style={{ color: colors.text.muted, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 }}>{eyebrow}</span>
        )}
      </div>
      {title && <h3 style={{ color: colors.text.primary, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.sm}` }}>{title}</h3>}
      <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, lineHeight: 1.6, margin: 0 }}>{children}</p>
    </div>
  );
}

export default function HostLandingEmptyState({ onCreate, onLearnMore, onBack }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: colors.background.primary,
      color: colors.text.primary,
      overflowY: 'auto',
      padding: `${spacing.lg} ${spacing.lg} ${spacing.xxxl}`,
    }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        {/* Top bar — back */}
        <div style={{ paddingTop: spacing.sm, marginBottom: spacing.xxl }}>
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={onBack} style={{ width: 'auto' }}>
            Back to competitions
          </Button>
        </div>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: spacing.xxxl }}>
          <div style={{
            width: 72, height: 72, margin: `0 auto ${spacing.lg}`,
            background: colors.gold.muted, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem',
          }}>
            👑
          </div>
          <h1 style={{ color: colors.gold.primary, fontSize: typography.fontSize['3xl'] || typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, margin: `0 0 ${spacing.md}` }}>
            Host your own social competition
          </h1>
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.lg, lineHeight: 1.6, maxWidth: 600, margin: '0 auto' }}>
            Turn your audience into a movement. Run a city-, state-, or nationwide
            contest where the public nominates, votes, and crowns a winner — and
            give people a title they’re proud to promote.
          </p>
          <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap', justifyContent: 'center', marginTop: spacing.xl }}>
            <Button onClick={onCreate} icon={Sparkles} style={{ width: 'auto' }}>Create a competition</Button>
            <Button variant="outline" onClick={onLearnMore} icon={Info} style={{ width: 'auto' }}>Learn more</Button>
          </div>
        </div>

        {/* What it is / who hosts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: spacing.lg, marginBottom: spacing.xl }}>
          <ExplainerCard Icon={Megaphone} eyebrow="What it is">
            A social competition is part contest, part fundraiser, and part the
            buzziest event your community has seen. People enter or get nominated,
            the public pays to vote, and one standout earns a title like
            “Realtor of the Year.”
          </ExplainerCard>
          <ExplainerCard Icon={Users} eyebrow="Who hosts them">
            Brands, creators, associations, nonprofits, and local businesses —
            anyone with a community worth celebrating. You’re the host; EliteRank
            powers voting, payments, and the public site.
          </ExplainerCard>
        </div>

        {/* What it takes */}
        <div style={{ marginBottom: spacing.xl }}>
          <h2 style={{ color: colors.text.primary, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, textAlign: 'center', margin: `0 0 ${spacing.lg}` }}>
            What it takes to run one
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: spacing.lg }}>
            {WHAT_IT_TAKES.map(({ Icon, title, body }, i) => (
              <div key={title} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: colors.gold.primary, color: colors.text.inverse, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, flexShrink: 0 }}>{i + 1}</div>
                  <Icon size={18} style={{ color: colors.gold.primary }} />
                </div>
                <h3 style={{ color: colors.text.primary, fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.xs}` }}>{title}</h3>
                <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, lineHeight: 1.6, margin: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Reassurance */}
        <div style={{ ...cardStyle, background: colors.background.card }}>
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, margin: `0 0 ${spacing.sm}` }}>
            Nothing goes public until you’re ready. Your competition won’t go live until:
          </p>
          {WONT_GO_LIVE_UNTIL.map((t) => (
            <div key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.sm, color: colors.text.muted, fontSize: typography.fontSize.sm, marginBottom: spacing.xs }}>
              <ShieldCheck size={15} style={{ color: colors.gold.primary, flexShrink: 0, marginTop: 2 }} />
              <span>{t}</span>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: 'center', marginTop: spacing.xxl }}>
          <Button onClick={onCreate} icon={Sparkles} style={{ width: 'auto' }}>Create a competition</Button>
        </div>
      </div>
    </div>
  );
}
