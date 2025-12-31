import React, { memo, useMemo } from 'react';
import { colors, borderRadius, spacing, typography, transitions, components } from '../../styles/theme';

// Modern badge variants - clean, subtle colors
const variants = {
  default: {
    background: colors.gold.muted,
    color: colors.gold.primary,
    borderColor: 'transparent',
  },
  gold: {
    background: colors.gold.muted,
    color: colors.gold.primary,
    borderColor: 'transparent',
  },
  success: {
    background: colors.status.successMuted,
    color: colors.status.success,
    borderColor: 'transparent',
  },
  warning: {
    background: colors.status.warningMuted,
    color: colors.status.warning,
    borderColor: 'transparent',
  },
  error: {
    background: colors.status.errorMuted,
    color: colors.status.error,
    borderColor: 'transparent',
  },
  info: {
    background: colors.status.infoMuted,
    color: colors.status.info,
    borderColor: 'transparent',
  },
  purple: {
    background: colors.accent.purpleMuted,
    color: colors.accent.purple,
    borderColor: 'transparent',
  },
  pink: {
    background: colors.accent.pinkMuted,
    color: colors.accent.pink,
    borderColor: 'transparent',
  },
  cyan: {
    background: colors.accent.cyanMuted,
    color: colors.accent.cyan,
    borderColor: 'transparent',
  },
  // Tier badges
  platinum: {
    background: 'rgba(228, 228, 231, 0.15)',
    color: colors.tier.platinum,
    borderColor: 'transparent',
  },
  silver: {
    background: 'rgba(161, 161, 170, 0.15)',
    color: colors.tier.silver,
    borderColor: 'transparent',
  },
  bronze: {
    background: 'rgba(205, 127, 50, 0.15)',
    color: colors.tier.bronze,
    borderColor: 'transparent',
  },
  // Outline variants
  outline: {
    background: 'transparent',
    color: colors.text.secondary,
    borderColor: colors.border.primary,
  },
  'outline-gold': {
    background: 'transparent',
    color: colors.gold.primary,
    borderColor: colors.gold.primary,
  },
  // Solid variants
  solid: {
    background: colors.background.elevated,
    color: colors.text.primary,
    borderColor: 'transparent',
  },
  'solid-gold': {
    background: colors.gold.primary,
    color: colors.text.inverse,
    borderColor: 'transparent',
  },
};

// Modern size system with consistent heights
const sizes = {
  xs: {
    height: '18px',
    padding: `0 ${spacing.xs}`,
    fontSize: '10px',
    iconSize: 10,
  },
  sm: {
    height: components.badge.height.sm,
    padding: `0 ${spacing.sm}`,
    fontSize: typography.fontSize.xs,
    iconSize: 12,
  },
  md: {
    height: components.badge.height.md,
    padding: `0 ${spacing.md}`,
    fontSize: typography.fontSize.xs,
    iconSize: 14,
  },
  lg: {
    height: components.badge.height.lg,
    padding: `0 ${spacing.lg}`,
    fontSize: typography.fontSize.sm,
    iconSize: 16,
  },
};

function Badge({
  children,
  variant = 'default',
  size = 'md',
  pill = false,
  uppercase = false,
  icon: Icon,
  dot = false,
  interactive = false,
  onClick,
  style = {},
  ...props
}) {
  const variantStyles = variants[variant] || variants.default;
  const sizeStyles = sizes[size] || sizes.md;

  const badgeStyle = useMemo(() => ({
    // Layout
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: sizeStyles.height,
    padding: sizeStyles.padding,

    // Typography
    fontFamily: typography.fontFamily.sans,
    fontSize: sizeStyles.fontSize,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: '1',
    textTransform: uppercase ? 'uppercase' : 'none',
    letterSpacing: uppercase ? '0.05em' : typography.letterSpacing.normal,
    whiteSpace: 'nowrap',

    // Appearance
    background: variantStyles.background,
    color: variantStyles.color,
    border: variantStyles.borderColor !== 'transparent'
      ? `1px solid ${variantStyles.borderColor}`
      : 'none',
    borderRadius: pill ? borderRadius.pill : borderRadius.md,

    // Interaction
    cursor: interactive || onClick ? 'pointer' : 'default',
    transition: `all ${transitions.fast}`,
    userSelect: 'none',

    // Custom overrides
    ...style,
  }), [variant, size, pill, uppercase, interactive, onClick, style, variantStyles, sizeStyles]);

  const dotStyle = {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'currentColor',
    flexShrink: 0,
  };

  return (
    <span
      style={badgeStyle}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      {...props}
    >
      {dot && <span style={dotStyle} />}
      {Icon && <Icon size={sizeStyles.iconSize} />}
      {children}
    </span>
  );
}

export default memo(Badge);

// Status badge component for common status values
const STATUS_MAP = {
  // Competition statuses
  active: { variant: 'success', label: 'Live' },
  live: { variant: 'success', label: 'Live', dot: true },
  nomination: { variant: 'info', label: 'Nominations Open' },
  voting: { variant: 'purple', label: 'Voting Open' },
  judging: { variant: 'warning', label: 'Judging' },
  completed: { variant: 'gold', label: 'Completed' },
  publish: { variant: 'cyan', label: 'Coming Soon' },
  draft: { variant: 'outline', label: 'Draft' },
  archived: { variant: 'outline', label: 'Archived' },

  // Contestant statuses
  approved: { variant: 'success', label: 'Contestant' },
  pending: { variant: 'warning', label: 'Pending' },
  'pending-approval': { variant: 'warning', label: 'Needs Review' },
  'profile-complete': { variant: 'info', label: 'Profile Complete' },
  'awaiting-profile': { variant: 'purple', label: 'Awaiting Profile' },
  rejected: { variant: 'error', label: 'Rejected' },

  // General
  new: { variant: 'success', label: 'New', dot: true },
  upcoming: { variant: 'cyan', label: 'Upcoming' },
  past: { variant: 'outline', label: 'Past' },
  featured: { variant: 'gold', label: 'Featured' },
  verified: { variant: 'success', label: 'Verified' },
};

export const StatusBadge = memo(function StatusBadge({
  status,
  size = 'sm',
  pill = true,
  uppercase = true,
  showDot = false,
}) {
  const config = STATUS_MAP[status?.toLowerCase()] || { variant: 'default', label: status };

  return (
    <Badge
      variant={config.variant}
      size={size}
      pill={pill}
      uppercase={uppercase}
      dot={showDot || config.dot}
    >
      {config.label}
    </Badge>
  );
});
