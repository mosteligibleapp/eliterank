import React from 'react';
import { Globe } from 'lucide-react';
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
  competitions,
  contestants,
  sponsors,
  events,
  competitionRankings,
  onViewPublicSite,
  onViewEliteRankCity,
}) {
  // Calculate revenue data
  const sponsorshipTotal = sponsors.reduce((sum, s) => sum + s.amount, 0);
  const revenueData = {
    total: 125500,
    sponsorships: sponsorshipTotal,
    paidVotes: 42500,
    eventTickets: 20000,
  };

  const currentCompetition = competitions[0];

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
          currentCity="New York"
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
        <CurrentPhaseCard events={events} />
        <TrafficCard />
        <UpcomingCard events={events} />
      </div>

      {/* Competition Overview */}
      <CompetitionOverview
        competition={currentCompetition}
        onViewPublicSite={onViewPublicSite}
      />

      {/* Leaderboard */}
      <Leaderboard contestants={contestants} title="New York Top Contestants" />

      {/* Footer */}
      <div
        style={{
          marginTop: spacing.xxxl,
          paddingTop: spacing.xl,
          borderTop: `1px solid ${colors.border.light}`,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <button
          onClick={onViewEliteRankCity}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            background: 'transparent',
            border: `1px solid ${colors.border.gold}`,
            borderRadius: borderRadius.pill,
            padding: `${spacing.md} ${spacing.xl}`,
            color: colors.gold.primary,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(212,175,55,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <Globe size={16} />
          View Elite Rank City - All Competitions
        </button>
      </div>
    </div>
  );
}
