/**
 * Field editability rules based on competition status
 *
 * Values:
 * - true: Fully editable
 * - false: Locked (cannot edit)
 * - 'warn': Editable with confirmation warning
 */

const FIELD_RULES = {
  // SLOT FIELDS - Always locked (admin-controlled franchise definition)
  // These define the unique competition slot and cannot be changed by hosts
  name: { draft: false, publish: false, live: false, completed: false },
  city: { draft: false, publish: false, live: false, completed: false },
  season: { draft: false, publish: false, live: false, completed: false },
  slug: { draft: false, publish: false, live: false, completed: false },
  category: { draft: false, publish: false, live: false, completed: false },
  demographic: { draft: false, publish: false, live: false, completed: false },

  // ECONOMICS FIELDS - Always locked (admin-controlled economics)
  // These affect prize commitments and revenue structure
  prize_pool_minimum: { draft: false, publish: false, live: false, completed: false },
  minimum_prize: { draft: false, publish: false, live: false, completed: false },
  number_of_winners: { draft: false, publish: false, live: false, completed: false },
  price_per_vote: { draft: false, publish: false, live: false, completed: false },
  eligibility_radius: { draft: false, publish: false, live: false, completed: false },
  min_contestants: { draft: false, publish: false, live: false, completed: false },
  max_contestants: { draft: false, publish: false, live: false, completed: false },

  // About/Marketing - mostly editable
  about_tagline: { draft: true, publish: true, live: true, completed: false },
  about_description: { draft: true, publish: true, live: true, completed: false },
  about_traits: { draft: true, publish: true, live: 'warn', completed: false },
  about_age_range: { draft: true, publish: true, live: false, completed: false },
  about_requirement: { draft: true, publish: true, live: false, completed: false },

  // Theme - warn during live
  theme_primary: { draft: true, publish: true, live: 'warn', completed: false },
  theme_voting: { draft: true, publish: true, live: 'warn', completed: false },
  theme_resurrection: { draft: true, publish: true, live: 'warn', completed: false },

  // Timeline - limited during live
  nomination_start: { draft: true, publish: true, live: false, completed: false },
  nomination_end: { draft: true, publish: true, live: false, completed: false },
  voting_start: { draft: true, publish: true, live: false, completed: false },
  voting_end: { draft: true, publish: true, live: 'warn', completed: false },
  finale_date: { draft: true, publish: true, live: 'warn', completed: false },

  // Events - always editable until complete
  events: { draft: true, publish: true, live: true, completed: false },

  // Rules - warn during live
  rules: { draft: true, publish: true, live: 'warn', completed: false },

  // Sponsors - always editable until complete
  sponsors: { draft: true, publish: true, live: true, completed: false },

  // Structure - locked once live
  number_of_winners: { draft: true, publish: true, live: false, completed: false },
  selection_criteria: { draft: true, publish: true, live: false, completed: false },
  advancement_thresholds: { draft: true, publish: true, live: false, completed: false },

  // Announcements - always editable
  announcements: { draft: true, publish: true, live: true, completed: true },

  // Winners - only after completion
  winners: { draft: false, publish: false, live: false, completed: true },

  // Host profile - always editable
  host_profile: { draft: true, publish: true, live: true, completed: true },
};

/**
 * Check if a field is editable for given competition status
 * @param {string} fieldName - Field to check
 * @param {string} status - Competition status (draft, publish, live, completed)
 * @returns {boolean|'warn'} - true if editable, false if locked, 'warn' if needs confirmation
 */
export function isFieldEditable(fieldName, status) {
  const normalizedStatus = normalizeStatus(status);
  const rules = FIELD_RULES[fieldName];

  if (!rules) {
    // Unknown field - default to editable in draft/publish, locked otherwise
    console.warn(`No editability rules defined for field: ${fieldName}`);
    return normalizedStatus === 'draft' || normalizedStatus === 'publish';
  }

  return rules[normalizedStatus] ?? false;
}

/**
 * Get all editable fields for a given status
 * @param {string} status - Competition status
 * @returns {object} - Object with field names as keys, editability as values
 */
export function getEditableFields(status) {
  const normalizedStatus = normalizeStatus(status);
  const result = {};

  for (const [field, rules] of Object.entries(FIELD_RULES)) {
    result[field] = rules[normalizedStatus] ?? false;
  }

  return result;
}

/**
 * Get fields that are locked for a given status
 * @param {string} status - Competition status
 * @returns {string[]} - Array of locked field names
 */
export function getLockedFields(status) {
  const normalizedStatus = normalizeStatus(status);

  return Object.entries(FIELD_RULES)
    .filter(([_, rules]) => rules[normalizedStatus] === false)
    .map(([field]) => field);
}

/**
 * Get fields that require warning before editing
 * @param {string} status - Competition status
 * @returns {string[]} - Array of field names requiring warning
 */
export function getWarnFields(status) {
  const normalizedStatus = normalizeStatus(status);

  return Object.entries(FIELD_RULES)
    .filter(([_, rules]) => rules[normalizedStatus] === 'warn')
    .map(([field]) => field);
}

/**
 * Check if any provided fields would trigger a warning
 * @param {string[]} fields - Fields being edited
 * @param {string} status - Competition status
 * @returns {string[]} - Fields that need warning confirmation
 */
export function checkFieldsForWarning(fields, status) {
  const warnFields = getWarnFields(status);
  return fields.filter((field) => warnFields.includes(field));
}

/**
 * Get human-readable reason why a field is locked
 * @param {string} fieldName - Field name
 * @param {string} status - Competition status
 * @returns {string} - Explanation message
 */
export function getLockedReason(fieldName, status) {
  const normalizedStatus = normalizeStatus(status);

  // Always-locked fields (admin-controlled) - same message regardless of status
  const alwaysLockedReasons = {
    name: 'Competition name is set by admin and defines the franchise slot.',
    city: 'City is set by admin and defines the franchise slot.',
    season: 'Season is set by admin and defines the franchise slot.',
    slug: 'URL slug is generated automatically and cannot be changed.',
    category: 'Category is set by admin and defines the franchise slot.',
    demographic: 'Demographic is set by admin and defines the franchise slot.',
    prize_pool_minimum: 'Minimum prize is set by admin to protect contestant expectations.',
    minimum_prize: 'Minimum prize is set by admin to protect contestant expectations.',
    number_of_winners: 'Winner count is set by admin and affects prize distribution.',
    price_per_vote: 'Price per vote is set by admin and affects revenue structure.',
    eligibility_radius: 'Eligibility radius is set by admin and defines competition scope.',
    min_contestants: 'Minimum contestants is set by admin for competition viability.',
    max_contestants: 'Maximum contestants is set by admin for competition management.',
  };

  // Check always-locked first
  if (alwaysLockedReasons[fieldName]) {
    return alwaysLockedReasons[fieldName];
  }

  // Status-specific reasons
  const reasons = {
    live: {
      about_age_range:
        'Eligibility requirements cannot change during an active competition.',
      about_requirement:
        'Eligibility requirements cannot change during an active competition.',
      nomination_start: 'Past dates cannot be modified.',
      nomination_end: 'Nomination period cannot be changed once voting has started.',
      voting_start: 'Voting has already begun.',
      advancement_thresholds: 'Advancement rules are locked once voting begins.',
    },
    completed: {
      default: 'This field cannot be modified after the competition has ended.',
    },
  };

  return (
    reasons[normalizedStatus]?.[fieldName] ||
    reasons[normalizedStatus]?.default ||
    'This field is locked for the current competition status.'
  );
}

/**
 * Get warning message for fields that allow editing with confirmation
 * @param {string} fieldName - Field name
 * @returns {string} - Warning message
 */
export function getEditWarning(fieldName) {
  const warnings = {
    about_traits:
      'Changing "Who Competes" criteria during a live competition may confuse current contestants and voters.',
    theme_primary:
      'Changing theme colors will immediately affect how the public page appears.',
    theme_voting:
      'Changing theme colors will immediately affect how the public page appears.',
    theme_resurrection:
      'Changing theme colors will immediately affect how the public page appears.',
    voting_end:
      'Extending or shortening the voting period affects all contestants equally. Consider announcing this change.',
    finale_date:
      'Changing the finale date may affect contestant and voter plans. Consider announcing this change.',
    rules:
      'Modifying rules during an active competition should be done carefully and communicated to participants.',
  };

  return (
    warnings[fieldName] ||
    'This competition is live. Are you sure you want to make this change?'
  );
}

/**
 * Normalize status string to match our standard format
 */
function normalizeStatus(status) {
  if (!status) return 'draft';

  const s = status.toLowerCase().replace('-', '_');

  // Map variations
  const statusMap = {
    coming_soon: 'publish',
    comingsoon: 'publish',
    'coming-soon': 'publish',
    active: 'live',
    in_progress: 'live',
    finished: 'completed',
    ended: 'completed',
    done: 'completed',
  };

  return statusMap[s] || s;
}

export default isFieldEditable;
