import React from 'react';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { useResponsive } from '../../../hooks/useResponsive';

/**
 * MetricCard - Reusable card for displaying a metric with optional progress bar
 */
export default function MetricCard({
  icon: Icon,
  label,
  value,
  goal,
  goalLabel,
  warning,
  cta,
  onCtaClick,
  iconColor = colors.gold.primary,
  variant = 'default', // 'default' | 'gold' | 'warning' | 'success'
}) {
  const { isMobile } = useResponsive();
  const progress = goal ? Math.min((value / goal) * 100, 100) : null;
  const isGoalMet = goal && value >= goal;

  const variantStyles = {
    default: {
      background: colors.background.card,
      border: `1px solid ${colors.border.light}`,
      progressBg: 'rgba(255,255,255,0.1)',
      progressFill: 'linear-gradient(90deg, #60a5fa, #3b82f6)',
    },
    gold: {
      background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
      border: `1px solid ${colors.border.gold}`,
      progressBg: 'rgba(212,175,55,0.2)',
      progressFill: 'linear-gradient(90deg, #d4af37, #f4d03f)',
    },
    warning: {
      background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.05))',
      border: '1px solid rgba(251,191,36,0.3)',
      progressBg: 'rgba(251,191,36,0.2)',
      progressFill: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
    },
    success: {
      background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
      border: '1px solid rgba(34,197,94,0.3)',
      progressBg: 'rgba(34,197,94,0.2)',
      progressFill: 'linear-gradient(90deg, #22c55e, #4ade80)',
    },
  };

  const style = variantStyles[variant] || variantStyles.default;

  return (
    <div style={{
      padding: isMobile ? spacing.md : spacing.lg,
      borderRadius: borderRadius.xl,
      background: style.background,
      border: style.border,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
      }}>
        {Icon && (
          <div style={{
            width: isMobile ? '28px' : '32px',
            height: isMobile ? '28px' : '32px',
            borderRadius: borderRadius.md,
            background: 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon size={isMobile ? 14 : 16} style={{ color: iconColor }} />
          </div>
        )}
        <span style={{
          color: colors.text.secondary,
          fontSize: isMobile ? typography.fontSize.xs : typography.fontSize.sm,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {label}
        </span>
      </div>

      {/* Value */}
      <div style={{
        fontSize: isMobile ? typography.fontSize.xl : typography.fontSize.xxl,
        fontWeight: typography.fontWeight.bold,
        color: '#fff',
        marginBottom: spacing.xs,
      }}>
        {value}
        {goal && (
          <span style={{
            fontSize: isMobile ? typography.fontSize.sm : typography.fontSize.md,
            fontWeight: typography.fontWeight.normal,
            color: colors.text.secondary,
          }}>
            {' / '}{goal}
          </span>
        )}
      </div>

      {/* Goal Label */}
      {goalLabel && (
        <p style={{
          fontSize: typography.fontSize.xs,
          color: colors.text.muted,
          marginBottom: spacing.sm,
        }}>
          {goalLabel}
        </p>
      )}

      {/* Progress Bar */}
      {progress !== null && (
        <div style={{ marginBottom: spacing.sm }}>
          <div style={{
            height: '6px',
            background: style.progressBg,
            borderRadius: borderRadius.xs,
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: isGoalMet ? 'linear-gradient(90deg, #22c55e, #4ade80)' : style.progressFill,
              borderRadius: borderRadius.xs,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* Warning */}
      {warning && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.xs,
          padding: `${spacing.xs} ${spacing.sm}`,
          background: 'rgba(251,191,36,0.1)',
          borderRadius: borderRadius.sm,
          marginBottom: spacing.sm,
        }}>
          <span style={{ fontSize: '12px' }}>⚠️</span>
          <span style={{
            fontSize: typography.fontSize.xs,
            color: '#fbbf24',
          }}>
            {warning}
          </span>
        </div>
      )}

      {/* CTA */}
      {cta && onCtaClick && (
        <button
          onClick={onCtaClick}
          style={{
            marginTop: 'auto',
            padding: `${spacing.sm} ${spacing.md}`,
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${colors.border.light}`,
            borderRadius: borderRadius.md,
            color: colors.text.secondary,
            fontSize: typography.fontSize.sm,
            cursor: 'pointer',
            transition: 'all 0.2s',
            textAlign: 'center',
          }}
        >
          {cta}
        </button>
      )}
    </div>
  );
}
