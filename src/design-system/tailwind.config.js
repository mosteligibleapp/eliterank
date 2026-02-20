/**
 * EliteRank Tailwind Configuration
 * 
 * Merge this into your root tailwind.config.js:
 * 
 * import designSystemConfig from './src/design-system/tailwind.config';
 * export default {
 *   ...designSystemConfig,
 *   content: [...],
 * };
 */

import { tokens } from './tokens';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  theme: {
    extend: {
      // Colors
      colors: {
        // Gold palette
        gold: {
          50: tokens.colors.gold[50],
          100: tokens.colors.gold[100],
          200: tokens.colors.gold[200],
          300: tokens.colors.gold[300],
          400: tokens.colors.gold[400],
          500: tokens.colors.gold[500],
          600: tokens.colors.gold[600],
          700: tokens.colors.gold[700],
          800: tokens.colors.gold[800],
          900: tokens.colors.gold[900],
          950: tokens.colors.gold[950],
          DEFAULT: tokens.colors.gold.DEFAULT,
        },
        
        // Background colors
        bg: {
          primary: tokens.colors.bg.primary,
          secondary: tokens.colors.bg.secondary,
          card: tokens.colors.bg.card,
          elevated: tokens.colors.bg.elevated,
          hover: tokens.colors.bg.hover,
        },
        
        // Semantic text colors
        'text-primary': tokens.colors.text.primary,
        'text-secondary': tokens.colors.text.secondary,
        'text-muted': tokens.colors.text.muted,
        'text-disabled': tokens.colors.text.disabled,
        
        // Status colors
        success: {
          light: tokens.colors.success.light,
          DEFAULT: tokens.colors.success.DEFAULT,
          dark: tokens.colors.success.dark,
        },
        warning: {
          light: tokens.colors.warning.light,
          DEFAULT: tokens.colors.warning.DEFAULT,
          dark: tokens.colors.warning.dark,
        },
        error: {
          light: tokens.colors.error.light,
          DEFAULT: tokens.colors.error.DEFAULT,
          dark: tokens.colors.error.dark,
        },
        info: {
          light: tokens.colors.info.light,
          DEFAULT: tokens.colors.info.DEFAULT,
          dark: tokens.colors.info.dark,
        },
        
        // Accent colors
        accent: {
          pink: tokens.colors.accent.pink,
          purple: tokens.colors.accent.purple,
          cyan: tokens.colors.accent.cyan,
        },
        
        // Border colors
        border: {
          subtle: tokens.colors.border.subtle,
          DEFAULT: tokens.colors.border.DEFAULT,
          strong: tokens.colors.border.strong,
          gold: tokens.colors.border.gold,
          'gold-strong': tokens.colors.border.goldStrong,
        },
        
        // Overlay
        overlay: {
          light: tokens.colors.overlay.light,
          medium: tokens.colors.overlay.medium,
          heavy: tokens.colors.overlay.heavy,
        },
      },
      
      // Typography
      fontFamily: {
        display: tokens.typography.fontFamily.display,
        body: tokens.typography.fontFamily.body,
        mono: tokens.typography.fontFamily.mono,
      },
      
      fontSize: {
        xs: tokens.typography.fontSize.xs,
        sm: tokens.typography.fontSize.sm,
        base: tokens.typography.fontSize.base,
        lg: tokens.typography.fontSize.lg,
        xl: tokens.typography.fontSize.xl,
        '2xl': tokens.typography.fontSize['2xl'],
        '3xl': tokens.typography.fontSize['3xl'],
        '4xl': tokens.typography.fontSize['4xl'],
        '5xl': tokens.typography.fontSize['5xl'],
        '6xl': tokens.typography.fontSize['6xl'],
        '7xl': tokens.typography.fontSize['7xl'],
      },
      
      fontWeight: tokens.typography.fontWeight,
      
      // Spacing
      spacing: {
        'page-x': tokens.spacing.page.x,
        'page-x-md': tokens.spacing.page.xMd,
        'page-x-lg': tokens.spacing.page.xLg,
        'section': tokens.spacing.section.DEFAULT,
        'section-sm': tokens.spacing.section.sm,
        'section-lg': tokens.spacing.section.lg,
        'card': tokens.spacing.card.DEFAULT,
        'card-sm': tokens.spacing.card.sm,
        'card-lg': tokens.spacing.card.lg,
      },
      
      // Border radius
      borderRadius: {
        xs: tokens.borderRadius.xs,
        sm: tokens.borderRadius.sm,
        DEFAULT: tokens.borderRadius.DEFAULT,
        md: tokens.borderRadius.md,
        lg: tokens.borderRadius.lg,
        xl: tokens.borderRadius.xl,
        '2xl': tokens.borderRadius['2xl'],
        '3xl': tokens.borderRadius['3xl'],
      },
      
      // Shadows
      boxShadow: {
        xs: tokens.shadows.xs,
        sm: tokens.shadows.sm,
        DEFAULT: tokens.shadows.DEFAULT,
        md: tokens.shadows.md,
        lg: tokens.shadows.lg,
        xl: tokens.shadows.xl,
        'glow-gold': tokens.shadows.glow.gold,
        'glow-gold-strong': tokens.shadows.glow.goldStrong,
        'glow-pink': tokens.shadows.glow.pink,
        'glow-purple': tokens.shadows.glow.purple,
        'glow-cyan': tokens.shadows.glow.cyan,
        'glow-success': tokens.shadows.glow.success,
        'glow-error': tokens.shadows.glow.error,
        inner: tokens.shadows.inner.DEFAULT,
        'inner-lg': tokens.shadows.inner.lg,
      },
      
      // Animation
      transitionDuration: {
        fast: tokens.animation.duration.fast,
        DEFAULT: tokens.animation.duration.DEFAULT,
        slow: tokens.animation.duration.slow,
        slower: tokens.animation.duration.slower,
        slowest: tokens.animation.duration.slowest,
      },
      
      transitionTimingFunction: {
        DEFAULT: tokens.animation.easing.DEFAULT,
        'ease-in': tokens.animation.easing.in,
        'ease-out': tokens.animation.easing.out,
        'ease-in-out': tokens.animation.easing.inOut,
        bounce: tokens.animation.easing.bounce,
        spring: tokens.animation.easing.spring,
      },
      
      // Keyframes
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeOut: {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        slideUp: {
          from: { transform: 'translateY(16px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          from: { transform: 'translateY(-16px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          from: { transform: 'translateX(-100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10%)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        countUp: {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
      
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'fade-out': 'fadeOut 150ms ease-in',
        'slide-up': 'slideUp 300ms ease-out',
        'slide-down': 'slideDown 300ms ease-out',
        'slide-in-right': 'slideInRight 300ms ease-out',
        'slide-in-left': 'slideInLeft 300ms ease-out',
        'scale-in': 'scaleIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        pulse: 'pulse 2s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        bounce: 'bounce 1s ease-in-out infinite',
        wiggle: 'wiggle 200ms ease-in-out',
        'count-up': 'countUp 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      
      // Z-index
      zIndex: {
        behind: '-1',
        base: '0',
        raised: '10',
        dropdown: '100',
        sticky: '200',
        overlay: '300',
        modal: '400',
        popover: '500',
        toast: '600',
        tooltip: '700',
        max: '9999',
      },
      
      // Backgrounds for gradients
      backgroundImage: {
        'gradient-gold': tokens.gradients.gold,
        'gradient-gold-subtle': tokens.gradients.goldSubtle,
        'gradient-gold-shine': tokens.gradients.goldShine,
        'gradient-dark': tokens.gradients.dark,
        'gradient-glass': tokens.gradients.glass,
        'gradient-pink-purple': tokens.gradients.pinkPurple,
        'gradient-cyan-blue': tokens.gradients.cyanBlue,
      },
    },
  },
  
  plugins: [
    // Custom utilities plugin
    function({ addUtilities, addComponents, theme }) {
      // Add custom utilities
      addUtilities({
        // Text gradient
        '.text-gradient-gold': {
          background: tokens.gradients.gold,
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        
        // Glass effect
        '.glass': {
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
          '-webkit-backdrop-filter': 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
        
        '.glass-strong': {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          '-webkit-backdrop-filter': 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        },
        
        // Gold glow on hover
        '.hover-glow-gold': {
          transition: 'box-shadow 200ms ease',
          '&:hover': {
            boxShadow: tokens.shadows.glow.gold,
          },
        },
        
        // Safe area insets for mobile
        '.safe-bottom': {
          paddingBottom: 'env(safe-area-inset-bottom)',
        },
        
        '.safe-top': {
          paddingTop: 'env(safe-area-inset-top)',
        },
        
        // Hide scrollbar
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        
        // Touch callout disable (for iOS)
        '.touch-none': {
          '-webkit-touch-callout': 'none',
          '-webkit-user-select': 'none',
          'user-select': 'none',
        },
      });
      
      // Add component classes
      addComponents({
        // Page container
        '.container-page': {
          width: '100%',
          marginLeft: 'auto',
          marginRight: 'auto',
          paddingLeft: tokens.spacing.page.x,
          paddingRight: tokens.spacing.page.x,
          '@screen md': {
            paddingLeft: tokens.spacing.page.xMd,
            paddingRight: tokens.spacing.page.xMd,
          },
          '@screen lg': {
            paddingLeft: tokens.spacing.page.xLg,
            paddingRight: tokens.spacing.page.xLg,
            maxWidth: '1280px',
          },
        },
        
        // Focus ring
        '.focus-ring': {
          '&:focus': {
            outline: 'none',
            boxShadow: `0 0 0 2px ${tokens.colors.bg.primary}, 0 0 0 4px ${tokens.colors.gold.DEFAULT}`,
          },
          '&:focus:not(:focus-visible)': {
            boxShadow: 'none',
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: `0 0 0 2px ${tokens.colors.bg.primary}, 0 0 0 4px ${tokens.colors.gold.DEFAULT}`,
          },
        },
        
        // Interactive card base
        '.card-interactive': {
          transition: 'transform 200ms ease, box-shadow 200ms ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: tokens.shadows.md,
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
      });
    },
  ],
};
