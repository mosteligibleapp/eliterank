import React, { memo, useMemo, useCallback, useState } from 'react';
import { gradients, colors, borderRadius, spacing, typography, shadows, transitions, components } from '../../styles/theme';

// Modern button variants - Instagram/Robinhood inspired
const variants = {
  primary: {
    background: gradients.gold,
    color: colors.text.inverse,
    border: 'none',
    hoverBackground: 'linear-gradient(135deg, #e5c04a 0%, #f7dc6f 100%)',
    activeBackground: 'linear-gradient(135deg, #c9a227 0%, #d4af37 100%)',
  },
  secondary: {
    background: colors.background.card,
    color: colors.text.primary,
    border: `1px solid ${colors.border.primary}`,
    hoverBackground: colors.background.cardHover,
    activeBackground: colors.background.elevated,
  },
  outline: {
    background: 'transparent',
    color: colors.gold.primary,
    border: `1.5px solid ${colors.gold.primary}`,
    hoverBackground: colors.gold.muted,
    activeBackground: 'rgba(212, 175, 55, 0.25)',
  },
  ghost: {
    background: 'transparent',
    color: colors.text.secondary,
    border: 'none',
    hoverBackground: colors.interactive.hover,
    activeBackground: colors.interactive.active,
  },
  success: {
    background: colors.status.success,
    color: '#fff',
    border: 'none',
    hoverBackground: colors.status.successLight,
    activeBackground: '#16a34a',
  },
  danger: {
    background: colors.status.error,
    color: '#fff',
    border: 'none',
    hoverBackground: colors.status.errorLight,
    activeBackground: '#dc2626',
  },
  // Legacy variants for backward compatibility
  approve: {
    background: colors.status.successMuted,
    color: colors.status.success,
    border: `1px solid rgba(34, 197, 94, 0.3)`,
    hoverBackground: 'rgba(34, 197, 94, 0.25)',
    activeBackground: 'rgba(34, 197, 94, 0.35)',
  },
  reject: {
    background: colors.status.errorMuted,
    color: colors.status.error,
    border: `1px solid rgba(239, 68, 68, 0.3)`,
    hoverBackground: 'rgba(239, 68, 68, 0.25)',
    activeBackground: 'rgba(239, 68, 68, 0.35)',
  },
  purple: {
    background: colors.accent.purpleMuted,
    color: colors.accent.purple,
    border: `1px solid rgba(139, 92, 246, 0.3)`,
    hoverBackground: 'rgba(139, 92, 246, 0.25)',
    activeBackground: 'rgba(139, 92, 246, 0.35)',
  },
};

// Modern size system
const sizes = {
  xs: {
    height: '28px',
    padding: `0 ${spacing.sm}`,
    fontSize: typography.fontSize.xs,
    iconSize: 12,
  },
  sm: {
    height: components.button.height.sm,
    padding: `0 ${spacing.md}`,
    fontSize: typography.fontSize.sm,
    iconSize: 14,
  },
  md: {
    height: components.button.height.md,
    padding: `0 ${spacing.lg}`,
    fontSize: typography.fontSize.base,
    iconSize: 16,
  },
  lg: {
    height: components.button.height.lg,
    padding: `0 ${spacing.xl}`,
    fontSize: typography.fontSize.md,
    iconSize: 18,
  },
  xl: {
    height: components.button.height.xl,
    padding: `0 ${spacing.xxl}`,
    fontSize: typography.fontSize.lg,
    iconSize: 20,
  },
};

function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  iconOnly = false,
  rounded = false,
  onClick,
  style = {},
  className,
  type = 'button',
  ...props
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const variantStyles = variants[variant] || variants.primary;
  const sizeStyles = sizes[size] || sizes.md;

  const buttonStyle = useMemo(() => {
    let background = variantStyles.background;
    if (isActive && !disabled) {
      background = variantStyles.activeBackground || variantStyles.background;
    } else if (isHovered && !disabled) {
      background = variantStyles.hoverBackground || variantStyles.background;
    }

    return {
      // Base styles
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      height: sizeStyles.height,
      padding: iconOnly ? '0' : sizeStyles.padding,
      width: fullWidth ? '100%' : iconOnly ? sizeStyles.height : 'auto',
      minWidth: iconOnly ? 'auto' : undefined,

      // Typography
      fontFamily: typography.fontFamily.sans,
      fontSize: sizeStyles.fontSize,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: '1',
      letterSpacing: typography.letterSpacing.wide,
      textDecoration: 'none',
      whiteSpace: 'nowrap',

      // Appearance
      background,
      color: variantStyles.color,
      border: variantStyles.border,
      borderRadius: rounded || iconOnly ? borderRadius.full : borderRadius.lg,
      boxShadow: variant === 'primary' && !disabled ? shadows.sm : 'none',

      // Interaction
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transform: isActive && !disabled ? 'scale(0.98)' : 'scale(1)',
      transition: `all ${transitions.fast} ${transitions.ease}`,

      // Accessibility
      outline: 'none',
      userSelect: 'none',
      WebkitTapHighlightColor: 'transparent',

      // Custom overrides
      ...style,
    };
  }, [variant, size, disabled, loading, fullWidth, isHovered, isActive, iconOnly, rounded, style, variantStyles, sizeStyles]);

  const handleClick = useCallback((e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  }, [disabled, loading, onClick]);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setIsActive(false);
  }, []);
  const handleMouseDown = useCallback(() => setIsActive(true), []);
  const handleMouseUp = useCallback(() => setIsActive(false), []);

  const iconSize = sizeStyles.iconSize;

  // Loading spinner
  const Spinner = () => (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 24 24"
      style={{
        animation: 'spin 1s linear infinite',
      }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="30 70"
      />
    </svg>
  );

  return (
    <>
      <button
        type={type}
        style={buttonStyle}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        disabled={disabled || loading}
        className={className}
        {...props}
      >
        {loading ? (
          <Spinner />
        ) : (
          <>
            {Icon && iconPosition === 'left' && <Icon size={iconSize} />}
            {!iconOnly && children}
            {Icon && iconPosition === 'right' && <Icon size={iconSize} />}
          </>
        )}
      </button>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

export default memo(Button);
