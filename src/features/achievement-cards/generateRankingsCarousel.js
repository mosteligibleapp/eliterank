/**
 * Rankings Carousel Generator
 *
 * Renders a 6-slide Instagram Story set (1080×1920 each, 9:16 portrait):
 *   slide 1 — full top-10 cover
 *   slides 2-6 — top 5 spotlights, in rank order
 *
 * The `brand` argument is the seam where per-organization brand guidelines
 * will plug in once that feature ships. The generator does not hard-code
 * brand values — it only consumes them. The defaults below match Most
 * Eligible Chicago today; future per-org configs become drop-in replacements.
 */

const SLIDE_W = 1080;
const SLIDE_H = 1920;
const CX = SLIDE_W / 2;

export const DEFAULT_BRAND = {
  colors: {
    background: '#000000',
    primary: '#E11D2A',
    primaryDark: '#8B1A1F',
    white: '#FFFFFF',
    mutedGray: '#888888',
    dimmedWhite: '#AAAAAA',
    dividerGray: '#3A3A3A',
  },
  logo: {
    iconPath: '/heart-city-logo.svg',
    height: 120,
  },
  font: {
    family: "'Montserrat', 'Inter', system-ui, sans-serif",
    weights: { regular: 400, medium: 500, bold: 700 },
  },
};

// ---------- helpers ----------

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

function roundRectPath(ctx, x, y, w, h, r) {
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
  const aspect = img.width / img.height;
  let dw, dh, dx, dy;
  if (aspect > 1) {
    dh = size;
    dw = dh * aspect;
    dx = cx - dw / 2;
    dy = cy - r;
  } else {
    dw = size;
    dh = dw / aspect;
    dx = cx - r;
    dy = cy - dh / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawCircleInitial(ctx, ch, cx, cy, r, brand) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#1A1A1A';
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = brand.colors.mutedGray;
  ctx.font = `${brand.font.weights.medium} ${Math.round(r)}px ${brand.font.family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((ch || '?').toUpperCase(), cx, cy);
}

function drawRoundedImageWithBorder(ctx, img, x, y, w, h, r, borderColor, borderWidth) {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.clip();
  if (img) {
    const aspect = img.width / img.height;
    const boxAspect = w / h;
    let dw, dh, dx, dy;
    if (aspect > boxAspect) {
      dh = h;
      dw = dh * aspect;
      dx = x + (w - dw) / 2;
      dy = y;
    } else {
      dw = w;
      dh = dw / aspect;
      dx = x;
      dy = y + (h - dh) / 2;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
  } else {
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
  if (borderWidth > 0) {
    roundRectPath(ctx, x, y, w, h, r);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.stroke();
  }
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

function fmtVotes(n) {
  return Number(n || 0).toLocaleString('en-US');
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function dasharrayLine(ctx, x1, y1, x2, y2, color, dash = [6, 8]) {
  ctx.save();
  ctx.setLineDash(dash);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

// ---------- shared footer logo ----------

function enableHQ(ctx) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
}

/**
 * Draws the brand logo as a footer stamp, anchored to the bottom of the slide.
 * Returns the y-coordinate of the logo's top edge so callers know where the
 * content area ends.
 */
function drawFooterLogo(ctx, brand, logoImg, bottomMargin = 50) {
  if (!logoImg) return SLIDE_H - bottomMargin;
  const targetH = brand.logo.height;
  const aspect = logoImg.width / logoImg.height;
  let drawH = targetH;
  let drawW = drawH * aspect;
  const maxW = 360;
  if (drawW > maxW) {
    drawW = maxW;
    drawH = drawW / aspect;
  }
  // Integer pixel positions — avoids sub-pixel sampling blur.
  const topY = Math.round(SLIDE_H - bottomMargin - drawH);
  const x = Math.round(CX - drawW / 2);
  ctx.drawImage(logoImg, x, topY, Math.round(drawW), Math.round(drawH));
  return topY;
}

// ---------- slide 1 — cover ----------

async function renderCoverSlide({
  contestants,
  ranks,
  title,
  cityName,
  season,
  roundTitle,
  brand,
  logoImg,
  avatars,
}) {
  const canvas = document.createElement('canvas');
  canvas.width = SLIDE_W;
  canvas.height = SLIDE_H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = brand.colors.background;
  ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);
  enableHQ(ctx);

  let y = 100;

  // ----- pill: "• [ROUND] STANDINGS •" -----
  const pillText = `• ${(roundTitle || 'CURRENT').toUpperCase()} STANDINGS •`;
  const pillFontSize = 26;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${brand.font.weights.bold} ${pillFontSize}px ${brand.font.family}`;
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '2.5px';
  const pillTextW = ctx.measureText(pillText).width;
  const pillPadH = 36;
  const pillPadV = 16;
  const pillW = pillTextW + pillPadH * 2;
  const pillH = pillFontSize + pillPadV * 2;
  const pillX = CX - pillW / 2;
  roundRectPath(ctx, pillX, y, pillW, pillH, pillH / 2);
  ctx.strokeStyle = brand.colors.primary;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = brand.colors.primary;
  ctx.fillText(pillText, CX, y + pillH / 2);
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';
  y += pillH + 40;

  // ----- title (display) -----
  ctx.fillStyle = brand.colors.white;
  ctx.font = `${brand.font.weights.bold} 56px ${brand.font.family}`;
  ctx.textBaseline = 'top';
  let displayTitle = title;
  if (ctx.measureText(displayTitle).width > 1000) {
    ctx.font = `${brand.font.weights.bold} 44px ${brand.font.family}`;
  }
  ctx.fillText(displayTitle, CX, y);
  y += 56 + 36;

  // ----- subtitle: "CHICAGO · 2026" — larger and breathing room above -----
  const subtitle = [cityName, season].filter(Boolean).join('   ·   ').toUpperCase();
  if (subtitle) {
    ctx.fillStyle = brand.colors.mutedGray;
    ctx.font = `${brand.font.weights.medium} 24px ${brand.font.family}`;
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '5px';
    ctx.fillText(subtitle, CX, y);
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';
    y += 24 + 56;
  } else {
    y += 24;
  }

  // ----- footer logo (drawn first so rows can size to remaining space) -----
  const logoTop = drawFooterLogo(ctx, brand, logoImg, 60);

  // ----- contestant rows — uniform full-color treatment for all 10 -----
  const rowsTop = y;
  const rowsBottomLimit = logoTop - 50; // breathing room above logo
  const rowsAvailable = rowsBottomLimit - rowsTop;

  const total = contestants.length;
  const rowGap = 6;
  const rowH = Math.floor(
    (rowsAvailable - rowGap * Math.max(total - 1, 0)) / Math.max(total, 1)
  );
  const cappedRowH = Math.max(80, Math.min(132, rowH));

  const rowX = 56;
  const rowW = SLIDE_W - rowX * 2;
  let rowY = rowsTop;

  for (let i = 0; i < total; i++) {
    const c = contestants[i] || {};
    const displayRank = ranks[i];

    // uniform row container — red-tinted bg + 2px red left border for every row
    ctx.save();
    ctx.fillStyle = 'rgba(225, 29, 42, 0.08)';
    roundRectPath(ctx, rowX, rowY, rowW, cappedRowH, 4);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = brand.colors.primary;
    ctx.fillRect(rowX, rowY, 2, cappedRowH);

    // rank — uniform white bold (rank 1 matches rank 2 styling)
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = brand.colors.white;
    ctx.font = `${brand.font.weights.bold} 44px ${brand.font.family}`;
    const rankText = String(displayRank).padStart(2, '0');
    ctx.fillText(rankText, rowX + 32, rowY + cappedRowH / 2);

    // avatar — same circle for every row, no special border
    const avatarR = Math.floor((cappedRowH - 28) / 2);
    const avatarCX = rowX + 152;
    const avatarCY = rowY + cappedRowH / 2;
    if (avatars[i]) {
      drawCircleImage(ctx, avatars[i], avatarCX, avatarCY, avatarR);
    } else {
      drawCircleInitial(ctx, c.name?.charAt(0) || '?', avatarCX, avatarCY, avatarR, brand);
    }

    // name + votes — inline, name·votes pulled together as a single cluster
    const clusterX = avatarCX + avatarR + 26;
    const clusterMaxW = rowX + rowW - 28 - clusterX;
    const sep = '   ·   ';
    ctx.font = `${brand.font.weights.bold} 30px ${brand.font.family}`;
    const voteText = fmtVotes(c.votes);
    const voteW = ctx.measureText(voteText).width;
    const sepW = ctx.measureText(sep).width;
    const nameMaxW = clusterMaxW - voteW - sepW;
    const nameText = truncate(ctx, c.name || 'Contestant', nameMaxW);
    const nameW = ctx.measureText(nameText).width;

    let cx = clusterX;
    ctx.fillStyle = brand.colors.white;
    ctx.fillText(nameText, cx, rowY + cappedRowH / 2);
    cx += nameW;
    ctx.fillStyle = brand.colors.dividerGray;
    ctx.fillText(sep, cx, rowY + cappedRowH / 2);
    cx += sepW;
    ctx.fillStyle = brand.colors.white;
    ctx.fillText(voteText, cx, rowY + cappedRowH / 2);

    rowY += cappedRowH + rowGap;
  }

  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png');
  });
}

// ---------- slides 2-6 — spotlight ----------

async function renderSpotlightSlide({
  index,
  contestants,
  ranks,
  brand,
  logoImg,
  photoImg,
}) {
  const canvas = document.createElement('canvas');
  canvas.width = SLIDE_W;
  canvas.height = SLIDE_H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = brand.colors.background;
  ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);
  enableHQ(ctx);

  // logo anchors the bottom — draw first so layout above can be measured
  drawFooterLogo(ctx, brand, logoImg, 60);

  const c = contestants[index] || {};
  const displayRank = ranks[index];
  const isFirst = index === 0;

  let y = 120;

  // hero rank — display weight, tight tracking
  ctx.fillStyle = brand.colors.primary;
  ctx.font = `${brand.font.weights.bold} 120px ${brand.font.family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '-4px';
  ctx.fillText(String(displayRank).padStart(2, '0'), CX, y);
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';
  y += 120 + 60;

  // photo — 3:4 portrait, sized for the taller story canvas
  const photoH = 1200;
  const photoW = photoH * (3 / 4); // 900
  const photoX = CX - photoW / 2;
  const photoY = y;
  drawRoundedImageWithBorder(
    ctx,
    photoImg,
    photoX,
    photoY,
    photoW,
    photoH,
    8,
    isFirst ? brand.colors.primary : brand.colors.primaryDark,
    isFirst ? 2 : 1
  );
  y = photoY + photoH + 60;

  // name + votes inline — same font and size; name white, votes red
  const nameVoteSize = 56;
  ctx.font = `${brand.font.weights.bold} ${nameVoteSize}px ${brand.font.family}`;
  ctx.textBaseline = 'top';
  const nameText = c.name || 'Contestant';
  const sep = '   ·   ';
  const voteText = fmtVotes(c.votes);
  const nameW = ctx.measureText(nameText).width;
  const sepW = ctx.measureText(sep).width;
  const voteW = ctx.measureText(voteText).width;
  const totalW = nameW + sepW + voteW;
  let cursorX = CX - totalW / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = brand.colors.white;
  ctx.fillText(nameText, cursorX, y);
  cursorX += nameW;
  ctx.fillStyle = brand.colors.dividerGray;
  ctx.fillText(sep, cursorX, y);
  cursorX += sepW;
  ctx.fillStyle = brand.colors.primary;
  ctx.fillText(voteText, cursorX, y);

  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png');
  });
}

// ---------- ranking with tie handling ----------

function computeDisplayRanks(contestants) {
  // Standard competition ranking: tied entries share the higher rank,
  // the next distinct vote count picks up at index+1.
  const ranks = new Array(contestants.length);
  let lastRank = 0;
  let lastVotes = null;
  for (let i = 0; i < contestants.length; i++) {
    const v = Number(contestants[i]?.votes || 0);
    if (i === 0 || v !== lastVotes) {
      lastRank = i + 1;
      lastVotes = v;
    }
    ranks[i] = lastRank;
  }
  return ranks;
}

// ---------- public API ----------

/**
 * Generate a 6-slide IG carousel of standings.
 *
 * @param {Object}   params
 * @param {Array}    params.contestants     Pre-sorted contestants (votes desc).
 *                                          Each: { name, votes, avatarUrl, photoUrl?, instagram }
 * @param {string}   [params.competitionSlug]
 * @param {string}   [params.title='Most Eligible Bachelorettes'] Slide-1 title line.
 * @param {string}   [params.cityName]      Subtitle location (e.g. "Chicago").
 * @param {string|number} [params.season]   Subtitle year/season.
 * @param {string}   [params.roundTitle]    "Entry Round", "Round 1", … "Final Round".
 * @param {Object}   [params.brand=DEFAULT_BRAND]  Brand config — see DEFAULT_BRAND shape.
 *
 * @returns {Promise<Array<{ filename: string, blob: Blob }>>}
 */
export async function generateRankingsCarousel({
  contestants = [],
  competitionSlug,
  title = 'Most Eligible Bachelorettes',
  cityName,
  season,
  roundTitle,
  brand = DEFAULT_BRAND,
}) {
  const all = contestants.slice(0, 10);
  if (all.length === 0) return [];

  const ranks = computeDisplayRanks(all);

  // preload assets in parallel — logo + per-row avatars + spotlight photos
  const spotlightCount = Math.min(5, all.length);
  const [logoImg, ...rest] = await Promise.all([
    brand.logo?.iconPath ? loadImage(brand.logo.iconPath).catch(() => null) : Promise.resolve(null),
    ...all.map((c) => (c?.avatarUrl ? loadImage(c.avatarUrl).catch(() => null) : Promise.resolve(null))),
    ...all.slice(0, spotlightCount).map((c) => {
      const url = c?.photoUrl || c?.avatarUrl;
      return url ? loadImage(url).catch(() => null) : Promise.resolve(null);
    }),
  ]);
  const avatars = rest.slice(0, all.length);
  const photos = rest.slice(all.length, all.length + spotlightCount);

  const slug = slugify(competitionSlug || title || 'standings');
  const roundSlug = slugify(roundTitle || 'current');

  const out = [];

  const cover = await renderCoverSlide({
    contestants: all,
    ranks,
    title,
    cityName,
    season,
    roundTitle,
    brand,
    logoImg,
    avatars,
  });
  if (cover) out.push({ filename: `${slug}-${roundSlug}-slide-1.png`, blob: cover });

  for (let i = 0; i < spotlightCount; i++) {
    const blob = await renderSpotlightSlide({
      index: i,
      contestants: all,
      ranks,
      brand,
      logoImg,
      photoImg: photos[i],
    });
    if (blob) {
      out.push({ filename: `${slug}-${roundSlug}-slide-${i + 2}.png`, blob });
    }
  }

  return out;
}

export default generateRankingsCarousel;
