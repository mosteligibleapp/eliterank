import React from 'react';
import { Crown } from 'lucide-react';
import { Panel, Avatar } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { formatNumber } from '../../../utils/formatters';

export default function Leaderboard({ contestants, title = 'Top Contestants' }) {
  const getTrendStyle = (trend) => ({
    width: '28px',
    height: '28px',
    borderRadius: borderRadius.sm,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.md,
    background: trend === 'up'
      ? 'rgba(var(--color-success-rgb),0.15)'
      : trend === 'down'
        ? 'rgba(var(--color-error-rgb),0.15)'
        : 'rgba(255,255,255,0.05)',
    color: trend === 'up'
      ? colors.status.success
      : trend === 'down'
        ? colors.status.error
        : colors.text.secondary,
  });

  const getTrendSymbol = (trend) => {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '—';
  };

  return (
    <Panel title={title} icon={Crown}>
      <div style={{ padding: `${spacing.sm} ${spacing.xl} ${spacing.xl}` }}>
        {contestants.map((contestant, index) => (
          <div
            key={contestant.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.lg,
              padding: spacing.md,
              borderRadius: borderRadius.lg,
              background: index < 3 ? 'rgba(212,175,55,0.05)' : 'transparent',
              marginBottom: spacing.xs,
            }}
          >
            {/* Rank */}
            <div
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.secondary,
              }}
            >
              {index === 0 ? (
                <Crown size={20} style={{ color: colors.gold.primary }} />
              ) : (
                index + 1
              )}
            </div>

            {/* Avatar */}
            <Avatar name={contestant.name} size={44} />

            {/* Info */}
            <div style={{ flex: 1 }}>
              <span
                style={{
                  fontWeight: typography.fontWeight.medium,
                  color: '#fff',
                  display: 'block',
                }}
              >
                {contestant.name}
              </span>
              <span style={{ fontSize: typography.fontSize.base, color: colors.text.secondary }}>
                {formatNumber(contestant.votes)} votes
              </span>
            </div>

            {/* Trend */}
            <div style={getTrendStyle(contestant.trend)}>
              {getTrendSymbol(contestant.trend)}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
