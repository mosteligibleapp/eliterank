/**
 * Image Transform Utilities
 * 
 * Converts Supabase Storage URLs to use the Image Transform API for optimized delivery.
 * This dramatically reduces bandwidth by serving appropriately sized images.
 * 
 * @see https://supabase.com/docs/guides/storage/serving/image-transformations
 */

const SUPABASE_PROJECT_ID = 'jioblcflgpqcfdmzjnto';
const STORAGE_URL_PATTERN = new RegExp(
  `https://${SUPABASE_PROJECT_ID}\\.supabase\\.co/storage/v1/object/public/`
);

/**
 * Transform a Supabase storage URL to use image optimization
 * 
 * @param {string} url - The original storage URL
 * @param {Object} options - Transform options
 * @param {number} [options.width] - Target width in pixels
 * @param {number} [options.height] - Target height in pixels  
 * @param {string} [options.resize='cover'] - Resize mode: 'cover', 'contain', or 'fill'
 * @param {string} [options.format='webp'] - Output format: 'webp', 'avif', 'jpeg', 'png'
 * @param {number} [options.quality=80] - Quality 1-100 (for lossy formats)
 * @returns {string} The transformed URL, or original if not a Supabase URL
 * 
 * @example
 * // For avatars (small, square)
 * getOptimizedImageUrl(url, { width: 200, height: 200 })
 * 
 * // For larger profile images
 * getOptimizedImageUrl(url, { width: 400, height: 400, quality: 85 })
 */
export function getOptimizedImageUrl(url, options = {}) {
  // Return as-is if not a string or empty
  if (!url || typeof url !== 'string') {
    return url;
  }

  // Only transform Supabase storage URLs
  if (!STORAGE_URL_PATTERN.test(url)) {
    return url;
  }

  // Build transform URL
  // Replace /object/ with /render/image/ in the path
  const transformUrl = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  );

  // Build query params
  const params = new URLSearchParams();
  
  if (options.width) {
    params.set('width', String(options.width));
  }
  if (options.height) {
    params.set('height', String(options.height));
  }
  if (options.resize) {
    params.set('resize', options.resize);
  }
  if (options.format) {
    params.set('format', options.format);
  }
  if (options.quality) {
    params.set('quality', String(options.quality));
  }

  const queryString = params.toString();
  return queryString ? `${transformUrl}?${queryString}` : transformUrl;
}

/**
 * Get an optimized avatar URL
 * Uses preset sizes optimized for avatar display (2x for retina)
 * 
 * @param {string} url - The original avatar URL
 * @param {number} [displaySize=64] - The CSS display size in pixels
 * @returns {string} Optimized URL
 */
export function getAvatarUrl(url, displaySize = 64) {
  if (!url) return url;
  
  // Request 2x for retina displays, with a reasonable max
  const targetSize = Math.min(displaySize * 2, 400);
  
  return getOptimizedImageUrl(url, {
    width: targetSize,
    height: targetSize,
    resize: 'cover',
    format: 'webp',
    quality: 80,
  });
}

/**
 * Get an optimized profile/card image URL
 * For larger images like profile cards, contestant cards
 * 
 * @param {string} url - The original image URL
 * @param {number} [width=600] - Target width
 * @returns {string} Optimized URL
 */
export function getProfileImageUrl(url, width = 600) {
  if (!url) return url;
  
  return getOptimizedImageUrl(url, {
    width,
    resize: 'contain',
    format: 'webp',
    quality: 85,
  });
}

export default getOptimizedImageUrl;
