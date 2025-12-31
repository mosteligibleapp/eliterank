import { useState, useEffect, useCallback } from 'react';
import { breakpoints } from '../styles/theme';

/**
 * Hook for responsive design - detects current screen size
 * Returns boolean flags and current breakpoint name
 */
export function useResponsive() {
  const getBreakpoint = useCallback(() => {
    if (typeof window === 'undefined') return 'md';

    const width = window.innerWidth;
    if (width < breakpoints.sm) return 'xs';
    if (width < breakpoints.md) return 'sm';
    if (width < breakpoints.lg) return 'md';
    if (width < breakpoints.xl) return 'lg';
    if (width < breakpoints.xxl) return 'xl';
    return 'xxl';
  }, []);

  const [state, setState] = useState(() => {
    const bp = getBreakpoint();
    return {
      breakpoint: bp,
      isMobile: bp === 'xs' || bp === 'sm',
      isTablet: bp === 'md',
      isDesktop: bp === 'lg' || bp === 'xl' || bp === 'xxl',
      isSmall: bp === 'xs' || bp === 'sm' || bp === 'md',
      isLarge: bp === 'lg' || bp === 'xl' || bp === 'xxl',
      width: typeof window !== 'undefined' ? window.innerWidth : 1024,
      height: typeof window !== 'undefined' ? window.innerHeight : 768,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const bp = getBreakpoint();
      setState({
        breakpoint: bp,
        isMobile: bp === 'xs' || bp === 'sm',
        isTablet: bp === 'md',
        isDesktop: bp === 'lg' || bp === 'xl' || bp === 'xxl',
        isSmall: bp === 'xs' || bp === 'sm' || bp === 'md',
        isLarge: bp === 'lg' || bp === 'xl' || bp === 'xxl',
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener('resize', handleResize);
  }, [getBreakpoint]);

  return state;
}

/**
 * Hook for safe area insets (iOS notch, etc.)
 */
export function useSafeArea() {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    const computeSafeArea = () => {
      const style = getComputedStyle(document.documentElement);
      setSafeArea({
        top: parseInt(style.getPropertyValue('--sat') || '0', 10),
        right: parseInt(style.getPropertyValue('--sar') || '0', 10),
        bottom: parseInt(style.getPropertyValue('--sab') || '0', 10),
        left: parseInt(style.getPropertyValue('--sal') || '0', 10),
      });
    };

    // Set CSS variables for safe area
    document.documentElement.style.setProperty('--sat', 'env(safe-area-inset-top)');
    document.documentElement.style.setProperty('--sar', 'env(safe-area-inset-right)');
    document.documentElement.style.setProperty('--sab', 'env(safe-area-inset-bottom)');
    document.documentElement.style.setProperty('--sal', 'env(safe-area-inset-left)');

    computeSafeArea();
    window.addEventListener('resize', computeSafeArea);

    return () => window.removeEventListener('resize', computeSafeArea);
  }, []);

  return safeArea;
}

export default useResponsive;
