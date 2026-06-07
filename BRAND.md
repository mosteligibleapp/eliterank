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
- **Status (success/warning/error/info states only):** `#22C55E` · `#F59E0B` · `#EF4444` · `#3B82F6`
- **Accents (tier badges & data-viz only):** purple `#8B5CF6` · pink `#EC4899` · cyan `#06B6D4`

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

### Palette as entered in Canva (keep in sync with this doc)
| Canva swatch name | Hex |
|---|---|
| Gold Primary | `#D4AF37` |
| Gold Light | `#F4D03F` |
| Gold Dark | `#B8962F` |
| Background | `#0A0A0C` |
| Dark Surface | `#18181B` |
| Secondary Text | `#A1A1AA` |
| White | `#FFFFFF` |

- **Not in the palette (deliberate):** Logo Highlight/Shadow (carried by the logo asset),
  status green/red (status-only), purple/pink/cyan accents (tier/data-viz only).
- **Themes:** skipped — auto-shuffle color combos work against the locked gold-on-dark look.
- **Fonts:** Inter (headings Bold/Extrabold, body Regular/Medium).
- **Logo upload note:** the Canva connector's asset upload accepts **public HTTPS URLs only**,
  not local repo files. Once this branch deploys, `eliterank.co/crown.png` is live and the
  crown can be pushed into Canva via MCP; until then, upload manually.
