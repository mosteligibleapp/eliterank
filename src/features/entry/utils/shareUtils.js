/**
 * Share Utilities
 * Canvas-based shareable card generation and share/download
 */

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;

const CX = CARD_WIDTH / 2;

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
 * Draw rounded rectangle path
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
 * Draw a 4-pointed sparkle star
 */
function drawSparkle(ctx, x, y, size, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x + size * 0.15, y - size * 0.15, x + size, y);
  ctx.quadraticCurveTo(x + size * 0.15, y + size * 0.15, x, y + size);
  ctx.quadraticCurveTo(x - size * 0.15, y + size * 0.15, x - size, y);
  ctx.quadraticCurveTo(x - size * 0.15, y - size * 0.15, x, y - size);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Draw a circular clipped image
 */
function drawCircularImage(ctx, img, cx, cy, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  // Cover-fit the image into the circle
  const imgAspect = img.width / img.height;
  let drawW, drawH, drawX, drawY;
  if (imgAspect > 1) {
    drawH = radius * 2;
    drawW = drawH * imgAspect;
    drawX = cx - drawW / 2;
    drawY = cy - radius;
  } else {
    drawW = radius * 2;
    drawH = drawW / imgAspect;
    drawX = cx - radius;
    drawY = cy - drawH / 2;
  }
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  ctx.restore();
}

/**
 * Draw stylized initial when no photo is available
 */
function drawInitial(ctx, initial, cx, cy, radius, accentColor) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  const gradient = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  gradient.addColorStop(0, '#1a1a20');
  gradient.addColorStop(1, '#0d0d10');
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = accentColor;
  ctx.font = `bold ${radius * 0.9}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial.toUpperCase(), cx, cy + 4);
}

/**
 * Generate a shareable PNG card — premium, social-ready design
 *
 * @param {Object} params
 * @param {string} params.name
 * @param {string} params.photoUrl
 * @param {string} params.handle - Instagram handle
 * @param {string} params.competitionTitle
 * @param {string} params.cityName
 * @param {string} params.season
 * @param {string} params.accentColor - Theme primary color
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
}) {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');

  // --- Background layers ---
  // Base dark gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  bgGrad.addColorStop(0, '#08080a');
  bgGrad.addColorStop(0.3, '#0e0e12');
  bgGrad.addColorStop(0.7, '#0e0e12');
  bgGrad.addColorStop(1, '#08080a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Large accent glow behind photo area
  ctx.save();
  const glow1 = ctx.createRadialGradient(CX, 1050, 0, CX, 1050, 600);
  glow1.addColorStop(0, `${accentColor}18`);
  glow1.addColorStop(0.5, `${accentColor}08`);
  glow1.addColorStop(1, 'transparent');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.restore();

  // Top accent glow
  ctx.save();
  const glow2 = ctx.createRadialGradient(CX, 350, 0, CX, 350, 400);
  glow2.addColorStop(0, `${accentColor}12`);
  glow2.addColorStop(1, 'transparent');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.restore();

  // --- Sparkle decorations ---
  const sparkles = [
    { x: 180, y: 320, size: 14, alpha: 0.5 },
    { x: 900, y: 380, size: 10, alpha: 0.4 },
    { x: 140, y: 720, size: 8, alpha: 0.3 },
    { x: 940, y: 680, size: 12, alpha: 0.45 },
    { x: 200, y: 1400, size: 10, alpha: 0.35 },
    { x: 880, y: 1350, size: 14, alpha: 0.5 },
    { x: 160, y: 1100, size: 6, alpha: 0.25 },
    { x: 920, y: 1050, size: 8, alpha: 0.3 },
    { x: 300, y: 1550, size: 8, alpha: 0.3 },
    { x: 780, y: 1500, size: 10, alpha: 0.4 },
  ];
  for (const s of sparkles) {
    drawSparkle(ctx, s.x, s.y, s.size, accentColor, s.alpha);
  }

  // --- Top branding ---
  let y = 340;

  // ELITERANK wordmark
  ctx.fillStyle = accentColor;
  ctx.font = '600 32px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('E L I T E R A N K', CX, y);
  y += 50;

  // Thin decorative line
  const lineW = 220;
  ctx.strokeStyle = `${accentColor}50`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(CX - lineW / 2, y);
  ctx.lineTo(CX + lineW / 2, y);
  ctx.stroke();

  // Small diamond on the line
  drawSparkle(ctx, CX, y, 5, accentColor, 0.7);
  y += 50;

  // "I'VE BEEN" small text
  ctx.fillStyle = '#a1a1aa';
  ctx.font = '500 30px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText("I'VE BEEN", CX, y);
  y += 60;

  // "NOMINATED" hero text with glow
  ctx.save();
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 40;
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 92px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('NOMINATED', CX, y);
  ctx.restore();
  // Second pass without shadow for crisp text
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 92px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('NOMINATED', CX, y);
  y += 50;

  // "for" + competition
  ctx.fillStyle = '#71717a';
  ctx.font = '400 28px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('for', CX, y);
  y += 44;

  ctx.fillStyle = '#e4e4e7';
  ctx.font = '600 36px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(competitionTitle || 'Competition', CX, y);
  y += 40;

  // City + Season
  const metaParts = [];
  if (cityName) metaParts.push(cityName);
  if (season) metaParts.push(season);
  if (metaParts.length) {
    ctx.fillStyle = '#71717a';
    ctx.font = '400 26px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(metaParts.join('  ·  '), CX, y);
  }
  y += 65;

  // --- Photo ---
  const photoRadius = 160;
  const photoCY = y + photoRadius;

  // Outer glow behind photo
  ctx.save();
  const photoGlow = ctx.createRadialGradient(CX, photoCY, photoRadius - 20, CX, photoCY, photoRadius + 60);
  photoGlow.addColorStop(0, `${accentColor}20`);
  photoGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = photoGlow;
  ctx.beginPath();
  ctx.arc(CX, photoCY, photoRadius + 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Photo or initial
  if (photoUrl) {
    try {
      const img = await loadImage(photoUrl);
      drawCircularImage(ctx, img, CX, photoCY, photoRadius);
    } catch {
      drawInitial(ctx, name?.charAt(0) || '?', CX, photoCY, photoRadius, accentColor);
    }
  } else {
    drawInitial(ctx, name?.charAt(0) || '?', CX, photoCY, photoRadius, accentColor);
  }

  // Gold ring — double ring for premium look
  ctx.strokeStyle = `${accentColor}30`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(CX, photoCY, photoRadius + 16, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(CX, photoCY, photoRadius + 6, 0, Math.PI * 2);
  ctx.stroke();

  y = photoCY + photoRadius + 50;

  // --- Name ---
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 60px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  // Truncate long names
  let displayName = name || 'Nominee';
  if (ctx.measureText(displayName).width > 800) {
    while (ctx.measureText(displayName + '...').width > 800 && displayName.length > 0) {
      displayName = displayName.slice(0, -1);
    }
    displayName += '...';
  }
  ctx.fillText(displayName, CX, y);
  y += 48;

  // Handle
  if (handle) {
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '400 30px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`@${handle.replace('@', '')}`, CX, y);
  }

  // --- CTA at bottom ---
  const ctaY = 1640;
  const ctaWidth = 440;
  const ctaHeight = 60;
  const ctaX = CX - ctaWidth / 2;

  roundRect(ctx, ctaX, ctaY, ctaWidth, ctaHeight, ctaHeight / 2);
  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaWidth, ctaY);
  ctaGrad.addColorStop(0, accentColor);
  ctaGrad.addColorStop(1, '#f4d03f');
  ctx.fillStyle = ctaGrad;
  ctx.fill();

  ctx.fillStyle = '#0a0a0c';
  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Vote at eliterank.co', CX, ctaY + ctaHeight / 2);

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
        text: "I've been nominated on EliteRank!",
      });
      return 'shared';
    } catch (err) {
      if (err.name === 'AbortError') return 'cancelled';
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
