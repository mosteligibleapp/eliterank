/**
 * UserRewardsPage - User rewards view wrapper
 * 
 * Displays the user's rewards and achievements.
 */

import React, { useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '../hooks';
import { DEFAULT_HOST_PROFILE } from '../constants';
import LoadingScreen from '../components/common/LoadingScreen';

const RewardsPage = lazy(() => import('../features/profile/RewardsPage'));

export default function UserRewardsPage() {
  const navigate = useNavigate();
  const { user, profile } = useSupabaseAuth();

  // Convert database profile to UI format
  const hostProfile = useMemo(() => {
    if (!profile) return DEFAULT_HOST_PROFILE;

    return {
      id: profile.id,
      email: user?.email || '',
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      bio: profile.bio || '',
      city: profile.city || '',
      instagram: profile.instagram || '',
      twitter: profile.twitter || '',
      linkedin: profile.linkedin || '',
      tiktok: profile.tiktok || '',
      hobbies: Array.isArray(profile.interests) ? profile.interests : [],
      avatarUrl: profile.avatar_url || '',
      coverImage: profile.cover_image || '',
      gallery: Array.isArray(profile.gallery) ? profile.gallery : [],
      wins: profile.wins || 0,
      total_competitions: profile.total_competitions || 0,
    };
  }, [profile, user?.email]);

  const handleBack = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        overflow: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
          <button
            onClick={handleBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            ← Back to Competitions
          </button>
        </div>
        <Suspense fallback={<LoadingScreen message="Loading rewards..." />}>
          <RewardsPage hostProfile={hostProfile} />
        </Suspense>
      </div>
    </div>
  );
}
