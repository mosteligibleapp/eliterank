/**
 * Rankings Carousel Generator
 *
 * Renders a 6-slide carousel of competition standings in either of two
 * Instagram-native formats:
 *
 *   format: 'story'  → 1080×1920 (9:16 portrait, IG Stories / Reels)
 *   format: 'grid'   → 1080×1350 (4:5 portrait, IG feed / carousel post)
 *
 * Each carousel: 1 cover slide (top 10) + up to 5 spotlight slides
 * (one per top-5 contestant, in rank order).
 *
 * The `brand` argument is the seam where per-organization brand guidelines
 * will plug in once that feature ships. The generator does not hard-code
 * brand values — it only consumes them. The defaults below match Most
 * Eligible Chicago today; future per-org configs become drop-in replacements.
 */

const SLIDE_W = 1080;
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
  },
  font: {
    family: "'Montserrat', 'Inter', system-ui, sans-serif",
    weights: { regular: 400, medium: 500, bold: 700 },
  },
};

// Per-format layout metrics — every size that should scale between
// IG Stories (9:16, taller) and IG feed posts (4:5, shorter) is defined
// here so the render functions stay layout-agnostic.
const FORMAT_SPECS = {
  story: {
    height: 1920,
    logoHeight: 120,
    logoBottomPad: 60,
    cover: {
      topPad: 100,
      pillFontSize: 26,
      pillPadH: 36,
      pillPadV: 16,
      pillGapBelow: 40,
      titleFontSize: 56,
      titleGapBelow: 36,
      subtitleFontSize: 24,
      subtitleTracking: '5px',
      subtitleGapBelow: 56,
      rowsBottomBreathing: 50,
      rowH: { min: 80, max: 132 },
      rowGap: 6,
      rowRankSize: 44,
      rowNameSize: 30,
      rowVoteSize: 28,
    },
    spotlight: {
      topPad: 120,
      rankSize: 120,
      rankPhotoGap: 60,
      photoH: 1200,         // photoW = photoH * 3/4 = 900
      photoVoteGap: 60,
      nameVoteSize: 56,
    },
  },
  grid: {
    height: 1350,
    logoHeight: 96,
    logoBottomPad: 50,
    cover: {
      topPad: 60,
      pillFontSize: 22,
      pillPadH: 32,
      pillPadV: 14,
      pillGapBelow: 28,
      titleFontSize: 44,
      titleGapBelow: 28,
      subtitleFontSize: 20,
      subtitleTracking: '4px',
      subtitleGapBelow: 36,
      rowsBottomBreathing: 36,
      rowH: { min: 70, max: 104 },
      rowGap: 4,
      rowRankSize: 36,
      rowNameSize: 24,
      rowVoteSize: 22,
    },
    spotlight: {
      topPad: 70,
      rankSize: 88,
      rankPhotoGap: 32,
      photoH: 800,          // photoW = 600
      photoVoteGap: 36,
      nameVoteSize: 40,
    },
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

function enableHQ(ctx) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
}

/**
 * Draws the brand logo as a footer stamp anchored to the bottom of the slide.
 * Returns the y-coordinate of the logo's top edge so callers know where the
 * content area ends.
 */
function drawFooterLogo(ctx, brand, logoImg, slideH, logoHeight, bottomMargin) {
  if (!logoImg) return slideH - bottomMargin;
  const aspect = logoImg.width / logoImg.height;
  let drawH = logoHeight;
  let drawW = drawH * aspect;
  const maxW = 360;
  if (drawW > maxW) {
    drawW = maxW;
    drawH = drawW / aspect;
  }
  // Integer pixel positions — avoids sub-pixel sampling blur.
  const topY = Math.round(slideH - bottomMargin - drawH);
  const x = Math.round(CX - drawW / 2);
  ctx.drawImage(logoImg, x, topY, Math.round(drawW), Math.round(drawH));
  return topY;
}

// ---------- slide 1 — cover ----------

async function renderCoverSlide({
  spec,
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
  const SLIDE_H = spec.height;
  const m = spec.cover;

  const canvas = document.createElement('canvas');
  canvas.width = SLIDE_W;
  canvas.height = SLIDE_H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = brand.colors.background;
  ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);
  enableHQ(ctx);

  let y = m.topPad;

  // ----- pill: "• [ROUND] STANDINGS •" -----
  const pillText = `• ${(roundTitle || 'CURRENT').toUpperCase()} STANDINGS •`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${brand.font.weights.bold} ${m.pillFontSize}px ${brand.font.family}`;
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '2.5px';
  const pillTextW = ctx.measureText(pillText).width;
  const pillW = pillTextW + m.pillPadH * 2;
  const pillH = m.pillFontSize + m.pillPadV * 2;
  const pillX = CX - pillW / 2;
  roundRectPath(ctx, pillX, y, pillW, pillH, pillH / 2);
  ctx.strokeStyle = brand.colors.primary;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = brand.colors.primary;
  ctx.fillText(pillText, CX, y + pillH / 2);
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';
  y += pillH + m.pillGapBelow;

  // ----- title (display) -----
  ctx.fillStyle = brand.colors.white;
  ctx.font = `${brand.font.weights.bold} ${m.titleFontSize}px ${brand.font.family}`;
  ctx.textBaseline = 'top';
  let displayTitle = title;
  if (ctx.measureText(displayTitle).width > 1000) {
    ctx.font = `${brand.font.weights.bold} ${Math.round(m.titleFontSize * 0.8)}px ${brand.font.family}`;
  }
  ctx.fillText(displayTitle, CX, y);
  y += m.titleFontSize + m.titleGapBelow;

  // ----- subtitle: "CHICAGO · 2026" -----
  const subtitle = [cityName, season].filter(Boolean).join('   ·   ').toUpperCase();
  if (subtitle) {
    ctx.fillStyle = brand.colors.mutedGray;
    ctx.font = `${brand.font.weights.medium} ${m.subtitleFontSize}px ${brand.font.family}`;
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = m.subtitleTracking;
    ctx.fillText(subtitle, CX, y);
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';
    y += m.subtitleFontSize + m.subtitleGapBelow;
  } else {
    y += m.subtitleFontSize;
  }

  // ----- footer logo (drawn first so rows can size to remaining space) -----
  const logoTop = drawFooterLogo(ctx, brand, logoImg, SLIDE_H, spec.logoHeight, spec.logoBottomPad);

  // ----- contestant rows — uniform full-color treatment for all 10 -----
  const rowsTop = y;
  const rowsBottomLimit = logoTop - m.rowsBottomBreathing;
  const rowsAvailable = rowsBottomLimit - rowsTop;

  const total = contestants.length;
  const rowH = Math.floor(
    (rowsAvailable - m.rowGap * Math.max(total - 1, 0)) / Math.max(total, 1)
  );
  const cappedRowH = Math.max(m.rowH.min, Math.min(m.rowH.max, rowH));

  const rowX = 56;
  const rowW = SLIDE_W - rowX * 2;
  let rowY = rowsTop;

  // Compute the votes column once so every row aligns to the same x.
  ctx.font = `${brand.font.weights.regular} ${m.rowVoteSize}px ${brand.font.family}`;
  const voteLabelText = ' votes';
  const voteLabelW = ctx.measureText(voteLabelText).width;
  const voteRightPad = 32;
  const voteNumberRightX = rowX + rowW - voteRightPad - voteLabelW;

  for (let i = 0; i < total; i++) {
    const c = contestants[i] || {};
    const displayRank = ranks[i];

    // uniform row container — red-tinted bg + 2px red left border
    ctx.save();
    ctx.fillStyle = 'rgba(225, 29, 42, 0.08)';
    roundRectPath(ctx, rowX, rowY, rowW, cappedRowH, 4);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = brand.colors.primary;
    ctx.fillRect(rowX, rowY, 2, cappedRowH);

    // rank
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = brand.colors.white;
    ctx.font = `${brand.font.weights.bold} ${m.rowRankSize}px ${brand.font.family}`;
    const rankText = String(displayRank).padStart(2, '0');
    ctx.fillText(rankText, rowX + 32, rowY + cappedRowH / 2);

    // avatar
    const avatarR = Math.floor((cappedRowH - 28) / 2);
    const avatarCX = rowX + 152;
    const avatarCY = rowY + cappedRowH / 2;
    if (avatars[i]) {
      drawCircleImage(ctx, avatars[i], avatarCX, avatarCY, avatarR);
    } else {
      drawCircleInitial(ctx, c.name?.charAt(0) || '?', avatarCX, avatarCY, avatarR, brand);
    }

    // votes column — number right-aligned at fixed column, label after
    ctx.font = `${brand.font.weights.regular} ${m.rowVoteSize}px ${brand.font.family}`;
    ctx.fillStyle = brand.colors.white;
    ctx.textAlign = 'right';
    const voteText = fmtVotes(c.votes);
    ctx.fillText(voteText, voteNumberRightX, rowY + cappedRowH / 2);
    ctx.textAlign = 'left';
    ctx.fillText(voteLabelText, voteNumberRightX, rowY + cappedRowH / 2);

    // name — left-aligned, truncated to fit before the votes column
    const nameX = avatarCX + avatarR + 26;
    const nameMaxW = voteNumberRightX - 32 - nameX;
    ctx.font = `${brand.font.weights.bold} ${m.rowNameSize}px ${brand.font.family}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = brand.colors.white;
    ctx.fillText(truncate(ctx, c.name || 'Contestant', nameMaxW), nameX, rowY + cappedRowH / 2);

    rowY += cappedRowH + m.rowGap;
  }

  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png');
  });
}

// ---------- slides 2-6 — spotlight ----------

async function renderSpotlightSlide({
  spec,
  index,
  contestants,
  ranks,
  brand,
  logoImg,
  photoImg,
}) {
  const SLIDE_H = spec.height;
  const m = spec.spotlight;

  const canvas = document.createElement('canvas');
  canvas.width = SLIDE_W;
  canvas.height = SLIDE_H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = brand.colors.background;
  ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);
  enableHQ(ctx);

  // logo anchors the bottom
  drawFooterLogo(ctx, brand, logoImg, SLIDE_H, spec.logoHeight, spec.logoBottomPad);

  const c = contestants[index] || {};
  const displayRank = ranks[index];
  const isFirst = index === 0;

  let y = m.topPad;

  // hero rank
  ctx.fillStyle = brand.colors.primary;
  ctx.font = `${brand.font.weights.bold} ${m.rankSize}px ${brand.font.family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '-3px';
  ctx.fillText(String(displayRank).padStart(2, '0'), CX, y);
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';
  y += m.rankSize + m.rankPhotoGap;

  // photo (3:4 portrait)
  const photoH = m.photoH;
  const photoW = photoH * (3 / 4);
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
  y = photoY + photoH + m.photoVoteGap;

  // name + votes inline — name bold white, count + " votes" both white regular
  const nameVoteSize = m.nameVoteSize;
  ctx.textBaseline = 'top';
  const nameText = c.name || 'Contestant';
  const sep = '   ·   ';
  const voteText = fmtVotes(c.votes);
  const voteLabel = ' votes';

  ctx.font = `${brand.font.weights.bold} ${nameVoteSize}px ${brand.font.family}`;
  const nameW = ctx.measureText(nameText).width;
  ctx.font = `${brand.font.weights.regular} ${nameVoteSize}px ${brand.font.family}`;
  const sepW = ctx.measureText(sep).width;
  const voteW = ctx.measureText(voteText).width;
  const voteLabelW = ctx.measureText(voteLabel).width;

  const totalW = nameW + sepW + voteW + voteLabelW;
  let cursorX = CX - totalW / 2;
  ctx.textAlign = 'left';

  ctx.font = `${brand.font.weights.bold} ${nameVoteSize}px ${brand.font.family}`;
  ctx.fillStyle = brand.colors.white;
  ctx.fillText(nameText, cursorX, y);
  cursorX += nameW;

  ctx.font = `${brand.font.weights.regular} ${nameVoteSize}px ${brand.font.family}`;
  ctx.fillStyle = brand.colors.dividerGray;
  ctx.fillText(sep, cursorX, y);
  cursorX += sepW;

  ctx.fillStyle = brand.colors.white;
  ctx.fillText(voteText, cursorX, y);
  cursorX += voteW;
  ctx.fillText(voteLabel, cursorX, y);

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
 * Generate a 6-slide carousel of standings in the requested IG format.
 *
 * @param {Object}   params
 * @param {Array}    params.contestants     Pre-sorted contestants (votes desc).
 *                                          Each: { name, votes, avatarUrl, photoUrl?, instagram }
 * @param {string}   [params.competitionSlug]
 * @param {string}   [params.title='Most Eligible Bachelorettes'] Slide-1 title line.
 * @param {string}   [params.cityName]      Subtitle location (e.g. "Chicago").
 * @param {string|number} [params.season]   Subtitle year/season.
 * @param {string}   [params.roundTitle]    "Entry Round", "Round 1", … "Final Round".
 * @param {'story'|'grid'} [params.format='story']
 *        'story' → 1080×1920 (9:16). 'grid' → 1080×1350 (4:5).
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
  format = 'story',
  brand = DEFAULT_BRAND,
}) {
  const spec = FORMAT_SPECS[format] || FORMAT_SPECS.story;
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
  const fmtSlug = format === 'grid' ? 'grid' : 'story';

  const out = [];

  const cover = await renderCoverSlide({
    spec,
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
  if (cover) out.push({ filename: `${slug}-${roundSlug}-${fmtSlug}-1.png`, blob: cover });

  for (let i = 0; i < spotlightCount; i++) {
    const blob = await renderSpotlightSlide({
      spec,
      index: i,
      contestants: all,
      ranks,
      brand,
      logoImg,
      photoImg: photos[i],
    });
    if (blob) {
      out.push({ filename: `${slug}-${roundSlug}-${fmtSlug}-${i + 2}.png`, blob });
    }
  }

  return out;
}

export default generateRankingsCarousel;
