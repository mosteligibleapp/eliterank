import { Heart, Sparkles, Dumbbell, Star, Crown, Trophy, Vote, Scale } from 'lucide-react';

// Available cities for competitions
export const AVAILABLE_CITIES = [
  { name: 'New York', state: 'NY', country: 'USA' },
  { name: 'Los Angeles', state: 'CA', country: 'USA' },
  { name: 'Chicago', state: 'IL', country: 'USA' },
  { name: 'Miami', state: 'FL', country: 'USA' },
  { name: 'Houston', state: 'TX', country: 'USA' },
  { name: 'Phoenix', state: 'AZ', country: 'USA' },
  { name: 'Philadelphia', state: 'PA', country: 'USA' },
  { name: 'San Antonio', state: 'TX', country: 'USA' },
  { name: 'San Diego', state: 'CA', country: 'USA' },
  { name: 'Dallas', state: 'TX', country: 'USA' },
  { name: 'Austin', state: 'TX', country: 'USA' },
  { name: 'Atlanta', state: 'GA', country: 'USA' },
  { name: 'Denver', state: 'CO', country: 'USA' },
  { name: 'Seattle', state: 'WA', country: 'USA' },
  { name: 'Boston', state: 'MA', country: 'USA' },
  { name: 'Nashville', state: 'TN', country: 'USA' },
  { name: 'Las Vegas', state: 'NV', country: 'USA' },
  { name: 'Portland', state: 'OR', country: 'USA' },
  { name: 'Charlotte', state: 'NC', country: 'USA' },
  { name: 'San Francisco', state: 'CA', country: 'USA' },
];

// Category types for competitions
export const CATEGORY_TYPES = [
  { id: 'dating', name: 'Dating', icon: Heart, color: '#ec4899', description: 'Singles & Dating Competition' },
  { id: 'pageant', name: 'Pageant', icon: Sparkles, color: '#f59e0b', description: 'Beauty & Talent Pageant' },
  { id: 'fitness', name: 'Fitness', icon: Dumbbell, color: '#22c55e', description: 'Fitness & Body Competition' },
  { id: 'health', name: 'Health', icon: Star, color: '#3b82f6', description: 'Health & Wellness' },
  { id: 'social', name: 'Social', icon: Crown, color: '#8b5cf6', description: 'Social Influencer' },
  { id: 'talent', name: 'Talent', icon: Trophy, color: '#d4af37', description: 'Talent & Performance' },
];

// Contestant entry types
export const CONTESTANT_TYPES = [
  { id: 'nominations', name: 'Public Nominations', description: 'Anyone can nominate contestants' },
  { id: 'appointments', name: 'Host Appointments', description: 'Host selects contestants directly' },
  { id: 'applications', name: 'Applications', description: 'Contestants apply and are reviewed' },
];

// Winner selection criteria
export const SELECTION_CRITERIA = [
  { id: 'votes', name: 'Public Votes', icon: Vote, description: '100% determined by public voting' },
  { id: 'judges', name: 'Judges Only', icon: Scale, description: '100% determined by judges' },
  { id: 'hybrid', name: 'Hybrid', icon: Trophy, description: 'Combination of votes and judges' },
];

// Wizard steps configuration
export const WIZARD_STEPS = [
  { id: 1, name: 'Organization', description: 'Select owner organization' },
  { id: 2, name: 'Location', description: 'Choose city and year' },
  { id: 3, name: 'Category', description: 'Select competition type' },
  { id: 4, name: 'Contestants', description: 'Entry method' },
  { id: 5, name: 'Settings', description: 'Host & events' },
  { id: 6, name: 'Winners', description: 'Selection criteria' },
  { id: 7, name: 'Review', description: 'Confirm details' },
];

// Status styles for competition cards
export const STATUS_STYLES = {
  draft: { bg: 'rgba(100,100,100,0.2)', color: '#9ca3af', label: 'Draft' },
  publish: { bg: 'rgba(212,175,55,0.2)', color: '#d4af37', label: 'Published' },
  live: { bg: 'rgba(34,197,94,0.2)', color: '#22c55e', label: 'Live' },
  completed: { bg: 'rgba(139,92,246,0.2)', color: '#8b5cf6', label: 'Completed' },
  archive: { bg: 'rgba(100,100,100,0.2)', color: '#6b7280', label: 'Archived' },
  // Timeline phases (for live competitions)
  nomination: { bg: 'rgba(251,191,36,0.2)', color: '#fbbf24', label: 'Nominations' },
  voting: { bg: 'rgba(34,197,94,0.2)', color: '#22c55e', label: 'Voting' },
  judging: { bg: 'rgba(59,130,246,0.2)', color: '#3b82f6', label: 'Judging' },
};

// Logo options for organization creation
export const LOGO_OPTIONS = ['👑', '✨', '💪', '⭐', '🏆', '🎭', '💎', '🌟', '🎯', '🔥', '💫', '🎪'];

// Default template values
export const DEFAULT_TEMPLATE = {
  organization: null,
  city: '',
  season: new Date().getFullYear() + 1,
  category: '',
  contestantType: '',
  hasHost: true,
  hasEvents: true,
  numberOfWinners: 5,
  selectionCriteria: '',
  voteWeight: 50,
  judgeWeight: 50,
  votePrice: 1.00,
  hostPayoutPercentage: 20,
  maxContestants: 30,
};

// Vote price presets
export const VOTE_PRICE_PRESETS = [0.50, 1.00, 2.00, 5.00];
