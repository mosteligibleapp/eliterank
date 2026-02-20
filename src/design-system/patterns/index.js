/**
 * EliteRank Design System - Patterns
 * 
 * Pre-built UI patterns combining multiple components
 * for common use cases in the EliteRank application.
 * 
 * @example
 * import { ContestantCard, LeaderboardRow, VoteButton, EventCard } from './design-system/patterns';
 */

// ContestantCard
export { default as ContestantCard } from './ContestantCard';
export { ContestantCardSkeleton, ContestantGrid } from './ContestantCard';

// LeaderboardRow
export { default as LeaderboardRow } from './LeaderboardRow';
export { Leaderboard, LeaderboardRowSkeleton, TopThreeDisplay } from './LeaderboardRow';

// VoteButton
export { default as VoteButton } from './VoteButton';
export { VoteButtonGroup, FloatingVoteButton } from './VoteButton';

// EventCard
export { default as EventCard } from './EventCard';
export { EventCardSkeleton, EventGrid } from './EventCard';
