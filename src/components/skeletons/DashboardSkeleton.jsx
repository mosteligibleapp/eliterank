/**
 * DashboardSkeleton — stat cards + table placeholder
 * Content-only: no page wrapper or header bar.
 * The SuspenseWrapper provides the outer page container.
 */

import React from 'react';
import { SkeletonPulse, SkeletonCard } from '../common/Skeleton';
import { spacing, borderRadius } from '../../styles/theme';

export default function DashboardSkeleton() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: spacing[6] }}>
      {/* Stat cards row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: spacing[4],
        marginBottom: spacing[8],
      }}>
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} height="100px" />
        ))}
      </div>

      {/* Table placeholder */}
      <SkeletonPulse height="40px" radius={borderRadius.md} style={{ marginBottom: spacing[2] }} />
      {Array.from({ length: 8 }, (_, i) => (
        <SkeletonPulse
          key={i}
          height="48px"
          radius={borderRadius.xs}
          style={{ marginBottom: spacing.px }}
        />
      ))}
    </div>
  );
}
