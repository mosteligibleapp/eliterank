/**
 * EliteRank Design Tokens
 * 
 * Inspired by:
 * - Kalshi: Fintech-clean, data-forward, trustworthy
 * - Posh: Trendy nightlife, editorial, dark mode luxury
 * - Sweatpals: Community warmth, social proof, energetic
 */

export const tokens = {
  colors: {
    // Primary brand - Gold
    gold: {
      50: '#fefce8',
      100: '#fef9c3',
      200: '#fef08a',
      300: '#fde047',
      400: '#facc15',
      500: '#d4af37',  // Brand gold
      600: '#b8960c',
      700: '#a16207',
      800: '#854d0e',
      900: '#713f12',
      950: '#422006',
      DEFAULT: '#d4af37',
    },
    
    // Backgrounds (dark mode first - like Posh)
    bg: {
      primary: '#08080c',      // Deepest black - page background
      secondary: '#0f0f14',    // Slightly lighter - sections
      card: '#141419',         // Card backgrounds
      elevated: '#1c1c24',     // Modals, dropdowns, elevated surfaces
      hover: '#222230',        // Hover states
    },
    
    // Text hierarchy
    text: {
      primary: '#ffffff',      // Primary text - white
      secondary: '#a1a1aa',    // Secondary text - zinc-400
      muted: '#71717a',        // Muted text - zinc-500
      disabled: '#52525b',     // Disabled text - zinc-600
      inverse: '#08080c',      // Inverse (on light backgrounds)
    },
    
    // Status colors (like Kalshi - trustworthy, clear)
    success: {
      light: '#86efac',        // green-300
      DEFAULT: '#22c55e',      // green-500
      dark: '#16a34a',         // green-600
    },
    warning: {
      light: '#fcd34d',        // amber-300
      DEFAULT: '#f59e0b',      // amber-500
      dark: '#d97706',         // amber-600
    },
    error: {
      light: '#fca5a5',        // red-300
      DEFAULT: '#ef4444',      // red-500
      dark: '#dc2626',         // red-600
    },
    info: {
      light: '#93c5fd',        // blue-300
      DEFAULT: '#3b82f6',      // blue-500
      dark: '#2563eb',         // blue-600
    },
    
    // Accent colors (energetic like Sweatpals)
    accent: {
      pink: '#ec4899',         // pink-500 - notifications, highlights
      purple: '#a855f7',       // purple-500 - premium features
      cyan: '#06b6d4',         // cyan-500 - links, interactive
    },
    
    // Borders
    border: {
      subtle: 'rgba(255,255,255,0.06)',
      DEFAULT: 'rgba(255,255,255,0.1)',
      strong: 'rgba(255,255,255,0.2)',
      gold: 'rgba(212,175,55,0.3)',
      goldStrong: 'rgba(212,175,55,0.5)',
    },
    
    // Overlays
    overlay: {
      light: 'rgba(255,255,255,0.05)',
      medium: 'rgba(0,0,0,0.5)',
      heavy: 'rgba(0,0,0,0.8)',
    },
  },
  
  // Gradients
  gradients: {
    gold: 'linear-gradient(135deg, #d4af37 0%, #f5d77a 50%, #d4af37 100%)',
    goldSubtle: 'linear-gradient(135deg, rgba(212,175,55,0.2) 0%, rgba(245,215,122,0.1) 100%)',
    goldShine: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
    dark: 'linear-gradient(180deg, #0f0f14 0%, #08080c 100%)',
    glass: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
    pinkPurple: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)',
    cyanBlue: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
  },
  
  typography: {
    fontFamily: {
      display: ['SF Pro Display', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      body: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      mono: ['SF Mono', 'Fira Code', 'monospace'],
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
      sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.01em' }],
      base: ['1rem', { lineHeight: '1.5rem', letterSpacing: '0' }],
      lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
      xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
      '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.03em' }],
      '5xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
      '6xl': ['3.75rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
      '7xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
      black: 900,
    },
  },
  
  spacing: {
    // Page-level spacing
    page: {
      x: '1.5rem',        // Mobile horizontal padding
      xMd: '2rem',        // Tablet
      xLg: '3rem',        // Desktop
      xXl: '4rem',        // Large desktop
    },
    // Section spacing
    section: {
      sm: '2rem',
      DEFAULT: '4rem',
      lg: '6rem',
    },
    // Card internal spacing
    card: {
      sm: '0.75rem',
      DEFAULT: '1.25rem',
      lg: '1.5rem',
    },
    // Component gaps
    gap: {
      xs: '0.25rem',
      sm: '0.5rem',
      DEFAULT: '0.75rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
    },
  },
  
  borderRadius: {
    none: '0',
    xs: '0.25rem',       // 4px
    sm: '0.375rem',      // 6px
    DEFAULT: '0.5rem',   // 8px
    md: '0.625rem',      // 10px
    lg: '0.75rem',       // 12px
    xl: '1rem',          // 16px
    '2xl': '1.25rem',    // 20px
    '3xl': '1.5rem',     // 24px
    full: '9999px',
  },
  
  shadows: {
    // Standard shadows
    none: 'none',
    xs: '0 1px 2px rgba(0,0,0,0.3)',
    sm: '0 1px 3px rgba(0,0,0,0.4)',
    DEFAULT: '0 4px 12px rgba(0,0,0,0.5)',
    md: '0 8px 24px rgba(0,0,0,0.5)',
    lg: '0 16px 48px rgba(0,0,0,0.6)',
    xl: '0 24px 64px rgba(0,0,0,0.7)',
    
    // Glow effects
    glow: {
      gold: '0 0 20px rgba(212,175,55,0.3)',
      goldStrong: '0 0 40px rgba(212,175,55,0.5)',
      pink: '0 0 20px rgba(236,72,153,0.3)',
      purple: '0 0 20px rgba(168,85,247,0.3)',
      cyan: '0 0 20px rgba(6,182,212,0.3)',
      success: '0 0 20px rgba(34,197,94,0.3)',
      error: '0 0 20px rgba(239,68,68,0.3)',
    },
    
    // Inner shadows
    inner: {
      DEFAULT: 'inset 0 2px 4px rgba(0,0,0,0.3)',
      lg: 'inset 0 4px 8px rgba(0,0,0,0.4)',
    },
  },
  
  animation: {
    duration: {
      instant: '0ms',
      fast: '150ms',
      DEFAULT: '200ms',
      slow: '300ms',
      slower: '500ms',
      slowest: '700ms',
    },
    easing: {
      DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',    // Smooth
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',            // Accelerate
      out: 'cubic-bezier(0, 0, 0.2, 1)',           // Decelerate
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',       // Smooth in-out
      bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Playful bounce
      spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Spring effect
    },
    // Pre-composed animations
    presets: {
      fadeIn: 'fadeIn 200ms ease-out',
      fadeOut: 'fadeOut 150ms ease-in',
      slideUp: 'slideUp 300ms ease-out',
      slideDown: 'slideDown 300ms ease-out',
      scaleIn: 'scaleIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      pulse: 'pulse 2s infinite',
      shimmer: 'shimmer 2s infinite',
      spin: 'spin 1s linear infinite',
    },
  },
  
  // Z-index scale
  zIndex: {
    behind: -1,
    base: 0,
    raised: 10,
    dropdown: 100,
    sticky: 200,
    overlay: 300,
    modal: 400,
    popover: 500,
    toast: 600,
    tooltip: 700,
    max: 9999,
  },
  
  // Breakpoints
  breakpoints: {
    xs: '375px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  
  // Touch targets
  touch: {
    minSize: '44px',
    minSpacing: '8px',
  },
};

// Export individual token groups for convenience
export const { colors, gradients, typography, spacing, borderRadius, shadows, animation, zIndex, breakpoints, touch } = tokens;

// CSS custom properties generator
export function generateCSSVariables() {
  return `
:root {
  /* Colors - Gold */
  --color-gold-50: ${colors.gold[50]};
  --color-gold-100: ${colors.gold[100]};
  --color-gold-200: ${colors.gold[200]};
  --color-gold-300: ${colors.gold[300]};
  --color-gold-400: ${colors.gold[400]};
  --color-gold-500: ${colors.gold[500]};
  --color-gold-600: ${colors.gold[600]};
  --color-gold-700: ${colors.gold[700]};
  --color-gold-800: ${colors.gold[800]};
  --color-gold-900: ${colors.gold[900]};
  --color-gold: ${colors.gold.DEFAULT};
  
  /* Colors - Background */
  --color-bg-primary: ${colors.bg.primary};
  --color-bg-secondary: ${colors.bg.secondary};
  --color-bg-card: ${colors.bg.card};
  --color-bg-elevated: ${colors.bg.elevated};
  --color-bg-hover: ${colors.bg.hover};
  
  /* Colors - Text */
  --color-text-primary: ${colors.text.primary};
  --color-text-secondary: ${colors.text.secondary};
  --color-text-muted: ${colors.text.muted};
  --color-text-disabled: ${colors.text.disabled};
  
  /* Colors - Status */
  --color-success: ${colors.success.DEFAULT};
  --color-warning: ${colors.warning.DEFAULT};
  --color-error: ${colors.error.DEFAULT};
  --color-info: ${colors.info.DEFAULT};
  
  /* Colors - Accent */
  --color-accent-pink: ${colors.accent.pink};
  --color-accent-purple: ${colors.accent.purple};
  --color-accent-cyan: ${colors.accent.cyan};
  
  /* Typography */
  --font-display: ${typography.fontFamily.display.join(', ')};
  --font-body: ${typography.fontFamily.body.join(', ')};
  --font-mono: ${typography.fontFamily.mono.join(', ')};
  
  /* Animation */
  --duration-fast: ${animation.duration.fast};
  --duration-default: ${animation.duration.DEFAULT};
  --duration-slow: ${animation.duration.slow};
  --easing-default: ${animation.easing.DEFAULT};
  --easing-bounce: ${animation.easing.bounce};
  
  /* Shadows */
  --shadow-default: ${shadows.DEFAULT};
  --shadow-glow-gold: ${shadows.glow.gold};
}
  `.trim();
}

export default tokens;
