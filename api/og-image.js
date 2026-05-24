/**
 * Edge function that renders per-page Open Graph share images. Composites the
 * competition cover (or profile photo) with overlaid brand chrome — used when
 * a share link is opened in iMessage / Instagram DMs / Slack / Twitter etc.
 *
 * Routes:
 *   /api/og-image?type=competition&id=<uuid>
 *   /api/og-image?type=profile&id=<uuid>
 *
 * No JSX — uses React.createElement directly so the file ships as plain .js
 * with no build-step assumptions on Vercel.
 */

import { ImageResponse } from '@vercel/og';
import React from 'react';
import { getCityImage } from '../src/utils/cityImages.js';

export const config = { runtime: 'edge' };

const h = React.createElement;

const SITE_URL = 'https://eliterank.co';
const GOLD = '#d4af37';
const GOLD_LIGHT = '#f5d485';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CROWN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
  '<path d="M12 2L16 9L22 6.5L19 15H5L2 6.5L8 9L12 2Z" fill="#f5d485"/>' +
  '<rect x="4.5" y="16" width="15" height="3" rx="0.5" fill="#d4af37"/>' +
  '</svg>';
const CROWN_DATA_URI = 'data:image/svg+xml;utf8,' + encodeURIComponent(CROWN_SVG);

/**
 * Rewrite a Supabase Storage URL to use the image transformation endpoint so
 * the source originals (which can be 20MB+ for full-res photos) get downsized
 * before being composited into the share card. No-op for non-Supabase URLs.
 */
function resizeImage(url, { width, height, quality = 80 } = {}) {
  if (!url) return url;
  try {
    const u = new URL(url);
    // Only touch Supabase storage URLs we recognize.
    if (!u.pathname.includes('/storage/v1/object/public/')) return url;
    u.pathname = u.pathname.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/',
    );
    if (width) u.searchParams.set('width', String(width));
    if (height) u.searchParams.set('height', String(height));
    u.searchParams.set('quality', String(quality));
    u.searchParams.set('resize', 'cover');
    return u.toString();
  } catch {
    return url;
  }
}

// ----------------------------------------------------------------------------
// Data fetching
// ----------------------------------------------------------------------------

async function supabaseRest(pathWithQuery) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(`${base}/rest/v1${pathWithQuery}`, {
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        accept: 'application/json',
      },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchCompetition(id) {
  if (!UUID_RE.test(id)) return null;
  const rows = await supabaseRest(
    `/competitions?id=eq.${encodeURIComponent(id)}` +
      `&select=name,city,season,cover_image,organization:organizations(name,logo_url)&limit=1`,
  );
  return Array.isArray(rows) ? rows[0] : null;
}

async function fetchProfile(id) {
  if (!UUID_RE.test(id)) return null;
  const rows = await supabaseRest(
    `/profiles?id=eq.${encodeURIComponent(id)}` +
      `&select=first_name,last_name,city,avatar_url,cover_image&limit=1`,
  );
  return Array.isArray(rows) ? rows[0] : null;
}

// ----------------------------------------------------------------------------
// Shared building blocks
// ----------------------------------------------------------------------------

function brandLockup() {
  return h(
    'div',
    { style: { display: 'flex', alignItems: 'center', gap: 12 } },
    h('img', { src: CROWN_DATA_URI, width: 36, height: 36 }),
    h(
      'div',
      { style: { color: '#ffffff', fontSize: 22, fontWeight: 700, letterSpacing: 3 } },
      'ELITERANK',
    ),
  );
}

function domain() {
  return h(
    'div',
    {
      style: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 20,
        fontWeight: 500,
        letterSpacing: 1,
      },
    },
    'www.eliterank.co',
  );
}

function topAccentBar() {
  return h('div', {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: 1200,
      height: 3,
      backgroundImage: `linear-gradient(to right, ${GOLD_LIGHT}, ${GOLD})`,
      opacity: 0.85,
      display: 'flex',
    },
  });
}

function topFade() {
  return h('div', {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: 1200,
      height: 180,
      backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 100%)',
      display: 'flex',
    },
  });
}

function bottomFade(height) {
  return h('div', {
    style: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: 1200,
      height,
      backgroundImage:
        'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.75) 35%, rgba(0,0,0,0.25) 75%, rgba(0,0,0,0) 100%)',
      display: 'flex',
    },
  });
}

// ----------------------------------------------------------------------------
// Competition card
// ----------------------------------------------------------------------------

function competitionCard(competition) {
  const name = competition.name?.trim() || 'EliteRank Competition';
  const city = competition.city?.trim() || '';
  const season = competition.season ? String(competition.season) : '';
  const orgLogo = competition.organization?.logo_url
    ? resizeImage(competition.organization.logo_url, { width: 144, height: 144 })
    : null;
  // Prefer host-uploaded cover; otherwise fall back to the city skyline used
  // on the public competition card so the share preview matches what visitors
  // see on-site instead of a generic brand placeholder.
  const rawCover = competition.cover_image || getCityImage(city, name);
  const cover = resizeImage(rawCover, { width: 1200, height: 630, quality: 82 }) || rawCover;

  return h(
    'div',
    {
      style: {
        width: 1200,
        height: 630,
        display: 'flex',
        position: 'relative',
        backgroundColor: '#0a0a0c',
      },
    },
    cover &&
      h('img', {
        src: cover,
        width: 1200,
        height: 630,
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1200,
          height: 630,
          objectFit: 'cover',
        },
      }),
    topFade(),
    bottomFade(360),
    topAccentBar(),

    // Top-left brand lockup
    h(
      'div',
      { style: { position: 'absolute', top: 40, left: 48, display: 'flex' } },
      brandLockup(),
    ),

    // Top-right org logo
    orgLogo &&
      h(
        'div',
        {
          style: {
            position: 'absolute',
            top: 36,
            right: 48,
            width: 72,
            height: 72,
            borderRadius: 12,
            backgroundColor: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(212,175,55,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 6,
          },
        },
        h('img', {
          src: orgLogo,
          width: 60,
          height: 60,
          style: { width: 60, height: 60, objectFit: 'contain', borderRadius: 8 },
        }),
      ),

    // Bottom-left content (name + meta)
    h(
      'div',
      {
        style: {
          position: 'absolute',
          bottom: 96,
          left: 60,
          right: 60,
          display: 'flex',
          flexDirection: 'column',
        },
      },
      h(
        'div',
        {
          style: {
            color: '#ffffff',
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -1.5,
            maxWidth: 1080,
          },
        },
        name,
      ),
      (city || season) &&
        h(
          'div',
          {
            style: {
              marginTop: 18,
              color: '#ffffff',
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            },
          },
          city && h('span', null, city),
          city && season && h('span', { style: { color: GOLD } }, '·'),
          season && h('span', null, `Season ${season}`),
        ),
    ),

    // Bottom-right domain
    h(
      'div',
      { style: { position: 'absolute', bottom: 48, right: 60, display: 'flex' } },
      domain(),
    ),
  );
}

// ----------------------------------------------------------------------------
// Profile card
// ----------------------------------------------------------------------------

function profileCard(profile) {
  const fullName =
    [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() ||
    'EliteRank Member';
  const city = profile.city || '';
  const rawPhoto = profile.cover_image || profile.avatar_url;
  const photo = resizeImage(rawPhoto, { width: 1200, height: 630, quality: 82 }) || rawPhoto;

  return h(
    'div',
    {
      style: {
        width: 1200,
        height: 630,
        display: 'flex',
        position: 'relative',
        backgroundColor: '#0a0a0c',
      },
    },
    photo &&
      h('img', {
        src: photo,
        width: 1200,
        height: 630,
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1200,
          height: 630,
          objectFit: 'cover',
          objectPosition: 'center 25%',
        },
      }),
    topFade(),
    bottomFade(320),
    topAccentBar(),

    h(
      'div',
      { style: { position: 'absolute', top: 40, left: 48, display: 'flex' } },
      brandLockup(),
    ),

    h(
      'div',
      {
        style: {
          position: 'absolute',
          bottom: 96,
          left: 60,
          right: 60,
          display: 'flex',
          flexDirection: 'column',
        },
      },
      h(
        'div',
        {
          style: {
            color: '#ffffff',
            fontSize: 72,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -1.5,
            maxWidth: 1080,
          },
        },
        fullName,
      ),
      city &&
        h(
          'div',
          {
            style: {
              marginTop: 18,
              color: '#ffffff',
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            },
          },
          h('span', { style: { color: GOLD } }, '📍'),
          h('span', null, city),
        ),
    ),

    h(
      'div',
      { style: { position: 'absolute', bottom: 48, right: 60, display: 'flex' } },
      domain(),
    ),
  );
}

// ----------------------------------------------------------------------------
// Entry point
// ----------------------------------------------------------------------------

// The dynamic URL emitted by api/og.js carries `v=<hash-of-cover-or-photo>`
// — when the underlying photo changes, the version segment changes, so the
// crawler hits a fresh URL. That lets us tell the CDN this response is
// content-addressed and never needs revalidation: render once per version,
// serve forever from cache.
const RESPONSE_OPTS = {
  width: 1200,
  height: 630,
  headers: {
    'cache-control': 'public, max-age=31536000, s-maxage=31536000, immutable',
  },
};

export default async function handler(req) {
  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const id = url.searchParams.get('id');

  try {
    if (type === 'competition' && id) {
      const competition = await fetchCompetition(id);
      if (competition) {
        // Always render — the card falls back to the city skyline when there
        // is no host-uploaded cover, so every real competition gets a
        // distinct preview.
        return new ImageResponse(competitionCard(competition), RESPONSE_OPTS);
      }
    } else if (type === 'profile' && id) {
      const profile = await fetchProfile(id);
      if (profile && (profile.avatar_url || profile.cover_image)) {
        return new ImageResponse(profileCard(profile), RESPONSE_OPTS);
      }
    }
  } catch (err) {
    console.error('[og-image] render error:', err);
  }

  // Nothing renderable — defer to the static brand image on the same
  // deployment (so preview deploys serve their own brand image, not prod's).
  return Response.redirect(`${url.origin}/og-image.png`, 302);
}
