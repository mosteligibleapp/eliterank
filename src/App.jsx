/**
 * EliteRank Dashboard - Main Application
 *
 * This is the main entry point for the EliteRank competition platform.
 * 
 * Architecture:
 * - Declarative routing via React Router
 * - Auth state managed by AppShell
 * - Lazy loading for performance optimization
 * - Error boundaries for resilient error handling
 * 
 * The actual routing logic has been moved to src/routes/index.jsx
 * Page components are in src/pages/
 * Common shell concerns (auth, modals) are in src/components/layout/AppShell.jsx
 */

import React from 'react';
import AppShell from './components/layout/AppShell';
import AppRoutes from './routes';

/**
 * App Component
 * 
 * The root component that sets up:
 * 1. AppShell - handles auth state, modals, error boundaries
 * 2. AppRoutes - declarative routing configuration
 * 
 * Note: BrowserRouter and context providers (Toast, Notification) 
 * are set up in main.jsx
 */
export default function App() {
  return (
    <AppShell>
      <AppRoutes />
    </AppShell>
  );
}
