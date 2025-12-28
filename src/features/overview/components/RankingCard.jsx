import React from 'react';
import { Trophy } from 'lucide-react';
import { colors, spacing, borderRadius, typography, gradients } from '../../../styles/theme';
import { formatCurrency } from '../../../utils/formatters';

export default function RankingCard({ competitionRankings, currentCity, currentRevenue }) {
  const hasRankings = competitionRankings && competitionRankings.length > 0;
  const currentRank = hasRankings ? competitionRankings.find((c) => c.city === currentCity) : null;
  const isFirst = currentRank?.rank === 1;
  const totalCompetitions = hasRankings ? competitionRankings.length : 0;

  const cardStyle = {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    background: isFirst
      ? 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))'
      : colors.background.card,
    border: isFirst
      ? `1px solid ${colors.border.gold}`
      : `1px solid ${colors.border.light}`,
  };

  const iconBoxStyle = {
    width: '52px',
    height: '52px',
    borderRadius: borderRadius.lg,
    background: isFirst ? gradients.gold : 'rgba(139,92,246,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.base, marginBottom: spacing.sm }}>
            National Ranking
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing.sm }}>
            <p style={{ fontSize: typography.fontSize.display, fontWeight: typography.fontWeight.semibold, color: isFirst ? colors.gold.primary : '#fff' }}>
              {currentRank ? `#${currentRank.rank}` : '#'}
            </p>
            <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.md }}>
              of {totalCompetitions}
            </span>
          </div>
        </div>
        <div style={iconBoxStyle}>
          <Trophy size={26} style={{ color: isFirst ? '#0a0a0f' : colors.status.purple }} />
        </div>
      </div>

      {/* Mini Leaderboard */}
      <div style={{ marginTop: spacing.lg }}>
        <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.xs, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: spacing.md }}>
          Revenue Leaderboard
        </p>
        {hasRankings ? (
          competitionRankings.slice(0, 3).map((comp, i) => (
            <div
              key={comp.city}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: `${spacing.sm} ${spacing.md}`,
                background: comp.city === currentCity ? 'rgba(212,175,55,0.1)' : 'transparent',
                borderRadius: borderRadius.sm,
                marginBottom: spacing.xs,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: borderRadius.sm,
                    background: i === 0 ? gradients.gold : i === 1 ? gradients.platinum : gradients.bronze,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.bold,
                    color: '#0a0a0f',
                  }}
                >
                  {comp.rank}
                </span>
                <span
                  style={{
                    fontSize: typography.fontSize.base,
                    color: comp.city === currentCity ? colors.gold.primary : colors.text.light,
                    fontWeight: comp.city === currentCity ? typography.fontWeight.semibold : typography.fontWeight.normal,
                  }}
                >
                  {comp.city} {comp.city === currentCity && '(You)'}
                </span>
              </div>
              <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                ${(comp.revenue / 1000).toFixed(0)}k
              </span>
            </div>
          ))
        ) : (
          <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm, textAlign: 'center', padding: spacing.lg }}>
            No ranking data available yet
          </p>
        )}
      </div>
    </div>
  );
}
