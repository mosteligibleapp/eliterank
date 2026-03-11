/**
 * ProfileSkeleton — avatar + name + bio + social row
 * Content-only: no page wrapper or header bar.
 * The SuspenseWrapper provides the outer page container.
 */

import React from 'react';
import { SkeletonPulse, SkeletonCircle, SkeletonText } from '../common/Skeleton';
import { spacing, borderRadius } from '../../styles/theme';

export default function ProfileSkeleton() {
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: spacing[6] }}>
      {/* Cover image */}
      <SkeletonPulse height="200px" radius={borderRadius.lg} style={{ marginBottom: spacing[6] }} />

      {/* Avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[4], marginBottom: spacing[6] }}>
        <SkeletonCircle size="80px" />
        <div style={{ flex: 1 }}>
          <SkeletonPulse width="180px" height="24px" style={{ marginBottom: spacing[2] }} />
          <SkeletonPulse width="120px" height="14px" />
        </div>
      </div>

      {/* Bio */}
      <SkeletonText lines={3} style={{ marginBottom: spacing[8] }} />

      {/* Social row */}
      <div style={{ display: 'flex', gap: spacing[3] }}>
        {[1, 2, 3, 4].map((i) => (
          <SkeletonPulse key={i} width="40px" height="40px" radius={borderRadius.full} />
        ))}
      </div>

      {/* Gallery placeholder */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: spacing[3],
        marginTop: spacing[8],
      }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonPulse key={i} height="140px" radius={borderRadius.md} />
        ))}
      </div>
    </div>
  );
}
