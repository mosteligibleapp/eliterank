/**
 * Template-based default content for competition pages.
 *
 * Computed on-the-fly from competition context so a brand-new competition reads
 * as fully filled-in (about copy, traits, eligibility) using the information we
 * already have on file — organization name, competition name, territory, and
 * demographic. The host can override any of it in the About Section editor.
 *
 * Tolerant of BOTH the dashboard's flattened camelCase competition object and
 * the public page's raw snake_case row, so one generator serves both.
 */

// Read a field that may be camelCase (dashboard) or snake_case (public row).
const pick = (c, camel, snake, fallback = undefined) => {
  if (!c) return fallback;
  if (c[camel] !== undefined && c[camel] !== null) return c[camel];
  if (c[snake] !== undefined && c[snake] !== null) return c[snake];
  return fallback;
};

// Trait sets by category — the only category-specific content left (description
// and requirement are now derived from real config below).
const CATEGORY_TRAITS = {
  dating: ['Charismatic', 'Ambitious', 'Genuine', 'Confident'],
  fitness: ['Disciplined', 'Dedicated', 'Strong', 'Inspiring'],
  talent: ['Creative', 'Skilled', 'Passionate', 'Captivating'],
  business: ['Driven', 'Innovative', 'Strategic', 'Visionary'],
  pageant: ['Elegant', 'Poised', 'Talented', 'Radiant'],
  health: ['Balanced', 'Energetic', 'Mindful', 'Vibrant'],
  social: ['Engaging', 'Authentic', 'Creative', 'Influential'],
  default: ['Charismatic', 'Driven', 'Authentic', 'Inspiring'],
};

// Age range by demographic slug
const AGE_RANGE_BY_DEMOGRAPHIC = {
  'women-21-39': '21-39',
  'women-40-plus': '40+',
  'men-21-39': '21-39',
  'men-40-plus': '40+',
  'lgbtq-plus-21-39': '21-39',
  'lgbtq-plus-40-plus': '40+',
  'all-genders-29-45': '29-45',
  'all-genders-45-plus': '45+',
  'open': 'All Ages',
  default: '21+',
};

// ── Shape-tolerant accessors ────────────────────────────────────────────────

function getCityName(c) {
  const city = c?.city;
  if (city && typeof city === 'object') return city.name || null;
  if (typeof city === 'string') return city || null;
  return c?.cityData?.name || null;
}

function getCategorySlug(c) {
  return pick(c, 'categorySlug', 'category_slug', null) || c?.category?.slug || 'default';
}

function getDemographicSlug(c) {
  return pick(c, 'demographicSlug', 'demographic_slug', null) || c?.demographic?.slug || 'default';
}

function getOrgName(c) {
  return pick(c, 'organizationName', null) || c?.organization?.name || null;
}

// Possessive form, handling names already ending in "s" (Illinois → Illinois').
function possessive(name) {
  if (!name) return name;
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

// The possessive place phrase used in the about copy — "Chicago's", "Texas'",
// or "America's" — based on the competition's territory scope.
function getLocationPossessive(c) {
  const scope = pick(c, 'territoryScope', 'territory_scope', 'city');
  if (scope === 'us') return "America's";
  if (scope === 'state') {
    const state = pick(c, 'territoryState', 'territory_state', null);
    return state ? possessive(state) : "the state's";
  }
  const city = getCityName(c);
  return city ? possessive(city) : "your city's";
}

// The noun for who competes — from the competition's gender eligibility, falling
// back to the demographic slug, then a neutral "standouts".
function getContestantNoun(c) {
  const gender = pick(c, 'eligibilityGender', 'eligibility_gender', null);
  if (gender === 'female') return 'women';
  if (gender === 'male') return 'men';
  if (gender === 'LGBTQ+') return 'LGBTQ+ standouts';

  const slug = getDemographicSlug(c);
  if (slug.startsWith('women')) return 'women';
  if (slug.startsWith('men')) return 'men';
  if (slug.startsWith('lgbtq')) return 'LGBTQ+ standouts';
  return 'standouts';
}

/**
 * Default About description — "{Org} presents {Competition}, a competition for
 * {place}'s {who} who deserve the spotlight." Built from the org name,
 * competition name, territory, and demographic we already have on file.
 */
export function getDefaultDescription(competition) {
  const orgName = getOrgName(competition);
  const compName = competition?.name || 'this competition';
  const place = getLocationPossessive(competition);
  const who = getContestantNoun(competition);
  const body = `a competition for ${place} ${who} who deserve the spotlight.`;
  return orgName
    ? `${orgName} presents ${compName}, ${body}`
    : `${compName} is ${body}`;
}

/**
 * Get default traits for a competition
 */
export function getDefaultTraits(competition) {
  const slug = getCategorySlug(competition);
  return [...(CATEGORY_TRAITS[slug] || CATEGORY_TRAITS.default)];
}

/**
 * Get default age range for a competition
 */
export function getDefaultAgeRange(competition) {
  const slug = getDemographicSlug(competition);
  return AGE_RANGE_BY_DEMOGRAPHIC[slug] || AGE_RANGE_BY_DEMOGRAPHIC.default;
}

/**
 * Default eligibility requirement — derived from the actual territory:
 *  - city scope:  "Lives within {radius} miles of {city}"
 *  - state scope: "Lives in {state}"
 *  - US scope:    "Lives in the United States"
 */
export function getDefaultRequirement(competition) {
  const scope = pick(competition, 'territoryScope', 'territory_scope', 'city');
  if (scope === 'us') return 'Lives in the United States';
  if (scope === 'state') {
    const state = pick(competition, 'territoryState', 'territory_state', null);
    return state ? `Lives in ${state}` : 'Lives in the host state';
  }
  const city = getCityName(competition) || 'the host city';
  const radius = pick(competition, 'eligibilityRadiusMiles', 'eligibility_radius_miles', null);
  return radius ? `Lives within ${radius} miles of ${city}` : `Lives in ${city}`;
}

/**
 * Get all defaults as an object
 */
export function getCompetitionDefaults(competition) {
  return {
    description: getDefaultDescription(competition),
    traits: getDefaultTraits(competition),
    ageRange: getDefaultAgeRange(competition),
    requirement: getDefaultRequirement(competition),
  };
}

export default getCompetitionDefaults;
