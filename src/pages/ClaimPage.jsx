/**
 * ClaimPage - Nomination claim flow wrapper
 * 
 * Handles the /claim/:token route for claiming nominations.
 * The actual logic is in ClaimNominationPage feature component.
 */

import React, { lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Skeleton, SkeletonCircle, SkeletonText } from '../components/ui/Skeleton';

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
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)' }}>
        <div style={{ width: 420, maxWidth: '90%', textAlign: 'center' }}>
          <SkeletonCircle size={72} style={{ margin: '0 auto 20px' }} />
          <Skeleton width="70%" height={24} borderRadius={6} style={{ margin: '0 auto 12px' }} />
          <SkeletonText lines={2} lineHeight={14} gap={8} style={{ marginBottom: 24 }} />
          <Skeleton width="100%" height={44} borderRadius={12} />
        </div>
      </div>
    }>
      <ClaimNominationPage
        token={token}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </Suspense>
  );
}
