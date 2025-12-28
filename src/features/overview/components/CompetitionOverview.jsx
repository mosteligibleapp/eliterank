import React from 'react';
import { Crown, Eye } from 'lucide-react';
import { Button, Badge } from '../../../components/ui';
import { colors, spacing, borderRadius, typography, shadows } from '../../../styles/theme';
import { formatNumber } from '../../../utils/formatters';

// Human-readable status labels
const STATUS_LABELS = {
  setup: 'Setup',
  assigned: 'Assigned',
  nomination: 'Nominations',
  voting: 'Voting',
  judging: 'Judging',
  completed: 'Completed',
  upcoming: 'Upcoming',
  active: 'Active',
};

// Status badge variants
const STATUS_VARIANTS = {
  setup: 'default',
  assigned: 'info',
  nomination: 'warning',
  voting: 'success',
  judging: 'info',
  completed: 'purple',
  upcoming: 'default',
  active: 'success',
};

export default function CompetitionOverview({ competition, onViewPublicSite }) {
  const panelStyle = {
    background: colors.background.card,
    border: `1px solid rgba(212,175,55,0.25)`,
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
    marginBottom: spacing.xxl,
    boxShadow: shadows.card,
  };

  const cardStyle = {
    background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
    border: `1px solid ${colors.border.gold}`,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
  };

  // Handle empty/undefined competition
  const comp = competition || { contestants: 0, votes: 0, status: 'upcoming' };

  const stats = [
    { label: 'Contestants', value: comp.contestants || 0 },
    { label: 'Total Votes', value: formatNumber(comp.votes || 0) },
    { label: 'Nominations', value: 0 },
  ];

  return (
    <div style={panelStyle}>
      <div style={{ padding: spacing.xl }}>
        <div style={cardStyle}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.lg,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, fontWeight: typography.fontWeight.semibold }}>
              <Crown size={18} style={{ color: colors.gold.primary }} />
              {comp.name || 'Your Competition'}
            </div>
            <Badge variant={STATUS_VARIANTS[comp.status] || 'default'} pill uppercase>
              {STATUS_LABELS[comp.status] || comp.status}
            </Badge>
          </div>

          {/* Stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: spacing.lg,
              marginBottom: spacing.xl,
              textAlign: 'center',
            }}
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  padding: spacing.lg,
                  borderRadius: borderRadius.lg,
                }}
              >
                <div style={{ fontSize: typography.fontSize.display, fontWeight: typography.fontWeight.semibold, color: '#fff' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <Button
            onClick={onViewPublicSite}
            icon={Eye}
            fullWidth
            size="lg"
          >
            View Public Site
          </Button>
        </div>
      </div>
    </div>
  );
}
