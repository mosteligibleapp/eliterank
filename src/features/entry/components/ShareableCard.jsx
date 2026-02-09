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

    // --- Background ---
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#08080a');
    bgGrad.addColorStop(0.3, '#0e0e12');
    bgGrad.addColorStop(0.7, '#0e0e12');
    bgGrad.addColorStop(1, '#08080a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Accent glow behind photo area
    const glow1 = ctx.createRadialGradient(w / 2, 1050 * s, 0, w / 2, 1050 * s, 600 * s);
    glow1.addColorStop(0, `${accentColor}18`);
    glow1.addColorStop(0.5, `${accentColor}08`);
    glow1.addColorStop(1, 'transparent');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, w, h);

    // Top glow
    const glow2 = ctx.createRadialGradient(w / 2, 350 * s, 0, w / 2, 350 * s, 400 * s);
    glow2.addColorStop(0, `${accentColor}12`);
    glow2.addColorStop(1, 'transparent');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, w, h);

    // --- Sparkles ---
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
    for (const sp of sparkles) {
      drawSparkle(sp.x * s, sp.y * s, sp.size * s, sp.alpha);
    }

    const cx = w / 2;
    let y = 340 * s;

    // --- Branding ---
    ctx.fillStyle = accentColor;
    ctx.font = `600 ${32 * s}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('E L I T E R A N K', cx, y);
    y += 50 * s;

    // Decorative line
    const lineW = 220 * s;
    ctx.strokeStyle = `${accentColor}50`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - lineW / 2, y);
    ctx.lineTo(cx + lineW / 2, y);
    ctx.stroke();
    drawSparkle(cx, y, 5 * s, 0.7);
    y += 50 * s;

    // "I'VE BEEN"
    ctx.fillStyle = '#a1a1aa';
    ctx.font = `500 ${30 * s}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText("I'VE BEEN", cx, y);
    y += 60 * s;

    // "NOMINATED" hero text with glow
    ctx.save();
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 20 * s;
    ctx.fillStyle = accentColor;
    ctx.font = `bold ${92 * s}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText('NOMINATED', cx, y);
    ctx.restore();
    ctx.fillStyle = accentColor;
    ctx.font = `bold ${92 * s}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText('NOMINATED', cx, y);
    y += 50 * s;

    // "for" + competition
    ctx.fillStyle = '#71717a';
    ctx.font = `400 ${28 * s}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText('for', cx, y);
    y += 44 * s;

    ctx.fillStyle = '#e4e4e7';
    ctx.font = `600 ${36 * s}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText(competitionTitle || 'Competition', cx, y);
    y += 40 * s;

    const metaParts = [];
    if (cityName) metaParts.push(cityName);
    if (season) metaParts.push(String(season));
    if (metaParts.length) {
      ctx.fillStyle = '#71717a';
      ctx.font = `400 ${26 * s}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillText(metaParts.join('  ·  '), cx, y);
    }
    y += 65 * s;

    // --- Photo ---
    const photoR = 160 * s;
    const photoCY = y + photoR;

    // Outer glow
    ctx.save();
    const pGlow = ctx.createRadialGradient(cx, photoCY, photoR - 20 * s, cx, photoCY, photoR + 60 * s);
    pGlow.addColorStop(0, `${accentColor}20`);
    pGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = pGlow;
    ctx.beginPath();
    ctx.arc(cx, photoCY, photoR + 60 * s, 0, Math.PI * 2);
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
      ctx.strokeStyle = `${accentColor}30`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, photoCY, photoR + 16 * s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.arc(cx, photoCY, photoR + 6 * s, 0, Math.PI * 2);
      ctx.stroke();
    }

    function drawBottom() {
      let ry = photoCY + photoR + 50 * s;

      // Name
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${60 * s}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(name || 'Nominee', cx, ry);
      ry += 44 * s;

      // Handle
      if (handle) {
        ctx.fillStyle = '#a1a1aa';
        ctx.font = `400 ${30 * s}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillText(`@${handle.replace('@', '')}`, cx, ry);
      }

      // CTA
      const ctaY = 1640 * s;
      const ctaW = 440 * s;
      const ctaH = 60 * s;
      const ctaX = cx - ctaW / 2;

      ctx.beginPath();
      const r = ctaH / 2;
      ctx.moveTo(ctaX + r, ctaY);
      ctx.lineTo(ctaX + ctaW - r, ctaY);
      ctx.quadraticCurveTo(ctaX + ctaW, ctaY, ctaX + ctaW, ctaY + r);
      ctx.quadraticCurveTo(ctaX + ctaW, ctaY + ctaH, ctaX + ctaW - r, ctaY + ctaH);
      ctx.lineTo(ctaX + r, ctaY + ctaH);
      ctx.quadraticCurveTo(ctaX, ctaY + ctaH, ctaX, ctaY + r);
      ctx.quadraticCurveTo(ctaX, ctaY, ctaX + r, ctaY);
      ctx.closePath();

      const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY);
      ctaGrad.addColorStop(0, accentColor);
      ctaGrad.addColorStop(1, '#f4d03f');
      ctx.fillStyle = ctaGrad;
      ctx.fill();

      ctx.fillStyle = '#0a0a0c';
      ctx.font = `bold ${26 * s}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Vote at eliterank.co', cx, ctaY + ctaH / 2);
      ctx.textBaseline = 'alphabetic';
    }

    if (photoUrl && imageLoaded) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, photoCY, photoR, 0, Math.PI * 2);
        ctx.clip();
        // Cover-fit
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
