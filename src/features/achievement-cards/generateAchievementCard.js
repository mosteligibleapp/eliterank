/**
 * Achievement Card Generator
 * 
 * Generates branded shareable cards for contestant milestones.
 * Focused on the competition/organization brand, not EliteRank.
 */

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;
const CX = CARD_WIDTH / 2;

/**
 * Achievement types with display config
 */
export const ACHIEVEMENT_TYPES = {
  nominated: {
    title: 'NOMINATED',
    subtitle: 'for',
    emoji: '🎯',
  },
  contestant: {
    title: 'COMPETING',
    subtitle: 'in',
    emoji: '✨',
  },
  advancing: {
    title: 'ADVANCING',
    subtitle: 'in',
    emoji: '🔥',
  },
  top20: {
    title: 'TOP 20',
    subtitle: 'in',
    emoji: '⭐',
  },
  top10: {
    title: 'TOP 10',
    subtitle: 'in',
    emoji: '🌟',
  },
  top5: {
    title: 'TOP 5',
    subtitle: 'in',
    emoji: '💫',
  },
  finalist: {
    title: 'FINALIST',
    subtitle: 'in',
    emoji: '🏆',
  },
  winner: {
    title: 'WINNER',
    subtitle: 'of',
    emoji: '👑',
  },
  runner_up: {
    title: 'RUNNER UP',
    subtitle: 'in',
    emoji: '🥈',
  },
};

/**
 * Load an image from URL
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
 * Draw a 4-pointed sparkle
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
 * Draw circular clipped image
 */
function drawCircularImage(ctx, img, cx, cy, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
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
 * Draw initial fallback
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
 * Generate an achievement card
 * 
 * @param {Object} params
 * @param {string} params.achievementType - Key from ACHIEVEMENT_TYPES or custom title
 * @param {string} params.customTitle - Override achievement title (e.g., "TOP 15")
 * @param {string} params.name - Contestant name
 * @param {string} params.photoUrl - Contestant photo
 * @param {string} params.handle - Social handle
 * @param {string} params.competitionName - e.g., "Most Eligible Chicago"
 * @param {string} params.season - e.g., "2026"
 * @param {string} params.organizationName - e.g., "Most Eligible"
 * @param {string} params.organizationLogoUrl - Logo to display at top
 * @param {string} params.accentColor - Theme color
 * @param {string} params.voteUrl - CTA URL (e.g., "mosteligible.co/chicago")
 * @param {number} params.rank - Current rank (optional, shown for top placements)
 * @returns {Promise<Blob>}
 */
export async function generateAchievementCard({
  achievementType = 'nominated',
  customTitle,
  name,
  photoUrl,
  handle,
  competitionName,
  season,
  organizationName = 'Most Eligible',
  organizationLogoUrl,
  accentColor = '#d4af37',
  voteUrl,
  rank,
}) {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');

  const achievement = ACHIEVEMENT_TYPES[achievementType] || ACHIEVEMENT_TYPES.nominated;
  const displayTitle = customTitle || achievement.title;
  const subtitle = achievement.subtitle;

  // --- Background ---
  const bgGrad = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  bgGrad.addColorStop(0, '#08080a');
  bgGrad.addColorStop(0.3, '#0e0e12');
  bgGrad.addColorStop(0.7, '#0e0e12');
  bgGrad.addColorStop(1, '#08080a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Accent glows
  const glow1 = ctx.createRadialGradient(CX, 1050, 0, CX, 1050, 600);
  glow1.addColorStop(0, `${accentColor}18`);
  glow1.addColorStop(0.5, `${accentColor}08`);
  glow1.addColorStop(1, 'transparent');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const glow2 = ctx.createRadialGradient(CX, 350, 0, CX, 350, 400);
  glow2.addColorStop(0, `${accentColor}12`);
  glow2.addColorStop(1, 'transparent');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Sparkles
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

  let y = 280;

  // --- Organization Logo or Name ---
  if (organizationLogoUrl) {
    try {
      const logo = await loadImage(organizationLogoUrl);
      // Draw logo centered, max height 80px
      const maxLogoHeight = 80;
      const maxLogoWidth = 400;
      let logoW = logo.width;
      let logoH = logo.height;
      
      if (logoH > maxLogoHeight) {
        logoW = (maxLogoHeight / logoH) * logoW;
        logoH = maxLogoHeight;
      }
      if (logoW > maxLogoWidth) {
        logoH = (maxLogoWidth / logoW) * logoH;
        logoW = maxLogoWidth;
      }
      
      ctx.drawImage(logo, CX - logoW / 2, y - logoH / 2, logoW, logoH);
      y += 60;
    } catch {
      // Fall back to text
      ctx.fillStyle = accentColor;
      ctx.font = '600 36px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(organizationName.toUpperCase(), CX, y);
      y += 50;
    }
  } else {
    // Text fallback
    ctx.fillStyle = accentColor;
    ctx.font = '600 36px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(organizationName.toUpperCase(), CX, y);
    y += 50;
  }

  // Decorative line
  const lineW = 220;
  ctx.strokeStyle = `${accentColor}50`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(CX - lineW / 2, y);
  ctx.lineTo(CX + lineW / 2, y);
  ctx.stroke();
  drawSparkle(ctx, CX, y, 5, accentColor, 0.7);
  y += 70;

  // --- Achievement Title with glow ---
  ctx.save();
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 40;
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 92px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(displayTitle, CX, y);
  ctx.restore();
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 92px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(displayTitle, CX, y);
  y += 70;

  // Subtitle + competition name
  ctx.fillStyle = '#71717a';
  ctx.font = '400 28px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(subtitle, CX, y);
  y += 44;

  ctx.fillStyle = '#e4e4e7';
  ctx.font = '600 36px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(competitionName || 'the competition', CX, y);
  y += 40;

  // Season
  if (season) {
    ctx.fillStyle = '#71717a';
    ctx.font = '400 26px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(season, CX, y);
  }
  y += 120;

  // --- Photo ---
  const photoRadius = 160;
  const photoCY = y + photoRadius;

  // Outer glow
  const photoGlow = ctx.createRadialGradient(CX, photoCY, photoRadius - 20, CX, photoCY, photoRadius + 60);
  photoGlow.addColorStop(0, `${accentColor}20`);
  photoGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = photoGlow;
  ctx.beginPath();
  ctx.arc(CX, photoCY, photoRadius + 60, 0, Math.PI * 2);
  ctx.fill();

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

  // Rings
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

  y = photoCY + photoRadius + 90;

  // --- Name ---
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 60px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  let displayName = name || 'Contestant';
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
    y += 50;
  }

  // Rank badge (for top placements)
  if (rank && achievementType !== 'nominated' && achievementType !== 'contestant') {
    y += 20;
    const badgeW = 160;
    const badgeH = 50;
    roundRect(ctx, CX - badgeW / 2, y, badgeW, badgeH, 25);
    ctx.fillStyle = `${accentColor}30`;
    ctx.fill();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.fillStyle = accentColor;
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(`#${rank}`, CX, y + badgeH / 2);
    ctx.textBaseline = 'alphabetic';
  }

  // --- CTA ---
  const ctaY = 1640;
  const ctaHeight = 60;
  const ctaText = voteUrl ? `Vote at ${voteUrl.replace(/^https?:\/\//, '')}` : 'Vote for me!';
  
  // Measure text to size button
  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, sans-serif';
  const ctaTextWidth = ctx.measureText(ctaText).width;
  const ctaWidth = Math.max(440, ctaTextWidth + 80);
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
  ctx.fillText(ctaText, CX, ctaY + ctaHeight / 2);

  // Convert to blob
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

export default generateAchievementCard;
