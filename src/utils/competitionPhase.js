/**
 * Competition Phase Utilities
 *
 * Computes the current phase of a competition based on timeline dates.
 * Timeline dates are the source of truth for phase transitions.
 */

/**
 * Compute the current phase of a competition based on its timeline dates.
 *
 * Phase priority (in order):
 * 1. If after finals_date → 'completed'
 * 2. If after voting_end and before/at finals_date → 'judging'
 * 3. If between voting_start and voting_end → 'voting'
 * 4. If between nomination_start and nomination_end → 'nomination'
 * 5. If before nomination_start but has a host → 'assigned' (coming soon)
 * 6. If no timeline set → use manual status or 'setup'
 *
 * @param {Object} competition - Competition object with timeline fields
 * @param {string} competition.nomination_start - ISO date string for nomination start
 * @param {string} competition.nomination_end - ISO date string for nomination end
 * @param {string} competition.voting_start - ISO date string for voting start
 * @param {string} competition.voting_end - ISO date string for voting end
 * @param {string} competition.finals_date - ISO date string for finals
 * @param {string} competition.status - Manual status (fallback if no timeline)
 * @param {string} competition.host_id - Host ID (indicates if host is assigned)
 * @returns {string} The computed phase
 */
export function computeCompetitionPhase(competition) {
  if (!competition) return 'setup';

  const now = new Date();

  const nominationStart = competition.nomination_start ? new Date(competition.nomination_start) : null;
  const nominationEnd = competition.nomination_end ? new Date(competition.nomination_end) : null;
  const votingStart = competition.voting_start ? new Date(competition.voting_start) : null;
  const votingEnd = competition.voting_end ? new Date(competition.voting_end) : null;
  const finalsDate = competition.finals_date ? new Date(competition.finals_date) : null;

  // Check if we have any timeline data to work with
  const hasTimelineData = nominationStart || votingStart || finalsDate;

  if (!hasTimelineData) {
    // No timeline data - use manual status
    return competition.status || 'setup';
  }

  // Phase 1: Completed - after finals date
  if (finalsDate && now >= finalsDate) {
    return 'completed';
  }

  // Phase 2: Judging - after voting ends but before finals
  if (votingEnd && now >= votingEnd) {
    return 'judging';
  }

  // Phase 3: Voting - between voting start and end
  if (votingStart && now >= votingStart) {
    // If voting_end is set, we're in voting until then
    // If not set, we're in voting from start until some other condition
    if (!votingEnd || now < votingEnd) {
      return 'voting';
    }
  }

  // Phase 4: Nomination - between nomination start and end
  if (nominationStart && now >= nominationStart) {
    // If voting hasn't started yet, we're in nomination phase
    if (!votingStart || now < votingStart) {
      // Check if nomination period has ended
      if (!nominationEnd || now < nominationEnd) {
        return 'nomination';
      }
      // Nomination ended but voting hasn't started - gap period, treat as nomination closed
      return 'nomination';
    }
  }

  // Phase 5: Before nomination starts (upcoming/assigned)
  if (nominationStart && now < nominationStart) {
    // Competition has timeline but hasn't started yet
    return competition.host_id ? 'assigned' : 'setup';
  }

  // Fallback to manual status
  return competition.status || 'setup';
}

/**
 * Check if a competition is viewable (can be clicked to open)
 * Competitions are viewable if they are in nomination, voting, judging, or completed phase
 *
 * @param {string} phase - The computed phase
 * @returns {boolean} Whether the competition is viewable
 */
export function isCompetitionViewable(phase) {
  return ['nomination', 'voting', 'active', 'judging', 'completed'].includes(phase);
}

/**
 * Get the display status configuration for a phase
 *
 * @param {string} phase - The competition phase
 * @returns {Object} Status configuration with variant, label, icon info
 */
export function getPhaseDisplayConfig(phase) {
  const configs = {
    active: { variant: 'success', label: 'LIVE NOW', pulse: true },
    voting: { variant: 'success', label: 'VOTING', pulse: true },
    nomination: { variant: 'warning', label: 'NOMINATIONS OPEN', icon: 'UserPlus' },
    judging: { variant: 'info', label: 'JUDGING', pulse: true },
    setup: { variant: 'default', label: 'SETUP', icon: 'Clock' },
    assigned: { variant: 'warning', label: 'COMING SOON', icon: 'Clock' },
    upcoming: { variant: 'warning', label: 'COMING SOON', icon: 'Clock' },
    completed: { variant: 'secondary', label: 'COMPLETED', icon: 'Trophy' },
  };

  return configs[phase] || configs.setup;
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
