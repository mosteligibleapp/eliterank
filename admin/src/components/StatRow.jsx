import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { colors, spacing, borderRadius, typography, transitions } from '@shared/styles/theme';
import { useResponsive } from '@shared/hooks/useResponsive';

/**
 * A row of compact stat cards for summary metrics.
 *
 * @param {Object} props
 * @param {Array<{label: string, value: string|number, icon?: React.ElementType, color?: string, change?: string|number}>} props.stats
 */
export default function StatRow({ stats = [] }) {
  const { isMobile } = useResponsive();

  const styles = {
    container: {
      display: 'grid',
      gridTemplateColumns: isMobile
        ? 'repeat(2, 1fr)'
        : `repeat(${Math.min(stats.length, 6)}, 1fr)`,
      gap: spacing.md,
    },
    card: {
      display: 'flex',
      alignItems: 'center',
      gap: spacing.md,
      padding: `${spacing.md} ${spacing.lg}`,
      background: colors.background.card,
      border: `1px solid ${colors.border.primary}`,
      borderRadius: borderRadius.lg,
      minHeight: '64px',
      transition: transitions.colors,
    },
    iconBox: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '36px',
      height: '36px',
      borderRadius: borderRadius.md,
      flexShrink: 0,
    },
    content: {
      display: 'flex',
      flexDirection: 'column',
      gap: spacing[0.5],
      minWidth: 0,
    },
    label: {
      fontSize: typography.fontSize.xs,
      color: colors.text.tertiary,
      fontWeight: typography.fontWeight.medium,
      textTransform: 'uppercase',
      letterSpacing: typography.letterSpacing.wide,
      lineHeight: typography.lineHeight.none,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    value: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.bold,
      color: colors.text.primary,
      lineHeight: typography.lineHeight.tight,
    },
    change: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: spacing[0.5],
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.none,
    },
  };

  return (
    <div style={styles.container}>
      {stats.map((stat, idx) => {
        const iconColor = stat.color || colors.gold.primary;
        const iconBg = stat.color
          ? `${stat.color}15`
          : colors.gold.muted;
        const Icon = stat.icon;

        const changeNum = stat.change != null ? parseFloat(stat.change) : null;
        const isPositive = changeNum != null && changeNum > 0;
        const isNegative = changeNum != null && changeNum < 0;
        const changeColor = isPositive
          ? colors.status.success
          : isNegative
            ? colors.status.error
            : colors.text.tertiary;

        return (
          <div key={idx} style={styles.card}>
            {Icon && (
              <div style={{ ...styles.iconBox, background: iconBg }}>
                <Icon size={18} style={{ color: iconColor }} />
              </div>
            )}
            <div style={styles.content}>
              <span style={styles.label}>{stat.label}</span>
              <span style={styles.value}>{stat.value}</span>
              {stat.change != null && (
                <span style={{ ...styles.change, color: changeColor }}>
                  {isPositive && <TrendingUp size={10} />}
                  {isNegative && <TrendingDown size={10} />}
                  {isPositive ? '+' : ''}{stat.change}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
