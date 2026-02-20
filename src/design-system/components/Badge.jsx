import React from 'react';

/**
 * Badge Component
 * 
 * Variants:
 * - default: Standard badge
 * - live: Pulsing live indicator
 * - voting: Active voting status
 * - completed: Finished status
 * - rank: Ranking badges (#1, #2, #3 with colors)
 * - count: Vote/number counts
 * - tag: Category/interest tags
 * 
 * @example
 * <Badge variant="live">LIVE</Badge>
 * <Badge variant="rank" rank={1}>#1</Badge>
 * <Badge variant="count">1,234 votes</Badge>
 */

const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  rank,
  icon,
  removable,
  onRemove,
  className = '',
  ...props
}) => {
  
  // Base styles
  const baseStyles = `
    inline-flex items-center justify-center
    font-medium
    whitespace-nowrap
    transition-colors duration-150
  `;
  
  // Size variants
  const sizeStyles = {
    sm: 'h-5 px-1.5 text-xs gap-1 rounded',
    md: 'h-6 px-2 text-xs gap-1.5 rounded-md',
    lg: 'h-7 px-2.5 text-sm gap-1.5 rounded-md',
  };
  
  // Variant styles
  const variantStyles = {
    default: `
      bg-bg-elevated
      text-text-secondary
      border border-border
    `,
    live: `
      bg-error/20
      text-error-light
      border border-error/30
      animate-pulse
    `,
    voting: `
      bg-success/20
      text-success-light
      border border-success/30
    `,
    completed: `
      bg-bg-elevated
      text-text-muted
      border border-border
    `,
    rank: getRankStyles(rank),
    count: `
      bg-bg-hover
      text-text-primary
      font-semibold
      border border-border
    `,
    tag: `
      bg-bg-elevated
      text-text-secondary
      border border-border
      hover:bg-bg-hover hover:text-text-primary
      cursor-default
    `,
    gold: `
      bg-gold/20
      text-gold
      border border-gold/30
    `,
    premium: `
      bg-gradient-to-r from-gold-600/20 to-gold-400/20
      text-gold
      border border-gold/30
    `,
    info: `
      bg-info/20
      text-info-light
      border border-info/30
    `,
    warning: `
      bg-warning/20
      text-warning-light
      border border-warning/30
    `,
    success: `
      bg-success/20
      text-success-light
      border border-success/30
    `,
    error: `
      bg-error/20
      text-error-light
      border border-error/30
    `,
  };
  
  const combinedStyles = [
    baseStyles,
    sizeStyles[size],
    typeof variantStyles[variant] === 'string' ? variantStyles[variant] : variantStyles[variant],
    removable && 'pr-1',
    className,
  ].filter(Boolean).join(' ');
  
  // Render rank content
  const renderContent = () => {
    if (variant === 'rank' && rank !== undefined) {
      return (
        <>
          {getRankIcon(rank)}
          <span>#{rank}</span>
        </>
      );
    }
    
    if (variant === 'live') {
      return (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-error" />
          </span>
          {children || 'LIVE'}
        </>
      );
    }
    
    return (
      <>
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
        {removable && (
          <button
            onClick={onRemove}
            className="ml-0.5 p-0.5 rounded hover:bg-white/10 transition-colors"
            aria-label="Remove"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </>
    );
  };
  
  return (
    <span className={combinedStyles} {...props}>
      {renderContent()}
    </span>
  );
};

// Helper function to get rank-specific styles
function getRankStyles(rank) {
  switch (rank) {
    case 1:
      return `
        bg-gradient-to-r from-gold-600/30 to-gold-400/30
        text-gold
        border border-gold/40
        shadow-glow-gold
      `;
    case 2:
      return `
        bg-zinc-400/20
        text-zinc-300
        border border-zinc-400/30
      `;
    case 3:
      return `
        bg-amber-700/20
        text-amber-500
        border border-amber-600/30
      `;
    default:
      return `
        bg-bg-elevated
        text-text-secondary
        border border-border
      `;
  }
}

// Helper function to get rank icons
function getRankIcon(rank) {
  switch (rank) {
    case 1:
      return (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    case 2:
    case 3:
      return (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * Badge Group - For displaying multiple badges
 */
export const BadgeGroup = ({ 
  children, 
  className = '',
  max,
  ...props 
}) => {
  const badges = React.Children.toArray(children);
  const visibleBadges = max ? badges.slice(0, max) : badges;
  const hiddenCount = max ? badges.length - max : 0;
  
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`} {...props}>
      {visibleBadges}
      {hiddenCount > 0 && (
        <Badge variant="default" size="sm">
          +{hiddenCount}
        </Badge>
      )}
    </div>
  );
};

/**
 * Status Dot - Simple status indicator
 */
export const StatusDot = ({ 
  status = 'default',
  pulse = false,
  className = '',
}) => {
  const statusColors = {
    default: 'bg-text-muted',
    online: 'bg-success',
    offline: 'bg-text-disabled',
    busy: 'bg-error',
    away: 'bg-warning',
  };
  
  return (
    <span className={`relative inline-flex h-2 w-2 ${className}`}>
      {pulse && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusColors[status]} opacity-75`} />
      )}
      <span className={`relative inline-flex rounded-full h-2 w-2 ${statusColors[status]}`} />
    </span>
  );
};

export default Badge;
