/**
 * Competition Phase Utilities
 *
 * Status System (controlled by super admin):
 * - draft: Not viewable on public page
 * - publish: Viewable with "Coming Soon" teaser, shows interest forms
 * - live: Full visibility, follows timeline dates (nomination → voting → finale)
 * - completed: Competition over, winners displayed
 * - archive: Hidden from public but data preserved
 *
 * Timeline dates control the phase ONLY when status is "live"
 */

// Valid super admin statuses
export const COMPETITION_STATUSES = {
  DRAFT: 'draft',
  PUBLISH: 'publish',
  LIVE: 'live',
  COMPLETED: 'completed',
  ARCHIVE: 'archive',
};

// Timeline-based phases (used when status is "live")
export const TIMELINE_PHASES = {
  NOMINATION: 'nomination',   // During any active prospecting period
  VOTING: 'voting',           // During an active voting round
  JUDGING: 'judging',         // During an active judging round
  BETWEEN_ROUNDS: 'between',  // Between rounds/periods
  COMPLETED: 'completed',     // After finale date
};

/**
 * Compute the current phase of a competition.
 *
 * If status is "live", compute phase from timeline dates.
 * Otherwise, return the status directly.
 *
 * @param {Object} competition - Competition object
 * @returns {string} The current phase/status
 */
export function computeCompetitionPhase(competition) {
  if (!competition) return COMPETITION_STATUSES.DRAFT;

  const status = (competition.status || COMPETITION_STATUSES.DRAFT).toLowerCase();

  // If not "live", the status IS the phase
  if (status !== COMPETITION_STATUSES.LIVE) {
    return status;
  }

  // Status is "live" - compute phase from timeline
  return computeTimelinePhase(competition);
}

/**
 * Compute the timeline-based phase for an active competition.
 *
 * Supports:
 * - nomination_periods array (multiple prospecting periods with custom names)
 * - voting_rounds array with round_type ('voting' or 'judging')
 * - Flat fields fallback for backwards compatibility
 *
 * @param {Object} competition - Competition with timeline fields
 * @returns {string} The timeline phase
 */
export function computeTimelinePhase(competition) {
  const now = new Date();

  // Get settings - could be nested under .settings or flat on competition
  const settings = competition.settings || {};

  // Helper to get date from either settings or competition (settings takes priority)
  const getDate = (settingsKey, compKey) => {
    const value = settings[settingsKey] || competition[compKey || settingsKey];
    return value ? new Date(value) : null;
  };

  const finalsDate = getDate('finale_date', 'finals_date') || getDate('finals_date');

  // Phase 1: Completed - after finals date
  if (finalsDate && now >= finalsDate) {
    return TIMELINE_PHASES.COMPLETED;
  }

  // Get nomination periods (new system)
  const nominationPeriods = competition.nomination_periods || [];

  // Get voting/judging rounds
  const votingRounds = competition.voting_rounds || [];
  const sortedRounds = [...votingRounds].sort((a, b) => (a.round_order || 0) - (b.round_order || 0));

  // Check if currently in any voting or judging round
  for (const round of sortedRounds) {
    const roundStart = round.start_date ? new Date(round.start_date) : null;
    const roundEnd = round.end_date ? new Date(round.end_date) : null;
    if (roundStart && roundEnd && now >= roundStart && now < roundEnd) {
      // Return phase based on round_type
      if (round.round_type === 'judging') {
        return TIMELINE_PHASES.JUDGING;
      }
      return TIMELINE_PHASES.VOTING;
    }
  }

  // Check if currently in any nomination/prospecting period (new system)
  if (nominationPeriods.length > 0) {
    const sortedPeriods = [...nominationPeriods].sort((a, b) => (a.period_order || 0) - (b.period_order || 0));

    for (const period of sortedPeriods) {
      const periodStart = period.start_date ? new Date(period.start_date) : null;
      const periodEnd = period.end_date ? new Date(period.end_date) : null;
      if (periodStart && periodEnd && now >= periodStart && now < periodEnd) {
        return TIMELINE_PHASES.NOMINATION;
      }
    }

    // Get overall nomination window
    const firstPeriod = sortedPeriods[0];
    const lastPeriod = sortedPeriods[sortedPeriods.length - 1];
    const nomStart = firstPeriod?.start_date ? new Date(firstPeriod.start_date) : null;
    const nomEnd = lastPeriod?.end_date ? new Date(lastPeriod.end_date) : null;

    // If before first nomination period starts
    if (nomStart && now < nomStart) {
      return TIMELINE_PHASES.NOMINATION; // Show as upcoming nominations
    }

    // If after all nomination periods but before first round
    if (nomEnd && now >= nomEnd) {
      const firstRound = sortedRounds[0];
      const firstRoundStart = firstRound?.start_date ? new Date(firstRound.start_date) : null;
      if (firstRoundStart && now < firstRoundStart) {
        return TIMELINE_PHASES.BETWEEN_ROUNDS;
      }
    }
  } else {
    // Fallback to flat fields for backwards compatibility
    const nominationStart = getDate('nomination_start');
    const nominationEnd = getDate('nomination_end');

    if (nominationStart && nominationEnd) {
      if (now >= nominationStart && now < nominationEnd) {
        return TIMELINE_PHASES.NOMINATION;
      }
      if (now < nominationStart) {
        return TIMELINE_PHASES.NOMINATION; // Upcoming
      }
    }
  }

  // Check if between rounds (after all nomination periods and rounds)
  if (sortedRounds.length > 0) {
    const lastRound = sortedRounds[sortedRounds.length - 1];
    const lastRoundEnd = lastRound?.end_date ? new Date(lastRound.end_date) : null;
    if (lastRoundEnd && now >= lastRoundEnd) {
      // After last round but before finale
      return TIMELINE_PHASES.BETWEEN_ROUNDS;
    }
  }

  // Default to nomination phase if nothing else matches
  return TIMELINE_PHASES.NOMINATION;
}

/**
 * Check if a competition is visible on the public competitions list.
 * Visible statuses: publish, live, completed
 *
 * @param {string} status - The competition status
 * @returns {boolean}
 */
export function isCompetitionVisible(status) {
  const normalizedStatus = (status || '').toLowerCase();
  return [
    COMPETITION_STATUSES.PUBLISH,
    COMPETITION_STATUSES.LIVE,
    COMPETITION_STATUSES.COMPLETED,
  ].includes(normalizedStatus);
}

/**
 * Check if a competition is fully accessible (not just teaser).
 * Accessible statuses: live, completed
 *
 * @param {string} status - The competition status
 * @returns {boolean}
 */
export function isCompetitionAccessible(status) {
  const normalizedStatus = (status || '').toLowerCase();
  return [
    COMPETITION_STATUSES.LIVE,
    COMPETITION_STATUSES.COMPLETED,
  ].includes(normalizedStatus);
}

/**
 * Legacy function for backward compatibility.
 * @deprecated Use isCompetitionAccessible instead
 */
export function isCompetitionViewable(phase) {
  return isCompetitionAccessible(phase) ||
    [TIMELINE_PHASES.NOMINATION, TIMELINE_PHASES.VOTING, TIMELINE_PHASES.JUDGING, TIMELINE_PHASES.COMPLETED].includes(phase);
}

/**
 * Check if nomination dates are set (required for active status)
 * Supports both nomination_periods array and flat fields
 *
 * @param {Object} competition - Competition object
 * @returns {boolean}
 */
export function hasNominationDates(competition) {
  // Check for nomination_periods first (new system)
  const periods = competition?.nomination_periods || [];
  if (periods.length > 0) {
    const firstPeriod = periods[0];
    return !!(firstPeriod?.start_date && firstPeriod?.end_date);
  }

  // Fall back to flat fields
  const nominationStart = competition?.nomination_start || competition?.nominationStart;
  const nominationEnd = competition?.nomination_end || competition?.nominationEnd;
  return !!(nominationStart && nominationEnd);
}

/**
 * Validate if a competition can be set to a given status.
 *
 * @param {Object} competition - Competition object
 * @param {string} newStatus - The desired status
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateStatusChange(competition, newStatus) {
  const currentStatus = competition?.status;

  // Prevent invalid transitions
  if (currentStatus === COMPETITION_STATUSES.COMPLETED && newStatus === COMPETITION_STATUSES.LIVE) {
    return {
      valid: false,
      error: 'Cannot reactivate a completed competition. Create a new season instead.',
    };
  }

  if (currentStatus === COMPETITION_STATUSES.ARCHIVE && newStatus !== COMPETITION_STATUSES.DRAFT) {
    return {
      valid: false,
      error: 'Archived competitions can only be moved back to draft status.',
    };
  }

  if (newStatus === COMPETITION_STATUSES.LIVE) {
    if (!hasNominationDates(competition)) {
      return {
        valid: false,
        error: 'Nomination start and end dates must be set before going live.',
      };
    }
  }

  if (newStatus === COMPETITION_STATUSES.PUBLISH) {
    // Require city and organization for publishing
    if (!competition?.city) {
      return {
        valid: false,
        error: 'City must be set before publishing a competition.',
      };
    }
  }

  return { valid: true };
}

/**
 * Validate timeline dates are in logical order.
 *
 * @param {Object} competition - Competition object with timeline fields
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateTimelineDates(competition) {
  const errors = [];

  // Handle both camelCase and snake_case field names
  const nominationStart = competition?.nominationStart || competition?.nomination_start;
  const nominationEnd = competition?.nominationEnd || competition?.nomination_end;
  const votingStart = competition?.votingStart || competition?.voting_start;
  const votingEnd = competition?.votingEnd || competition?.voting_end;
  const finalsDate = competition?.finalsDate || competition?.finals_date;

  // Parse dates
  const nomStart = nominationStart ? new Date(nominationStart) : null;
  const nomEnd = nominationEnd ? new Date(nominationEnd) : null;
  const voteStart = votingStart ? new Date(votingStart) : null;
  const voteEnd = votingEnd ? new Date(votingEnd) : null;
  const finals = finalsDate ? new Date(finalsDate) : null;

  // Nomination end must be after nomination start
  if (nomStart && nomEnd && nomEnd <= nomStart) {
    errors.push('Nomination end date must be after nomination start date.');
  }

  // Voting start should be on or after nomination start (can overlap with nominations)
  if (nomStart && voteStart && voteStart < nomStart) {
    errors.push('Voting cannot start before nominations start.');
  }

  // Voting end must be after voting start
  if (voteStart && voteEnd && voteEnd <= voteStart) {
    errors.push('Voting end date must be after voting start date.');
  }

  // Finals must be after voting ends (if voting end is set)
  if (voteEnd && finals && finals < voteEnd) {
    errors.push('Finals date must be on or after voting ends.');
  }

  // Finals must be after voting starts (if no voting end but voting start is set)
  if (!voteEnd && voteStart && finals && finals < voteStart) {
    errors.push('Finals date must be after voting starts.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get the display configuration for a phase/status
 *
 * @param {string} phase - The phase or status
 * @returns {Object} Display configuration
 */
export function getPhaseDisplayConfig(phase) {
  const configs = {
    // Super admin statuses
    [COMPETITION_STATUSES.DRAFT]: {
      variant: 'secondary',
      label: 'DRAFT',
      icon: 'FileEdit',
      description: 'Not visible to public',
    },
    [COMPETITION_STATUSES.PUBLISH]: {
      variant: 'warning',
      label: 'COMING SOON',
      icon: 'Clock',
      description: 'Visible with teaser page',
    },
    [COMPETITION_STATUSES.LIVE]: {
      variant: 'success',
      label: 'LIVE',
      icon: 'Activity',
      pulse: true,
      description: 'Following timeline dates',
    },
    [COMPETITION_STATUSES.COMPLETED]: {
      variant: 'gold',
      label: 'COMPLETED',
      icon: 'Trophy',
      description: 'Winners displayed',
    },
    [COMPETITION_STATUSES.ARCHIVE]: {
      variant: 'secondary',
      label: 'ARCHIVED',
      icon: 'Archive',
      description: 'Hidden from public',
    },

    // Timeline phases (shown when status is live)
    [TIMELINE_PHASES.NOMINATION]: {
      variant: 'warning',
      label: 'NOMINATIONS OPEN',
      icon: 'UserPlus',
      pulse: true,
    },
    [TIMELINE_PHASES.VOTING]: {
      variant: 'success',
      label: 'VOTING LIVE',
      icon: 'Vote',
      pulse: true,
    },
    [TIMELINE_PHASES.JUDGING]: {
      variant: 'info',
      label: 'JUDGING',
      icon: 'Award',
      pulse: true,
    },
    [TIMELINE_PHASES.BETWEEN_ROUNDS]: {
      variant: 'secondary',
      label: 'BETWEEN ROUNDS',
      icon: 'Clock',
    },
    [TIMELINE_PHASES.COMPLETED]: {
      variant: 'gold',
      label: 'COMPLETED',
      icon: 'Trophy',
    },

    // Legacy fallbacks
    setup: { variant: 'secondary', label: 'SETUP', icon: 'Settings' },
    assigned: { variant: 'warning', label: 'COMING SOON', icon: 'Clock' },
    voting: { variant: 'success', label: 'VOTING LIVE', icon: 'Vote', pulse: true },
    live: { variant: 'success', label: 'LIVE', icon: 'Activity', pulse: true },
    completed: { variant: 'gold', label: 'COMPLETED', icon: 'Trophy' },
  };

  return configs[phase] || configs[COMPETITION_STATUSES.DRAFT];
}

/**
 * Get status options for super admin dropdown
 *
 * @returns {Array<{ value: string, label: string, description: string }>}
 */
export function getStatusOptions() {
  return [
    {
      value: COMPETITION_STATUSES.DRAFT,
      label: 'Draft',
      description: 'Not visible to public',
    },
    {
      value: COMPETITION_STATUSES.PUBLISH,
      label: 'Published',
      description: 'Visible with "Coming Soon" teaser',
    },
    {
      value: COMPETITION_STATUSES.LIVE,
      label: 'Live',
      description: 'Full visibility - follows timeline dates',
    },
    {
      value: COMPETITION_STATUSES.COMPLETED,
      label: 'Completed',
      description: 'Winners displayed',
    },
    {
      value: COMPETITION_STATUSES.ARCHIVE,
      label: 'Archived',
      description: 'Hidden but data preserved',
    },
  ];
}

/**
 * Format a date for timeline display
 *
 * @param {string} dateStr - ISO date string
 * @param {Object} options - Formatting options
 * @returns {string|null} Formatted date or null if invalid
 */
export function formatTimelineDate(dateStr, options = {}) {
  if (!dateStr) return null;

  try {
    const date = new Date(dateStr);
    const defaultOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      ...options,
    };

    return date.toLocaleDateString('en-US', defaultOptions);
  } catch {
    return null;
  }
}

/**
 * Get the status of a date period (upcoming, active, ended)
 *
 * @param {string} startDate - Start date ISO string
 * @param {string} endDate - End date ISO string (optional)
 * @returns {string|null} 'upcoming', 'active', 'ended', or null
 */
export function getDatePeriodStatus(startDate, endDate) {
  if (!startDate) return null;

  const now = new Date();
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  if (now < start) return 'upcoming';
  if (end && now > end) return 'ended';
  if (!end && now > start) return 'ended';

  return 'active';
}

/**
 * Check if a competition should auto-transition from publish to live.
 * This happens when status is 'publish' and nomination_start date has passed.
 *
 * @param {Object} competition - Competition object
 * @param {Object} settings - Competition settings (with nomination_start)
 * @returns {boolean} True if should transition to live
 */
export function shouldAutoTransitionToLive(competition, settings = null) {
  if (!competition) return false;

  // Only applies to competitions with status 'publish'
  if (competition.status !== COMPETITION_STATUSES.PUBLISH) return false;

  // Check nomination_start from settings first, then from competition
  const nominationStart = settings?.nomination_start || competition?.nomination_start;

  if (!nominationStart) return false;

  const now = new Date();
  const startDate = new Date(nominationStart);

  // If nomination start has passed, should transition to live
  return now >= startDate;
}

/**
 * Check if a competition should auto-transition from live to completed.
 * This happens when status is 'live' and finale_date has passed.
 *
 * @param {Object} competition - Competition object
 * @param {Object} settings - Competition settings (with finale_date)
 * @returns {boolean} True if should transition to completed
 */
export function shouldAutoTransitionToCompleted(competition, settings = null) {
  if (!competition) return false;

  // Only applies to competitions with status 'live'
  if (competition.status !== COMPETITION_STATUSES.LIVE) return false;

  // Check finale_date from settings first, then from competition
  const finaleDate = settings?.finale_date || competition?.finale_date || competition?.finals_date;

  if (!finaleDate) return false;

  const now = new Date();
  const endDate = new Date(finaleDate);

  // If finale date has passed, should transition to completed
  return now >= endDate;
}

/**
 * Get UI permissions based on the current phase.
 * Use this to determine what actions are allowed in the UI.
 *
 * @param {string} phase - The current phase (from computeCompetitionPhase)
 * @returns {Object} Permission flags for UI controls
 */
export function getPhasePermissions(phase) {
  return {
    allowVoting: phase === TIMELINE_PHASES.VOTING,
    allowJudging: phase === TIMELINE_PHASES.JUDGING,
    allowNominations: phase === TIMELINE_PHASES.NOMINATION,
    showResults: phase === TIMELINE_PHASES.COMPLETED || phase === 'completed',
    isActive: phase !== COMPETITION_STATUSES.DRAFT && phase !== COMPETITION_STATUSES.ARCHIVE,
    isBetweenRounds: phase === TIMELINE_PHASES.BETWEEN_ROUNDS,
  };
}
