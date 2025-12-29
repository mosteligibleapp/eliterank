/**
 * City Background Images
 *
 * Maps city names to stock images for competition card backgrounds.
 * Uses Unsplash for free, high-quality city images.
 */

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
};

// Default fallback image
const DEFAULT_CITY_IMAGE = 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&q=80';

/**
 * Get background image URL for a city
 * @param {string} cityName - Name of the city
 * @returns {string} URL of the city image
 */
export function getCityImage(cityName) {
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
 * Get all available city images
 * @returns {Object} Map of city names to image URLs
 */
export function getAllCityImages() {
  return { ...CITY_IMAGES };
}

export default getCityImage;
