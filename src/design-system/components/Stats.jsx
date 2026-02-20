import React from 'react';

/**
 * Stats Components
 * 
 * Kalshi-inspired data displays:
 * - VoteCount: Vote count with trend indicator
 * - RankDisplay: Rank with medal/icon
 * - ProgressBar: Progress visualization
 * - StatCard: Single stat with label
 * - StatsGrid: Grid of stats
 * 
 * @example
 * <VoteCount count={12345} trend={5.2} />
 * <RankDisplay rank={1} />
 * <ProgressBar value={75} max={100} />
 */

/**
 * Vote Count - Displays vote count with optional trend
 */
export const VoteCount = ({
  count = 0,
  trend,
  size = 'md',
  showLabel = true,
  animated = true,
  className = '',
}) => {
  const sizes = {
    sm: { count: 'text-lg', trend: 'text-xs', label: 'text-xs' },
    md: { count: 'text-2xl', trend: 'text-sm', label: 'text-sm' },
    lg: { count: 'text-4xl', trend: 'text-base', label: 'text-base' },
    xl: { count: 'text-5xl', trend: 'text-lg', label: 'text-lg' },
  };
  
  const sizeConfig = sizes[size];
  const formattedCount = formatNumber(count);
  const isPositive = trend > 0;
  const isNegative = trend < 0;
  
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-baseline gap-2">
        <span 
          className={`
            ${sizeConfig.count}
            font-bold text-text-primary font-display
            ${animated ? 'animate-count-up' : ''}
          `}
        >
          {formattedCount}
        </span>
        
        {trend !== undefined && trend !== 0 && (
          <span 
            className={`
              ${sizeConfig.trend}
              font-medium flex items-center gap-0.5
              ${isPositive ? 'text-success' : isNegative ? 'text-error' : 'text-text-muted'}
            `}
          >
            {isPositive ? (
              <TrendUpIcon className="w-4 h-4" />
            ) : (
              <TrendDownIcon className="w-4 h-4" />
            )}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      
      {showLabel && (
        <span className={`${sizeConfig.label} text-text-muted mt-0.5`}>
          votes
        </span>
      )}
    </div>
  );
};

/**
 * Rank Display - Shows rank with appropriate styling
 */
export const RankDisplay = ({
  rank,
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  const sizes = {
    sm: { container: 'w-6 h-6', text: 'text-xs' },
    md: { container: 'w-8 h-8', text: 'text-sm' },
    lg: { container: 'w-10 h-10', text: 'text-base' },
    xl: { container: 'w-12 h-12', text: 'text-lg' },
  };
  
  const rankStyles = {
    1: 'bg-gradient-to-br from-gold-500 to-gold-600 text-bg-primary shadow-glow-gold',
    2: 'bg-gradient-to-br from-zinc-300 to-zinc-400 text-bg-primary',
    3: 'bg-gradient-to-br from-amber-600 to-amber-700 text-white',
    default: 'bg-bg-elevated text-text-secondary border border-border',
  };
  
  const sizeConfig = sizes[size];
  const style = rankStyles[rank] || rankStyles.default;
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div 
        className={`
          ${sizeConfig.container}
          ${style}
          rounded-full
          flex items-center justify-center
          font-bold ${sizeConfig.text}
        `}
      >
        {rank <= 3 ? (
          <span>{rank}</span>
        ) : (
          <span>#{rank}</span>
        )}
      </div>
      {showLabel && rank <= 3 && (
        <span className="text-sm text-text-muted">
          {rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'}
        </span>
      )}
    </div>
  );
};

/**
 * Progress Bar - Visual progress indicator
 */
export const ProgressBar = ({
  value = 0,
  max = 100,
  size = 'md',
  variant = 'default',
  showValue = false,
  label,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };
  
  const variants = {
    default: 'bg-gradient-to-r from-gold-600 to-gold-400',
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error',
    info: 'bg-info',
    gradient: 'bg-gradient-to-r from-accent-pink to-accent-purple',
  };
  
  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && (
            <span className="text-sm text-text-secondary">{label}</span>
          )}
          {showValue && (
            <span className="text-sm font-medium text-text-primary">
              {formatNumber(value)} / {formatNumber(max)}
            </span>
          )}
        </div>
      )}
      
      <div className={`${sizes[size]} w-full bg-bg-elevated rounded-full overflow-hidden`}>
        <div
          className={`${sizes[size]} ${variants[variant]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Stat Card - Single stat display
 */
export const StatCard = ({
  label,
  value,
  change,
  icon,
  variant = 'default',
  className = '',
}) => {
  const isPositive = change > 0;
  const isNegative = change < 0;
  
  return (
    <div 
      className={`
        p-4 rounded-xl
        bg-bg-card border border-border
        ${className}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm text-text-muted">{label}</span>
        {icon && (
          <span className="text-text-muted">{icon}</span>
        )}
      </div>
      
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-text-primary font-display">
          {typeof value === 'number' ? formatNumber(value) : value}
        </span>
        
        {change !== undefined && (
          <span 
            className={`
              text-sm font-medium flex items-center
              ${isPositive ? 'text-success' : isNegative ? 'text-error' : 'text-text-muted'}
            `}
          >
            {isPositive ? '+' : ''}{change}%
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Stats Grid - Grid layout for multiple stats
 */
export const StatsGrid = ({
  children,
  columns = 3,
  className = '',
}) => {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  };
  
  return (
    <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
      {children}
    </div>
  );
};

/**
 * Trend Indicator - Standalone trend display
 */
export const TrendIndicator = ({
  value,
  size = 'md',
  showIcon = true,
}) => {
  const isPositive = value > 0;
  const isNegative = value < 0;
  
  const sizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };
  
  return (
    <span 
      className={`
        ${sizes[size]}
        font-medium inline-flex items-center gap-0.5
        ${isPositive ? 'text-success' : isNegative ? 'text-error' : 'text-text-muted'}
      `}
    >
      {showIcon && (
        isPositive ? (
          <TrendUpIcon className="w-4 h-4" />
        ) : isNegative ? (
          <TrendDownIcon className="w-4 h-4" />
        ) : null
      )}
      {isPositive ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
};

/**
 * Countdown Timer - For time-sensitive displays
 */
export const CountdownTimer = ({
  endTime,
  size = 'md',
  showLabels = true,
  onComplete,
  className = '',
}) => {
  const [timeLeft, setTimeLeft] = React.useState(calculateTimeLeft(endTime));
  
  React.useEffect(() => {
    const timer = setInterval(() => {
      const left = calculateTimeLeft(endTime);
      setTimeLeft(left);
      
      if (left.total <= 0) {
        clearInterval(timer);
        onComplete?.();
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [endTime, onComplete]);
  
  const sizes = {
    sm: { number: 'text-lg', label: 'text-[10px]' },
    md: { number: 'text-2xl', label: 'text-xs' },
    lg: { number: 'text-4xl', label: 'text-sm' },
  };
  
  const sizeConfig = sizes[size];
  
  if (timeLeft.total <= 0) {
    return <span className="text-error font-medium">Ended</span>;
  }
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {timeLeft.days > 0 && (
        <TimeUnit value={timeLeft.days} label="days" sizeConfig={sizeConfig} showLabels={showLabels} />
      )}
      <TimeUnit value={timeLeft.hours} label="hrs" sizeConfig={sizeConfig} showLabels={showLabels} />
      <TimeUnit value={timeLeft.minutes} label="min" sizeConfig={sizeConfig} showLabels={showLabels} />
      <TimeUnit value={timeLeft.seconds} label="sec" sizeConfig={sizeConfig} showLabels={showLabels} />
    </div>
  );
};

const TimeUnit = ({ value, label, sizeConfig, showLabels }) => (
  <div className="flex flex-col items-center">
    <span className={`${sizeConfig.number} font-bold text-text-primary font-mono`}>
      {String(value).padStart(2, '0')}
    </span>
    {showLabels && (
      <span className={`${sizeConfig.label} text-text-muted uppercase tracking-wider`}>
        {label}
      </span>
    )}
  </div>
);

// Helper functions
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
}

function calculateTimeLeft(endTime) {
  const difference = new Date(endTime) - new Date();
  
  if (difference <= 0) {
    return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  
  return {
    total: difference,
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
}

// Icon components
const TrendUpIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const TrendDownIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
);

export default {
  VoteCount,
  RankDisplay,
  ProgressBar,
  StatCard,
  StatsGrid,
  TrendIndicator,
  CountdownTimer,
};
