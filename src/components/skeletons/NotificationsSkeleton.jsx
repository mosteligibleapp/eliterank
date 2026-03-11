/**
 * NotificationsSkeleton — list of circle + text rows
 * Content-only: no page wrapper or header bar.
 * The SuspenseWrapper provides the outer page container.
 */

import React from 'react';
import { SkeletonPulse, SkeletonCircle } from '../common/Skeleton';
import { colors, spacing, borderRadius } from '../../styles/theme';

function NotificationRowSkeleton() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: spacing.md,
      padding: spacing.lg,
      borderBottom: `1px solid ${colors.border.secondary}`,
    }}>
      <SkeletonCircle size="44px" />
      <div style={{ flex: 1 }}>
        <SkeletonPulse width="70%" height="14px" style={{ marginBottom: spacing[2] }} />
        <SkeletonPulse width="90%" height="12px" style={{ marginBottom: spacing[2] }} />
        <SkeletonPulse width="80px" height="11px" />
      </div>
    </div>
  );
}

export default function NotificationsSkeleton() {
  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div style={{
        background: colors.background.secondary,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        marginTop: spacing[4],
      }}>
        {Array.from({ length: 6 }, (_, i) => (
          <NotificationRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
