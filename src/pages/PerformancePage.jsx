/**
 * PerformancePage — contestant-facing performance dashboard.
 *
 * For each competition the signed-in user entered, shows their lifetime vote
 * total broken down into free / paid / bonus, how far they advanced (named
 * rounds), the rewards their advancement earned (read-only, with claiming
 * handled on the dedicated Rewards page), and the contestants they faced.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Trophy, Check, ChevronRight, Eye, Gift } from 'lucide-react';
import { useSupabaseAuth } from '../hooks';
import usePerformanceDashboard from '../hooks/usePerformanceDashboard';
import { useResponsive } from '../hooks/useResponsive';
import { PageHeader, OrganizationLogo } from '../components/ui';
import EmptyState from '../components/common/EmptyState';
import { getCompetitionUrl } from '../utils/slugs';
import { SAMPLE_PERFORMANCE } from '../lib/samplePerformance';
import { colors, spacing, borderRadius, typography } from '../styles/theme';

// Status chip styling for an earned reward. Pending rewards instead route to
// the Rewards tab to claim, so they don't need an entry here.
const REWARD_STATUS = {
  claimed: { color: colors.status.info, label: 'Claimed' },
  shipped: { color: colors.status.info, label: 'Shipped' },
  active: { color: colors.status.success, label: 'Active' },
  completed: { color: colors.text.muted, label: 'Completed' },
  expired: { color: colors.status.error, label: 'Expired' },
};

// Vote-type palette. Per the brand rules accent colors are reserved for data
// visualization — this breakdown is exactly that. Paid leans on the gold
// accent (premium), free stays neutral silver, bonus uses the cyan accent.
const VOTE_TYPES = [
  { key: 'freeVotes', label: 'Free', color: colors.text.secondary },
  { key: 'paidVotes', label: 'Paid', color: colors.gold.primary },
  { key: 'bonusVotes', label: 'Bonus', color: colors.accent.cyan },
];

function formatNumber(n) {
  return (n ?? 0).toLocaleString('en-US');
}

// Competition.status values that mean the competition is over.
const ENDED_COMPETITION_STATUSES = new Set(['completed', 'complete', 'ended', 'archive', 'archived']);

// Reflects the competition's phase, not the contestant's outcome.
function CompetitionPhaseBadge({ competitionStatus }) {
  if (ENDED_COMPETITION_STATUSES.has(competitionStatus)) {
    return (
      <span style={{ ...styles.badge, color: colors.text.secondary, background: 'rgba(255,255,255,0.06)' }}>
        <Check size={11} /> Complete
      </span>
    );
  }
  return (
    <span style={{ ...styles.badge, color: colors.status.success, background: colors.status.successMuted }}>
      Active
    </span>
  );
}

function VoteBreakdown({ entry }) {
  const total = entry.totalVotes || 0;
  const segments = VOTE_TYPES.map((t) => ({
    ...t,
    value: entry[t.key] || 0,
    pct: total > 0 ? (entry[t.key] || 0) / total : 0,
  }));

  return (
    <div style={styles.breakdown}>
      <div style={styles.totalRow}>
        <div>
          <div style={styles.totalLabel}>Total votes this competition</div>
          <div style={styles.totalValue}>{formatNumber(total)}</div>
        </div>
        <div style={styles.placement}>
          <span style={styles.placementRank}>#{entry.placement}</span>
          <span style={styles.placementOf}>of {entry.fieldSize}</span>
        </div>
      </div>

      {/* Stacked proportion bar */}
      <div style={styles.bar}>
        {total > 0 ? (
          segments.map((s) => (
            s.value > 0 && (
              <div
                key={s.key}
                style={{ width: `${s.pct * 100}%`, background: s.color, height: '100%' }}
                title={`${s.label}: ${formatNumber(s.value)}`}
              />
            )
          ))
        ) : (
          <div style={{ width: '100%', background: 'rgba(255,255,255,0.06)', height: '100%' }} />
        )}
      </div>

      {/* Per-type tiles */}
      <div style={styles.tiles}>
        {segments.map((s) => (
          <div key={s.key} style={styles.tile}>
            <div style={styles.tileHead}>
              <span style={{ ...styles.dot, background: s.color }} />
              <span style={styles.tileLabel}>{s.label}</span>
            </div>
            <div style={styles.tileValue}>{formatNumber(s.value)}</div>
            <div style={styles.tilePct}>
              {total > 0 ? `${Math.round(s.pct * 100)}%` : '—'}
            </div>
          </div>
        ))}
      </div>

      {/* How far they advanced — named round chips, filled up to the round
          they reached. */}
      {entry.rounds && entry.rounds.length > 0 && (() => {
        const reached = entry.rounds.filter((r) => r.order <= entry.roundsReached);
        const furthest = reached.length ? reached[reached.length - 1].label : null;
        return (
          <div style={styles.roundsBlock}>
            <div style={styles.roundsHead}>
              <span style={styles.roundsLabel}>Rounds reached</span>
              {furthest && <span style={styles.roundsValue}>{furthest}</span>}
            </div>
            <div style={styles.roundsChips}>
              {entry.rounds.map((r) => {
                const isReached = r.order <= entry.roundsReached;
                return (
                  <span
                    key={r.order}
                    style={{
                      ...styles.roundChip,
                      ...(isReached ? styles.roundChipReached : styles.roundChipMuted),
                    }}
                  >
                    {r.label}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function RewardsEarned({ rewards, onClaim }) {
  return (
    <div style={styles.compSection}>
      <div style={styles.compSectionHead}>
        <span style={styles.compSectionTitle}>Rewards earned</span>
        <span style={styles.compSectionCount}>{rewards.length}</span>
      </div>
      <div style={styles.rewardList}>
        {rewards.map((a) => {
          const r = a.reward || {};
          const isPending = a.status === 'pending';
          const statusMeta = REWARD_STATUS[a.status];
          return (
            <div key={a.id} style={styles.rewardRow}>
              <div
                style={{
                  ...styles.rewardThumb,
                  background: r.image_url
                    ? `url(${r.image_url}) center/cover`
                    : 'rgba(212,175,55,0.12)',
                }}
              >
                {!r.image_url && <Gift size={16} style={{ color: colors.gold.primary }} />}
              </div>
              <div style={styles.rewardText}>
                <span style={styles.rewardName}>{r.name || 'Reward'}</span>
                {isPending ? (
                  <span style={styles.rewardSubPending}>Ready to claim</span>
                ) : statusMeta ? (
                  <span style={styles.rewardSub}>
                    <span style={{ ...styles.statusDot, background: statusMeta.color }} />
                    {statusMeta.label}
                  </span>
                ) : null}
              </div>
              {isPending ? (
                <button type="button" style={styles.claimBtn} onClick={onClaim}>
                  Claim
                  <ChevronRight size={13} />
                </button>
              ) : r.cash_value ? (
                <span style={styles.rewardValue}>${Number(r.cash_value).toLocaleString()}</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompetitorRow({ competitor }) {
  const initials = (competitor.name?.[0] || '?').toUpperCase();
  return (
    <div style={styles.compRow}>
      <div
        style={{
          ...styles.compAvatar,
          background: competitor.avatarUrl
            ? `url(${competitor.avatarUrl}) center/cover`
            : 'rgba(212,175,55,0.15)',
        }}
      >
        {!competitor.avatarUrl && initials}
      </div>
      <div style={styles.compText}>
        <div style={styles.compNameRow}>
          <span style={styles.compName}>{competitor.name}</span>
          {competitor.status === 'winner' && (
            <Trophy size={12} style={{ color: colors.gold.primary, flexShrink: 0 }} />
          )}
        </div>
        <div style={styles.compMeta}>
          {competitor.city && <span>{competitor.city}</span>}
          {competitor.city && <span style={styles.metaDot}>·</span>}
          <span>{formatNumber(competitor.votes)} votes</span>
        </div>
      </div>
    </div>
  );
}

function CompetitionCard({ entry, isMobile, onOpenCompetition, onClaim }) {
  return (
    <div style={styles.card}>
      {/* Header */}
      <button
        type="button"
        onClick={() => onOpenCompetition(entry)}
        style={styles.cardHeader}
      >
        {entry.orgLogo && (
          <OrganizationLogo logo={entry.orgLogo} size={isMobile ? 44 : 52} />
        )}
        <div style={styles.headerText}>
          <div style={styles.headerTitleRow}>
            <h3 style={styles.compTitle}>{entry.competitionName}</h3>
            <CompetitionPhaseBadge competitionStatus={entry.competitionStatus} />
          </div>
          {entry.citySeason && <div style={styles.compSub}>{entry.citySeason}</div>}
        </div>
        <ChevronRight size={18} style={{ color: colors.text.tertiary, flexShrink: 0 }} />
      </button>

      <VoteBreakdown entry={entry} />

      {/* Rewards earned — what their advancement was worth */}
      {entry.rewards && entry.rewards.length > 0 && (
        <RewardsEarned rewards={entry.rewards} onClaim={onClaim} />
      )}

      {/* Competitors */}
      <div style={styles.compSection}>
        <div style={styles.compSectionHead}>
          <span style={styles.compSectionTitle}>
            Who you competed with
          </span>
          <span style={styles.compSectionCount}>{entry.competitors.length}</span>
        </div>
        {entry.competitors.length === 0 ? (
          <p style={styles.compEmpty}>No other contestants in this competition yet.</p>
        ) : (
          <div style={styles.compList}>
            {entry.competitors.map((c) => (
              <CompetitorRow key={c.id} competitor={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PerformancePage() {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const { user, profile } = useSupabaseAuth();
  const { competitions, loading } = usePerformanceDashboard(user?.id);

  // Earned rewards are shown here read-only; claiming/tracking/shipping still
  // lives on the dedicated Rewards page, so a pending reward routes there.
  const goToRewards = () => navigate('/rewards');

  // Super admins with no real contestant entries see sample data so they can
  // review the populated layout. It's a render-only preview — nothing is
  // written to the database, so it can't leak onto public leaderboards.
  const isSamplePreview = !loading
    && competitions.length === 0
    && profile?.is_super_admin === true;
  const data = isSamplePreview ? SAMPLE_PERFORMANCE : competitions;

  const handleOpenCompetition = (entry) => {
    if (entry.orgSlug && entry.competitionSlug) {
      navigate(getCompetitionUrl(entry.orgSlug, entry.competitionSlug));
    } else if (entry.orgSlug) {
      navigate(`/${entry.orgSlug}/id/${entry.competitionId}`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.background.primary }}>
      <PageHeader title="Performance" />

      <div style={{
        maxWidth: '760px',
        margin: '0 auto',
        padding: isMobile ? spacing.md : `${spacing.lg} ${spacing.lg} ${spacing.xxxl}`,
      }}>
        {loading ? (
          <div style={styles.loading}>Loading your performance…</div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={<BarChart3 size={32} />}
            title="No performance data yet"
            description="Once you enter a competition, your vote breakdown and the contestants you competed with will show up here."
            ctaLabel="Browse Competitions"
            onCta={() => navigate('/')}
          />
        ) : (
          <div style={styles.stack}>
            {isSamplePreview && (
              <div style={styles.sampleBanner}>
                <Eye size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>
                  <strong>Sample preview</strong> — super admins only. This is placeholder
                  data to show how a contestant's dashboard looks once they have votes. It
                  isn't saved and only you can see it.
                </span>
              </div>
            )}
            {data.map((entry) => (
              <CompetitionCard
                key={entry.competitionId}
                entry={entry}
                isMobile={isMobile}
                onOpenCompetition={handleOpenCompetition}
                onClaim={goToRewards}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  loading: {
    padding: spacing.xxl,
    textAlign: 'center',
    color: colors.text.muted,
    fontSize: typography.fontSize.sm,
  },
  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  },
  sampleBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: `${spacing.sm} ${spacing.md}`,
    background: colors.gold.muted,
    border: `1px solid ${colors.border.focus}`,
    borderRadius: borderRadius.md,
    color: colors.gold.primary,
    fontSize: typography.fontSize.xs,
    lineHeight: 1.5,
  },
  card: {
    background: colors.background.secondary,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
    padding: spacing.lg,
    background: 'transparent',
    border: 'none',
    borderBottom: `1px solid ${colors.border.secondary}`,
    cursor: 'pointer',
    textAlign: 'left',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  compTitle: {
    margin: 0,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    letterSpacing: typography.letterSpacing.tight,
  },
  compSub: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: '2px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: borderRadius.pill,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    whiteSpace: 'nowrap',
  },

  // Vote breakdown
  breakdown: {
    padding: spacing.lg,
  },
  totalRow: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  totalLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: typography.fontWeight.semibold,
  },
  totalValue: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    lineHeight: 1.1,
    fontVariantNumeric: 'tabular-nums',
  },
  placement: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  placementRank: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.gold.primary,
    fontVariantNumeric: 'tabular-nums',
  },
  placementOf: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  bar: {
    display: 'flex',
    width: '100%',
    height: '10px',
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.04)',
    marginBottom: spacing.md,
  },
  tiles: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: spacing.sm,
  },
  tile: {
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid ${colors.border.secondary}`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  tileHead: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: borderRadius.full,
    flexShrink: 0,
  },
  tileLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  tileValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1.2,
  },
  tilePct: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    fontVariantNumeric: 'tabular-nums',
  },

  // Rounds-reached progress
  roundsBlock: {
    marginTop: spacing.md,
  },
  roundsHead: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  roundsLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: typography.fontWeight.semibold,
  },
  roundsValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gold.primary,
    fontVariantNumeric: 'tabular-nums',
  },
  roundsChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  roundChip: {
    padding: `3px ${spacing.sm}`,
    borderRadius: borderRadius.pill,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    whiteSpace: 'nowrap',
  },
  roundChipReached: {
    background: colors.gold.muted,
    color: colors.gold.primary,
    border: `1px solid ${colors.border.focus}`,
  },
  roundChipMuted: {
    background: 'rgba(255,255,255,0.03)',
    color: colors.text.muted,
    border: `1px solid ${colors.border.secondary}`,
  },

  // Competitors
  compSection: {
    borderTop: `1px solid ${colors.border.secondary}`,
    padding: spacing.lg,
  },
  compSectionHead: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  compSectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  compSectionCount: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gold.primary,
    background: colors.gold.muted,
    borderRadius: borderRadius.pill,
    padding: '1px 8px',
  },
  compEmpty: {
    margin: 0,
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },

  // Rewards earned
  rewardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  rewardRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
  },
  rewardThumb: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rewardText: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  rewardName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rewardSub: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    marginTop: '1px',
  },
  rewardSubPending: {
    fontSize: typography.fontSize.xs,
    color: colors.gold.primary,
    fontWeight: typography.fontWeight.medium,
    marginTop: '1px',
  },
  statusDot: {
    width: '7px',
    height: '7px',
    borderRadius: borderRadius.full,
    flexShrink: 0,
  },
  rewardValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.status.success,
    fontVariantNumeric: 'tabular-nums',
    flexShrink: 0,
  },
  claimBtn: {
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    padding: `${spacing.xs} ${spacing.sm} ${spacing.xs} ${spacing.md}`,
    background: colors.gold.primary,
    color: colors.text.inverse,
    border: 'none',
    borderRadius: borderRadius.pill,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
  },
  compList: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  },
  compRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    padding: `${spacing.sm} 0`,
  },
  compAvatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gold.primary,
    flexShrink: 0,
  },
  compText: {
    flex: 1,
    minWidth: 0,
  },
  compNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 0,
  },
  compName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  compMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    marginTop: '1px',
  },
  metaDot: {
    color: colors.text.muted,
  },
};
