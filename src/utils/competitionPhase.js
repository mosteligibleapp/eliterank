/**
 * Competition Phase Utilities
 *
 * New Status System (controlled by super admin):
 * - draft: Not viewable on public page
 * - publish: Viewable with "Coming Soon" teaser, shows Apply to Host / Sponsor forms
 * - active: Follows timeline dates (nomination → voting → judging → complete)
 * - complete: Competition over, winners displayed
 * - archive: Hidden from public but data preserved
 *
 * Timeline dates are the source of truth ONLY when status is "active"
 */

// Valid super admin statuses
export const COMPETITION_STATUSES = {
  DRAFT: 'draft',
  PUBLISH: 'publish',
  ACTIVE: 'active',
  COMPLETE: 'complete',
  ARCHIVE: 'archive',
};

// Timeline-based phases (used when status is "active")
export const TIMELINE_PHASES = {
  NOMINATION: 'nomination',
  VOTING: 'voting',
  JUDGING: 'judging',
  COMPLETED: 'completed',
};

/**
 * Compute the current phase of a competition.
 *
 * If status is "active", compute phase from timeline dates.
 * Otherwise, return the status directly.
 *
 * @param {Object} competition - Competition object
 * @returns {string} The current phase/status
 */
export function computeCompetitionPhase(competition) {
  if (!competition) return COMPETITION_STATUSES.DRAFT;

  const status = competition.status || COMPETITION_STATUSES.DRAFT;

  // If not "active", the status IS the phase
  if (status !== COMPETITION_STATUSES.ACTIVE) {
    return status;
  }

  // Status is "active" - compute phase from timeline
  return computeTimelinePhase(competition);
}

/**
 * Compute the timeline-based phase for an active competition.
 *
 * @param {Object} competition - Competition with timeline fields
 * @returns {string} The timeline phase
 */
export function computeTimelinePhase(competition) {
  const now = new Date();

  const nominationStart = competition.nomination_start ? new Date(competition.nomination_start) : null;
  const nominationEnd = competition.nomination_end ? new Date(competition.nomination_end) : null;
  const votingStart = competition.voting_start ? new Date(competition.voting_start) : null;
  const votingEnd = competition.voting_end ? new Date(competition.voting_end) : null;
  const finalsDate = competition.finals_date ? new Date(competition.finals_date) : null;

  // Phase 1: Completed - after finals date
  if (finalsDate && now >= finalsDate) {
    return TIMELINE_PHASES.COMPLETED;
  }

  // Phase 2: Judging - after voting ends but before finals
  if (votingEnd && now >= votingEnd) {
    return TIMELINE_PHASES.JUDGING;
  }

  // Phase 3: Voting - between voting start and end
  if (votingStart && now >= votingStart) {
    if (!votingEnd || now < votingEnd) {
      return TIMELINE_PHASES.VOTING;
    }
  }

  // Phase 4: Nomination - between nomination start and end (or before voting starts)
  if (nominationStart && now >= nominationStart) {
    if (!votingStart || now < votingStart) {
      return TIMELINE_PHASES.NOMINATION;
    }
  }

  // Before nomination starts - still show as nomination (upcoming)
  // This happens when status is active but we haven't reached nomination_start yet
  return TIMELINE_PHASES.NOMINATION;
}

/**
 * Check if a competition is visible on the public competitions list.
 * Visible statuses: publish, active, complete
 *
 * @param {string} status - The competition status
 * @returns {boolean}
 */
export function isCompetitionVisible(status) {
  return [
    COMPETITION_STATUSES.PUBLISH,
    COMPETITION_STATUSES.ACTIVE,
    COMPETITION_STATUSES.COMPLETE,
  ].includes(status);
}

/**
 * Check if a competition is fully accessible (not just teaser).
 * Accessible statuses: active, complete
 *
 * @param {string} status - The competition status
 * @returns {boolean}
 */
export function isCompetitionAccessible(status) {
  return [
    COMPETITION_STATUSES.ACTIVE,
    COMPETITION_STATUSES.COMPLETE,
  ].includes(status);
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
 * Handles both snake_case (DB) and camelCase (UI) field names
 *
 * @param {Object} competition - Competition object
 * @returns {boolean}
 */
export function hasNominationDates(competition) {
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
  if (currentStatus === COMPETITION_STATUSES.COMPLETE && newStatus === COMPETITION_STATUSES.ACTIVE) {
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

  if (newStatus === COMPETITION_STATUSES.ACTIVE) {
    if (!hasNominationDates(competition)) {
      return {
        valid: false,
        error: 'Nomination start and end dates must be set before activating a competition.',
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
    [COMPETITION_STATUSES.ACTIVE]: {
      variant: 'success',
      label: 'ACTIVE',
      icon: 'Activity',
      pulse: true,
      description: 'Following timeline dates',
    },
    [COMPETITION_STATUSES.COMPLETE]: {
      variant: 'gold',
      label: 'COMPLETE',
      icon: 'Trophy',
      description: 'Winners displayed',
    },
    [COMPETITION_STATUSES.ARCHIVE]: {
      variant: 'secondary',
      label: 'ARCHIVED',
      icon: 'Archive',
      description: 'Hidden from public',
    },

    // Timeline phases (shown when status is active)
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
    [TIMELINE_PHASES.COMPLETED]: {
      variant: 'gold',
      label: 'COMPLETE',
      icon: 'Trophy',
    },

    // Legacy fallbacks
    setup: { variant: 'secondary', label: 'SETUP', icon: 'Settings' },
    assigned: { variant: 'warning', label: 'COMING SOON', icon: 'Clock' },
    voting: { variant: 'success', label: 'VOTING LIVE', icon: 'Vote', pulse: true },
    active: { variant: 'success', label: 'ACTIVE', icon: 'Activity', pulse: true },
    completed: { variant: 'gold', label: 'COMPLETE', icon: 'Trophy' },
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
      value: COMPETITION_STATUSES.ACTIVE,
      label: 'Active',
      description: 'Live - follows timeline dates',
    },
    {
      value: COMPETITION_STATUSES.COMPLETE,
      label: 'Complete',
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
