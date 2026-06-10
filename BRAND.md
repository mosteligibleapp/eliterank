# EliteRank Brand Reference

Canva Brand Kit / external design reference. All values are the source of truth from
[`src/styles/theme.js`](src/styles/theme.js). **Vibe: Dark + Gold luxury — premium,
exclusive, minimal color variety. Gold is the only accent.**

> When designing in Canva (or any external tool), match these exactly. Do not introduce
> new colors, gradients, or fonts. See `CLAUDE.md` for the full brand rules.

## Colors

### Brand / Accent — Gold (the ONLY accent color)
| Name | Hex | In Canva kit? |
|---|---|---|
| Gold Primary | `#D4AF37` | ✅ |
| Gold Light | `#F4D03F` | ✅ |
| Gold Dark | `#B8962F` | ✅ |
| Logo Highlight | `#F5D485` | ❌ (documented only) |
| Logo Shadow | `#A8893A` | ❌ (documented only) |

**Logo Highlight / Logo Shadow** are the gradient stops baked into the crown logo
(`public/favicon.svg`: `#F5D485 → #D4AF37 → #A8893A`). They are intentionally **left out
of the Canva color palette** — the crown logo asset already carries that sheen, so adding
them as standalone swatches just invites clutter. Kept here as a record of the true logo
gradient in case it ever needs to be recreated.

### Backgrounds (dark)
| Name | Hex |
|---|---|
| Base | `#0A0A0C` |
| Secondary | `#111114` |
| Tertiary | `#18181B` |
| Card | `#1C1C1F` |
| Card Hover | `#242428` |
| Elevated | `#27272A` |

### Text
| Name | Hex |
|---|---|
| Primary | `#FFFFFF` |
| Secondary | `#A1A1AA` |
| Tertiary | `#71717A` |
| Muted | `#52525B` |
| Inverse (on gold) | `#0A0A0C` |

### Tier colors (ranking badges / data-viz ONLY)
| Tier | Hex |
|---|---|
| Platinum | `#E4E4E7` |
| Gold | `#D4AF37` |
| Silver | `#A1A1AA` |
| Bronze | `#CD7F32` |

### Reserved — do NOT use for general/marketing design
- **Accents (tier badges & data-viz only):** purple `#8B5CF6` · pink `#EC4899` · cyan `#06B6D4`

## Status Colors (functional use — open/closed, success/error)
Status colors ARE allowed, but **only to carry meaning** (e.g. nominations Open/Closed,
success/error) — never as decoration. The brand status pair is an elegant, desaturated
jewel-tone set chosen to sit beside antique gold:

| Name | Hex | Use |
|---|---|---|
| Open / Success | `#2FA36C` | emerald — open, live, success |
| Closed / Error | `#C24A5C` | garnet — closed, ended, error |

**Treatment (always):**
- Pair the color with a **text label** ("OPEN"/"CLOSED") and/or icon — never color alone
  (accessibility + intent).
- Use as a **muted pill**: fill at ~15% opacity, with a saturated border + label, not a
  solid bright block. e.g. `background: rgba(var(--color-success-rgb), 0.15); color/border: var(--color-success)`.
- Keep small (chip/pill). Gold stays the hero.

### Source of truth & how to reference status colors
Single global definition lives in **`src/index.css` `:root`** (loaded by both the web app
*and* the admin app via `@shared/index.css`):

```
--color-success: #2fa36c;  --color-success-rgb: 47, 163, 108;
--color-success-light: #3fbe80;  --color-success-dark: #1f7a50;
--color-error:   #c24a5c;  --color-error-rgb:   194, 74, 92;
--color-error-dark: #9e3848;
```

- **In components / inline styles:** use `var(--color-success)` / `var(--color-error)`, and
  `rgba(var(--color-success-rgb), <opacity>)` for tints. Never hardcode the hex.
- **In `src/styles/theme.js`:** `colors.status.success`/`error` hold the same literal values
  for the rare JS-only consumer; keep them in sync with the CSS vars above.
- `src/design-system/tokens.js` is currently **unused** (not imported anywhere); retuned for
  consistency only.

> ✅ **Fully migrated (done):** all ~70 component/CSS files in `src/` and `admin/` that
> hardcoded `#22c55e`/`#ef4444` (+ `rgba()` tints and the `#4ade80`/`#16a34a`/`#dc2626`
> shades) now reference the CSS vars above. The duplicate `--color-success`/`--color-error`
> definitions were removed from `competition-phases.css` so `index.css` is the lone source.
> Both `npm run build:web` and `build:admin` pass.
>
> ℹ️ **Out of scope (intentional):** `supabase/functions/*` email templates keep literal
> hex — email clients don't support CSS custom properties. Retune those separately if
> branded status colors are ever wanted in emails.

## Gradients

## Gradients
| Name | Value |
|---|---|
| Gold | `linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%)` |
| Dark | `linear-gradient(180deg, #111114 0%, #0A0A0C 100%)` |

## Typography
The app uses the **system font stack** (SF Pro Display / `-apple-system`), which isn't
available in Canva. Closest free Canva substitute: **Inter** (alt: Archivo). For mono
accents: **Space Mono** or **Roboto Mono**.

- **Headings:** Inter — Bold / Extrabold (700–800)
- **Body:** Inter — Regular / Medium (400–500)

Never add Google Fonts or custom display fonts to the actual app — system fonts only.
The Inter substitution applies to Canva/external collateral only.

## Logo
- **Primary mark:** `public/favicon.svg` — gold crown on `#0A0A0C` (also the favicon)
- **Crown only (transparent):** `public/crown.svg` / `public/crown.png` — for logo use in
  Canva and other collateral
- **Social / lockup:** `public/og-image.png` (and `public/og-image.svg`)
- Logo gradient: `#F5D485 → #D4AF37 → #A8893A`

## Canva Brand Kit
- Brand kit id: `kAGY6tn2LUY`

### Palettes as entered in Canva (keep in sync with this doc)
Two **separate** palettes, deliberately walled off from each other:

**Palette 1 — "Color palette" (brand / marketing)**
| Canva swatch name | Hex |
|---|---|
| Gold Primary | `#D4AF37` |
| Gold Light | `#F4D03F` |
| Gold Dark | `#B8962F` |
| Base Black | `#0A0A0C` |
| Dark Surface | `#18181B` |
| Secondary Text | `#A1A1AA` |
| Primary Text / White | `#FFFFFF` |

**Palette 2 — "Status — Functional Only"** (use only for real status, see Status Colors above)
| Canva swatch name | Hex |
|---|---|
| Open / Success | `#2FA36C` |
| Closed / Error | `#C24A5C` |

- **Not in either palette (deliberate):** Logo Highlight/Shadow (carried by the logo asset),
  purple/pink/cyan accents (tier/data-viz only).
- **Themes:** skipped — auto-shuffle color combos work against the locked gold-on-dark look.
- **Fonts:** Inter (headings Bold/Extrabold, body Regular/Medium).
- **Logo upload note:** the Canva connector's asset upload accepts **public HTTPS URLs only**,
  not local repo files. Once this branch deploys, `eliterank.co/crown.png` is live and the
  crown can be pushed into Canva via MCP; until then, upload manually.
