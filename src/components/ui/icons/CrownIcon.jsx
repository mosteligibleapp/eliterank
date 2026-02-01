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
      {/* Main crown shape - 3 peaks, scaled up */}
      <path
        d="M12 2L16 9L22 6.5L19 15H5L2 6.5L8 9L12 2Z"
        fill={color}
      />
      {/* Bottom band */}
      <rect
        x="4.5"
        y="16"
        width="15"
        height="3"
        rx="0.5"
        fill={color}
      />
    </svg>
  );
}
