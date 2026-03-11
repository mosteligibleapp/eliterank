/**
 * Generate OG social sharing image (1200x630) using Playwright.
 * Run: npx playwright install chromium && node scripts/generate-og-image.mjs
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(__dirname, '../public/og-image.png');

const html = `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');

  body {
    width: 1200px;
    height: 630px;
    background: #0a0a0c;
    font-family: 'Inter', system-ui, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
  }

  /* Radial gold glow behind crown */
  .glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -60%);
    width: 600px;
    height: 400px;
    background: radial-gradient(ellipse at center, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 40%, transparent 70%);
    pointer-events: none;
  }

  /* Subtle grid pattern */
  .grid-bg {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(212,175,55,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(212,175,55,0.03) 1px, transparent 1px);
    background-size: 60px 60px;
    pointer-events: none;
  }

  /* Top border accent */
  .top-accent {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, transparent, #d4af37, transparent);
  }

  .content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  /* SVG Crown */
  .crown {
    width: 120px;
    height: 96px;
    margin-bottom: 8px;
    filter: drop-shadow(0 4px 24px rgba(212,175,55,0.4));
  }

  .title {
    font-size: 72px;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: -2px;
    line-height: 1;
  }

  .subtitle {
    font-size: 28px;
    font-weight: 400;
    color: #a1a1aa;
    letter-spacing: 1px;
    margin-top: 4px;
  }

  .divider {
    width: 200px;
    height: 3px;
    background: linear-gradient(90deg, transparent, #d4af37, transparent);
    border-radius: 2px;
    margin: 12px 0;
  }

  .tagline {
    font-size: 20px;
    font-weight: 600;
    color: #71717a;
    letter-spacing: 4px;
    text-transform: uppercase;
  }

  /* Corner accents */
  .corner {
    position: absolute;
    width: 60px;
    height: 60px;
    border: 2px solid rgba(212,175,55,0.15);
  }
  .corner-tl { top: 32px; left: 32px; border-right: none; border-bottom: none; }
  .corner-tr { top: 32px; right: 32px; border-left: none; border-bottom: none; }
  .corner-bl { bottom: 32px; left: 32px; border-right: none; border-top: none; }
  .corner-br { bottom: 32px; right: 32px; border-left: none; border-top: none; }

  .url {
    position: absolute;
    bottom: 40px;
    right: 48px;
    font-size: 16px;
    font-weight: 600;
    color: rgba(212,175,55,0.5);
    letter-spacing: 1px;
  }
</style>
</head>
<body>
  <div class="grid-bg"></div>
  <div class="glow"></div>
  <div class="top-accent"></div>

  <div class="corner corner-tl"></div>
  <div class="corner corner-tr"></div>
  <div class="corner corner-bl"></div>
  <div class="corner corner-br"></div>

  <div class="content">
    <svg class="crown" viewBox="0 0 120 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Crown body -->
      <path d="M10 72L20 28L40 48L60 16L80 48L100 28L110 72H10Z" fill="url(#crownGrad)" stroke="rgba(244,208,63,0.3)" stroke-width="1"/>
      <!-- Crown base -->
      <rect x="8" y="72" width="104" height="14" rx="3" fill="url(#crownGrad)"/>
      <!-- Jewel circles -->
      <circle cx="60" cy="52" r="5" fill="#0a0a0c" stroke="#f4d03f" stroke-width="1.5"/>
      <circle cx="36" cy="56" r="3.5" fill="#0a0a0c" stroke="#f4d03f" stroke-width="1"/>
      <circle cx="84" cy="56" r="3.5" fill="#0a0a0c" stroke="#f4d03f" stroke-width="1"/>
      <!-- Crown tips -->
      <circle cx="20" cy="26" r="4" fill="#f4d03f"/>
      <circle cx="40" cy="46" r="3.5" fill="#d4af37"/>
      <circle cx="60" cy="14" r="5" fill="#f4d03f"/>
      <circle cx="80" cy="46" r="3.5" fill="#d4af37"/>
      <circle cx="100" cy="26" r="4" fill="#f4d03f"/>
      <defs>
        <linearGradient id="crownGrad" x1="60" y1="14" x2="60" y2="86" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#f4d03f"/>
          <stop offset="100%" stop-color="#b8962f"/>
        </linearGradient>
      </defs>
    </svg>

    <div class="title">EliteRank</div>
    <div class="subtitle">Most Eligible Competition</div>
    <div class="divider"></div>
    <div class="tagline">Compete &middot; Vote &middot; Rise</div>
  </div>

  <div class="url">eliterank.co</div>
</body>
</html>`;

async function generate() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(html, { waitUntil: 'networkidle' });

  // Wait for font to load
  await page.waitForTimeout(1500);

  await page.screenshot({ path: outputPath, type: 'png' });
  await browser.close();

  console.log(`OG image saved to ${outputPath}`);
}

generate().catch(console.error);
