import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ProfileSkeleton from './ProfileSkeleton';
import NotificationsSkeleton from './NotificationsSkeleton';
import CompetitionSkeleton from './CompetitionSkeleton';
import DashboardSkeleton from './DashboardSkeleton';
import RewardsSkeleton from './RewardsSkeleton';
import AchievementsSkeleton from './AchievementsSkeleton';

describe('Page Skeletons', () => {
  // Content-only skeletons (no page wrapper — SuspenseWrapper provides it)
  it('ProfileSkeleton renders without crashing', () => {
    const { container } = render(<ProfileSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
    // Content-only: no minHeight wrapper, max-width container instead
    expect(container.firstChild.style.maxWidth).toBe('900px');
  });

  it('NotificationsSkeleton renders without crashing', () => {
    const { container } = render(<NotificationsSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
    // Content-only: max-width container
    expect(container.firstChild.style.maxWidth).toBe('680px');
  });

  it('DashboardSkeleton renders without crashing', () => {
    const { container } = render(<DashboardSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
    // Content-only: max-width container
    expect(container.firstChild.style.maxWidth).toBe('1200px');
  });

  it('RewardsSkeleton renders without crashing', () => {
    const { container } = render(<RewardsSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
    // Content-only: max-width container
    expect(container.firstChild.style.maxWidth).toBe('1200px');
  });

  it('AchievementsSkeleton renders without crashing', () => {
    const { container } = render(<AchievementsSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
    // Content-only: max-width container
    expect(container.firstChild.style.maxWidth).toBe('680px');
  });

  // CompetitionSkeleton keeps full-page layout (hero-based)
  it('CompetitionSkeleton renders with full-page layout', () => {
    const { container } = render(<CompetitionSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
    expect(container.firstChild.style.minHeight).toBe('100vh');
  });

  it('NotificationsSkeleton renders multiple row placeholders', () => {
    const { container } = render(<NotificationsSkeleton />);
    // Should render 6 notification row skeletons (each has a circle + text)
    const shimmerElements = container.querySelectorAll('[style*="shimmer"]');
    expect(shimmerElements.length).toBeGreaterThanOrEqual(6);
  });

  it('CompetitionSkeleton renders card grid', () => {
    const { container } = render(<CompetitionSkeleton />);
    // Should have grid layout with cards
    const shimmerElements = container.querySelectorAll('[style*="shimmer"]');
    expect(shimmerElements.length).toBeGreaterThanOrEqual(6);
  });

  it('DashboardSkeleton renders stat cards and table rows', () => {
    const { container } = render(<DashboardSkeleton />);
    const shimmerElements = container.querySelectorAll('[style*="shimmer"]');
    // 4 stat cards + 1 table header + 8 rows = 13
    expect(shimmerElements.length).toBeGreaterThanOrEqual(10);
  });
});
