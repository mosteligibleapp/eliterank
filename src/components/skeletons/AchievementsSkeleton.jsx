/**
 * AchievementsSkeleton — card grid
 * Content-only: no page wrapper or header bar.
 * The SuspenseWrapper provides the outer page container.
 */

import React from 'react';
import { SkeletonCard } from '../common/Skeleton';
import { spacing } from '../../styles/theme';

export default function AchievementsSkeleton() {
  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: spacing[6] }}>
      {/* Competition cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} height="72px" />
        ))}
      </div>
    </div>
  );
}
