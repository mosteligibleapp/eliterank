/**
 * Competition System Type Definitions & Constants
 *
 * This file defines the data structures and constants used throughout
 * the competition management system.
 */

// =============================================================================
// STATUS CONSTANTS
// =============================================================================

// Re-export from competitionPhase.js for backwards compatibility
// COMPETITION_STATUSES is the single source of truth
import { COMPETITION_STATUSES } from '../utils/competitionPhase';
export const COMPETITION_STATUS = COMPETITION_STATUSES;

export const STATUS_CONFIG = {
  [COMPETITION_STATUS.DRAFT]: {
    label: 'Draft',
    color: '#6b7280',
    bg: 'rgba(107, 114, 128, 0.2)',
    description: 'Only visible to super admin',
  },
  [COMPETITION_STATUS.PUBLISH]: {
    label: 'Published',
    color: '#d4af37',
    bg: 'rgba(212, 175, 55, 0.2)',
    description: 'Public can view interest form',
  },
  [COMPETITION_STATUS.LIVE]: {
    label: 'Live',
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.2)',
    description: 'Competition is active',
  },
  [COMPETITION_STATUS.ARCHIVE]: {
    label: 'Archived',
    color: '#6b7280',
    bg: 'rgba(107, 114, 128, 0.2)',
    description: 'Hidden from public',
  },
  [COMPETITION_STATUS.COMPLETED]: {
    label: 'Completed',
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.2)',
    description: 'Competition has ended',
  },
};

// =============================================================================
// SELECTION CRITERIA
// =============================================================================

export const SELECTION_CRITERIA = {
  VOTES: 'votes',
  HYBRID: 'hybrid',
};

export const SELECTION_CRITERIA_CONFIG = {
  [SELECTION_CRITERIA.VOTES]: {
    label: 'Public Votes Only',
    description: 'Winner determined 100% by public votes',
  },
  [SELECTION_CRITERIA.HYBRID]: {
    label: 'Hybrid (Votes + Judges)',
    description: 'Combination of public votes and judge scores',
  },
};

// =============================================================================
// INTEREST TYPES
// =============================================================================

export const INTEREST_TYPE = {
  HOSTING: 'hosting',
  SPONSORING: 'sponsoring',
  COMPETING: 'competing',
  JUDGING: 'judging',
};

export const INTEREST_TYPE_CONFIG = {
  [INTEREST_TYPE.HOSTING]: {
    label: 'Hosting',
    description: 'I want to host this competition',
  },
  [INTEREST_TYPE.SPONSORING]: {
    label: 'Sponsoring',
    description: 'I want to sponsor this competition',
  },
  [INTEREST_TYPE.COMPETING]: {
    label: 'Competing',
    description: 'I want to compete in this competition',
  },
  [INTEREST_TYPE.JUDGING]: {
    label: 'Judging',
    description: 'I want to be a judge for this competition',
  },
};

// =============================================================================
// US STATES
// =============================================================================

export const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
];

// =============================================================================
// PRICE BUNDLER CONFIG
// =============================================================================

export const PRICE_BUNDLER_TIERS = [
  { minVotes: 1, maxVotes: 10, discount: 0, pricePerVote: 1.00 },
  { minVotes: 11, maxVotes: 25, discount: 10, pricePerVote: 0.90 },
  { minVotes: 26, maxVotes: 50, discount: 15, pricePerVote: 0.85 },
  { minVotes: 51, maxVotes: 100, discount: 20, pricePerVote: 0.80 },
  { minVotes: 101, maxVotes: 250, discount: 30, pricePerVote: 0.70 },
  { minVotes: 251, maxVotes: 500, discount: 50, pricePerVote: 0.50 },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a URL-safe slug from a string
 */
export function generateSlug(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate a city slug from name and state
 */
export function generateCitySlug(cityName, stateCode) {
  return `${generateSlug(cityName)}-${stateCode.toLowerCase()}`;
}

/**
 * Generate a competition URL path
 */
export function generateCompetitionUrl(orgSlug, citySlug, season) {
  return `/org/${orgSlug}/${citySlug}-${season}`;
}

/**
 * Calculate vote price based on bundler tiers
 */
export function calculateVotePrice(voteCount, useBundler = false, basePricePerVote = 1.00) {
  if (!useBundler) {
    return voteCount * basePricePerVote;
  }

  const tier = PRICE_BUNDLER_TIERS.find(
    t => voteCount >= t.minVotes && voteCount <= t.maxVotes
  ) || PRICE_BUNDLER_TIERS[PRICE_BUNDLER_TIERS.length - 1];

  return voteCount * tier.pricePerVote;
}

/**
 * Get the current competition phase based on dates
 */
export function getCurrentPhase(settings) {
  if (!settings) return null;

  const now = new Date();
  const nominationStart = settings.nomination_start ? new Date(settings.nomination_start) : null;
  const nominationEnd = settings.nomination_end ? new Date(settings.nomination_end) : null;
  const finaleDate = settings.finale_date ? new Date(settings.finale_date) : null;

  // Check voting rounds
  const votingRounds = settings.voting_rounds || [];
  const sortedRounds = [...votingRounds].sort((a, b) => a.round_order - b.round_order);

  // After finale
  if (finaleDate && now >= finaleDate) {
    return { phase: 'completed', label: 'Completed' };
  }

  // Check if in any voting round
  for (const round of sortedRounds) {
    const roundStart = new Date(round.start_date);
    const roundEnd = new Date(round.end_date);
    if (now >= roundStart && now < roundEnd) {
      return { phase: 'voting', label: round.title, round };
    }
  }

  // Check if in nomination period
  if (nominationStart && nominationEnd) {
    if (now >= nominationStart && now < nominationEnd) {
      return { phase: 'nomination', label: 'Nominations Open' };
    }
    if (now < nominationStart) {
      return { phase: 'upcoming', label: 'Coming Soon' };
    }
  }

  // Between nomination end and first voting round
  if (nominationEnd && now >= nominationEnd) {
    const firstRound = sortedRounds[0];
    if (firstRound && now < new Date(firstRound.start_date)) {
      return { phase: 'between', label: 'Nominations Closed' };
    }
  }

  return { phase: 'unknown', label: 'TBD' };
}

/**
 * Check if competition should auto-complete
 */
export function shouldAutoComplete(competition, settings) {
  if (competition.status === COMPETITION_STATUS.COMPLETED) return false;
  if (competition.status !== COMPETITION_STATUS.LIVE) return false;

  const finaleDate = settings?.finale_date ? new Date(settings.finale_date) : null;
  if (!finaleDate) return false;

  return new Date() >= finaleDate;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

export const DEFAULT_COMPETITION = {
  organization_id: null,
  city_id: null,
  season: new Date().getFullYear() + 1,
  status: COMPETITION_STATUS.DRAFT,
  entry_type: 'nominations',
  has_events: false,
  number_of_winners: 5,
  selection_criteria: SELECTION_CRITERIA.VOTES,
  host_id: null,
  description: '',
  rules_doc_url: '',
};

export const DEFAULT_COMPETITION_SETTINGS = {
  price_per_vote: 1.00,
  use_price_bundler: false,
  nomination_start: null,
  nomination_end: null,
  finale_date: null,
  allow_manual_votes: false,
};

export const DEFAULT_VOTING_ROUND = {
  title: '',
  round_order: 1,
  start_date: null,
  end_date: null,
  contestants_advance: 10,
};

export const DEFAULT_PRIZE = {
  title: '',
  description: '',
  image_url: null,
  value: '',
  external_url: '',
  sort_order: 0,
};

export const DEFAULT_RULE_SECTION = {
  section_title: '',
  section_content: '',
  sort_order: 0,
};
