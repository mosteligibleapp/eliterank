/**
 * Achievement Card Generator
 *
 * Generates branded shareable cards for contestant milestones.
 * Premium photo-first design optimized for Instagram Stories (1080x1920).
 */

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;
const CX = CARD_WIDTH / 2;

export const ACHIEVEMENT_TYPES = {
  nominated: {
    title: 'NOMINATED',
    subtitle: 'for',
  },
  contestant: {
    title: 'COMPETING',
    subtitle: 'in',
  },
  advanced: {
    title: 'ADVANCED',
    subtitle: 'in',
  },
  finalist: {
    title: 'FINALIST',
    subtitle: 'in',
  },
  winner: {
    title: 'WINNER',
    subtitle: 'of',
  },
  placement: {
    title: 'PLACED',
    subtitle: 'in',
  },
};

export function getAdvancementTitle(advancingCount) {
  return `TOP ${advancingCount}`;
}

export function getPlacementTitle(place) {
  if (place === 1) return 'WINNER';
  const suffix = place === 2 ? 'ND' : place === 3 ? 'RD' : 'TH';
  return `${place}${suffix} PLACE`;
}

export function getRoundAdvancementTitle(round, nextRound) {
  if (nextRound?.contestants_advance) {
    return `TOP ${nextRound.contestants_advance}`;
  }
  if (round?.title) {
    return `${round.title.toUpperCase()} QUALIFIER`;
  }
  return 'ADVANCED';
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

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
 * Draw a decorative line with sparkle endpoints
 */
function drawDecorativeLine(ctx, cx, y, width, color) {
  // Left line
  const lineGradL = ctx.createLinearGradient(cx - width / 2, y, cx - 20, y);
  lineGradL.addColorStop(0, 'transparent');
  lineGradL.addColorStop(1, `${color}60`);
  ctx.strokeStyle = lineGradL;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - width / 2, y);
  ctx.lineTo(cx - 20, y);
  ctx.stroke();

  // Right line
  const lineGradR = ctx.createLinearGradient(cx + 20, y, cx + width / 2, y);
  lineGradR.addColorStop(0, `${color}60`);
  lineGradR.addColorStop(1, 'transparent');
  ctx.strokeStyle = lineGradR;
  ctx.beginPath();
  ctx.moveTo(cx + 20, y);
  ctx.lineTo(cx + width / 2, y);
  ctx.stroke();

  // Center sparkle
  drawSparkle(ctx, cx, y, 6, color, 0.8);
}

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

  // === BACKGROUND ===
  // Rich multi-stop gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  bgGrad.addColorStop(0, '#050507');
  bgGrad.addColorStop(0.15, '#0a0a10');
  bgGrad.addColorStop(0.4, '#0e0e14');
  bgGrad.addColorStop(0.6, '#0c0c12');
  bgGrad.addColorStop(0.85, '#0a0a10');
  bgGrad.addColorStop(1, '#050507');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Large warm glow behind photo area
  const glow1 = ctx.createRadialGradient(CX, 620, 0, CX, 620, 500);
  glow1.addColorStop(0, `${accentColor}20`);
  glow1.addColorStop(0.4, `${accentColor}0c`);
  glow1.addColorStop(1, 'transparent');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Secondary glow behind achievement title
  const glow2 = ctx.createRadialGradient(CX, 1150, 0, CX, 1150, 400);
  glow2.addColorStop(0, `${accentColor}14`);
  glow2.addColorStop(0.5, `${accentColor}08`);
  glow2.addColorStop(1, 'transparent');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Subtle bottom glow
  const glow3 = ctx.createRadialGradient(CX, 1700, 0, CX, 1700, 300);
  glow3.addColorStop(0, `${accentColor}10`);
  glow3.addColorStop(1, 'transparent');
  ctx.fillStyle = glow3;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // === SPARKLES - rich distribution ===
  const sparkles = [
    // Top area - flanking org name
    { x: 120, y: 180, size: 8, alpha: 0.3 },
    { x: 960, y: 200, size: 10, alpha: 0.35 },
    { x: 200, y: 260, size: 5, alpha: 0.2 },
    { x: 880, y: 270, size: 6, alpha: 0.25 },
    // Around photo
    { x: 160, y: 440, size: 14, alpha: 0.5 },
    { x: 920, y: 480, size: 12, alpha: 0.45 },
    { x: 130, y: 620, size: 6, alpha: 0.2 },
    { x: 950, y: 580, size: 8, alpha: 0.3 },
    { x: 180, y: 780, size: 10, alpha: 0.35 },
    { x: 900, y: 740, size: 16, alpha: 0.5 },
    // Mid section - around name and title
    { x: 140, y: 980, size: 6, alpha: 0.2 },
    { x: 940, y: 1020, size: 8, alpha: 0.25 },
    { x: 100, y: 1150, size: 12, alpha: 0.4 },
    { x: 980, y: 1130, size: 10, alpha: 0.35 },
    { x: 160, y: 1280, size: 5, alpha: 0.15 },
    { x: 920, y: 1300, size: 7, alpha: 0.2 },
    // Bottom area
    { x: 200, y: 1500, size: 10, alpha: 0.3 },
    { x: 880, y: 1460, size: 14, alpha: 0.45 },
    { x: 140, y: 1650, size: 6, alpha: 0.2 },
    { x: 940, y: 1680, size: 8, alpha: 0.25 },
    { x: 300, y: 1780, size: 5, alpha: 0.15 },
    { x: 780, y: 1800, size: 7, alpha: 0.2 },
    // Scattered small ones for texture
    { x: 260, y: 360, size: 4, alpha: 0.12 },
    { x: 820, y: 340, size: 3, alpha: 0.1 },
    { x: 240, y: 1100, size: 4, alpha: 0.12 },
    { x: 840, y: 1400, size: 3, alpha: 0.1 },
  ];
  for (const s of sparkles) {
    drawSparkle(ctx, s.x, s.y, s.size, accentColor, s.alpha);
  }

  // === ORGANIZATION BRANDING (top) ===
  let y = 200;
  ctx.textAlign = 'center';

  if (organizationLogoUrl) {
    try {
      const logo = await loadImage(organizationLogoUrl);
      const maxH = 70;
      const maxW = 360;
      let logoW = logo.width;
      let logoH = logo.height;
      if (logoH > maxH) { logoW = (maxH / logoH) * logoW; logoH = maxH; }
      if (logoW > maxW) { logoH = (maxW / logoW) * logoH; logoW = maxW; }
      ctx.globalAlpha = 0.9;
      ctx.drawImage(logo, CX - logoW / 2, y - logoH / 2, logoW, logoH);
      ctx.globalAlpha = 1;
      y += logoH / 2 + 30;
    } catch {
      ctx.fillStyle = `${accentColor}cc`;
      ctx.font = '500 28px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.letterSpacing = '6px';
      ctx.fillText(organizationName.toUpperCase(), CX, y);
      ctx.letterSpacing = '0px';
      y += 40;
    }
  } else {
    ctx.fillStyle = `${accentColor}cc`;
    ctx.font = '500 28px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(organizationName.toUpperCase(), CX, y);
    y += 40;
  }

  // Decorative divider below org
  drawDecorativeLine(ctx, CX, y, 260, accentColor);
  y += 60;

  // === PHOTO (hero element) ===
  const photoRadius = 200;
  const photoCY = y + photoRadius;

  // Multi-layered glow behind photo
  ctx.save();
  const outerGlow = ctx.createRadialGradient(CX, photoCY, photoRadius * 0.5, CX, photoCY, photoRadius + 100);
  outerGlow.addColorStop(0, `${accentColor}18`);
  outerGlow.addColorStop(0.6, `${accentColor}0a`);
  outerGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = outerGlow;
  ctx.beginPath();
  ctx.arc(CX, photoCY, photoRadius + 100, 0, Math.PI * 2);
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

  // Triple ring effect
  // Inner accent ring
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(CX, photoCY, photoRadius + 6, 0, Math.PI * 2);
  ctx.stroke();

  // Middle subtle ring
  ctx.strokeStyle = `${accentColor}20`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(CX, photoCY, photoRadius + 18, 0, Math.PI * 2);
  ctx.stroke();

  // Outer faint ring
  ctx.strokeStyle = `${accentColor}12`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(CX, photoCY, photoRadius + 30, 0, Math.PI * 2);
  ctx.stroke();

  // Small sparkles on the ring
  drawSparkle(ctx, CX - photoRadius - 10, photoCY - 40, 5, accentColor, 0.5);
  drawSparkle(ctx, CX + photoRadius + 14, photoCY + 30, 4, accentColor, 0.4);
  drawSparkle(ctx, CX - 30, photoCY - photoRadius - 12, 5, accentColor, 0.45);
  drawSparkle(ctx, CX + 50, photoCY + photoRadius + 15, 4, accentColor, 0.35);

  y = photoCY + photoRadius + 70;

  // === NAME ===
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  let displayName = name || 'Contestant';
  if (ctx.measureText(displayName).width > 860) {
    while (ctx.measureText(displayName + '...').width > 860 && displayName.length > 0) {
      displayName = displayName.slice(0, -1);
    }
    displayName += '...';
  }
  ctx.fillText(displayName, CX, y);
  y += 46;

  // Handle
  if (handle) {
    ctx.fillStyle = '#9a9aaa';
    ctx.font = '400 28px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`@${handle.replace('@', '')}`, CX, y);
    y += 40;
  }

  // === DIVIDER ===
  y += 30;
  drawDecorativeLine(ctx, CX, y, 300, accentColor);
  y += 60;

  // === ACHIEVEMENT TITLE with glow ===
  // Auto-size title to prevent overflow
  let titleFontSize = 88;
  ctx.font = `bold ${titleFontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
  while (ctx.measureText(displayTitle).width > 900 && titleFontSize > 48) {
    titleFontSize -= 4;
    ctx.font = `bold ${titleFontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
  }

  // Glow pass
  ctx.save();
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 50;
  ctx.fillStyle = accentColor;
  ctx.fillText(displayTitle, CX, y);
  ctx.restore();

  // Second glow pass for intensity
  ctx.save();
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 20;
  ctx.fillStyle = accentColor;
  ctx.font = `bold ${titleFontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.fillText(displayTitle, CX, y);
  ctx.restore();

  // Crisp text pass
  ctx.fillStyle = accentColor;
  ctx.font = `bold ${titleFontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.fillText(displayTitle, CX, y);
  y += titleFontSize * 0.6 + 10;

  // Subtitle
  ctx.fillStyle = '#71717a';
  ctx.font = '400 28px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(subtitle, CX, y);
  y += 48;

  // Competition name
  ctx.fillStyle = '#e4e4e7';
  ctx.font = '600 36px -apple-system, BlinkMacSystemFont, sans-serif';
  let compDisplay = competitionName || 'the competition';
  if (ctx.measureText(compDisplay).width > 860) {
    ctx.font = '600 30px -apple-system, BlinkMacSystemFont, sans-serif';
  }
  ctx.fillText(compDisplay, CX, y);
  y += 44;

  // Season
  if (season) {
    ctx.fillStyle = '#52525b';
    ctx.font = '400 26px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(season, CX, y);
  }

  // Rank badge (for top placements)
  if (rank && achievementType !== 'nominated' && achievementType !== 'contestant') {
    y += 50;
    const badgeW = 160;
    const badgeH = 50;
    roundRect(ctx, CX - badgeW / 2, y, badgeW, badgeH, 25);
    ctx.fillStyle = `${accentColor}20`;
    ctx.fill();
    ctx.strokeStyle = `${accentColor}60`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = accentColor;
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(`#${rank}`, CX, y + badgeH / 2);
    ctx.textBaseline = 'alphabetic';
  }

  // === CTA BUTTON ===
  const ctaY = 1680;
  const ctaHeight = 68;
  const ctaText = voteUrl ? `Vote at ${voteUrl.replace(/^https?:\/\//, '')}` : 'Vote for me';

  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, sans-serif';
  const ctaTextWidth = ctx.measureText(ctaText).width;
  const ctaWidth = Math.max(480, ctaTextWidth + 100);
  const ctaX = CX - ctaWidth / 2;

  // Button shadow
  ctx.save();
  ctx.shadowColor = `${accentColor}40`;
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, ctaX, ctaY, ctaWidth, ctaHeight, ctaHeight / 2);
  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaWidth, ctaY + ctaHeight);
  ctaGrad.addColorStop(0, accentColor);
  ctaGrad.addColorStop(1, '#f4d03f');
  ctx.fillStyle = ctaGrad;
  ctx.fill();
  ctx.restore();

  // Button text
  ctx.fillStyle = '#0a0a0c';
  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ctaText, CX, ctaY + ctaHeight / 2);

  // Subtle border on button for depth
  roundRect(ctx, ctaX, ctaY, ctaWidth, ctaHeight, ctaHeight / 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // === BOTTOM BRANDING ===
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#3f3f46';
  ctx.font = '400 20px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('eliterank.co', CX, 1820);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

export default generateAchievementCard;
