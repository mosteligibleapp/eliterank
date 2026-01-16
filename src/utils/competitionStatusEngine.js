/**
 * Competition Status Engine
 *
 * Handles automated status transitions based on dates and current state.
 * Status changes follow these rules:
 *
 * | Status     | Trigger                                                    | Who Controls |
 * |------------|-----------------------------------------------------------|--------------|
 * | Draft      | Competition created                                        | Automatic    |
 * | Published  | Admin sets (requires: city, category, demographic, host)   | Admin only   |
 * | Live       | datetime >= nomination_start AND status = Published        | Automatic    |
 * | Completed  | datetime > finale_date AND status = Live                   | Automatic    |
 * | Archived   | Admin manually archives                                    | Admin only   |
 */

import { COMPETITION_STATUS } from '../types/competition';

/**
 * Determines the computed status of a competition based on dates and current status.
 * This does NOT mutate the database — it returns what the status SHOULD be.
 * A separate process/trigger handles actual status updates.
 *
 * @param {object} competition - Competition object with status and date fields
 * @returns {string} - The computed status
 */
export function computeCompetitionStatus(competition) {
  if (!competition) return COMPETITION_STATUS.DRAFT;

  const now = new Date();
  const { status } = competition;

  // Get first nomination period start date
  const nominationStart = competition.nomination_start
    ? new Date(competition.nomination_start)
    : null;

  // Get finale date
  const finaleDate = competition.finale_date
    ? new Date(competition.finale_date)
    : null;

  // Archived and Draft are manual states — don't auto-transition
  if (status === COMPETITION_STATUS.ARCHIVED || status === COMPETITION_STATUS.DRAFT) {
    return status;
  }

  // Auto-transition: Published → Live (when nomination period starts)
  if (status === COMPETITION_STATUS.PUBLISHED && nominationStart && nominationStart <= now) {
    return COMPETITION_STATUS.LIVE;
  }

  // Auto-transition: Live → Completed (after finale date)
  if (status === COMPETITION_STATUS.LIVE && finaleDate && finaleDate < now) {
    return COMPETITION_STATUS.COMPLETED;
  }

  return status;
}

/**
 * Checks if the stored status differs from the computed status.
 * Useful for identifying competitions that need status updates.
 *
 * @param {object} competition - Competition object
 * @returns {object} - { needsUpdate: boolean, currentStatus: string, computedStatus: string }
 */
export function checkStatusSync(competition) {
  const currentStatus = competition?.status || COMPETITION_STATUS.DRAFT;
  const computedStatus = computeCompetitionStatus(competition);

  return {
    needsUpdate: currentStatus !== computedStatus,
    currentStatus,
    computedStatus,
  };
}

/**
 * Requirements for publishing a competition
 */
const PUBLISH_REQUIREMENTS = {
  city: (c) => Boolean(c.city || c.city_id),
  category: (c) => Boolean(c.category_id),
  demographic: (c) => Boolean(c.demographic_id),
  host: (c) => Boolean(c.host_id),
  nominationStart: (c) => Boolean(c.nomination_start),
  finaleDate: (c) => Boolean(c.finale_date),
};

/**
 * Checks what requirements are met for a competition
 *
 * @param {object} competition - Competition object
 * @returns {object} - Object with boolean values for each requirement
 */
export function checkPublishRequirements(competition) {
  if (!competition) {
    return Object.keys(PUBLISH_REQUIREMENTS).reduce((acc, key) => {
      acc[key] = false;
      return acc;
    }, {});
  }

  return Object.entries(PUBLISH_REQUIREMENTS).reduce((acc, [key, check]) => {
    acc[key] = check(competition);
    return acc;
  }, {});
}

/**
 * Validates whether a manual status change is allowed.
 * Only admins can change status — this validates the transition.
 *
 * @param {object} competition - Competition object
 * @param {string} newStatus - The desired new status
 * @returns {object} - { valid: boolean, errors: string[], warnings: string[] }
 */
export function validateAdminStatusChange(competition, newStatus) {
  const currentStatus = competition?.status || COMPETITION_STATUS.DRAFT;
  const errors = [];
  const warnings = [];

  // Check requirements for publishing
  if (newStatus === COMPETITION_STATUS.PUBLISHED) {
    const requirements = checkPublishRequirements(competition);

    if (!requirements.city) errors.push('City must be assigned');
    if (!requirements.category) errors.push('Category must be assigned');
    if (!requirements.demographic) errors.push('Demographic must be assigned');
    if (!requirements.host) errors.push('Host must be assigned');
    if (!requirements.nominationStart) warnings.push('Nomination start date not set');
    if (!requirements.finaleDate) warnings.push('Finale date not set');
  }

  // Validate transition from completed/archived
  if (currentStatus === COMPETITION_STATUS.COMPLETED && newStatus !== COMPETITION_STATUS.ARCHIVED) {
    warnings.push('Reopening a completed competition may affect historical data');
  }

  if (currentStatus === COMPETITION_STATUS.ARCHIVED && newStatus !== COMPETITION_STATUS.DRAFT) {
    errors.push('Archived competitions can only be moved back to Draft');
  }

  // Validate going backwards in status
  const statusOrder = [
    COMPETITION_STATUS.DRAFT,
    COMPETITION_STATUS.PUBLISHED,
    COMPETITION_STATUS.LIVE,
    COMPETITION_STATUS.COMPLETED,
  ];

  const currentIndex = statusOrder.indexOf(currentStatus);
  const newIndex = statusOrder.indexOf(newStatus);

  if (newIndex < currentIndex && newStatus !== COMPETITION_STATUS.ARCHIVED) {
    warnings.push(`Moving from ${currentStatus} back to ${newStatus} - this is unusual`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Gets a human-readable description of why status cannot be changed
 *
 * @param {string} status - Current status
 * @returns {string} - Description
 */
export function getStatusChangeRestriction(status) {
  switch (status) {
    case COMPETITION_STATUS.DRAFT:
      return 'Competition is in draft. Admin can publish when requirements are met.';
    case COMPETITION_STATUS.PUBLISHED:
      return 'Competition will go live automatically when nomination period starts.';
    case COMPETITION_STATUS.LIVE:
      return 'Competition will complete automatically after the finale date.';
    case COMPETITION_STATUS.COMPLETED:
      return 'Competition has ended. Admin can archive if needed.';
    case COMPETITION_STATUS.ARCHIVED:
      return 'Competition is archived. Admin can restore if needed.';
    default:
      return 'Status is managed automatically based on timeline dates.';
  }
}

/**
 * Gets the next automatic status transition info
 *
 * @param {object} competition - Competition object
 * @returns {object|null} - { nextStatus, triggerDate, description } or null
 */
export function getNextAutoTransition(competition) {
  if (!competition) return null;

  const { status, nomination_start, finale_date } = competition;

  if (status === COMPETITION_STATUS.PUBLISHED && nomination_start) {
    return {
      nextStatus: COMPETITION_STATUS.LIVE,
      triggerDate: new Date(nomination_start),
      description: 'Will go live when nomination period starts',
    };
  }

  if (status === COMPETITION_STATUS.LIVE && finale_date) {
    return {
      nextStatus: COMPETITION_STATUS.COMPLETED,
      triggerDate: new Date(finale_date),
      description: 'Will complete after finale date',
    };
  }

  return null;
}

export default {
  computeCompetitionStatus,
  checkStatusSync,
  checkPublishRequirements,
  validateAdminStatusChange,
  getStatusChangeRestriction,
  getNextAutoTransition,
};
