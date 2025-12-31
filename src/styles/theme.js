// Theme configuration for EliteRank
// Modern, sleek design system inspired by Instagram & Robinhood
// Optimized for web and mobile experiences

// ============================================
// BREAKPOINTS - Mobile-first responsive design
// ============================================
export const breakpoints = {
  xs: 0,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
};

// Media query helpers (for use in JS)
export const media = {
  sm: `@media (min-width: ${breakpoints.sm}px)`,
  md: `@media (min-width: ${breakpoints.md}px)`,
  lg: `@media (min-width: ${breakpoints.lg}px)`,
  xl: `@media (min-width: ${breakpoints.xl}px)`,
  xxl: `@media (min-width: ${breakpoints.xxl}px)`,
};

// Check if mobile (for JS usage)
export const isMobile = () => typeof window !== 'undefined' && window.innerWidth < breakpoints.md;
export const isTablet = () => typeof window !== 'undefined' && window.innerWidth >= breakpoints.md && window.innerWidth < breakpoints.lg;
export const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= breakpoints.lg;

// ============================================
// COLORS - Clean, high-contrast palette
// ============================================
export const colors = {
  // Primary brand color - Gold
  gold: {
    primary: '#d4af37',
    light: '#f4d03f',
    dark: '#b8962f',
    muted: 'rgba(212, 175, 55, 0.15)',
  },

  // Background colors - Rich, deep tones
  background: {
    primary: '#0a0a0c',
    secondary: '#111114',
    tertiary: '#18181b',
    card: '#1c1c1f',
    cardHover: '#242428',
    elevated: '#27272a',
    overlay: 'rgba(0, 0, 0, 0.85)',
    overlayLight: 'rgba(0, 0, 0, 0.5)',
  },

  // Text colors - Clear hierarchy
  text: {
    primary: '#ffffff',
    secondary: '#a1a1aa',
    tertiary: '#71717a',
    muted: '#52525b',
    inverse: '#0a0a0c',
  },

  // Status colors - Vibrant, accessible
  status: {
    success: '#22c55e',
    successLight: '#4ade80',
    successMuted: 'rgba(34, 197, 94, 0.15)',
    warning: '#f59e0b',
    warningLight: '#fbbf24',
    warningMuted: 'rgba(245, 158, 11, 0.15)',
    error: '#ef4444',
    errorLight: '#f87171',
    errorMuted: 'rgba(239, 68, 68, 0.15)',
    info: '#3b82f6',
    infoLight: '#60a5fa',
    infoMuted: 'rgba(59, 130, 246, 0.15)',
  },

  // Accent colors
  accent: {
    purple: '#8b5cf6',
    purpleLight: '#a78bfa',
    purpleMuted: 'rgba(139, 92, 246, 0.15)',
    pink: '#ec4899',
    pinkLight: '#f472b6',
    pinkMuted: 'rgba(236, 72, 153, 0.15)',
    cyan: '#06b6d4',
    cyanLight: '#22d3ee',
    cyanMuted: 'rgba(6, 182, 212, 0.15)',
  },

  // Tier colors for rankings
  tier: {
    platinum: '#e4e4e7',
    gold: '#d4af37',
    silver: '#a1a1aa',
    bronze: '#cd7f32',
  },

  // Border colors
  border: {
    primary: 'rgba(255, 255, 255, 0.1)',
    secondary: 'rgba(255, 255, 255, 0.06)',
    focus: 'rgba(212, 175, 55, 0.5)',
    error: 'rgba(239, 68, 68, 0.5)',
  },

  // Interactive states
  interactive: {
    hover: 'rgba(255, 255, 255, 0.05)',
    active: 'rgba(255, 255, 255, 0.1)',
    disabled: 'rgba(255, 255, 255, 0.03)',
  },
};

// ============================================
// GRADIENTS - Subtle, premium feel
// ============================================
export const gradients = {
  gold: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
  goldSubtle: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%)',
  goldRadial: 'radial-gradient(circle at 30% 30%, rgba(212, 175, 55, 0.15) 0%, transparent 70%)',
  dark: 'linear-gradient(180deg, #111114 0%, #0a0a0c 100%)',
  card: 'linear-gradient(180deg, rgba(28, 28, 31, 0.8) 0%, rgba(28, 28, 31, 0.95) 100%)',
  success: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  purple: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
  shine: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)',
  skeleton: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%)',
};

// ============================================
// SHADOWS - Layered depth system
// ============================================
export const shadows = {
  // Elevation levels
  xs: '0 1px 2px rgba(0, 0, 0, 0.3)',
  sm: '0 2px 4px rgba(0, 0, 0, 0.3)',
  md: '0 4px 8px rgba(0, 0, 0, 0.3)',
  lg: '0 8px 16px rgba(0, 0, 0, 0.4)',
  xl: '0 16px 32px rgba(0, 0, 0, 0.5)',
  xxl: '0 24px 48px rgba(0, 0, 0, 0.6)',

  // Special effects
  gold: '0 4px 20px rgba(212, 175, 55, 0.25)',
  goldGlow: '0 0 30px rgba(212, 175, 55, 0.3)',
  goldInset: 'inset 0 1px 0 rgba(212, 175, 55, 0.2)',
  success: '0 4px 20px rgba(34, 197, 94, 0.25)',
  error: '0 4px 20px rgba(239, 68, 68, 0.25)',

  // Card shadows
  card: '0 2px 8px rgba(0, 0, 0, 0.2)',
  cardHover: '0 8px 24px rgba(0, 0, 0, 0.3)',
  cardActive: '0 2px 4px rgba(0, 0, 0, 0.2)',

  // Focus rings
  focus: '0 0 0 2px rgba(212, 175, 55, 0.4)',
  focusError: '0 0 0 2px rgba(239, 68, 68, 0.4)',
};

// ============================================
// BORDER RADIUS - Consistent rounding
// ============================================
export const borderRadius = {
  none: '0',
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  xxl: '24px',
  full: '50%',
  pill: '9999px',
};

// ============================================
// SPACING - 4px base, 8px scale
// ============================================
export const spacing = {
  0: '0',
  px: '1px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  // Named aliases for backward compatibility
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
  xxxl: '48px',
};

// ============================================
// TYPOGRAPHY - Clean, readable hierarchy
// ============================================
export const typography = {
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"SF Mono", SFMono-Regular, ui-monospace, Menlo, Monaco, "Cascadia Mono", monospace',
  },

  fontSize: {
    // Fluid scale
    xs: '0.75rem',     // 12px
    sm: '0.8125rem',   // 13px
    base: '0.875rem',  // 14px
    md: '0.9375rem',   // 15px
    lg: '1rem',        // 16px
    xl: '1.125rem',    // 18px
    '2xl': '1.25rem',  // 20px
    '3xl': '1.5rem',   // 24px
    '4xl': '1.875rem', // 30px
    '5xl': '2.25rem',  // 36px
    '6xl': '3rem',     // 48px
    '7xl': '3.75rem',  // 60px
    // Legacy aliases
    xxl: '1.25rem',
    xxxl: '1.5rem',
    display: '1.875rem',
    hero: '2.25rem',
  },

  fontWeight: {
    thin: '100',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },

  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

// ============================================
// TRANSITIONS - Smooth, snappy animations
// ============================================
export const transitions = {
  // Durations
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
  slower: '500ms',

  // Easings
  ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',

  // Common transitions
  all: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  colors: 'color 150ms ease, background-color 150ms ease, border-color 150ms ease',
  opacity: 'opacity 150ms ease',
  transform: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  shadow: 'box-shadow 200ms ease',
};

// ============================================
// Z-INDEX - Layering system
// ============================================
export const zIndex = {
  hide: -1,
  base: 0,
  raised: 1,
  dropdown: 10,
  sticky: 20,
  banner: 30,
  overlay: 40,
  modal: 50,
  popover: 60,
  toast: 70,
  tooltip: 80,
  max: 9999,
};

// ============================================
// ANIMATIONS - Keyframe definitions
// ============================================
export const animations = {
  fadeIn: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,
  fadeOut: `
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `,
  slideUp: `
    @keyframes slideUp {
      from { transform: translateY(10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `,
  slideDown: `
    @keyframes slideDown {
      from { transform: translateY(-10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `,
  slideInRight: `
    @keyframes slideInRight {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
  `,
  slideInLeft: `
    @keyframes slideInLeft {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }
  `,
  scaleIn: `
    @keyframes scaleIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `,
  pulse: `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `,
  spin: `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `,
  shimmer: `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `,
  bounce: `
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }
  `,
};

// ============================================
// LAYOUT - Container and grid utilities
// ============================================
export const layout = {
  maxWidth: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    xxl: '1536px',
    full: '100%',
  },

  container: {
    center: true,
    padding: {
      mobile: spacing[4],
      tablet: spacing[6],
      desktop: spacing[8],
    },
  },

  // Common grid configurations
  grid: {
    cols1: 'repeat(1, minmax(0, 1fr))',
    cols2: 'repeat(2, minmax(0, 1fr))',
    cols3: 'repeat(3, minmax(0, 1fr))',
    cols4: 'repeat(4, minmax(0, 1fr))',
    colsAuto: 'repeat(auto-fill, minmax(280px, 1fr))',
    colsAutoLg: 'repeat(auto-fill, minmax(320px, 1fr))',
  },
};

// ============================================
// COMPONENT TOKENS - Specific component styles
// ============================================
export const components = {
  // Button variants
  button: {
    height: {
      sm: '32px',
      md: '40px',
      lg: '48px',
      xl: '56px',
    },
    padding: {
      sm: `0 ${spacing[3]}`,
      md: `0 ${spacing[4]}`,
      lg: `0 ${spacing[6]}`,
      xl: `0 ${spacing[8]}`,
    },
  },

  // Input fields
  input: {
    height: {
      sm: '36px',
      md: '44px',
      lg: '52px',
    },
    padding: `0 ${spacing[4]}`,
  },

  // Cards
  card: {
    padding: {
      sm: spacing[3],
      md: spacing[4],
      lg: spacing[6],
    },
  },

  // Avatar sizes
  avatar: {
    xs: '24px',
    sm: '32px',
    md: '40px',
    lg: '56px',
    xl: '80px',
    xxl: '120px',
  },

  // Badge sizes
  badge: {
    height: {
      sm: '20px',
      md: '24px',
      lg: '28px',
    },
  },

  // Navigation
  nav: {
    height: '56px',
    heightMobile: '64px',
  },

  // Bottom bar (mobile)
  bottomBar: {
    height: '72px',
    safeArea: 'env(safe-area-inset-bottom, 0px)',
  },
};

// ============================================
// STYLE HELPERS - Common style patterns
// ============================================
export const styleHelpers = {
  // Flexbox shortcuts
  flexCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexBetween: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flexStart: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  flexColumn: {
    display: 'flex',
    flexDirection: 'column',
  },

  // Text truncation
  truncate: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  // Line clamp
  lineClamp: (lines) => ({
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  }),

  // Absolute fill
  absoluteFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Visual hidden (accessible)
  visuallyHidden: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  },

  // Glass effect
  glass: {
    background: 'rgba(28, 28, 31, 0.8)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  },

  // No scrollbar
  hideScrollbar: {
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    '&::-webkit-scrollbar': {
      display: 'none',
    },
  },
};

// Export all as default for convenient importing
export default {
  breakpoints,
  media,
  colors,
  gradients,
  shadows,
  borderRadius,
  spacing,
  typography,
  transitions,
  zIndex,
  animations,
  layout,
  components,
  styleHelpers,
};
