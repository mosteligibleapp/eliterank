/**
 * CompetitionSkeleton — hero block + tab bar + card grid
 * Competitions have their own full-page layout with hero,
 * so this skeleton keeps minHeight: '100vh' and adds fade-in.
 */

import React from 'react';
import { SkeletonPulse, SkeletonCard } from '../common/Skeleton';
import { colors, spacing, borderRadius } from '../../styles/theme';

export default function CompetitionSkeleton() {
  return (
    <div style={{
      minHeight: '100vh',
      background: colors.background.primary,
      animation: 'fadeIn 0.2s ease-out',
    }}>
      {/* Hero area */}
      <SkeletonPulse height="280px" radius="0" />

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        gap: spacing[4],
        padding: `${spacing[4]} ${spacing[6]}`,
        borderBottom: `1px solid ${colors.border.secondary}`,
      }}>
        {[1, 2, 3].map((i) => (
          <SkeletonPulse key={i} width="80px" height="32px" radius={borderRadius.pill} />
        ))}
      </div>

      {/* Card grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: spacing[4],
        padding: spacing[6],
      }}>
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonCard key={i} height="320px" />
        ))}
      </div>
    </div>
  );
}
