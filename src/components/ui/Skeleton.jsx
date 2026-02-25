import React, { memo, useRef, useEffect } from 'react';

const SKELETON_STYLE_ID = 'skeleton-shimmer-keyframes';

function injectShimmerStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(SKELETON_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = SKELETON_STYLE_ID;
  style.textContent = `
    @keyframes skeletonShimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `;
  document.head.appendChild(style);
}

function useShimmerStyles() {
  const injected = useRef(false);
  if (!injected.current) {
    injectShimmerStyles();
    injected.current = true;
  }
}

const BASE_COLOR = 'rgba(255,255,255,0.06)';
const SHIMMER_COLOR = 'rgba(255,255,255,0.12)';
const CARD_BG = '#1c1c1f';
const CARD_BORDER = 'rgba(255,255,255,0.1)';
const BORDER_SUBTLE = 'rgba(255,255,255,0.06)';

const shimmerBackground = {
  background: `linear-gradient(90deg, ${BASE_COLOR} 25%, ${SHIMMER_COLOR} 50%, ${BASE_COLOR} 75%)`,
  backgroundSize: '200% 100%',
  animation: 'skeletonShimmer 2s ease-in-out infinite',
};

export const Skeleton = memo(function Skeleton({
  width,
  height,
  borderRadius = 8,
  style,
  className,
}) {
  useShimmerStyles();

  return (
    <div
      className={className}
      style={{
        ...shimmerBackground,
        width,
        height,
        borderRadius,
        flexShrink: 0,
        ...style,
      }}
    />
  );
});

export const SkeletonText = memo(function SkeletonText({
  lines = 3,
  lastLineWidth = '60%',
  lineHeight = 16,
  gap = 10,
  style,
}) {
  useShimmerStyles();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          style={{
            ...shimmerBackground,
            height: lineHeight,
            borderRadius: 4,
            width: i === lines - 1 && lines > 1 ? lastLineWidth : '100%',
          }}
        />
      ))}
    </div>
  );
});

export const SkeletonCircle = memo(function SkeletonCircle({
  size = 40,
  style,
}) {
  useShimmerStyles();

  return (
    <div
      style={{
        ...shimmerBackground,
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        ...style,
      }}
    />
  );
});

export const SkeletonCard = memo(function SkeletonCard({
  height = 200,
  style,
}) {
  useShimmerStyles();

  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${CARD_BORDER}`,
        borderRadius: 16,
        height,
        overflow: 'hidden',
        ...style,
      }}
    >
      <div style={{ ...shimmerBackground, width: '100%', height: '100%' }} />
    </div>
  );
});

export const SkeletonAvatar = memo(function SkeletonAvatar({
  size = 48,
  lines = 2,
  style,
}) {
  useShimmerStyles();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, ...style }}>
      <SkeletonCircle size={size} />
      <div style={{ flex: 1 }}>
        <SkeletonText lines={lines} lineHeight={14} gap={8} lastLineWidth="50%" />
      </div>
    </div>
  );
});

export const SkeletonGrid = memo(function SkeletonGrid({
  count = 6,
  columns = 3,
  cardHeight = 200,
  gap = 16,
  style,
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap,
        ...style,
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} height={cardHeight} />
      ))}
    </div>
  );
});

const cardStyle = {
  background: CARD_BG,
  border: `1px solid ${CARD_BORDER}`,
  borderRadius: 16,
  padding: 24,
};

const sectionGap = { display: 'flex', flexDirection: 'column', gap: 16 };

export const EventCardSkeleton = memo(function EventCardSkeleton({ style }) {
  useShimmerStyles();

  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${CARD_BORDER}`,
        borderRadius: 16,
        overflow: 'hidden',
        ...style,
      }}
    >
      <div style={{ ...shimmerBackground, width: '100%', paddingTop: '66.66%' }} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Skeleton width="75%" height={16} borderRadius={4} />
        <Skeleton width="50%" height={13} borderRadius={4} />
      </div>
    </div>
  );
});

export const EventsGridSkeleton = memo(function EventsGridSkeleton({
  count = 4,
  style,
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
        ...style,
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
});

export const CompetitionPageSkeleton = memo(function CompetitionPageSkeleton({ style }) {
  useShimmerStyles();

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <SkeletonCircle size={56} />
        <div style={{ flex: 1 }}>
          <Skeleton width="40%" height={28} borderRadius={6} />
          <Skeleton width="25%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} width={80} height={36} borderRadius={8} />
        ))}
      </div>

      <div style={{ ...cardStyle, marginBottom: 24, padding: 20 }}>
        <SkeletonText lines={3} lineHeight={14} gap={10} />
      </div>

      <SkeletonGrid count={6} columns={3} cardHeight={240} gap={16} />
    </div>
  );
});

export const ProfileSkeleton = memo(function ProfileSkeleton({ style }) {
  useShimmerStyles();

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', ...style }}>
      <Skeleton
        width="100%"
        height={200}
        borderRadius={0}
        style={{ borderRadius: '0 0 16px 16px' }}
      />

      <div style={{ padding: '0 24px', marginTop: -40 }}>
        <SkeletonCircle size={96} style={{ border: '4px solid #0a0a0c' }} />

        <div style={{ marginTop: 16, ...sectionGap }}>
          <Skeleton width={200} height={24} borderRadius={6} />
          <Skeleton width={120} height={14} borderRadius={4} />
          <SkeletonText lines={3} lineHeight={13} gap={8} style={{ marginTop: 8 }} />
        </div>

        <div style={{ marginTop: 32, ...sectionGap }}>
          <Skeleton width={160} height={18} borderRadius={4} />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
              marginTop: 8,
            }}
          >
            {Array.from({ length: 2 }, (_, i) => (
              <SkeletonCard key={i} height={160} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export const DashboardSkeleton = memo(function DashboardSkeleton({ style }) {
  useShimmerStyles();

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px', ...style }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32,
        }}
      >
        <Skeleton width={240} height={28} borderRadius={6} />
        <Skeleton width={120} height={40} borderRadius={8} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 32,
        }}
      >
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} style={{ ...cardStyle }}>
            <Skeleton width="50%" height={13} borderRadius={4} />
            <Skeleton width={80} height={28} borderRadius={6} style={{ marginTop: 12 }} />
            <Skeleton width="30%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} width={90} height={36} borderRadius={8} />
        ))}
      </div>

      <div style={{ ...cardStyle, padding: 24, minHeight: 300 }}>
        <SkeletonText lines={1} lineHeight={18} style={{ marginBottom: 20 }} />
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonAvatar key={i} size={40} lines={2} style={{ marginBottom: 16 }} />
        ))}
      </div>
    </div>
  );
});

export const HomeFeedSkeleton = memo(function HomeFeedSkeleton({ style }) {
  useShimmerStyles();

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px', ...style }}>
      <Skeleton
        width="100%"
        height={48}
        borderRadius={12}
        style={{ marginBottom: 20 }}
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} width={80} height={32} borderRadius={20} />
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 20,
        }}
      >
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            style={{
              background: CARD_BG,
              border: `1px solid ${CARD_BORDER}`,
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <div style={{ ...shimmerBackground, width: '100%', paddingTop: '56.25%' }} />
            <div style={{ padding: 16 }}>
              <Skeleton width="70%" height={18} borderRadius={4} />
              <Skeleton width="45%" height={13} borderRadius={4} style={{ marginTop: 8 }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <Skeleton width={60} height={24} borderRadius={12} />
                <Skeleton width={60} height={24} borderRadius={12} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export const AnnouncementsSkeleton = memo(function AnnouncementsSkeleton({
  count = 4,
  style,
}) {
  useShimmerStyles();

  return (
    <div style={{ ...sectionGap, gap: 12, ...style }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ ...cardStyle, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <Skeleton width={100} height={12} borderRadius={4} />
            <Skeleton width={60} height={12} borderRadius={4} />
          </div>
          <Skeleton width="80%" height={18} borderRadius={4} style={{ marginBottom: 10 }} />
          <SkeletonText lines={2} lineHeight={13} gap={8} lastLineWidth="70%" />
        </div>
      ))}
    </div>
  );
});

export const LeaderboardSkeleton = memo(function LeaderboardSkeleton({
  rows = 10,
  style,
}) {
  useShimmerStyles();

  return (
    <div style={{ ...sectionGap, gap: 0, ...style }}>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '14px 20px',
            borderBottom: `1px solid ${BORDER_SUBTLE}`,
          }}
        >
          <Skeleton width={24} height={18} borderRadius={4} />
          <SkeletonCircle size={40} />
          <div style={{ flex: 1 }}>
            <Skeleton width={140} height={14} borderRadius={4} />
            <Skeleton width={80} height={11} borderRadius={4} style={{ marginTop: 6 }} />
          </div>
          <Skeleton width={48} height={20} borderRadius={6} />
        </div>
      ))}
    </div>
  );
});

const SkeletonComponents = {
  Skeleton,
  SkeletonText,
  SkeletonCircle,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonGrid,
  EventCardSkeleton,
  EventsGridSkeleton,
  CompetitionPageSkeleton,
  ProfileSkeleton,
  DashboardSkeleton,
  HomeFeedSkeleton,
  AnnouncementsSkeleton,
  LeaderboardSkeleton,
};

export default SkeletonComponents;
