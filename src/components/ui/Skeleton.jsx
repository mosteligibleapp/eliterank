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
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px', ...style }}>
      {/* Centered header: org logo, season, title, city, phase badge */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <SkeletonCircle size={80} style={{ margin: '0 auto 12px' }} />
        <Skeleton width={100} height={12} borderRadius={4} style={{ margin: '0 auto 10px' }} />
        <Skeleton width={280} height={32} borderRadius={6} style={{ margin: '0 auto 10px' }} />
        <Skeleton width={160} height={20} borderRadius={4} style={{ margin: '0 auto 12px' }} />
        <Skeleton width={80} height={24} borderRadius={12} style={{ margin: '0 auto' }} />
      </div>

      {/* Nav tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} width={100} height={36} borderRadius={8} />
        ))}
      </div>

      {/* 2-column grid: main content + sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
        {/* Left column: leaderboard header + portrait grid */}
        <div style={{ ...sectionGap, gap: 12 }}>
          <div style={{ ...cardStyle, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton width={120} height={18} borderRadius={4} />
              <Skeleton width={60} height={18} borderRadius={4} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                style={{
                  background: CARD_BG,
                  border: `1px solid ${CARD_BORDER}`,
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                <div style={{ ...shimmerBackground, width: '100%', paddingTop: '133%' }} />
                <div style={{ padding: '8px 8px 10px', textAlign: 'center' }}>
                  <Skeleton width="70%" height={13} borderRadius={4} style={{ margin: '0 auto 4px' }} />
                  <Skeleton width="40%" height={11} borderRadius={4} style={{ margin: '0 auto' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Countdown card */}
          <div style={{ ...cardStyle, padding: 16 }}>
            <Skeleton width="60%" height={14} borderRadius={4} style={{ marginBottom: 12 }} />
            <Skeleton width="100%" height={40} borderRadius={8} />
          </div>
          {/* Prize pool card */}
          <div style={{ ...cardStyle, padding: 16 }}>
            <Skeleton width="80%" height={14} borderRadius={4} style={{ marginBottom: 10 }} />
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} width="100%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
            ))}
          </div>
          {/* Activity feed */}
          <div style={{ ...cardStyle, padding: 12 }}>
            <Skeleton width={80} height={10} borderRadius={4} style={{ marginBottom: 10 }} />
            {Array.from({ length: 5 }, (_, i) => (
              <SkeletonAvatar key={i} size={22} lines={1} style={{ marginBottom: 8 }} />
            ))}
          </div>
          {/* Upcoming event card */}
          <div style={{ ...cardStyle, padding: 16 }}>
            <Skeleton width="50%" height={14} borderRadius={4} style={{ marginBottom: 10 }} />
            <Skeleton width="100%" height={12} borderRadius={4} />
          </div>
        </div>
      </div>
    </div>
  );
});

export const ProfileSkeleton = memo(function ProfileSkeleton({ style }) {
  useShimmerStyles();

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', ...style }}>
      {/* Cover image */}
      <Skeleton width="100%" height={200} borderRadius={0} style={{ borderRadius: '0 0 16px 16px' }} />

      {/* Profile info row (overlapping cover) */}
      <div style={{ padding: '0 24px', marginTop: -60 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
          <SkeletonCircle size={140} style={{ border: '4px solid #0a0a0c' }} />
          <div style={{ flex: 1, paddingBottom: 8 }}>
            <Skeleton width={200} height={28} borderRadius={6} style={{ marginBottom: 8 }} />
            <Skeleton width={140} height={14} borderRadius={4} style={{ marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Skeleton width={80} height={24} borderRadius={12} />
              <Skeleton width={80} height={24} borderRadius={12} />
            </div>
          </div>
        </div>
      </div>

      {/* 2-column grid: 2fr 1fr */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, padding: '24px 24px 0' }}>
        {/* Left column */}
        <div style={{ ...sectionGap, gap: 24 }}>
          {/* Competitions */}
          <div style={{ ...cardStyle }}>
            <Skeleton width={140} height={18} borderRadius={4} style={{ marginBottom: 16 }} />
            {Array.from({ length: 2 }, (_, i) => (
              <div key={i} style={{ ...shimmerBackground, height: 80, borderRadius: 12, marginTop: i > 0 ? 8 : 0 }} />
            ))}
          </div>
          {/* Bio */}
          <div style={{ ...cardStyle }}>
            <Skeleton width={80} height={18} borderRadius={4} style={{ marginBottom: 12 }} />
            <SkeletonText lines={3} lineHeight={14} gap={8} />
          </div>
          {/* Gallery (3-col grid) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} style={{ ...shimmerBackground, paddingTop: '100%', borderRadius: 12 }} />
            ))}
          </div>
        </div>

        {/* Right column */}
        <div style={{ ...sectionGap, gap: 24 }}>
          {/* Social links */}
          <div style={{ ...cardStyle }}>
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: i > 0 ? 12 : 0 }}>
                <Skeleton width={40} height={40} borderRadius={8} />
                <div style={{ flex: 1 }}>
                  <Skeleton width="80%" height={13} borderRadius={4} />
                </div>
              </div>
            ))}
          </div>
          {/* Stats (2x2 grid) */}
          <div style={{ ...cardStyle }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} style={{ textAlign: 'center', padding: 12 }}>
                  <Skeleton width={36} height={36} borderRadius={8} style={{ margin: '0 auto 8px' }} />
                  <Skeleton width="60%" height={14} borderRadius={4} style={{ margin: '0 auto' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export const DashboardSkeleton = memo(function DashboardSkeleton({ withChrome = true, style }) {
  useShimmerStyles();

  return (
    <div style={style}>
      {withChrome && (
        <>
          {/* Sticky header bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 16px',
              height: 56,
              borderBottom: `1px solid ${CARD_BORDER}`,
              background: '#0a0a0c',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Skeleton width={36} height={36} borderRadius={8} />
              <Skeleton width={40} height={40} borderRadius={12} />
              <Skeleton width={160} height={20} borderRadius={4} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <SkeletonCircle size={36} />
              <Skeleton width={100} height={36} borderRadius={8} />
            </div>
          </div>

          {/* Nav tabs */}
          <div
            style={{
              display: 'flex',
              gap: 4,
              padding: '0 16px',
              borderBottom: `1px solid ${CARD_BORDER}`,
              background: '#0a0a0c',
            }}
          >
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} width={80} height={44} borderRadius={0} />
            ))}
          </div>
        </>
      )}

      {/* Content area (OverviewTab layout) */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Left column */}
          <div style={{ ...sectionGap, gap: 24 }}>
            {/* Timeline card */}
            <div style={{ ...cardStyle, height: 120 }}>
              <Skeleton width="50%" height={16} borderRadius={4} style={{ marginBottom: 16 }} />
              <Skeleton width="100%" height={48} borderRadius={8} />
            </div>
            {/* 3 metric cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} style={{ ...cardStyle, height: 80, padding: 16 }}>
                  <Skeleton width="50%" height={12} borderRadius={4} style={{ marginBottom: 8 }} />
                  <Skeleton width={60} height={24} borderRadius={6} />
                </div>
              ))}
            </div>
            {/* Events panel */}
            <div style={{ ...cardStyle }}>
              <Skeleton width={140} height={16} borderRadius={4} style={{ marginBottom: 16 }} />
              {Array.from({ length: 2 }, (_, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: i > 0 ? 12 : 0 }}>
                  <Skeleton width={40} height={40} borderRadius={8} />
                  <div style={{ flex: 1 }}>
                    <Skeleton width="60%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                    <Skeleton width="30%" height={11} borderRadius={4} />
                  </div>
                  <Skeleton width={60} height={22} borderRadius={12} />
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div style={{ ...sectionGap, gap: 24 }}>
            {/* Revenue card */}
            <div style={{ ...cardStyle, height: 100 }}>
              <Skeleton width="40%" height={14} borderRadius={4} style={{ marginBottom: 12 }} />
              <Skeleton width={100} height={32} borderRadius={6} />
            </div>
            {/* Top contestants */}
            <div style={{ ...cardStyle }}>
              <Skeleton width={140} height={16} borderRadius={4} style={{ marginBottom: 16 }} />
              {Array.from({ length: 5 }, (_, i) => (
                <SkeletonAvatar key={i} size={36} lines={1} style={{ marginTop: i > 0 ? 10 : 0 }} />
              ))}
            </div>
            {/* Announcements */}
            <div style={{ ...cardStyle }}>
              <Skeleton width={120} height={16} borderRadius={4} style={{ marginBottom: 16 }} />
              <SkeletonText lines={2} lineHeight={13} gap={8} style={{ marginBottom: 16 }} />
              <SkeletonText lines={2} lineHeight={13} gap={8} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export const HomeFeedSkeleton = memo(function HomeFeedSkeleton({ style }) {
  useShimmerStyles();

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px', ...style }}>
      {/* Hero section (centered) */}
      <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 32px' }}>
        <SkeletonCircle size={80} style={{ margin: '0 auto 16px' }} />
        <Skeleton width={240} height={24} borderRadius={12} style={{ margin: '0 auto 12px' }} />
        <Skeleton width={400} height={40} borderRadius={6} style={{ margin: '0 auto 10px', maxWidth: '90%' }} />
        <Skeleton width={200} height={16} borderRadius={4} style={{ margin: '0 auto' }} />
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} width={100} height={36} borderRadius={20} />
        ))}
      </div>

      {/* Card grid (flex wrap, centered) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 20 }}>
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            style={{
              flex: '1 1 380px',
              maxWidth: 500,
              background: CARD_BG,
              border: `1px solid ${CARD_BORDER}`,
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <div style={{ ...shimmerBackground, width: '100%', paddingTop: '56.25%' }} />
            <div style={{ padding: 16 }}>
              <Skeleton width="70%" height={18} borderRadius={4} />
              <Skeleton width="40%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
              <Skeleton width={100} height={32} borderRadius={8} style={{ marginTop: 12 }} />
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

export const NominationsPageSkeleton = memo(function NominationsPageSkeleton({ style }) {
  useShimmerStyles();

  return (
    <div style={{ padding: 24, ...style }}>
      {/* 4-column stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            style={{
              ...cardStyle,
              padding: 16,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Skeleton width={48} height={48} borderRadius={12} />
            <div>
              <Skeleton width={40} height={24} borderRadius={6} style={{ marginBottom: 4 }} />
              <Skeleton width={80} height={12} borderRadius={4} />
            </div>
          </div>
        ))}
      </div>

      {/* 4 collapsible sections */}
      <div style={{ ...sectionGap, gap: 20 }}>
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            style={{
              background: CARD_BG,
              border: `1px solid ${CARD_BORDER}`,
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            {/* Section header bar */}
            <div
              style={{
                padding: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                ...shimmerBackground,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Skeleton width={40} height={40} borderRadius={12} />
                <Skeleton width={120} height={18} borderRadius={4} />
                <Skeleton width={160} height={12} borderRadius={4} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Skeleton width={28} height={20} borderRadius={10} />
                <Skeleton width={20} height={20} borderRadius={4} />
              </div>
            </div>
            {/* Section body with person rows */}
            <div style={{ padding: 16 }}>
              {Array.from({ length: 3 }, (_, j) => (
                <div
                  key={j}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 12,
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 12,
                    marginTop: j > 0 ? 8 : 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <SkeletonCircle size={40} />
                    <Skeleton width={120} height={14} borderRadius={4} />
                  </div>
                  <Skeleton width={80} height={28} borderRadius={8} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
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
  NominationsPageSkeleton,
};

export default SkeletonComponents;
