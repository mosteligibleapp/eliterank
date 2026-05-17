/**
 * Sentry Error Tracking (stubbed)
 * 
 * To enable Sentry:
 * 1. Run: npm install @sentry/react
 * 2. Add VITE_SENTRY_DSN to your .env
 * 3. Uncomment the implementation below
 */

export function initSentry() {
  // No-op: @sentry/react not installed
  // To enable, install the package and configure VITE_SENTRY_DSN
}

export const Sentry = {
  // Stub methods to prevent runtime errors if Sentry is referenced
  captureException: () => {},
  captureMessage: () => {},
  setUser: () => {},
  setTag: () => {},
  setContext: () => {},
};
