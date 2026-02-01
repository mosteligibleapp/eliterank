import React from 'react';

/**
 * Simplified Crown Icon - for tabs, buttons, and small icon uses
 * Based on EliteRank logo crown shape
 * Accepts color prop for flexibility (defaults to currentColor)
 */
export default function CrownIcon({ size = 24, color = 'currentColor', className, style }) {
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
      {/* Main crown shape - 3 peaks */}
      <path
        d="M12 3L15.5 9L20 7L18 14H6L4 7L8.5 9L12 3Z"
        fill={color}
      />
      {/* Bottom band */}
      <rect
        x="5.5"
        y="15"
        width="13"
        height="2.5"
        rx="0.5"
        fill={color}
      />
    </svg>
  );
}
