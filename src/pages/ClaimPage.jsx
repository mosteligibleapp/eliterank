/**
 * ClaimPage - Nomination claim flow wrapper
 * 
 * Handles the /claim/:token route for claiming nominations.
 * The actual logic is in ClaimNominationPage feature component.
 */

import React, { lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const ClaimNominationPage = lazy(() => import('../features/public-site/pages/ClaimNominationPage'));

export default function ClaimPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const handleClose = () => {
    navigate('/', { replace: true });
  };

  const handleSuccess = () => {
    navigate('/profile', { replace: true });
  };

  if (!token) {
    navigate('/', { replace: true });
    return null;
  }

  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a0a0c' }} />}>
      <ClaimNominationPage
        token={token}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </Suspense>
  );
}
