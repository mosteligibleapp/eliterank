/**
 * Field editability across the competition lifecycle.
 *
 * Phases: draft → pending_approval → approved → publish → live → completed
 *
 * Two host-facing lock tiers (per product spec):
 *  - SUBMIT_LOCK: editable only in draft; locks once submitted for approval
 *    (category, who-can-enter, territory, entry type, how-they-win, # winners,
 *     sponsor-of-record org, name/identity).
 *  - PUBLISH_LOCK: editable through "approved"; locks once published to public
 *    (nomination/voting dates, prize structure, judging criteria, nomination/
 *     application form fields).
 *
 * Plus: LOCKED (platform-controlled, never host-editable — e.g. vote pricing),
 * EDITABLE (always), MARKETING (until completed), THEME (warn while live).
 *
 * Values: true (editable) | false (locked) | 'warn' (editable w/ confirmation).
 */

const PHASES = ['draft', 'pending_approval', 'approved', 'publish', 'live', 'completed'];

const p = (draft, pending, approved, publish, live, completed) => ({
  draft, pending_approval: pending, approved, publish, live, completed,
});

// Tiers
const EDITABLE = p(true, true, true, true, true, true);
const LOCKED = p(false, false, false, false, false, false);
const SUBMIT_LOCK = p(true, false, false, false, false, false);
const PUBLISH_LOCK = p(true, true, true, false, false, false);
const MARKETING = p(true, true, true, true, true, false);
const THEME = p(true, true, true, true, 'warn', false);

const FIELD_RULES = {
  // Platform-controlled — never host-editable
  slug: LOCKED,
  price_per_vote: LOCKED,
  prize_pool_minimum: LOCKED,
  minimum_prize: LOCKED,

  // Identity / structure — lock at Submit-for-approval
  name: SUBMIT_LOCK,
  city: SUBMIT_LOCK,
  season: SUBMIT_LOCK,
  category: SUBMIT_LOCK,
  category_template: SUBMIT_LOCK,
  demographic: SUBMIT_LOCK,
  territory: SUBMIT_LOCK,
  eligibility: SUBMIT_LOCK,
  eligibility_radius: SUBMIT_LOCK,
  about_age_range: SUBMIT_LOCK,
  about_requirement: SUBMIT_LOCK,
  min_contestants: SUBMIT_LOCK,
  max_contestants: SUBMIT_LOCK,
  entry_type: SUBMIT_LOCK,
  selection_criteria: SUBMIT_LOCK,
  number_of_winners: SUBMIT_LOCK,
  organization: SUBMIT_LOCK,

  // Specifics — lock at Publish-to-public
  nomination_start: PUBLISH_LOCK,
  nomination_end: PUBLISH_LOCK,
  voting_start: PUBLISH_LOCK,
  voting_end: PUBLISH_LOCK,
  finals_date: PUBLISH_LOCK,
  sponsors: PUBLISH_LOCK,
  prizes: PUBLISH_LOCK,
  prize_structure: PUBLISH_LOCK,
  judging_criteria: PUBLISH_LOCK,
  nomination_form: PUBLISH_LOCK,
  advancement_thresholds: PUBLISH_LOCK,
  rules: PUBLISH_LOCK,

  // Editable until the competition ends
  events: MARKETING,
  about_description: MARKETING,
  about_traits: MARKETING,

  // Theme — warn during live
  theme_primary: THEME,
  theme_voting: THEME,
  theme_resurrection: THEME,

  // Always editable
  announcements: EDITABLE,
  host_profile: EDITABLE,

  // Winners — only once completed
  winners: p(false, false, false, false, false, true),
};

function normalizeStatus(status) {
  if (!status) return 'draft';
  const s = String(status).toLowerCase().replace(/-/g, '_');
  const map = {
    coming_soon: 'publish',
    comingsoon: 'publish',
    upcoming: 'publish',
    nomination: 'publish',
    active: 'live',
    in_progress: 'live',
    voting: 'live',
    finals: 'live',
    finished: 'completed',
    ended: 'completed',
    done: 'completed',
    archive: 'completed',
  };
  const out = map[s] || s;
  return PHASES.includes(out) ? out : 'draft';
}

export function isFieldEditable(fieldName, status) {
  const phase = normalizeStatus(status);
  const rules = FIELD_RULES[fieldName];
  if (!rules) {
    // Unknown field: editable before publish, locked after.
    return phase === 'draft' || phase === 'pending_approval' || phase === 'approved';
  }
  return rules[phase] ?? false;
}

export function getEditableFields(status) {
  const phase = normalizeStatus(status);
  const result = {};
  for (const [field, rules] of Object.entries(FIELD_RULES)) result[field] = rules[phase] ?? false;
  return result;
}

export function getLockedFields(status) {
  const phase = normalizeStatus(status);
  return Object.entries(FIELD_RULES).filter(([, r]) => r[phase] === false).map(([f]) => f);
}

export function getWarnFields(status) {
  const phase = normalizeStatus(status);
  return Object.entries(FIELD_RULES).filter(([, r]) => r[phase] === 'warn').map(([f]) => f);
}

export function checkFieldsForWarning(fields, status) {
  const warnFields = getWarnFields(status);
  return fields.filter((field) => warnFields.includes(field));
}

export function getLockedReason(fieldName, status) {
  const phase = normalizeStatus(status);
  const platform = {
    slug: 'The URL is generated automatically and can’t be changed.',
    price_per_vote: 'Vote pricing is set by EliteRank, not the host.',
    prize_pool_minimum: 'Set by EliteRank to protect contestant expectations.',
    minimum_prize: 'Set by EliteRank to protect contestant expectations.',
  };
  if (platform[fieldName]) return platform[fieldName];

  const rules = FIELD_RULES[fieldName];
  if (rules === SUBMIT_LOCK || (rules && rules.pending_approval === false && rules.draft === true && rules.approved === false)) {
    return 'Locked once you submit for approval — this defines the competition and can’t change.';
  }
  if (rules === PUBLISH_LOCK || (rules && rules.approved === true && rules.publish === false)) {
    return 'Locked once your competition is published to the public.';
  }
  if (phase === 'completed') return 'This can’t be changed after the competition has ended.';
  return 'This field is locked in the current phase.';
}

export function getEditWarning(fieldName) {
  const warnings = {
    about_traits: 'Changing who competes during a live competition may confuse current contestants and voters.',
    theme_primary: 'Changing theme colors immediately affects the public page.',
    theme_voting: 'Changing theme colors immediately affects the public page.',
    theme_resurrection: 'Changing theme colors immediately affects the public page.',
  };
  return warnings[fieldName] || 'This competition is live. Are you sure you want to make this change?';
}

export default isFieldEditable;
