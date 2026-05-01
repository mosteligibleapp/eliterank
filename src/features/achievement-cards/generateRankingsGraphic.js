/**
 * Rankings Graphic Generator
 *
 * Generates a branded shareable leaderboard snapshot for end-of-round
 * announcements. 4:5 vertical (1080x1350) — Instagram portrait.
 */

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;
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

function drawCircleImage(ctx, img, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const size = r * 2;
  const imgAspect = img.width / img.height;
  let dw, dh, dx, dy;
  if (imgAspect > 1) {
    dh = size;
    dw = dh * imgAspect;
    dx = cx - dw / 2;
    dy = cy - r;
  } else {
    dw = size;
    dh = dw / imgAspect;
    dx = cx - r;
    dy = cy - dh / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawCircleInitial(ctx, initial, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#111111';
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = `${GOLD}66`;
  ctx.font = `300 ${r}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((initial || '?').toUpperCase(), cx, cy);
}

function truncate(ctx, text, maxWidth) {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let s = text;
  while (s.length > 0 && ctx.measureText(s + '…').width > maxWidth) {
    s = s.slice(0, -1);
  }
  return s + '…';
}

function formatVotes(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (v >= 10_000) return `${(v / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return v.toLocaleString('en-US');
}

/**
 * Generate a rankings graphic (Instagram 4:5 portrait).
 *
 * @param {Object} params
 * @param {Array}  params.contestants     Sorted ranked array (highest votes first).
 *                                        Each item: { name, votes, avatarUrl, instagram }
 * @param {string} params.competitionName Competition name (e.g. "Most Eligible LA")
 * @param {string} [params.cityName]      City label for meta line
 * @param {string|number} [params.season] Season label/number for meta line
 * @param {string} [params.roundTitle]    Round label (e.g. "Round 2", "Semifinals")
 * @param {string} [params.headline]      Override pill text (defaults to round-based)
 * @param {string} [params.organizationLogoUrl]
 * @param {number} [params.maxRows=10]    Max contestants to render
 */
export async function generateRankingsGraphic({
  contestants = [],
  competitionName,
  cityName: rawCityName,
  season,
  roundTitle,
  headline,
  organizationLogoUrl,
  maxRows = 10,
}) {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');

  const cityName =
    rawCityName && typeof rawCityName === 'object'
      ? rawCityName.name || rawCityName.city_name || ''
      : rawCityName || '';

  const rows = contestants.slice(0, maxRows);
  const pillText =
    headline ||
    (roundTitle ? `${roundTitle.toUpperCase()} STANDINGS` : 'CURRENT STANDINGS');

  // Background — pure black, matches achievement card
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Logo (top center)
  let cursorY = 50;
  const logoMaxH = 70;
  const logoMaxW = 280;
  if (organizationLogoUrl) {
    try {
      const logo = await loadImage(organizationLogoUrl);
      const logoAspect = logo.width / logo.height;
      let drawH = logoMaxH;
      let drawW = drawH * logoAspect;
      if (drawW > logoMaxW) {
        drawW = logoMaxW;
        drawH = drawW / logoAspect;
      }
      ctx.drawImage(logo, CX - drawW / 2, cursorY, drawW, drawH);
      cursorY += drawH + 32;
    } catch {
      cursorY += 8;
    }
  }

  // Headline pill (gold outline + dots, identical pattern to achievement card)
  ctx.textAlign = 'center';
  const pillFontSize = 30;
  ctx.font = `700 ${pillFontSize}px ${FONT}`;
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '4px';
  const pillTextW = ctx.measureText(pillText).width;
  const pillPadH = 48;
  const pillPadV = 18;
  const pillW = pillTextW + pillPadH * 2;
  const pillH = pillFontSize + pillPadV * 2;
  const pillX = CX - pillW / 2;
  const pillY = cursorY;

  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const dotR = 4;
  const dotY = pillY + pillH / 2;
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(CX - pillTextW / 2 - 18, dotY, dotR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(CX + pillTextW / 2 + 18, dotY, dotR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = GOLD;
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, CX, pillY + pillH / 2);
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';
  cursorY = pillY + pillH + 32;

  // Competition name
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 48px ${FONT}`;
  let compDisplay = competitionName || 'the competition';
  if (ctx.measureText(compDisplay).width > 960) {
    ctx.font = `700 40px ${FONT}`;
    compDisplay = truncate(ctx, compDisplay, 960);
  }
  ctx.fillText(compDisplay, CX, cursorY);
  cursorY += 56;

  // Meta line — city · season (matches achievement card metadata style)
  if (cityName || season) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `500 26px ${FONT}`;
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '4px';
    const metaText = [cityName, season ? `Season ${season}` : null]
      .filter(Boolean)
      .join('  ·  ');
    if (metaText) ctx.fillText(metaText, CX, cursorY);
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';
    cursorY += 26 + 28;
  } else {
    cursorY += 12;
  }

  // Divider
  ctx.strokeStyle = 'rgba(212,175,55,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(120, cursorY);
  ctx.lineTo(CARD_WIDTH - 120, cursorY);
  ctx.stroke();
  cursorY += 28;

  // Footer reserved space
  const ctaH = 90;
  const ctaBottomMargin = 60;
  const ctaY = CARD_HEIGHT - ctaBottomMargin - ctaH;
  const rowsAvailableHeight = ctaY - cursorY - 24;

  // Rows — height divides remaining space (capped to keep things readable)
  const rowCount = Math.max(rows.length, 1);
  const rowH = Math.min(96, Math.floor(rowsAvailableHeight / rowCount));
  const rowGap = Math.max(0, Math.min(8, Math.floor((rowsAvailableHeight - rowH * rowCount) / Math.max(rowCount - 1, 1))));

  const rowX = 60;
  const rowW = CARD_WIDTH - 120;
  const photoR = Math.floor((rowH - 16) / 2);

  // Preload avatars in parallel for speed
  const loadedAvatars = await Promise.all(
    rows.map((c) => (c?.avatarUrl ? loadImage(c.avatarUrl).catch(() => null) : Promise.resolve(null)))
  );

  for (let i = 0; i < rows.length; i++) {
    const c = rows[i] || {};
    const rank = i + 1;
    const isTop3 = rank <= 3;
    const y = cursorY + i * (rowH + rowGap);

    // Row background — subtle gold glow for top 3, neutral for the rest
    roundRect(ctx, rowX, y, rowW, rowH, 16);
    ctx.fillStyle = isTop3 ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.03)';
    ctx.fill();
    ctx.strokeStyle = isTop3 ? 'rgba(212,175,55,0.35)' : 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Rank numeral
    const rankX = rowX + 30;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isTop3 ? GOLD : 'rgba(255,255,255,0.6)';
    ctx.font = `800 ${Math.floor(rowH * 0.42)}px ${FONT}`;
    const rankLabel = String(rank).padStart(2, '0');
    ctx.fillText(rankLabel, rankX, y + rowH / 2);
    const rankAdvance = ctx.measureText('00').width + 24;

    // Avatar (circle with thin gold border for top 3)
    const photoCX = rowX + rankAdvance + photoR + 8;
    const photoCY = y + rowH / 2;
    if (isTop3) {
      ctx.beginPath();
      ctx.arc(photoCX, photoCY, photoR + 3, 0, Math.PI * 2);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (loadedAvatars[i]) {
      drawCircleImage(ctx, loadedAvatars[i], photoCX, photoCY, photoR);
    } else {
      drawCircleInitial(ctx, c.name?.charAt(0) || '?', photoCX, photoCY, photoR);
    }

    // Votes (right-aligned)
    const voteFontSize = Math.floor(rowH * 0.32);
    const voteLabelSize = Math.floor(rowH * 0.18);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = GOLD;
    ctx.font = `800 ${voteFontSize}px ${FONT}`;
    const voteText = formatVotes(c.votes);
    const voteRightX = rowX + rowW - 32;
    const voteBaselineY = y + rowH / 2 + voteFontSize / 3;
    ctx.fillText(voteText, voteRightX, voteBaselineY);
    const voteWidth = ctx.measureText(voteText).width;

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = `500 ${voteLabelSize}px ${FONT}`;
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '2px';
    ctx.textAlign = 'right';
    ctx.fillText('VOTES', voteRightX, voteBaselineY + voteLabelSize + 6);
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';

    // Name + handle (between avatar and votes)
    const nameX = photoCX + photoR + 24;
    const nameMaxW = voteRightX - voteWidth - 32 - nameX;
    const handle = c.instagram ? `@${String(c.instagram).replace(/^@/, '')}` : '';

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#FFFFFF';
    const nameSize = Math.floor(rowH * 0.3);
    ctx.font = `700 ${nameSize}px ${FONT}`;
    const nameText = truncate(ctx, c.name || 'Contestant', nameMaxW);
    const nameY = handle ? y + rowH / 2 - 4 : y + rowH / 2 + nameSize / 3;
    ctx.fillText(nameText, nameX, nameY);

    if (handle) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      const handleSize = Math.floor(rowH * 0.2);
      ctx.font = `500 ${handleSize}px ${FONT}`;
      const handleText = truncate(ctx, handle, nameMaxW);
      ctx.fillText(handleText, nameX, nameY + handleSize + 10);
    }
  }

  // CTA pill — solid gold, black text, identical to achievement card footer
  const ctaText = 'www.eliterank.co';
  const ctaFontSize = 28;
  ctx.font = `700 ${ctaFontSize}px ${FONT}`;
  const ctaTextW = ctx.measureText(ctaText).width;
  const ctaPadH = 56;
  const ctaW = ctaTextW + ctaPadH * 2;
  const ctaX = CX - ctaW / 2;

  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2);
  ctx.fillStyle = GOLD;
  ctx.fill();

  ctx.fillStyle = '#000000';
  ctx.font = `700 ${ctaFontSize}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ctaText, CX, ctaY + ctaH / 2);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

export default generateRankingsGraphic;
