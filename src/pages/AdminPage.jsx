/**
 * AdminPage - Super Admin dashboard wrapper
 * 
 * Wraps the SuperAdminPage feature component and provides logout functionality.
 */

import React, { lazy, Suspense, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores';
import LoadingScreen from '../components/common/LoadingScreen';

const SuperAdminPage = lazy(() => import('../features/super-admin/SuperAdminPage'));

export default function AdminPage() {
  const navigate = useNavigate();
  const signOut = useAuthStore(s => s.signOut);

  const handleLogout = useCallback(async () => {
    await signOut();
    navigate('/');
  }, [signOut, navigate]);

  return (
    <Suspense fallback={<LoadingScreen message="Loading admin dashboard..." />}>
      <SuperAdminPage onLogout={handleLogout} />
    </Suspense>
  );
}
