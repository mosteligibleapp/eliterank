# EliteRank Brand Reference

Canva Brand Kit / external design reference. All values are the source of truth from
[`src/styles/theme.js`](src/styles/theme.js). **Vibe: Dark + Gold luxury — premium,
exclusive, minimal color variety. Gold is the only accent.**

> When designing in Canva (or any external tool), match these exactly. Do not introduce
> new colors, gradients, or fonts. See `CLAUDE.md` for the full brand rules.

## Colors

### Brand / Accent — Gold (the ONLY accent color)
| Name | Hex |
|---|---|
| Gold (primary) | `#D4AF37` |
| Gold Light | `#F4D03F` |
| Gold Dark | `#B8962F` |

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
- **Primary mark:** `favicon.svg` — gold crown on `#0A0A0C`
- **Social / lockup:** `public/og-image.png` (and `public/og-image.svg`)

## Canva Brand Kit
- Existing brand kit id: `kAGY6tn2LUY`
- Logo upload note: the Canva connector's asset upload accepts **public HTTPS URLs only**,
  not local repo files. Upload logos manually, or provide a live URL to push them via MCP.
