/**
 * Slug Generation Utilities
 *
 * SINGLE SOURCE OF TRUTH for all slug generation in the app.
 * Used by: CompetitionsManager, navigation handlers, URL construction
 */

/**
 * Convert text to URL-safe slug
 * @param {string} text - Text to slugify
 * @returns {string} URL-safe slug
 */
export function slugify(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')  // Remove special characters
    .replace(/[\s_]+/g, '-')        // Replace spaces/underscores with dashes
    .replace(/-+/g, '-')            // Collapse multiple dashes
    .replace(/^-|-$/g, '');         // Remove leading/trailing dashes
}

/**
 * Remove state suffix from city slug (e.g., "chicago-il" -> "chicago")
 * @param {string} citySlug - City slug potentially with state
 * @returns {string} City slug without state
 */
export function removeCityStateSuffix(citySlug) {
  if (!citySlug) return '';
  return citySlug.replace(/-[a-z]{2}$/i, '');
}

/**
 * Generate competition slug
 *
 * Format: {name}-{city}-{year} for open demographic
 * Format: {name}-{city}-{year}-{demographic} for specific demographic
 *
 * @param {Object} params
 * @param {string} params.name - Competition name (e.g., "Most Eligible")
 * @param {string} params.citySlug - City slug (e.g., "chicago" or "chicago-il")
 * @param {number} params.season - Season year (e.g., 2026)
 * @param {string} [params.demographicSlug] - Demographic slug (e.g., "women-21-39")
 * @returns {string} Competition slug
 *
 * @example
 * generateCompetitionSlug({ name: "Elite Single Women", citySlug: "chicago-il", season: 2026 })
 * // Returns: "elite-single-women-chicago-2026"
 *
 * @example
 * generateCompetitionSlug({ name: "Most Eligible", citySlug: "chicago", season: 2026, demographicSlug: "women-21-39" })
 * // Returns: "most-eligible-chicago-2026-women-21-39"
 */
export function generateCompetitionSlug({ name, citySlug, season, demographicSlug }) {
  const namePart = slugify(name || 'competition');
  const cityPart = removeCityStateSuffix(citySlug || 'unknown');
  const yearPart = season || new Date().getFullYear();

  // Open demographic or no demographic specified
  if (!demographicSlug || demographicSlug === 'open') {
    return `${namePart}-${cityPart}-${yearPart}`;
  }

  // Specific demographic
  return `${namePart}-${cityPart}-${yearPart}-${demographicSlug}`;
}

/**
 * Generate competition URL path
 *
 * @param {string} orgSlug - Organization slug (e.g., "most-eligible")
 * @param {string} competitionSlug - Competition slug
 * @returns {string} URL path (e.g., "/most-eligible/elite-single-women-chicago-2026")
 */
export function getCompetitionUrl(orgSlug, competitionSlug) {
  const org = orgSlug || 'most-eligible';
  return `/${org}/${competitionSlug}`;
}

/**
 * Generate competition URL by ID (fallback)
 *
 * @param {string} orgSlug - Organization slug
 * @param {string} competitionId - Competition UUID
 * @returns {string} URL path (e.g., "/most-eligible/id/abc-123")
 */
export function getCompetitionUrlById(orgSlug, competitionId) {
  const org = orgSlug || 'most-eligible';
  return `/${org}/id/${competitionId}`;
}

/**
 * Check if a URL path segment looks like a competition slug
 * (contains a 4-digit year)
 *
 * @param {string} segment - URL path segment
 * @returns {boolean}
 */
export function isCompetitionSlug(segment) {
  if (!segment) return false;
  return /\d{4}/.test(segment);
}

/**
 * Check if a URL path segment is an ID route
 *
 * @param {string} segment - URL path segment
 * @returns {boolean}
 */
export function isIdRoute(segment) {
  return segment === 'id';
}

/**
 * Extract year from competition slug
 *
 * @param {string} slug - Competition slug
 * @returns {number|null} Year or null if not found
 */
export function extractYearFromSlug(slug) {
  if (!slug) return null;
  const match = slug.match(/\d{4}/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * Reserved paths that should NOT be treated as organization slugs
 */
export const RESERVED_PATHS = [
  'c',        // Legacy competition route prefix
  'org',      // Organization routes
  'login',    // Auth
  'claim',    // Claim nomination
  'admin',    // Admin panel
  'profile',  // User profile
  'api',      // API routes
  'auth',     // Auth callbacks
  'rewards',  // Rewards
  'events',   // Events
  'news',     // News/announcements
  'about',    // About page
  'join',     // Join/signup
];

/**
 * Check if a path segment is reserved
 *
 * @param {string} segment - URL path segment
 * @returns {boolean}
 */
export function isReservedPath(segment) {
  if (!segment) return false;
  return RESERVED_PATHS.includes(segment.toLowerCase());
}
