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
 * Loading screen for auth check
 */
function AuthLoadingScreen() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
        color: '#d4af37',
        fontSize: '1.25rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            margin: '0 auto 16px',
            border: '3px solid rgba(212, 175, 55, 0.2)',
            borderTopColor: '#d4af37',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        Checking authentication...
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}

/**
 * ProtectedRoute component
 * 
 * @param {React.ReactNode} children - Content to render if authorized
 * @param {string[]} allowedRoles - Array of roles that can access this route
 * @param {string} redirectTo - Where to redirect if unauthorized (default: /?login=true)
 */
export default function ProtectedRoute({ 
  children, 
  allowedRoles = [], 
  redirectTo = '/?login=true' 
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
    return <Navigate to={`/?login=true&returnTo=${returnUrl}`} replace />;
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
