/**
 * Share Utilities
 * Canvas-based shareable card generation and share/download
 */

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;

// Safe zone to avoid IG UI overlap
const SAFE = {
  left: 140,
  right: 940,
  top: 280,
  bottom: 1640,
};

const SAFE_WIDTH = SAFE.right - SAFE.left;
const SAFE_CENTER_X = SAFE.left + SAFE_WIDTH / 2;

/**
 * Load an image from a URL into an HTMLImageElement
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

/**
 * Draw rounded rectangle
 */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Draw a circular clipped image
 */
function drawCircularImage(ctx, img, cx, cy, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.restore();
}

/**
 * Draw stylized initial when no photo is available
 */
function drawInitial(ctx, initial, cx, cy, radius, accentColor) {
  // Background circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  const gradient = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  gradient.addColorStop(0, accentColor);
  gradient.addColorStop(1, '#1c1c1f');
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();

  // Letter
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${radius}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial.toUpperCase(), cx, cy);
}

/**
 * Generate a shareable PNG card
 *
 * @param {Object} params
 * @param {string} params.name
 * @param {string} params.photoUrl
 * @param {string} params.handle - Instagram handle
 * @param {string} params.competitionTitle
 * @param {string} params.cityName
 * @param {string} params.season
 * @param {string} params.accentColor - Theme primary color
 * @param {boolean} params.isNomination
 * @param {number} params.nominationCount - optional stats
 * @returns {Promise<Blob>}
 */
export async function generateShareCard({
  name,
  photoUrl,
  handle,
  competitionTitle,
  cityName,
  season,
  accentColor = '#d4af37',
  isNomination = false,
}) {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  bgGrad.addColorStop(0, '#0a0a0c');
  bgGrad.addColorStop(0.5, '#111114');
  bgGrad.addColorStop(1, '#0a0a0c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Subtle accent glow
  ctx.save();
  const glowGrad = ctx.createRadialGradient(
    CARD_WIDTH / 2, CARD_HEIGHT * 0.35, 0,
    CARD_WIDTH / 2, CARD_HEIGHT * 0.35, 500
  );
  glowGrad.addColorStop(0, `${accentColor}15`);
  glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.restore();

  let y = SAFE.top;

  // Branding
  ctx.fillStyle = accentColor;
  ctx.font = `bold 36px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('ELITERANK', SAFE_CENTER_X, y);
  y += 60;

  // Competition label
  ctx.fillStyle = '#a1a1aa';
  ctx.font = `500 28px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.fillText(competitionTitle || 'Competition', SAFE_CENTER_X, y);
  y += 40;

  if (season) {
    ctx.fillStyle = '#71717a';
    ctx.font = `400 24px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText(`Season ${season}`, SAFE_CENTER_X, y);
  }
  y += 70;

  // Photo (300px square, rounded)
  const photoSize = 300;
  const photoRadius = photoSize / 2;
  const photoCX = SAFE_CENTER_X;
  const photoCY = y + photoRadius;

  if (photoUrl) {
    try {
      const img = await loadImage(photoUrl);
      drawCircularImage(ctx, img, photoCX, photoCY, photoRadius);
    } catch {
      drawInitial(ctx, name?.charAt(0) || '?', photoCX, photoCY, photoRadius, accentColor);
    }
  } else {
    drawInitial(ctx, name?.charAt(0) || '?', photoCX, photoCY, photoRadius, accentColor);
  }

  // Gold ring around photo
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(photoCX, photoCY, photoRadius + 4, 0, Math.PI * 2);
  ctx.stroke();

  y = photoCY + photoRadius + 50;

  // Name
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 56px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(name || 'Nominee', SAFE_CENTER_X, y);
  y += 45;

  // Handle / City
  const subParts = [];
  if (handle) subParts.push(`@${handle.replace('@', '')}`);
  if (cityName) subParts.push(cityName);
  if (subParts.length) {
    ctx.fillStyle = '#a1a1aa';
    ctx.font = `400 28px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText(subParts.join('  •  '), SAFE_CENTER_X, y);
  }
  y += 55;

  // "NOMINATED" pill
  const pillText = isNomination ? 'NOMINATED' : 'ENTERED';
  ctx.font = `bold 24px -apple-system, BlinkMacSystemFont, sans-serif`;
  const pillWidth = ctx.measureText(pillText).width + 48;
  const pillHeight = 44;
  const pillX = SAFE_CENTER_X - pillWidth / 2;

  roundRect(ctx, pillX, y - pillHeight / 2, pillWidth, pillHeight, pillHeight / 2);
  ctx.fillStyle = `${accentColor}30`;
  ctx.fill();
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = accentColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, SAFE_CENTER_X, y);
  ctx.textBaseline = 'alphabetic';
  y += pillHeight / 2 + 50;

  // CTA Button at bottom
  const ctaY = SAFE.bottom - 60;
  const ctaWidth = 400;
  const ctaHeight = 56;
  const ctaX = SAFE_CENTER_X - ctaWidth / 2;

  roundRect(ctx, ctaX, ctaY, ctaWidth, ctaHeight, ctaHeight / 2);
  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaWidth, ctaY);
  ctaGrad.addColorStop(0, accentColor);
  ctaGrad.addColorStop(1, '#f4d03f');
  ctx.fillStyle = ctaGrad;
  ctx.fill();

  ctx.fillStyle = '#0a0a0c';
  ctx.font = `bold 24px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Vote at eliterank.co', SAFE_CENTER_X, ctaY + ctaHeight / 2);

  // Convert to blob
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

/**
 * Share or download the generated card
 * @param {Blob} blob - PNG blob
 * @param {string} fileName
 */
export async function shareOrDownload(blob, fileName = 'eliterank-nomination.png') {
  const file = new File([blob], fileName, { type: 'image/png' });

  // Try native share with file (works on mobile)
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'EliteRank',
        text: 'Check out my EliteRank nomination!',
      });
      return 'shared';
    } catch (err) {
      if (err.name === 'AbortError') return 'cancelled';
      // Fall through to download
    }
  }

  // Fallback: download
  downloadBlob(blob, fileName);
  return 'downloaded';
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copy a URL to clipboard
 */
export async function copyLink(url) {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
