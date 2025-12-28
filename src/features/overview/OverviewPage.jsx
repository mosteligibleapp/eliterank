import React from 'react';
import { Globe, Eye } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import RevenueCard from './components/RevenueCard';
import HostPayoutCard from './components/HostPayoutCard';
import RankingCard from './components/RankingCard';
import CurrentPhaseCard from './components/CurrentPhaseCard';
import TrafficCard from './components/TrafficCard';
import UpcomingCard from './components/UpcomingCard';
import CompetitionOverview from './components/CompetitionOverview';
import Leaderboard from './components/Leaderboard';

export default function OverviewPage({
  hostCompetition,
  contestants,
  sponsors,
  events,
  competitionRankings,
  onViewPublicSite,
  onViewEliteRankCity,
}) {
  // Calculate revenue from actual data
  const sponsorshipTotal = sponsors.reduce((sum, s) => sum + s.amount, 0);
  const revenueData = {
    total: sponsorshipTotal, // Only sponsorships for now, add votes/tickets when implemented
    sponsorships: sponsorshipTotal,
    paidVotes: 0,
    eventTickets: 0,
  };

  // Extract city name from competition name (e.g., "Chicago Most Eligible 2026" -> "Chicago")
  const cityName = hostCompetition?.name?.split(' ')[0] || 'Your City';

  return (
    <div>
      {/* First Row - 3 Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: spacing.xl,
          marginBottom: spacing.xxxl,
        }}
      >
        <RevenueCard revenueData={revenueData} sponsors={sponsors} />
        <HostPayoutCard totalRevenue={revenueData.total} />
        <RankingCard
          competitionRankings={competitionRankings}
          currentCity={cityName}
          currentRevenue={revenueData.total}
        />
      </div>

      {/* Second Row - 3 Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: spacing.xl,
          marginBottom: spacing.xxxl,
        }}
      >
        <CurrentPhaseCard competition={hostCompetition} />
        <TrafficCard />
        <UpcomingCard events={events} />
      </div>

      {/* Competition Overview */}
      <CompetitionOverview
        competition={hostCompetition}
        onViewPublicSite={onViewPublicSite}
      />

      {/* Leaderboard */}
      <Leaderboard contestants={contestants} title={`${cityName} Top Contestants`} />

      {/* Footer Actions */}
      <div
        style={{
          marginTop: spacing.xxxl,
          paddingTop: spacing.xl,
          borderTop: `1px solid ${colors.border.light}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: spacing.lg,
        }}
      >
        {/* Preview My Competition Button */}
        {hostCompetition && onViewPublicSite && (
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
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.2))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))';
            }}
          >
            <Eye size={18} />
            Preview My Competition as Public
          </button>
        )}

        {/* View All Competitions */}
        <button
          onClick={onViewEliteRankCity}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            background: 'transparent',
            border: `1px solid ${colors.border.light}`,
            borderRadius: borderRadius.pill,
            padding: `${spacing.md} ${spacing.xl}`,
            color: colors.text.secondary,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.color = colors.text.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = colors.text.secondary;
          }}
        >
          <Globe size={16} />
          View All Competitions
        </button>
      </div>
    </div>
  );
}
