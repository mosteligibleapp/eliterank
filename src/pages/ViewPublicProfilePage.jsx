/**
 * ViewPublicProfilePage - View another user's public profile
 *
 * Handles the /profile/:profileId route for viewing other users.
 */

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PageHeader } from '../components/ui';
import LoadingScreen from '../components/common/LoadingScreen';

const ProfilePage = lazy(() => import('../features/profile/ProfilePage'));

export default function ViewPublicProfilePage() {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!profileId || !supabase) {
        setError('Invalid profile');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profileId)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (data) {
          setProfileData({
            id: data.id,
            firstName: data.first_name || '',
            lastName: data.last_name || '',
            bio: data.bio || '',
            city: data.city || '',
            instagram: data.instagram || '',
            twitter: data.twitter || '',
            linkedin: data.linkedin || '',
            tiktok: data.tiktok || '',
            hobbies: Array.isArray(data.interests) ? data.interests : [],
            avatarUrl: data.avatar_url || '',
            coverImage: data.cover_image || '',
            gallery: Array.isArray(data.gallery) ? data.gallery : [],
            email: data.email || '',
          });
        } else {
          setError('This profile is not available. You may need to log in to view it.');
        }
      } catch (err) {
        setError(err.message || 'Failed to load profile');
      }
      setLoading(false);
    };

    fetchProfile();
  }, [profileId]);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const displayName = profileData
    ? `${profileData.firstName} ${profileData.lastName}`.trim() || 'Profile'
    : 'Profile';

  if (loading) {
    return <LoadingScreen message="Loading profile..." />;
  }

  if (error || !profileData) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
        <PageHeader title="Profile" onBack={handleBack} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            padding: '4rem 2rem',
            textAlign: 'center',
          }}
        >
          <h1 style={{ color: '#d4af37', marginBottom: '0.75rem', fontSize: '1.5rem' }}>
            Profile Not Found
          </h1>
          <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>
            {error || 'The requested profile could not be found.'}
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => navigate(`/login?returnTo=${encodeURIComponent(`/profile/${profileId}`)}`)}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #d4af37, #f4d03f)',
                color: '#0a0a0f',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Log In to View
            </button>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'transparent',
                color: '#9ca3af',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', overflow: 'auto' }}>
      <PageHeader title={displayName} onBack={handleBack} />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <Suspense fallback={<LoadingScreen message="Loading profile..." />}>
          <ProfilePage
            hostProfile={profileData}
            isEditing={false}
          />
        </Suspense>
      </div>
    </div>
  );
}
