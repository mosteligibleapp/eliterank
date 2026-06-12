// Constants barrel export
export * from './hobbies';
export * from './mockData';

// Navigation tabs
export const ADMIN_TABS = [
  { id: 'overview', label: 'Overview', icon: 'BarChart3' },
  { id: 'nominations', label: 'Nominations', icon: 'UserPlus' },
  { id: 'community', label: 'Community', icon: 'FileText' },
  { id: 'settings', label: 'Settings', icon: 'Settings' },
  { id: 'profile', label: 'Profile', icon: 'User' },
];

export const PUBLIC_SITE_TABS = [
  { id: 'contestants', label: 'Contestants', icon: 'Users' },
  { id: 'events', label: 'Events', icon: 'Calendar' },
  { id: 'announcements', label: 'Announcements', icon: 'Sparkles' },
  { id: 'about', label: 'About', icon: 'Award' },
];

// Status configurations
export const STATUS_CONFIG = {
  pending: { label: 'Pending Review', variant: 'warning' },
  'pending-approval': { label: 'Needs Approval', variant: 'warning' },
  'awaiting-profile': { label: 'Awaiting Profile', variant: 'purple' },
  'profile-complete': { label: 'Ready to Convert', variant: 'info' },
  approved: { label: 'Contestant', variant: 'success' },
  active: { label: 'Active', variant: 'success' },
  completed: { label: 'Completed', variant: 'success' },
  upcoming: { label: 'Upcoming', variant: 'purple' },
};

// Sponsor tiers with colors
export const SPONSOR_TIERS = ['Platinum', 'Gold', 'Silver'];

export const TIER_COLORS = {
  Platinum: { bg: 'rgba(224,224,224,0.15)', color: '#e0e0e0', border: 'rgba(224,224,224,0.3)' },
  Gold: { bg: 'rgba(212,175,55,0.15)', color: '#d4af37', border: 'rgba(212,175,55,0.3)' },
  Silver: { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: 'rgba(167,139,250,0.3)' },
};

// Announcement types with colors
export const ANNOUNCEMENT_TYPES = [
  { value: 'announcement', label: 'Announcement', color: 'gold' },
  { value: 'update', label: 'Update', color: 'success' },
  { value: 'news', label: 'News', color: 'info' },
];

export const ANNOUNCEMENT_TYPE_COLORS = {
  announcement: { bg: 'rgba(212,175,55,0.15)', color: '#d4af37', border: 'rgba(212,175,55,0.3)' },
  update: { bg: 'rgba(74,222,128,0.15)', color: '#4ade80', border: 'rgba(74,222,128,0.3)' },
  news: { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: 'rgba(96,165,250,0.3)' },
};

// Vote pricing
export const VOTE_PRICE = 1; // $1 per vote
export const VOTE_PRESETS = [1, 10, 25, 50, 100];

// Host payout percentage. EliteRank's platform fee is 15%, so hosts keep 85%
// of vote revenue. Kept in sync with competitions.host_payout_percentage
// (default 85.00) — see migration 083.
export const HOST_PAYOUT_PERCENTAGE = 0.85; // 85% (EliteRank keeps 15%)
