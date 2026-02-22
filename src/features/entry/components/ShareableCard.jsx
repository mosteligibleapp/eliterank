import React, { useRef, useEffect, useState } from 'react';

/**
 * ShareableCard - Canvas-rendered preview of the IG Story card
 * Matches the full-size PNG from shareUtils but at 360x640 preview scale
 */
export default function ShareableCard({
  name,
  photoUrl,
  handle,
  competitionTitle,
  cityName,
  season,
  accentColor = '#d4af37',
}) {
  const canvasRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const s = w / 1080; // scale factor

    function drawSparkle(x, y, size, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = accentColor;
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

    function drawDecorativeLine(cx, ly, width) {
      const lineGradL = ctx.createLinearGradient(cx - width / 2, ly, cx - 20 * s, ly);
      lineGradL.addColorStop(0, 'transparent');
      lineGradL.addColorStop(1, `${accentColor}60`);
      ctx.strokeStyle = lineGradL;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - width / 2, ly);
      ctx.lineTo(cx - 20 * s, ly);
      ctx.stroke();

      const lineGradR = ctx.createLinearGradient(cx + 20 * s, ly, cx + width / 2, ly);
      lineGradR.addColorStop(0, `${accentColor}60`);
      lineGradR.addColorStop(1, 'transparent');
      ctx.strokeStyle = lineGradR;
      ctx.beginPath();
      ctx.moveTo(cx + 20 * s, ly);
      ctx.lineTo(cx + width / 2, ly);
      ctx.stroke();

      drawSparkle(cx, ly, 6 * s, 0.8);
    }

    // === BACKGROUND ===
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#050507');
    bgGrad.addColorStop(0.15, '#0a0a10');
    bgGrad.addColorStop(0.4, '#0e0e14');
    bgGrad.addColorStop(0.6, '#0c0c12');
    bgGrad.addColorStop(0.85, '#0a0a10');
    bgGrad.addColorStop(1, '#050507');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Warm glow behind photo
    const glow1 = ctx.createRadialGradient(w / 2, 620 * s, 0, w / 2, 620 * s, 500 * s);
    glow1.addColorStop(0, `${accentColor}20`);
    glow1.addColorStop(0.4, `${accentColor}0c`);
    glow1.addColorStop(1, 'transparent');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, w, h);

    // Secondary glow
    const glow2 = ctx.createRadialGradient(w / 2, 1150 * s, 0, w / 2, 1150 * s, 400 * s);
    glow2.addColorStop(0, `${accentColor}14`);
    glow2.addColorStop(0.5, `${accentColor}08`);
    glow2.addColorStop(1, 'transparent');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, w, h);

    // Bottom glow
    const glow3 = ctx.createRadialGradient(w / 2, 1700 * s, 0, w / 2, 1700 * s, 300 * s);
    glow3.addColorStop(0, `${accentColor}10`);
    glow3.addColorStop(1, 'transparent');
    ctx.fillStyle = glow3;
    ctx.fillRect(0, 0, w, h);

    // === SPARKLES ===
    const sparkles = [
      { x: 120, y: 180, size: 8, alpha: 0.3 },
      { x: 960, y: 200, size: 10, alpha: 0.35 },
      { x: 200, y: 260, size: 5, alpha: 0.2 },
      { x: 880, y: 270, size: 6, alpha: 0.25 },
      { x: 160, y: 440, size: 14, alpha: 0.5 },
      { x: 920, y: 480, size: 12, alpha: 0.45 },
      { x: 130, y: 620, size: 6, alpha: 0.2 },
      { x: 950, y: 580, size: 8, alpha: 0.3 },
      { x: 180, y: 780, size: 10, alpha: 0.35 },
      { x: 900, y: 740, size: 16, alpha: 0.5 },
      { x: 140, y: 980, size: 6, alpha: 0.2 },
      { x: 940, y: 1020, size: 8, alpha: 0.25 },
      { x: 100, y: 1150, size: 12, alpha: 0.4 },
      { x: 980, y: 1130, size: 10, alpha: 0.35 },
      { x: 160, y: 1280, size: 5, alpha: 0.15 },
      { x: 920, y: 1300, size: 7, alpha: 0.2 },
      { x: 200, y: 1500, size: 10, alpha: 0.3 },
      { x: 880, y: 1460, size: 14, alpha: 0.45 },
      { x: 140, y: 1650, size: 6, alpha: 0.2 },
      { x: 940, y: 1680, size: 8, alpha: 0.25 },
      { x: 300, y: 1780, size: 5, alpha: 0.15 },
      { x: 780, y: 1800, size: 7, alpha: 0.2 },
      { x: 260, y: 360, size: 4, alpha: 0.12 },
      { x: 820, y: 340, size: 3, alpha: 0.1 },
      { x: 240, y: 1100, size: 4, alpha: 0.12 },
      { x: 840, y: 1400, size: 3, alpha: 0.1 },
    ];
    for (const sp of sparkles) {
      drawSparkle(sp.x * s, sp.y * s, sp.size * s, sp.alpha);
    }

    const cx = w / 2;
    let y = 200 * s;

    // === BRANDING ===
    ctx.fillStyle = `${accentColor}cc`;
    ctx.font = `500 ${28 * s}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('E L I T E R A N K', cx, y);
    y += 40 * s;

    drawDecorativeLine(cx, y, 260 * s);
    y += 60 * s;

    // === PHOTO ===
    const photoR = 200 * s;
    const photoCY = y + photoR;

    // Glow behind photo
    ctx.save();
    const outerGlow = ctx.createRadialGradient(cx, photoCY, photoR * 0.5, cx, photoCY, photoR + 100 * s);
    outerGlow.addColorStop(0, `${accentColor}18`);
    outerGlow.addColorStop(0.6, `${accentColor}0a`);
    outerGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(cx, photoCY, photoR + 100 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    function drawInitialCircle() {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, photoCY, photoR, 0, Math.PI * 2);
      const grad = ctx.createLinearGradient(cx - photoR, photoCY - photoR, cx + photoR, photoCY + photoR);
      grad.addColorStop(0, '#1a1a20');
      grad.addColorStop(1, '#0d0d10');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = accentColor;
      ctx.font = `bold ${photoR * 0.9}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((name?.charAt(0) || '?').toUpperCase(), cx, photoCY + 2 * s);
      ctx.textBaseline = 'alphabetic';
    }

    function drawRings() {
      // Inner accent ring
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.arc(cx, photoCY, photoR + 6 * s, 0, Math.PI * 2);
      ctx.stroke();

      // Middle subtle ring
      ctx.strokeStyle = `${accentColor}20`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, photoCY, photoR + 18 * s, 0, Math.PI * 2);
      ctx.stroke();

      // Outer faint ring
      ctx.strokeStyle = `${accentColor}12`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, photoCY, photoR + 30 * s, 0, Math.PI * 2);
      ctx.stroke();

      // Ring sparkles
      drawSparkle(cx - photoR - 10 * s, photoCY - 40 * s, 5 * s, 0.5);
      drawSparkle(cx + photoR + 14 * s, photoCY + 30 * s, 4 * s, 0.4);
      drawSparkle(cx - 30 * s, photoCY - photoR - 12 * s, 5 * s, 0.45);
      drawSparkle(cx + 50 * s, photoCY + photoR + 15 * s, 4 * s, 0.35);
    }

    function drawBottom() {
      let ry = photoCY + photoR + 70 * s;

      // Name
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${56 * s}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(name || 'Nominee', cx, ry);
      ry += 46 * s;

      // Handle
      if (handle) {
        ctx.fillStyle = '#9a9aaa';
        ctx.font = `400 ${28 * s}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillText(`@${handle.replace('@', '')}`, cx, ry);
        ry += 40 * s;
      }

      // Divider
      ry += 30 * s;
      drawDecorativeLine(cx, ry, 300 * s);
      ry += 60 * s;

      // NOMINATED with glow
      ctx.save();
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 50 * s;
      ctx.fillStyle = accentColor;
      ctx.font = `bold ${88 * s}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillText('NOMINATED', cx, ry);
      ctx.restore();

      ctx.save();
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 20 * s;
      ctx.fillStyle = accentColor;
      ctx.font = `bold ${88 * s}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillText('NOMINATED', cx, ry);
      ctx.restore();

      ctx.fillStyle = accentColor;
      ctx.font = `bold ${88 * s}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillText('NOMINATED', cx, ry);
      ry += 66 * s;

      // Subtitle
      ctx.fillStyle = '#71717a';
      ctx.font = `400 ${28 * s}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillText('for', cx, ry);
      ry += 48 * s;

      ctx.fillStyle = '#e4e4e7';
      ctx.font = `600 ${36 * s}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillText(competitionTitle || 'Competition', cx, ry);
      ry += 44 * s;

      const metaParts = [];
      if (cityName) metaParts.push(cityName);
      if (season) metaParts.push(String(season));
      if (metaParts.length) {
        ctx.fillStyle = '#52525b';
        ctx.font = `400 ${26 * s}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillText(metaParts.join('  ·  '), cx, ry);
      }

      // CTA
      const ctaY = 1680 * s;
      const ctaW = 480 * s;
      const ctaH = 68 * s;
      const ctaX = cx - ctaW / 2;
      const r = ctaH / 2;

      ctx.save();
      ctx.shadowColor = `${accentColor}40`;
      ctx.shadowBlur = 30 * s;
      ctx.shadowOffsetY = 4 * s;
      ctx.beginPath();
      ctx.moveTo(ctaX + r, ctaY);
      ctx.lineTo(ctaX + ctaW - r, ctaY);
      ctx.quadraticCurveTo(ctaX + ctaW, ctaY, ctaX + ctaW, ctaY + r);
      ctx.quadraticCurveTo(ctaX + ctaW, ctaY + ctaH, ctaX + ctaW - r, ctaY + ctaH);
      ctx.lineTo(ctaX + r, ctaY + ctaH);
      ctx.quadraticCurveTo(ctaX, ctaY + ctaH, ctaX, ctaY + r);
      ctx.quadraticCurveTo(ctaX, ctaY, ctaX + r, ctaY);
      ctx.closePath();
      const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY + ctaH);
      ctaGrad.addColorStop(0, accentColor);
      ctaGrad.addColorStop(1, '#f4d03f');
      ctx.fillStyle = ctaGrad;
      ctx.fill();
      ctx.restore();

      // Button border
      ctx.beginPath();
      ctx.moveTo(ctaX + r, ctaY);
      ctx.lineTo(ctaX + ctaW - r, ctaY);
      ctx.quadraticCurveTo(ctaX + ctaW, ctaY, ctaX + ctaW, ctaY + r);
      ctx.quadraticCurveTo(ctaX + ctaW, ctaY + ctaH, ctaX + ctaW - r, ctaY + ctaH);
      ctx.lineTo(ctaX + r, ctaY + ctaH);
      ctx.quadraticCurveTo(ctaX, ctaY + ctaH, ctaX, ctaY + r);
      ctx.quadraticCurveTo(ctaX, ctaY, ctaX + r, ctaY);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#0a0a0c';
      ctx.font = `bold ${26 * s}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Vote at eliterank.co', cx, ctaY + ctaH / 2);
      ctx.textBaseline = 'alphabetic';

      // Bottom branding
      ctx.fillStyle = '#3f3f46';
      ctx.font = `400 ${20 * s}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillText('eliterank.co', cx, 1820 * s);
    }

    if (photoUrl && imageLoaded) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, photoCY, photoR, 0, Math.PI * 2);
        ctx.clip();
        const aspect = img.width / img.height;
        let dw, dh, dx, dy;
        if (aspect > 1) {
          dh = photoR * 2;
          dw = dh * aspect;
          dx = cx - dw / 2;
          dy = photoCY - photoR;
        } else {
          dw = photoR * 2;
          dh = dw / aspect;
          dx = cx - photoR;
          dy = photoCY - dh / 2;
        }
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();
        drawRings();
        drawBottom();
      };
      img.onerror = () => {
        drawInitialCircle();
        drawRings();
        drawBottom();
      };
      img.src = photoUrl;
    } else {
      drawInitialCircle();
      drawRings();
      drawBottom();
    }
  }, [name, photoUrl, handle, competitionTitle, cityName, season, accentColor, imageLoaded]);

  // Pre-load photo
  useEffect(() => {
    if (!photoUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImageLoaded(true);
    img.src = photoUrl;
  }, [photoUrl]);

  return (
    <div className="entry-shareable-card">
      <canvas
        ref={canvasRef}
        width={360}
        height={640}
        className="entry-card-canvas"
      />
    </div>
  );
}
