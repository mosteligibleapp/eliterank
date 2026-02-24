/**
 * UserRewardsPage - User rewards view wrapper
 * 
 * Displays the user's rewards and achievements.
 */

import React, { useMemo, lazy, Suspense } from 'react';
import { useSupabaseAuth } from '../hooks';
import { DEFAULT_HOST_PROFILE } from '../constants';
import { PageHeader } from '../components/ui';
import LoadingScreen from '../components/common/LoadingScreen';

const RewardsPage = lazy(() => import('../features/profile/RewardsPage'));

export default function UserRewardsPage() {
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

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', overflowX: 'hidden' }}>
      <PageHeader title="Rewards" />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
        <Suspense fallback={<LoadingScreen message="Loading rewards..." />}>
          <RewardsPage hostProfile={hostProfile} />
        </Suspense>
      </div>
    </div>
  );
}
