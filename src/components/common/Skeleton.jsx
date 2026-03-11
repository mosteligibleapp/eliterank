/**
 * Skeleton Primitives — animated loading placeholders
 * Uses theme tokens + shimmer keyframe from index.css
 */

import React from 'react';
import { colors, borderRadius, spacing, gradients } from '../../styles/theme';

const baseStyle = {
  background: colors.background.elevated,
  backgroundImage: gradients.skeleton,
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
};

/**
 * Animated rectangular block
 */
export function SkeletonPulse({ width = '100%', height = '16px', radius = borderRadius.md, style }) {
  return (
    <div
      style={{
        ...baseStyle,
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
    />
  );
}

/**
 * N lines of varying-width text
 */
export function SkeletonText({ lines = 3, gap = spacing[2], style }) {
  const widths = ['100%', '90%', '75%', '85%', '60%', '95%', '70%'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonPulse
          key={i}
          width={widths[i % widths.length]}
          height="14px"
          radius={borderRadius.xs}
        />
      ))}
    </div>
  );
}

/**
 * Circular skeleton (avatars)
 */
export function SkeletonCircle({ size = '48px', style }) {
  return (
    <SkeletonPulse
      width={size}
      height={size}
      radius={borderRadius.full}
      style={{ flexShrink: 0, ...style }}
    />
  );
}

/**
 * Card-shaped skeleton
 */
export function SkeletonCard({ width = '100%', height = '160px', style }) {
  return (
    <SkeletonPulse
      width={width}
      height={height}
      radius={borderRadius.lg}
      style={style}
    />
  );
}
