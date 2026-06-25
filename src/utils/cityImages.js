/**
 * City Background Images
 *
 * Maps city names to stock images for competition card backgrounds.
 * Uses Unsplash for free, high-quality city images.
 */

// Competition-specific images (takes priority over city images).
// Used only as a fallback when a competition has no cover_image in the DB —
// the public competition card reads `competition.cover_image || getCityImage(...)`.
// Going forward, hosts upload covers via the admin app (admin/CompetitionsManager).
const COMPETITION_IMAGES = {
  'most eligible bachelorettes': '/covers/chicago-women-2026.jpg',
};

// City name to image URL mapping (lowercase for easier matching)
const CITY_IMAGES = {
  // Major US Cities
  'miami': 'https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?w=800&q=80',
  'new york': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80',
  'los angeles': 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=800&q=80',
  'chicago': 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=800&q=80',
  'houston': 'https://images.unsplash.com/photo-1530089711124-9ca31fb9e863?w=800&q=80',
  'phoenix': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  'philadelphia': 'https://images.unsplash.com/photo-1569761316261-9a8696fa2ca3?w=800&q=80',
  'san antonio': 'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=800&q=80',
  'san diego': 'https://images.unsplash.com/photo-1538097304804-2a1b932466a9?w=800&q=80',
  'dallas': 'https://images.unsplash.com/photo-1545194445-dddb8f4487c6?w=800&q=80',
  'austin': 'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=800&q=80',
  'jacksonville': 'https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?w=800&q=80',
  'san jose': 'https://images.unsplash.com/photo-1535581652167-3a26c90954af?w=800&q=80',
  'fort worth': 'https://images.unsplash.com/photo-1545194445-dddb8f4487c6?w=800&q=80',
  'columbus': 'https://images.unsplash.com/photo-1564862384608-2fb0e2b5e0e4?w=800&q=80',
  'charlotte': 'https://images.unsplash.com/photo-1546436836-07a91091f160?w=800&q=80',
  'indianapolis': 'https://images.unsplash.com/photo-1564862384608-2fb0e2b5e0e4?w=800&q=80',
  'seattle': 'https://images.unsplash.com/photo-1502175353174-a7a70e73b362?w=800&q=80',
  'denver': 'https://images.unsplash.com/photo-1546156929-a4c0ac411f47?w=800&q=80',
  'boston': 'https://images.unsplash.com/photo-1501979376754-1d81ab4e8be8?w=800&q=80',
  'nashville': 'https://images.unsplash.com/photo-1545419913-775e3e83c22f?w=800&q=80',
  'las vegas': 'https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?w=800&q=80',
  'portland': 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=800&q=80',
  'detroit': 'https://images.unsplash.com/photo-1564862384608-2fb0e2b5e0e4?w=800&q=80',
  'atlanta': 'https://images.unsplash.com/photo-1575917649705-5b59aaa12e6b?w=800&q=80',
  'san francisco': 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&q=80',
  'tampa': 'https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?w=800&q=80',
  'orlando': 'https://images.unsplash.com/photo-1575089976121-8ed7b2a54265?w=800&q=80',
  'new orleans': 'https://images.unsplash.com/photo-1568402102990-bc541580b59f?w=800&q=80',
  'minneapolis': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  'salt lake city': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
  'pittsburgh': 'https://images.unsplash.com/photo-1564862384608-2fb0e2b5e0e4?w=800&q=80',
  'cincinnati': 'https://images.unsplash.com/photo-1564862384608-2fb0e2b5e0e4?w=800&q=80',
  'kansas city': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  'baltimore': 'https://images.unsplash.com/photo-1569761316261-9a8696fa2ca3?w=800&q=80',
  'washington': 'https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=800&q=80',
  'dc': 'https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=800&q=80',

  // Canadian Cities
  'toronto': 'https://plus.unsplash.com/premium_photo-1694475481348-7cbe417be129?w=800&q=80&auto=format&fit=crop',
};

// Default fallback image
const DEFAULT_CITY_IMAGE = 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&q=80';

// ── State-wide & US-wide imagery ───────────────────────────────────────────
// A state-wide competition shouldn't show a random city skyline — it should
// reflect the state's landscape. We map each state to a regional landscape
// (mountains, coast, forest, plains…) so the hero feels like the place. These
// are a curated starting set and can be swapped for exact per-state photos; a
// host-uploaded cover_image always takes priority over any of these.
const LANDSCAPE = {
  snowyMountains: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=1600&q=80', // snow-capped peaks (Alaska / high country)
  mountains: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&q=80',      // mountain valley + river
  greenMountains: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=1600&q=80', // rolling green hills (Appalachia)
  beach: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80',          // coastline / beach
  forestLake: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1600&q=80',     // forest + lake
  plains: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600&q=80',         // open fields / plains
};

// State (2-letter code) → regional landscape.
const STATE_IMAGES = {
  AK: LANDSCAPE.snowyMountains, AL: LANDSCAPE.greenMountains, AR: LANDSCAPE.greenMountains,
  AZ: LANDSCAPE.mountains, CA: LANDSCAPE.beach, CO: LANDSCAPE.snowyMountains,
  CT: LANDSCAPE.forestLake, DE: LANDSCAPE.beach, FL: LANDSCAPE.beach,
  GA: LANDSCAPE.greenMountains, HI: LANDSCAPE.beach, IA: LANDSCAPE.plains,
  ID: LANDSCAPE.snowyMountains, IL: LANDSCAPE.plains, IN: LANDSCAPE.plains,
  KS: LANDSCAPE.plains, KY: LANDSCAPE.greenMountains, LA: LANDSCAPE.beach,
  MA: LANDSCAPE.forestLake, MD: LANDSCAPE.beach, ME: LANDSCAPE.forestLake,
  MI: LANDSCAPE.forestLake, MN: LANDSCAPE.forestLake, MO: LANDSCAPE.greenMountains,
  MS: LANDSCAPE.beach, MT: LANDSCAPE.snowyMountains, NC: LANDSCAPE.greenMountains,
  ND: LANDSCAPE.plains, NE: LANDSCAPE.plains, NH: LANDSCAPE.snowyMountains,
  NJ: LANDSCAPE.beach, NM: LANDSCAPE.mountains, NV: LANDSCAPE.mountains,
  NY: LANDSCAPE.forestLake, OH: LANDSCAPE.plains, OK: LANDSCAPE.plains,
  OR: LANDSCAPE.forestLake, PA: LANDSCAPE.greenMountains, RI: LANDSCAPE.beach,
  SC: LANDSCAPE.beach, SD: LANDSCAPE.plains, TN: LANDSCAPE.greenMountains,
  TX: LANDSCAPE.plains, UT: LANDSCAPE.mountains, VA: LANDSCAPE.greenMountains,
  VT: LANDSCAPE.snowyMountains, WA: LANDSCAPE.forestLake, WI: LANDSCAPE.forestLake,
  WV: LANDSCAPE.greenMountains, WY: LANDSCAPE.snowyMountains, DC: LANDSCAPE.greenMountains,
};

const DEFAULT_STATE_IMAGE = LANDSCAPE.mountains;
const US_WIDE_IMAGE = LANDSCAPE.mountains;

/**
 * Get background image URL for a competition
 * First checks for competition-specific images, then falls back to city images
 * @param {string} cityName - Name of the city
 * @param {string} competitionName - Name of the competition (optional)
 * @returns {string} URL of the image
 */
export function getCityImage(cityName, competitionName = '') {
  // First check for competition-specific image
  if (competitionName) {
    const normalizedCompName = competitionName.toLowerCase().trim();

    // Direct match
    if (COMPETITION_IMAGES[normalizedCompName]) {
      return COMPETITION_IMAGES[normalizedCompName];
    }

    // Partial match for competition name
    for (const [key, url] of Object.entries(COMPETITION_IMAGES)) {
      if (normalizedCompName.includes(key) || key.includes(normalizedCompName)) {
        return url;
      }
    }
  }

  // Fall back to city image
  if (!cityName) return DEFAULT_CITY_IMAGE;

  const normalizedName = cityName.toLowerCase().trim();

  // Direct match
  if (CITY_IMAGES[normalizedName]) {
    return CITY_IMAGES[normalizedName];
  }

  // Partial match (e.g., "New York City" -> "new york")
  for (const [key, url] of Object.entries(CITY_IMAGES)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return url;
    }
  }

  return DEFAULT_CITY_IMAGE;
}

/**
 * Map a US state (2-letter code, e.g. "AK") to a regional landscape image.
 * @param {string} state
 * @returns {string} image URL
 */
export function getStateImage(state) {
  if (!state) return DEFAULT_STATE_IMAGE;
  const key = String(state).trim().toUpperCase();
  return STATE_IMAGES[key] || DEFAULT_STATE_IMAGE;
}

/**
 * Territory-aware hero/cover image for a competition. A host-uploaded cover
 * always wins; otherwise state-wide → state landscape, US-wide → national
 * landscape, city-wide → city skyline. Tolerant of snake_case or camelCase.
 * @param {object} competition
 * @returns {string} image URL
 */
export function getCompetitionImage(competition = {}) {
  const cover = competition.cover_image || competition.coverImage;
  if (cover) return cover;

  const scope = String(competition.territory_scope || competition.territoryScope || '').toLowerCase();

  if (scope === 'state') {
    return getStateImage(competition.territory_state || competition.territoryState);
  }
  if (scope === 'us' || scope === 'us-wide' || scope === 'nationwide') {
    return US_WIDE_IMAGE;
  }

  const cityName = typeof competition.city === 'string'
    ? competition.city
    : (competition.city?.name || competition.cityName || '');
  return getCityImage(cityName, competition.name);
}

/**
 * Get all available city images
 * @returns {Object} Map of city names to image URLs
 */
export function getAllCityImages() {
  return { ...CITY_IMAGES };
}

export default getCityImage;
