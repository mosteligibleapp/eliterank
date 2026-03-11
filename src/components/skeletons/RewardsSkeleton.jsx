/**
 * RewardsSkeleton — stat row + reward item list
 * Content-only: no page wrapper or header bar.
 * The SuspenseWrapper provides the outer page container.
 */

import React from 'react';
import { SkeletonPulse, SkeletonCard } from '../common/Skeleton';
import { spacing, borderRadius } from '../../styles/theme';

export default function RewardsSkeleton() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: spacing[4] }}>
      {/* Stat row */}
      <div style={{
        display: 'flex',
        gap: spacing[4],
        marginBottom: spacing[8],
      }}>
        {[1, 2, 3].map((i) => (
          <SkeletonPulse key={i} width="100%" height="80px" radius={borderRadius.lg} />
        ))}
      </div>

      {/* Reward items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
        {Array.from({ length: 5 }, (_, i) => (
          <SkeletonCard key={i} height="72px" />
        ))}
      </div>
    </div>
  );
}
