/**
 * CompetitionRoutes - Competition-specific route handling
 * 
 * Handles all /c/ and /:orgSlug/:slug competition routes.
 * Uses the existing CompetitionLayout for rendering.
 */

import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { CompetitionPageSkeleton } from '../components/ui/Skeleton';
import ErrorBoundary from '../components/common/ErrorBoundary';

const CompetitionLayout = lazy(() => import('../pages/competition/CompetitionLayout'));

/**
 * CompetitionRoutes Component
 * 
 * Renders routes for competition pages with proper error handling and loading states.
 */
export default function CompetitionRoutes() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<CompetitionPageSkeleton />}>
        <Routes>
          {/* ID-based lookup: /:orgSlug/id/:competitionId - most reliable */}
          <Route path="/:orgSlug/id/:competitionId/*" element={<CompetitionLayout />} />
          
          {/* New format: /:orgSlug/:slug/* */}
          <Route path="/:orgSlug/:slug/*" element={<CompetitionLayout />} />
          
          {/* Legacy format: /c/:orgSlug/:citySlug/:year/* */}
          <Route path="/c/:orgSlug/:citySlug/:year/*" element={<CompetitionLayout />} />
          <Route path="/c/:orgSlug/:citySlug/*" element={<CompetitionLayout />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
