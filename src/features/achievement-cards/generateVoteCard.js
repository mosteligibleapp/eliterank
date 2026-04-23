/**
 * Vote Share Card Generator
 *
 * Generates a simple shareable card when someone votes.
 * "I voted for [name] for [competition] and you should too!"
 * Optimized for Instagram Stories (1080x1920).
 */

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;
const CX = CARD_WIDTH / 2;

const FONT = "'Montserrat', 'Inter', system-ui, sans-serif";
const GOLD = '#d4af37';

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

function drawInitialRect(ctx, initial, x, y, w, h, r) {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = '#111111';
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = `${GOLD}40`;
  ctx.font = `300 ${Math.min(w, h) * 0.35}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial.toUpperCase(), x + w / 2, y + h / 2);
}

/**
 * Generate a shareable "I Voted" card
 *
 * @param {Object} params
 * @param {string} params.contestantName - Name of the contestant voted for
 * @param {string} params.photoUrl - Contestant's photo URL
 * @param {string} params.competitionName - Competition name
 * @param {number} [params.voteCount] - Number of votes cast (optional)
 * @param {string} [params.organizationLogoUrl] - Logo URL
 * @returns {Promise<Blob>} PNG blob
 */
export async function generateVoteCard({
  contestantName,
  photoUrl,
  competitionName,
  voteCount,
  organizationLogoUrl,
}) {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');

  // === BACKGROUND — pure black ===
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // === LOGO (top, centered) ===
  const logoY = 80;
  if (organizationLogoUrl) {
    try {
      const logo = await loadImage(organizationLogoUrl);
      const logoAspect = logo.width / logo.height;
      let drawW = 160 * logoAspect;
      let drawH = 160;
      if (drawW > 360) { drawW = 360; drawH = drawW / logoAspect; }
      ctx.drawImage(logo, CX - drawW / 2, logoY, drawW, drawH);
    } catch {
      // No logo fallback
    }
  }

  // === PHOTO — circular, centered ===
  const photoSize = 480;
  const photoX = CX - photoSize / 2;
  const photoY = 320;
  const photoR = photoSize / 2; // Full circle

  let loadedImg = null;
  if (photoUrl) {
    try {
      loadedImg = await loadImage(photoUrl);
    } catch {
      loadedImg = null;
    }
  }

  // Gold ring around photo
  ctx.beginPath();
  ctx.arc(CX, photoY + photoSize / 2, photoSize / 2 + 6, 0, Math.PI * 2);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Photo or initial fallback (circular)
  if (loadedImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    const imgAspect = loadedImg.width / loadedImg.height;
    let dw, dh, dx, dy;
    if (imgAspect > 1) {
      dh = photoSize;
      dw = dh * imgAspect;
      dx = photoX + (photoSize - dw) / 2;
      dy = photoY;
    } else {
      dw = photoSize;
      dh = dw / imgAspect;
      dx = photoX;
      dy = photoY + (photoSize - dh) / 2;
    }
    ctx.drawImage(loadedImg, dx, dy, dw, dh);
    ctx.restore();
  } else {
    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#111111';
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = `${GOLD}40`;
    ctx.font = `300 ${photoSize * 0.4}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((contestantName?.charAt(0) || '?').toUpperCase(), CX, photoY + photoSize / 2);
  }

  // === "I VOTED" Badge ===
  let y = photoY + photoSize + 60;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const badgeFontSize = 42;
  ctx.font = `700 ${badgeFontSize}px ${FONT}`;
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '6px';
  const badgeText = 'I VOTED';
  const badgeTextW = ctx.measureText(badgeText).width;
  const badgePadH = 48;
  const badgePadV = 20;
  const badgeW = badgeTextW + badgePadH * 2;
  const badgeH = badgeFontSize + badgePadV * 2;
  const badgeX = CX - badgeW / 2;
  const badgeY = y;

  // Solid gold pill
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
  ctx.fillStyle = GOLD;
  ctx.fill();

  // Black text
  ctx.fillStyle = '#000000';
  ctx.font = `700 ${badgeFontSize}px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, CX, badgeY + badgeH / 2);
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';

  y = badgeY + badgeH + 48;

  // === "for" ===
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `400 38px ${FONT}`;
  ctx.fillText('for', CX, y);
  y += 38 + 20;

  // === Contestant Name ===
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 72px ${FONT}`;
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '-1.5px';
  let displayName = contestantName || 'Contestant';
  if (ctx.measureText(displayName).width > 960) {
    while (ctx.measureText(displayName + '...').width > 960 && displayName.length > 0) {
      displayName = displayName.slice(0, -1);
    }
    displayName += '...';
  }
  ctx.fillText(displayName, CX, y);
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';
  y += 72 + 24;

  // === "in [Competition]" ===
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `400 38px ${FONT}`;
  ctx.fillText('in', CX, y);
  y += 38 + 16;

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `600 48px ${FONT}`;
  let compDisplay = competitionName || 'Most Eligible';
  if (ctx.measureText(compDisplay).width > 900) {
    ctx.font = `600 40px ${FONT}`;
  }
  ctx.fillText(compDisplay, CX, y);
  y += 56 + 48;

  // === Call to action ===
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `500 36px ${FONT}`;
  ctx.fillText('and you should too!', CX, y);
  y += 36 + 80;

  // === CTA Button — solid gold pill ===
  const ctaText = 'www.eliterank.co';
  const ctaFontSize = 34;
  ctx.font = `700 ${ctaFontSize}px ${FONT}`;
  const ctaTextW = ctx.measureText(ctaText).width;
  const ctaPadH = 80;
  const ctaPadV = 32;
  const ctaW = ctaTextW + ctaPadH * 2;
  const ctaH = ctaFontSize + ctaPadV * 2;
  const ctaX = CX - ctaW / 2;
  const ctaY = y;

  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2);
  ctx.fillStyle = GOLD;
  ctx.fill();

  ctx.fillStyle = '#000000';
  ctx.font = `700 ${ctaFontSize}px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(ctaText, CX, ctaY + ctaH / 2);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

export default generateVoteCard;
