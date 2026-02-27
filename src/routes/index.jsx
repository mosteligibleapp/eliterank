/**
 * Routes Configuration
 * 
 * Main route definitions for the EliteRank application.
 * Uses React Router v6 declarative routing.
 */

import React, { lazy, Suspense, useCallback } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';

// Route guards and utilities
import ProtectedRoute, { ROLE } from './ProtectedRoute';
import { isCompetitionSlug, isIdRoute, isReservedPath } from '../utils/slugs';

// Common components
import LoadingScreen from '../components/common/LoadingScreen';
import ErrorBoundary from '../components/common/ErrorBoundary';

// Lazy-loaded pages
const HomePage = lazy(() => import('../pages/HomePage'));
const LoginPageWrapper = lazy(() => import('../pages/LoginPageWrapper'));
const ResetPasswordPage = lazy(() => import('../features/auth/ResetPasswordPage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const ClaimPage = lazy(() => import('../pages/ClaimPage'));
const UserProfilePage = lazy(() => import('../pages/UserProfilePage'));
const UserRewardsPage = lazy(() => import('../pages/UserRewardsPage'));
const ViewPublicProfilePage = lazy(() => import('../pages/ViewPublicProfilePage'));
const AdminPage = lazy(() => import('../pages/AdminPage'));
const AchievementsPage = lazy(() => import('../pages/AchievementsPage'));
const CompetitionLayout = lazy(() => import('../pages/competition/CompetitionLayout'));

/**
 * Suspense wrapper with consistent loading screen
 */
function SuspenseWrapper({ children, message = 'Loading...' }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen message={message} />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * AppRoutes Component
 * 
 * Main routing configuration. This component should be wrapped in AppShell
 * which handles auth state and common modals.
 */
export default function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();

  // Check for password reset flow
  // Supabase sends users to: your-site.com/reset-password#access_token=xxx&type=recovery
  // Also support legacy format: your-site.com?reset=true#...
  const searchParams = new URLSearchParams(location.search);
  const isResetFlow = location.pathname === '/reset-password' ||
    searchParams.get('reset') === 'true' ||
    location.hash.includes('type=recovery');

  // Check if this is a competition route
  const pathParts = location.pathname.split('/').filter(Boolean);
  const isCompetitionRoute =
    pathParts.length >= 2 &&
    !isReservedPath(pathParts[0]) &&
    (isIdRoute(pathParts[1]) || isCompetitionSlug(pathParts[1]));
  const isLegacyCompetitionRoute = pathParts[0] === 'c' && pathParts.length >= 2;

  // Handlers for HomePage
  const handleShowLogin = useCallback(() => {
    navigate('/login');
  }, [navigate]);

  const handleShowProfile = useCallback(() => {
    navigate('/profile');
  }, [navigate]);

  const handleShowRewards = useCallback(() => {
    navigate('/rewards');
  }, [navigate]);

  const handleShowAchievements = useCallback(() => {
    navigate('/achievements');
  }, [navigate]);

  const handleResetComplete = useCallback(() => {
    // Clear the URL params and navigate to home
    navigate('/', { replace: true });
  }, [navigate]);

  const handleResetBack = useCallback(() => {
    navigate('/login', { replace: true });
  }, [navigate]);

  // Password reset flow - intercept before other routes
  if (isResetFlow) {
    return (
      <SuspenseWrapper message="Loading...">
        <ResetPasswordPage 
          onComplete={handleResetComplete} 
          onBack={handleResetBack} 
        />
      </SuspenseWrapper>
    );
  }

  // Competition routes - handle separately for cleaner organization
  if (isCompetitionRoute || isLegacyCompetitionRoute) {
    return (
      <SuspenseWrapper message="Loading competition...">
        <Routes>
          {/* ID-based lookup: /:orgSlug/id/:competitionId */}
          <Route path="/:orgSlug/id/:competitionId/*" element={<CompetitionLayout />} />
          {/* New format: /:orgSlug/:slug/* */}
          <Route path="/:orgSlug/:slug/*" element={<CompetitionLayout />} />
          {/* Legacy format: /c/:orgSlug/:citySlug/:year/* */}
          <Route path="/c/:orgSlug/:citySlug/:year/*" element={<CompetitionLayout />} />
          <Route path="/c/:orgSlug/:citySlug/*" element={<CompetitionLayout />} />
        </Routes>
      </SuspenseWrapper>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/"
        element={
          <SuspenseWrapper>
            <HomePage
              onShowLogin={handleShowLogin}
              onShowProfile={handleShowProfile}
              onShowRewards={handleShowRewards}
              onShowAchievements={handleShowAchievements}
            />
          </SuspenseWrapper>
        }
      />

      {/* Login page */}
      <Route
        path="/login"
        element={
          <SuspenseWrapper message="Loading login...">
            <LoginPageWrapper />
          </SuspenseWrapper>
        }
      />

      {/* Claim nomination flow */}
      <Route
        path="/claim/:token"
        element={
          <SuspenseWrapper message="Loading nomination...">
            <ClaimPage />
          </SuspenseWrapper>
        }
      />
      <Route
        path="/claim/:token/complete"
        element={
          <SuspenseWrapper message="Loading nomination...">
            <ClaimPage />
          </SuspenseWrapper>
        }
      />

      {/* Protected routes - require authentication */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <SuspenseWrapper message="Loading profile...">
              <UserProfilePage />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/rewards"
        element={
          <ProtectedRoute>
            <SuspenseWrapper message="Loading rewards...">
              <UserRewardsPage />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/achievements"
        element={
          <ProtectedRoute>
            <SuspenseWrapper message="Loading achievements...">
              <AchievementsPage />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      {/* View other user's public profile */}
      <Route
        path="/profile/:profileId"
        element={
          <SuspenseWrapper message="Loading profile...">
            <ViewPublicProfilePage />
          </SuspenseWrapper>
        }
      />

      {/* Host dashboard - requires host role */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={[ROLE.HOST, ROLE.SUPER_ADMIN]}>
            <SuspenseWrapper message="Loading dashboard...">
              <DashboardPage />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      {/* Super admin - requires super_admin role */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={[ROLE.SUPER_ADMIN]}>
            <SuspenseWrapper message="Loading admin dashboard...">
              <AdminPage />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Re-export route utilities
export { ProtectedRoute, ROLE };
