import { useEffect, useState } from 'react';

/**
 * Auto-trim the dead padding around a logo so tightly-padded marks fill their
 * container and read "editorial" instead of floating small in whitespace,
 * while wide wordmarks keep their full width (they're trimmed, never cropped).
 *
 * How it works: load the image, draw it to an off-screen canvas, find the
 * bounding box of the actual content (non-transparent pixels, or pixels that
 * differ from a detected solid-color border), and re-emit a tightly-cropped
 * data URL with a small uniform margin. The result is meant to be displayed
 * with `object-fit: contain` — square-ish content then fills the box, wide
 * content fits to width.
 *
 * Enhancement only: on any failure (CORS-tainted canvas, load error, SVG with
 * no intrinsic size, or content that already fills the frame) it resolves to
 * null and callers fall back to the original URL. Results are cached per URL.
 */

const MAX_DIM = 256; // cap the analysis canvas — logos render small
const PAD_RATIO = 0.06; // breathing room added back around detected content
const ALPHA_THRESHOLD = 12; // alpha at/below this counts as transparent
const BG_DISTANCE = 48; // summed RGB distance from the border color to count as content

const cache = new Map(); // url -> Promise<string|null>

function computeTrim(url) {
  return new Promise((resolve) => {
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
      resolve(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onerror = () => resolve(null);
    img.onload = () => {
      try {
        const nw = img.naturalWidth;
        const nh = img.naturalHeight;
        if (!nw || !nh) {
          resolve(null);
          return;
        }

        const scale = Math.min(1, MAX_DIM / Math.max(nw, nh));
        const w = Math.max(1, Math.round(nw * scale));
        const h = Math.max(1, Math.round(nh * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);

        // Reading pixels throws if the canvas is tainted (cross-origin without
        // CORS) — caught below, callers fall back to the untrimmed URL.
        const { data } = ctx.getImageData(0, 0, w, h);

        // Detect a solid, opaque background by sampling the four corners. If
        // they're opaque and consistent, treat near-matching pixels as padding.
        const cornerAt = (x, y) => {
          const i = (y * w + x) * 4;
          return [data[i], data[i + 1], data[i + 2], data[i + 3]];
        };
        const corners = [cornerAt(0, 0), cornerAt(w - 1, 0), cornerAt(0, h - 1), cornerAt(w - 1, h - 1)];
        const opaque = corners.filter((c) => c[3] > 200);
        let bg = null;
        if (opaque.length >= 3) {
          const avg = [0, 1, 2].map((k) => Math.round(opaque.reduce((s, c) => s + c[k], 0) / opaque.length));
          const consistent = opaque.every(
            (c) => Math.abs(c[0] - avg[0]) + Math.abs(c[1] - avg[1]) + Math.abs(c[2] - avg[2]) < 30,
          );
          if (consistent) bg = avg;
        }

        let minX = w;
        let minY = h;
        let maxX = -1;
        let maxY = -1;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const a = data[i + 3];
            let isContent;
            if (a <= ALPHA_THRESHOLD) {
              isContent = false;
            } else if (bg) {
              const dist = Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]);
              isContent = dist > BG_DISTANCE;
            } else {
              isContent = true; // transparent background: any opaque pixel is content
            }
            if (isContent) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxX < minX || maxY < minY) {
          resolve(null); // nothing detected (e.g. a blank image)
          return;
        }

        const boxW = maxX - minX + 1;
        const boxH = maxY - minY + 1;
        // Already fills the frame in both dimensions → trimming would do nothing.
        if (boxW >= w * 0.92 && boxH >= h * 0.92) {
          resolve(null);
          return;
        }

        const pad = Math.round(Math.max(boxW, boxH) * PAD_RATIO);
        const cx = Math.max(0, minX - pad);
        const cy = Math.max(0, minY - pad);
        const cw = Math.min(w - cx, boxW + pad * 2);
        const ch = Math.min(h - cy, boxH + pad * 2);

        const out = document.createElement('canvas');
        out.width = cw;
        out.height = ch;
        out.getContext('2d').drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
        resolve(out.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };

    img.src = url;
  });
}

export function trimLogo(url) {
  if (!url) return Promise.resolve(null);
  if (!cache.has(url)) cache.set(url, computeTrim(url));
  return cache.get(url);
}

/**
 * React hook: returns a tightly-trimmed version of `url` once it's computed,
 * falling back to the original `url` while loading or if trimming isn't
 * possible. Safe to call with null/emoji values (returns them unchanged).
 */
export function useTrimmedLogo(url) {
  const [trimmed, setTrimmed] = useState(null);

  useEffect(() => {
    let active = true;
    setTrimmed(null);
    if (!url || typeof url !== 'string' || !url.startsWith('http')) return undefined;
    trimLogo(url).then((result) => {
      if (active) setTrimmed(result);
    });
    return () => {
      active = false;
    };
  }, [url]);

  return trimmed || url;
}
