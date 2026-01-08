/**
 * Public-facing competition phase detector
 *
 * This module provides a simplified interface for determining competition phases
 * for public pages. It wraps the internal competitionPhase utilities.
 *
 * Phases:
 * - 'coming-soon': Competition announced but not yet accepting nominations
 * - 'nominations': Accepting nominations/applications
 * - 'round1', 'round2', etc.: Active voting rounds
 * - 'resurrection': Special round for eliminated contestants
 * - 'finals': Final voting round
 * - 'results': Competition complete, showing winners
 * - 'draft': Not yet public (host only)
 * - 'cancelled': Competition was cancelled
 */

import {
  computeCompetitionPhase,
  COMPETITION_STATUSES,
  TIMELINE_PHASES,
} from './competitionPhase';

/**
 * Determine the current phase of a competition for public display
 *
 * @param {object} competition - Competition object from database
 * @param {Array} votingRounds - Array of voting_rounds for this competition
 * @param {Array} nominationPeriods - Array of nomination_periods for this competition
 * @returns {object} Phase info object
 */
export function getCompetitionPhase(
  competition,
  votingRounds = [],
  nominationPeriods = []
) {
  if (!competition) {
    return { phase: 'unknown', label: 'Unknown', isPublic: false };
  }

  const now = new Date();
  const status = competition.status?.toLowerCase();

  // Handle terminal states
  if (status === 'cancelled') {
    return {
      phase: 'cancelled',
      label: 'Cancelled',
      isPublic: false,
      isVoting: false,
      canNominate: false,
    };
  }

  if (status === 'completed') {
    return {
      phase: 'results',
      label: 'Results',
      isPublic: true,
      isVoting: false,
      canNominate: false,
      isComplete: true,
    };
  }

  if (status === 'draft') {
    return {
      phase: 'draft',
      label: 'Draft',
      isPublic: false,
      isVoting: false,
      canNominate: false,
    };
  }

  if (status === 'archive') {
    return {
      phase: 'archived',
      label: 'Archived',
      isPublic: false,
      isVoting: false,
      canNominate: false,
    };
  }

  // Use voting_rounds from competition if not provided
  const rounds = votingRounds.length > 0 ? votingRounds : competition.voting_rounds || [];
  const periods =
    nominationPeriods.length > 0
      ? nominationPeriods
      : competition.nomination_periods || [];

  // Check for active voting round
  const activeVotingRound = findActiveVotingRound(rounds, now);

  if (activeVotingRound) {
    const roundPhase = determineRoundPhase(activeVotingRound);
    return {
      phase: roundPhase.phase,
      label: roundPhase.label,
      isPublic: true,
      isVoting: true,
      canNominate: false,
      currentRound: activeVotingRound,
      roundNumber: activeVotingRound.round_order,
      endsAt: activeVotingRound.end_date,
      timeRemaining: getTimeRemaining(activeVotingRound.end_date),
    };
  }

  // Check for active nomination period
  const activeNomination = findActiveNominationPeriod(periods, now);

  if (activeNomination || status === 'live') {
    // If live but no active voting, check if nominations are open
    const nominationStart = competition.nomination_start
      ? new Date(competition.nomination_start)
      : null;
    const nominationEnd = competition.nomination_end
      ? new Date(competition.nomination_end)
      : null;

    // Check nomination periods first
    if (activeNomination) {
      return {
        phase: 'nominations',
        label: activeNomination.title || 'Nominations Open',
        isPublic: true,
        isVoting: false,
        canNominate: true,
        endsAt: activeNomination.end_date,
        timeRemaining: getTimeRemaining(activeNomination.end_date),
        currentPeriod: activeNomination,
      };
    }

    // Fall back to flat nomination dates
    if (
      nominationStart &&
      nominationEnd &&
      now >= nominationStart &&
      now <= nominationEnd
    ) {
      return {
        phase: 'nominations',
        label: 'Nominations Open',
        isPublic: true,
        isVoting: false,
        canNominate: true,
        endsAt: nominationEnd,
        timeRemaining: getTimeRemaining(nominationEnd),
      };
    }
  }

  // Check for coming soon (publish status)
  if (status === 'publish' || status === 'coming_soon' || status === 'coming-soon') {
    const nominationStart = competition.nomination_start
      ? new Date(competition.nomination_start)
      : null;

    return {
      phase: 'coming-soon',
      label: 'Coming Soon',
      isPublic: true,
      isVoting: false,
      canNominate: false,
      startsAt: nominationStart,
      timeRemaining: nominationStart ? getTimeRemaining(nominationStart) : null,
    };
  }

  // Default: if live but between rounds/nominations
  if (status === 'live') {
    // Find next upcoming round
    const nextRound = findNextVotingRound(rounds, now);

    if (nextRound) {
      return {
        phase: 'between-rounds',
        label: 'Between Rounds',
        isPublic: true,
        isVoting: false,
        canNominate: false,
        nextRound: nextRound,
        startsAt: nextRound.start_date,
        timeRemaining: getTimeRemaining(nextRound.start_date),
      };
    }
  }

  // Fallback
  return {
    phase: 'unknown',
    label: status || 'Unknown',
    isPublic: status === 'live' || status === 'publish',
    isVoting: false,
    canNominate: false,
  };
}

/**
 * Find currently active voting round
 */
function findActiveVotingRound(votingRounds, now) {
  if (!Array.isArray(votingRounds)) return null;

  return votingRounds.find((round) => {
    const start = round.start_date ? new Date(round.start_date) : null;
    const end = round.end_date ? new Date(round.end_date) : null;

    if (!start || !end) return false;
    return now >= start && now <= end;
  });
}

/**
 * Find next upcoming voting round
 */
function findNextVotingRound(votingRounds, now) {
  if (!Array.isArray(votingRounds)) return null;

  const upcoming = votingRounds
    .filter((round) => {
      const start = round.start_date ? new Date(round.start_date) : null;
      return start && start > now;
    })
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  return upcoming[0] || null;
}

/**
 * Find currently active nomination period
 */
function findActiveNominationPeriod(nominationPeriods, now) {
  if (!Array.isArray(nominationPeriods)) return null;

  return nominationPeriods.find((period) => {
    const start = period.start_date ? new Date(period.start_date) : null;
    const end = period.end_date ? new Date(period.end_date) : null;

    if (!start || !end) return false;
    return now >= start && now <= end;
  });
}

/**
 * Determine specific round phase based on round properties
 */
function determineRoundPhase(round) {
  const title = (round.title || '').toLowerCase();
  const roundType = (round.round_type || '').toLowerCase();

  // Check for resurrection
  if (roundType === 'resurrection' || title.includes('resurrection')) {
    return { phase: 'resurrection', label: 'Resurrection Round' };
  }

  // Check for finals
  if (roundType === 'finals' || title.includes('final')) {
    return { phase: 'finals', label: 'Finals' };
  }

  // Default to numbered round
  const roundNum = round.round_order || 1;
  return {
    phase: `round${roundNum}`,
    label: round.title || `Round ${roundNum}`,
  };
}

/**
 * Calculate time remaining until a date
 */
export function getTimeRemaining(endDate) {
  if (!endDate) return null;

  const end = new Date(endDate);
  const now = new Date();
  const diff = end - now;

  if (diff <= 0) {
    return {
      expired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      total: 0,
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return {
    expired: false,
    days,
    hours,
    minutes,
    seconds,
    total: diff,
    formatted: formatTimeRemaining(days, hours, minutes),
  };
}

/**
 * Format time remaining for display
 */
function formatTimeRemaining(days, hours, minutes) {
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Check if competition is in a voting phase
 */
export function isVotingPhase(phase) {
  return (
    [
      'round1',
      'round2',
      'round3',
      'round4',
      'resurrection',
      'finals',
    ].includes(phase) || phase?.startsWith('round')
  );
}

/**
 * Check if competition is publicly visible
 */
export function isPublicPhase(phase) {
  return (
    [
      'coming-soon',
      'nominations',
      'round1',
      'round2',
      'round3',
      'round4',
      'resurrection',
      'finals',
      'results',
      'between-rounds',
    ].includes(phase) || phase?.startsWith('round')
  );
}

export default getCompetitionPhase;
