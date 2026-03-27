import React, { memo, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { colors, borderRadius, spacing, typography, gradients } from '../../styles/theme';

const PADDING_MAP = {
  none: 0,
  sm: spacing.md,
  md: spacing.lg,
  lg: spacing.xl,
  xl: spacing.xxl,
};

const VARIANT_STYLES = {
  default: {
    background: colors.background.card,
    border: `1px solid ${colors.border.light}`,
  },
  gold: {
    background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(30,30,40,0.6))',
    border: `1px solid ${colors.border.gold}`,
  },
  highlighted: {
    background: colors.background.cardHover,
    border: `1px solid ${colors.border.lighter}`,
  },
};

function Card({
  children,
  variant = 'default',
  padding = 'lg',
  style = {},
  ...props
}) {
  const cardStyle = useMemo(() => ({
    ...VARIANT_STYLES[variant],
    borderRadius: borderRadius.xl,
    padding: PADDING_MAP[padding],
    ...style,
  }), [variant, padding, style]);

  return (
    <div style={cardStyle} {...props}>
      {children}
    </div>
  );
}

export default memo(Card);

// Panel component with header
const panelBaseStyle = {
  background: colors.background.card,
  border: `1px solid ${colors.border.light}`,
  borderRadius: borderRadius.xxl,
  overflow: 'hidden',
  marginBottom: spacing.xxl,
  boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
};

const headerBaseStyle = {
  padding: spacing.xl,
  borderBottom: `1px solid ${colors.border.lighter}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const titleBaseStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: spacing.md,
  fontSize: typography.fontSize.xl,
  fontWeight: typography.fontWeight.semibold,
};

export const Panel = memo(function Panel({
  title,
  icon: Icon,
  action,
  children,
  style = {},
  collapsible = false,
  defaultCollapsed = false,
}) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const panelStyle = useMemo(() => ({
    ...panelBaseStyle,
    ...style,
  }), [style]);

  const headerStyle = useMemo(() => ({
    ...headerBaseStyle,
    cursor: collapsible ? 'pointer' : 'default',
  }), [collapsible]);

  const handleHeaderClick = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <div style={panelStyle}>
      {title && (
        <div style={headerStyle} onClick={handleHeaderClick}>
          <div style={titleBaseStyle}>
            {Icon && <Icon size={22} style={{ color: colors.gold.primary }} />}
            {title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
            {action}
            {collapsible && (
              isCollapsed
                ? <ChevronDown size={20} style={{ color: colors.text.secondary }} />
                : <ChevronUp size={20} style={{ color: colors.text.secondary }} />
            )}
          </div>
        </div>
      )}
      {(!collapsible || !isCollapsed) && children}
    </div>
  );
});

// Stat card component
const ICON_COLOR_MAP = {
  gold: { bg: 'rgba(212,175,55,0.15)', color: colors.gold.primary },
  blue: { bg: 'rgba(59,130,246,0.15)', color: colors.status.info },
  purple: { bg: 'rgba(139,92,246,0.15)', color: colors.status.purple },
  green: { bg: 'rgba(34,197,94,0.15)', color: colors.status.success },
};

export const StatCard = memo(function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = 'gold',
  trend,
  trendValue,
  variant = 'default',
  children,
  onClick,
  style = {},
}) {
  const iconStyle = ICON_COLOR_MAP[iconColor] || ICON_COLOR_MAP.gold;

  const cardStyle = useMemo(() => ({
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    border: '1px solid',
    borderColor: variant === 'gold' ? colors.border.gold : colors.border.light,
    background:
      variant === 'gold'
        ? 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(30,30,40,0.6))'
        : colors.background.card,
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.3s',
    ...style,
  }), [variant, onClick, style]);

  const iconBoxStyle = useMemo(() => ({
    width: '52px',
    height: '52px',
    borderRadius: borderRadius.lg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: iconStyle.bg,
    color: iconStyle.color,
  }), [iconStyle]);

  return (
    <div style={cardStyle} onClick={onClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.base, marginBottom: spacing.sm }}>
            {label}
          </p>
          <p style={{ fontSize: typography.fontSize.display, fontWeight: typography.fontWeight.semibold, color: '#fff' }}>
            {value}
          </p>
        </div>
        {Icon && (
          <div style={iconBoxStyle}>
            <Icon size={26} />
          </div>
        )}
      </div>
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, fontSize: typography.fontSize.sm, color: colors.status.success }}>
          {trend}
          {trendValue}
        </div>
      )}
      {children}
    </div>
  );
});
