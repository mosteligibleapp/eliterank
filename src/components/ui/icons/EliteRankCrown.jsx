import React from 'react';

/**
 * EliteRank Crown Logo - Detailed version with gold gradient
 * Used for main branding/logo displays
 */
export default function EliteRankCrown({ size = 24, className, style }) {
  const gradientId = `eliterank-crown-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5d485" />
          <stop offset="50%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#a8893a" />
        </linearGradient>
      </defs>
      {/* Main crown shape - 3 peaks */}
      <path
        d="M12 2L16 9L22 6.5L19 15H5L2 6.5L8 9L12 2Z"
        fill={`url(#${gradientId})`}
      />
      {/* Bottom band */}
      <rect
        x="4.5"
        y="16"
        width="15"
        height="3"
        rx="0.5"
        fill={`url(#${gradientId})`}
      />
      {/* Band highlight line */}
      <rect
        x="4.5"
        y="17.5"
        width="15"
        height="0.5"
        fill="rgba(255,255,255,0.2)"
      />
    </svg>
  );
}
