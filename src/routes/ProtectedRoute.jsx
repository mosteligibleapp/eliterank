/**
 * ProtectedRoute - Auth guard wrapper for routes requiring authentication
 * 
 * Features:
 * - Redirects unauthenticated users to login
 * - Supports role-based access control
 * - Shows loading state while auth is initializing
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, useUserRole, ROLES } from '../stores';

// Re-export ROLES as ROLE for backwards compatibility
export const ROLE = ROLES;

/**
 * Get user role from profile
 * @deprecated Use useUserRole() hook from stores instead
 */
export function getUserRole(profile) {
  if (!profile) return ROLES.FAN;
  if (profile.is_super_admin) return ROLES.SUPER_ADMIN;
  if (profile.is_host) return ROLES.HOST;
  return ROLES.FAN;
}

/**
 * Empty bg div for auth check (fast from Zustand, no spinner flash)
 */
function AuthLoadingScreen() {
  return <div style={{ minHeight: '100vh', background: '#0a0a0c' }} />;
}

/**
 * ProtectedRoute component
 * 
 * @param {React.ReactNode} children - Content to render if authorized
 * @param {string[]} allowedRoles - Array of roles that can access this route
 * @param {string} redirectTo - Where to redirect if unauthorized (default: /login)
 */
export default function ProtectedRoute({
  children,
  allowedRoles = [],
  redirectTo = '/login'
}) {
  // Use Zustand stores for auth state
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isLoading = useAuthStore(s => s.isLoading);
  const userRole = useUserRole();
  const location = useLocation();

  // Still loading auth state
  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  // Not authenticated - redirect to login with return URL
  if (!isAuthenticated) {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnTo=${returnUrl}`} replace />;
  }

  // Check role-based access if roles specified
  if (allowedRoles.length > 0) {
    if (!allowedRoles.includes(userRole)) {
      // User doesn't have required role - redirect to home
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
