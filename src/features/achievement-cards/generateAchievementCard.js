/**
 * Achievement Card Generator
 *
 * Generates branded shareable cards for contestant milestones.
 * Editorial fashion-meets-luxury design, optimized for Instagram Stories (1080x1920).
 */

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;
const CX = CARD_WIDTH / 2;

const FONT_DISPLAY = "'Inter', 'Montserrat', system-ui, sans-serif";
const FONT_BODY = "'Inter', system-ui, sans-serif";

export const ACHIEVEMENT_TYPES = {
  nominated: {
    title: 'NOMINATED',
    subtitle: 'for',
  },
  contestant: {
    title: 'CONTESTANT',
    subtitle: '',
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

function formatVotingDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const month = d.toLocaleDateString('en-US', { month: 'long' });
    const day = d.getDate();
    const suffix = day === 1 || day === 21 || day === 31 ? 'st'
      : day === 2 || day === 22 ? 'nd'
      : day === 3 || day === 23 ? 'rd' : 'th';
    return `${month} ${day}${suffix}`;
  } catch {
    return null;
  }
}

function formatSeasonLabel(season) {
  if (!season) return null;
  const year = typeof season === 'number' ? season : Number(season);
  if (!isNaN(year) && year > 0) {
    return `Season ${year}`;
  }
  return String(season);
}

function loadImage(src) {
  return fetch(src)
    .then((res) => {
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      return res.blob();
    })
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const url = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to decode image blob'));
          };
          img.src = url;
        })
    );
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

function drawRoundedRectImage(ctx, img, x, y, w, h, r) {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  const imgAspect = img.width / img.height;
  const boxAspect = w / h;
  let dw, dh, dx, dy;
  if (imgAspect > boxAspect) {
    dh = h;
    dw = dh * imgAspect;
    dx = x + (w - dw) / 2;
    dy = y;
  } else {
    dw = w;
    dh = dw / imgAspect;
    dx = x;
    dy = y + (h - dh) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawInitialRect(ctx, initial, x, y, w, h, r, accentColor, fontFamily) {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, '#16161a');
  grad.addColorStop(1, '#0c0c10');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = `${accentColor}50`;
  ctx.font = `200 ${Math.min(w, h) * 0.35}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial.toUpperCase(), x + w / 2, y + h / 2);
}

export async function generateAchievementCard({
  achievementType = 'nominated',
  customTitle,
  name,
  photoUrl,
  handle,
  competitionName,
  cityName,
  season,
  organizationName = 'Most Eligible',
  organizationLogoUrl,
  accentColor = '#d4af37',
  voteUrl,
  rank,
  votingStartDate,
}) {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');

  const achievement = ACHIEVEMENT_TYPES[achievementType] || ACHIEVEMENT_TYPES.nominated;
  const displayTitle = customTitle || achievement.title;
  const subtitle = achievement.subtitle;
  const isNominated = achievementType === 'nominated';
  const FONT_SYS = "-apple-system, BlinkMacSystemFont, sans-serif";
  const fontDisplay = isNominated ? FONT_SYS : FONT_DISPLAY;
  const fontBody = isNominated ? FONT_SYS : FONT_BODY;

  // === BACKGROUND — clean, deep dark ===
  const bgGrad = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  bgGrad.addColorStop(0, '#06060a');
  bgGrad.addColorStop(0.3, '#0a0a10');
  bgGrad.addColorStop(0.6, '#0c0c12');
  bgGrad.addColorStop(1, '#06060a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Single warm ambient glow behind photo zone
  const ambientGlow = ctx.createRadialGradient(CX, 580, 80, CX, 580, 560);
  ambientGlow.addColorStop(0, `${accentColor}14`);
  ambientGlow.addColorStop(0.5, `${accentColor}08`);
  ambientGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = ambientGlow;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Subtle vignette (darker edges)
  const vigL = ctx.createLinearGradient(0, 0, 200, 0);
  vigL.addColorStop(0, 'rgba(0,0,0,0.3)');
  vigL.addColorStop(1, 'transparent');
  ctx.fillStyle = vigL;
  ctx.fillRect(0, 0, 200, CARD_HEIGHT);
  const vigR = ctx.createLinearGradient(CARD_WIDTH, 0, CARD_WIDTH - 200, 0);
  vigR.addColorStop(0, 'rgba(0,0,0,0.3)');
  vigR.addColorStop(1, 'transparent');
  ctx.fillStyle = vigR;
  ctx.fillRect(CARD_WIDTH - 200, 0, 200, CARD_HEIGHT);

  // === ORGANIZATION BRANDING (top) ===
  let y = 80;
  ctx.textAlign = 'center';

  if (organizationLogoUrl) {
    try {
      const logo = await loadImage(organizationLogoUrl);
      const maxH = 120;
      const maxW = 500;
      let logoW = logo.width;
      let logoH = logo.height;
      if (logoH > maxH) { logoW = (maxH / logoH) * logoW; logoH = maxH; }
      if (logoW > maxW) { logoH = (maxW / logoW) * logoH; logoW = maxW; }
      ctx.drawImage(logo, CX - logoW / 2, y, logoW, logoH);
      y += logoH + 44;
    } catch {
      ctx.fillStyle = `${accentColor}aa`;
      ctx.font = `600 32px ${fontBody}`;
      ctx.textBaseline = 'top';
      ctx.fillText(organizationName.toUpperCase(), CX, y);
      y += 56;
    }
  } else {
    ctx.fillStyle = `${accentColor}aa`;
    ctx.font = `600 32px ${fontBody}`;
    ctx.textBaseline = 'top';
    ctx.fillText(organizationName.toUpperCase(), CX, y);
    y += 56;
  }

  // === PHOTO — editorial rounded rectangle ===
  const photoW = 580;
  const photoH = 680;
  const photoR = 28;
  const photoX = CX - photoW / 2;
  const photoY = y;

  // Soft glow halo behind photo frame
  ctx.save();
  ctx.shadowColor = `${accentColor}40`;
  ctx.shadowBlur = 80;
  roundRect(ctx, photoX + 20, photoY + 20, photoW - 40, photoH - 40, photoR);
  ctx.fillStyle = `${accentColor}06`;
  ctx.fill();
  ctx.restore();

  // Photo or initial fallback
  if (photoUrl) {
    try {
      const img = await loadImage(photoUrl);
      drawRoundedRectImage(ctx, img, photoX, photoY, photoW, photoH, photoR);
    } catch {
      drawInitialRect(ctx, name?.charAt(0) || '?', photoX, photoY, photoW, photoH, photoR, accentColor, fontDisplay);
    }
  } else {
    drawInitialRect(ctx, name?.charAt(0) || '?', photoX, photoY, photoW, photoH, photoR, accentColor, fontDisplay);
  }

  // Bottom vignette on photo (editorial fade)
  ctx.save();
  roundRect(ctx, photoX, photoY, photoW, photoH, photoR);
  ctx.clip();
  const photoVig = ctx.createLinearGradient(0, photoY + photoH * 0.65, 0, photoY + photoH);
  photoVig.addColorStop(0, 'transparent');
  photoVig.addColorStop(1, 'rgba(6,6,10,0.55)');
  ctx.fillStyle = photoVig;
  ctx.fillRect(photoX, photoY, photoW, photoH);
  ctx.restore();

  // Thin gold border on photo
  roundRect(ctx, photoX, photoY, photoW, photoH, photoR);
  ctx.strokeStyle = `${accentColor}50`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  y = photoY + photoH + 48;

  // === NAME ===
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 62px ${fontDisplay}`;
  let displayName = name || 'Contestant';
  if (ctx.measureText(displayName).width > 880) {
    while (ctx.measureText(displayName + '...').width > 880 && displayName.length > 0) {
      displayName = displayName.slice(0, -1);
    }
    displayName += '...';
  }
  ctx.fillText(displayName, CX, y);
  y += 82;

  // === ACHIEVEMENT PILL BADGE ===
  ctx.font = `700 26px ${fontBody}`;
  let pillText = displayTitle;
  // Measure and size the pill
  let pillFontSize = 26;
  let pillTextWidth = ctx.measureText(pillText).width;
  if (pillTextWidth > 400) {
    pillFontSize = 22;
    ctx.font = `700 ${pillFontSize}px ${fontBody}`;
    pillTextWidth = ctx.measureText(pillText).width;
  }
  const pillPadH = 40;
  const pillPadV = 14;
  const pillW = pillTextWidth + pillPadH * 2;
  const pillH = pillFontSize + pillPadV * 2;
  const pillX = CX - pillW / 2;
  const pillY = y;

  // Pill background — very subtle gold fill
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fillStyle = `${accentColor}12`;
  ctx.fill();

  // Pill border
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.strokeStyle = `${accentColor}90`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Pill text
  ctx.fillStyle = accentColor;
  ctx.font = `700 ${pillFontSize}px ${fontBody}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, CX, pillY + pillH / 2);
  y = pillY + pillH + 28;

  // === SUBTITLE + COMPETITION NAME ===
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';

  if (subtitle) {
    ctx.fillStyle = '#71717a';
    ctx.font = `400 30px ${fontBody}`;
    ctx.fillText(subtitle, CX, y);
    y += 42;
  }

  // Competition name
  ctx.fillStyle = '#e4e4e7';
  let compFontSize = 40;
  ctx.font = `600 ${compFontSize}px ${fontDisplay}`;
  let compDisplay = competitionName || 'the competition';
  if (ctx.measureText(compDisplay).width > 900) {
    compFontSize = 34;
    ctx.font = `600 ${compFontSize}px ${fontDisplay}`;
  }
  ctx.fillText(compDisplay, CX, y);
  y += compFontSize + 18;

  // Season / City line
  if (season) {
    ctx.fillStyle = '#71717a';
    if (isNominated) {
      ctx.font = `400 30px ${fontBody}`;
      ctx.fillText(String(season), CX, y);
    } else {
      ctx.font = `400 30px ${fontBody}`;
      const metaText = cityName ? `${cityName}  \u00B7  ${season}` : formatSeasonLabel(season);
      ctx.fillText(metaText, CX, y);
    }
    y += 48;
  }

  // Rank badge (for top placements)
  if (rank && achievementType !== 'nominated' && achievementType !== 'contestant') {
    y += 8;
    ctx.fillStyle = accentColor;
    ctx.font = `700 28px ${fontBody}`;
    ctx.fillText(`#${rank}`, CX, y);
    y += 44;
  }

  // === THIN SEPARATOR ===
  const lineW = 160;
  const lineGrad = ctx.createLinearGradient(CX - lineW / 2, 0, CX + lineW / 2, 0);
  lineGrad.addColorStop(0, 'transparent');
  lineGrad.addColorStop(0.2, `${accentColor}30`);
  lineGrad.addColorStop(0.8, `${accentColor}30`);
  lineGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(CX - lineW / 2, y);
  ctx.lineTo(CX + lineW / 2, y);
  ctx.stroke();
  y += 28;

  // === VOTING DATE ===
  const formattedDate = !isNominated ? formatVotingDate(votingStartDate) : null;
  if (formattedDate) {
    ctx.fillStyle = accentColor;
    ctx.font = `500 28px ${fontBody}`;
    ctx.textBaseline = 'top';
    ctx.fillText(`Voting opens ${formattedDate}`, CX, y);
    y += 52;
  }

  // === CTA BUTTON (standalone, no box) ===
  const ctaText = 'www.eliterank.co';
  const btnH = 58;
  const btnW = 380;
  const btnX = CX - btnW / 2;
  const btnY = y;

  // Button shadow
  ctx.save();
  ctx.shadowColor = `${accentColor}30`;
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, btnX, btnY, btnW, btnH, btnH / 2);
  const ctaGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
  ctaGrad.addColorStop(0, accentColor);
  ctaGrad.addColorStop(1, '#c9a84c');
  ctx.fillStyle = ctaGrad;
  ctx.fill();
  ctx.restore();

  // Button text
  ctx.fillStyle = '#0a0a0c';
  ctx.font = `600 22px ${fontBody}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ctaText, CX, btnY + btnH / 2);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

export default generateAchievementCard;
