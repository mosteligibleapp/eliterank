import React, { useMemo } from 'react';
import { Eye } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../../../../styles/theme';
import { useResponsive } from '../../../../hooks/useResponsive';
import CurrentPhaseCard from '../../../overview/components/CurrentPhaseCard';
import UpcomingCard from '../../../overview/components/UpcomingCard';
import Leaderboard from '../../../overview/components/Leaderboard';

export default function OverviewTab({
  competition,
  contestants,
  events,
  onViewPublicSite,
}) {
  const competitionName = competition?.name || 'Competition';
  const { isMobile } = useResponsive();

  // Sort contestants by votes (descending) for proper ranking
  const rankedContestants = useMemo(() => {
    return [...contestants].sort((a, b) => (b.votes || 0) - (a.votes || 0));
  }, [contestants]);

  return (
    <div>
      {/* Two Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
        gap: isMobile ? spacing.lg : spacing.xl,
        marginBottom: isMobile ? spacing.xl : spacing.xxxl,
      }}>
        <CurrentPhaseCard competition={competition} />
        <UpcomingCard events={events} />
      </div>

      {/* Leaderboard - sorted by votes */}
      <Leaderboard contestants={rankedContestants} title={`${competitionName} Top Contestants`} />

      {/* Footer Actions */}
      {onViewPublicSite && (
        <div style={{
          marginTop: spacing.xxxl,
          paddingTop: spacing.xl,
          borderTop: `1px solid ${colors.border.light}`,
          display: 'flex',
          justifyContent: 'center',
        }}>
          <button
            onClick={onViewPublicSite}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))',
              border: `1px solid ${colors.gold.primary}`,
              borderRadius: borderRadius.pill,
              padding: `${spacing.lg} ${spacing.xxl}`,
              color: colors.gold.primary,
              fontSize: typography.fontSize.md,
              fontWeight: typography.fontWeight.semibold,
              cursor: 'pointer',
            }}
          >
            <Eye size={18} />
            Preview Competition as Public
          </button>
        </div>
      )}
    </div>
  );
}
