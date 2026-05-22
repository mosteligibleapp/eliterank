/**
 * Rewrite a Supabase Storage public URL to use the on-the-fly image
 * transformation endpoint, sized for the consuming UI. Non-Supabase URLs
 * (Vercel Blob fallback, external avatars, data: URIs) pass through
 * unchanged.
 *
 * Supabase URL shapes:
 *   .../storage/v1/object/public/<bucket>/<path>
 *   .../storage/v1/render/image/public/<bucket>/<path>?width=...
 *
 * The render endpoint serves resized + re-encoded variants and counts
 * against the "Storage Image Transformations" quota by unique source
 * image, not per request.
 */
export function transformSupabaseImage(url, { width, height, quality = 75, resize } = {}) {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('/storage/v1/')) return url;

  const objectMarker = '/storage/v1/object/public/';
  const renderMarker = '/storage/v1/render/image/public/';

  let baseUrl;
  if (url.includes(objectMarker)) {
    baseUrl = url.replace(objectMarker, renderMarker);
  } else if (url.includes(renderMarker)) {
    baseUrl = url.split('?')[0];
  } else {
    return url;
  }

  // Resize mode. Two dimensions default to `cover` (square/fixed-ratio
  // crops, e.g. avatars). With a single dimension Supabase STILL defaults
  // to `cover` server-side and crops a strip using the source's other
  // dimension — it does not scale proportionally. Pass `resize: 'contain'`
  // explicitly when proportional, uncropped output is needed (e.g. logos).
  const effectiveResize = resize ?? (width && height ? 'cover' : undefined);

  const params = new URLSearchParams();
  if (width) params.set('width', String(Math.round(width)));
  if (height) params.set('height', String(Math.round(height)));
  if (effectiveResize) params.set('resize', effectiveResize);
  if (quality) params.set('quality', String(quality));

  const qs = params.toString();
  return qs ? `${baseUrl}?${qs}` : baseUrl;
}

/**
 * Convenience for square avatars. Doubles the rendered size so retina
 * displays still get crisp output.
 */
export function avatarUrl(url, displaySize) {
  if (!url) return url;
  const px = Math.max(48, Math.round(displaySize * 2));
  return transformSupabaseImage(url, { width: px, height: px, quality: 75, resize: 'cover' });
}
