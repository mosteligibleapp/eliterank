/**
 * Activity feed type definitions
 * Maps activity types to Lucide icon names and CSS classes
 * NO EMOJIS - uses Lucide icons for clean brand alignment
 */

export const ACTIVITY_TYPES = {
  vote: {
    type: 'vote',
    label: 'Vote',
    icon: 'vote', // Lucide: Vote or CheckCircle
    colorClass: 'activity-vote',
  },
  rank_up: {
    type: 'rank_up',
    label: 'Rank Up',
    icon: 'trending-up', // Lucide: TrendingUp
    colorClass: 'activity-positive',
  },
  rank_down: {
    type: 'rank_down',
    label: 'Rank Down',
    icon: 'trending-down', // Lucide: TrendingDown
    colorClass: 'activity-warning',
  },
  new_leader: {
    type: 'new_leader',
    label: 'New Leader',
    icon: 'crown', // Lucide: Crown
    colorClass: 'activity-highlight',
  },
  milestone_pool: {
    type: 'milestone_pool',
    label: 'Prize Milestone',
    icon: 'trophy', // Lucide: Trophy
    colorClass: 'activity-milestone',
  },
  milestone_prize: {
    type: 'milestone_prize',
    label: 'Prize Update',
    icon: 'dollar-sign', // Lucide: DollarSign
    colorClass: 'activity-milestone',
  },
  profile_view: {
    type: 'profile_view',
    label: 'Profile Views',
    icon: 'eye', // Lucide: Eye
    colorClass: 'activity-neutral',
  },
  external_share: {
    type: 'external_share',
    label: 'Shared',
    icon: 'share-2', // Lucide: Share2
    colorClass: 'activity-positive',
  },
  urgency: {
    type: 'urgency',
    label: 'Time Alert',
    icon: 'clock', // Lucide: Clock
    colorClass: 'activity-urgent',
  },
};

/**
 * Get activity type config
 * @param {string} type - Activity type from database
 * @returns {object} Activity type config
 */
export function getActivityType(type) {
  return (
    ACTIVITY_TYPES[type] || {
      type: 'unknown',
      label: 'Update',
      icon: 'info',
      colorClass: 'activity-neutral',
    }
  );
}

/**
 * Get Lucide icon name for activity type
 * @param {string} type - Activity type
 * @returns {string} Lucide icon name
 */
export function getActivityIcon(type) {
  return getActivityType(type).icon;
}

export default ACTIVITY_TYPES;
