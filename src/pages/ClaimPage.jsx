/**
 * ClaimPage - Nomination claim flow wrapper
 * 
 * Handles the /claim/:token route for claiming nominations.
 * The actual logic is in ClaimNominationPage feature component.
 */

import React, { lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LoadingScreen from '../components/common/LoadingScreen';

const ClaimNominationPage = lazy(() => import('../features/public-site/pages/ClaimNominationPage'));

export default function ClaimPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const handleClose = () => {
    navigate('/', { replace: true });
  };

  const handleSuccess = () => {
    navigate('/', { replace: true });
  };

  if (!token) {
    navigate('/', { replace: true });
    return null;
  }

  return (
    <Suspense fallback={<LoadingScreen message="Loading nomination..." />}>
      <ClaimNominationPage
        token={token}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </Suspense>
  );
}
