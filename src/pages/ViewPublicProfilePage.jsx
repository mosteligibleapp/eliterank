/**
 * ViewPublicProfilePage - View another user's public profile
 *
 * Handles the /profile/:profileId route for viewing other users.
 */

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getCompetitionUrl, getCompetitionUrlById } from '../utils/slugs';
import { PageHeader } from '../components/ui';
import ProfileSkeleton from '../components/skeletons/ProfileSkeleton';

const ProfilePage = lazy(() => import('../features/profile/ProfilePage'));

export default function ViewPublicProfilePage() {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backUrl, setBackUrl] = useState('/');
  const [contestantId, setContestantId] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!profileId || !supabase) {
        setError('Invalid profile');
        setLoading(false);
        return;
      }

      try {
        // Fetch profile and their most recent competition entry in parallel
        const [profileResult, contestantResult, nomineeResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('*')
            .eq('id', profileId)
            .maybeSingle(),
          supabase
            .from('contestants')
            .select('id, competition_id, competition:competitions(id, slug, organization:organizations(slug))')
            .eq('user_id', profileId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('nominees')
            .select('competition_id, competition:competitions(id, slug, organization:organizations(slug))')
            .eq('user_id', profileId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (profileResult.error) throw profileResult.error;

        if (profileResult.data) {
          setProfileData({
            id: profileResult.data.id,
            firstName: profileResult.data.first_name || '',
            lastName: profileResult.data.last_name || '',
            headline: profileResult.data.headline || '',
            bio: profileResult.data.bio || '',
            city: profileResult.data.city || '',
            instagram: profileResult.data.instagram || '',
            twitter: profileResult.data.twitter || '',
            linkedin: profileResult.data.linkedin || '',
            tiktok: profileResult.data.tiktok || '',
            hobbies: Array.isArray(profileResult.data.interests) ? profileResult.data.interests : [],
            avatarUrl: profileResult.data.avatar_url || '',
            coverImage: profileResult.data.cover_image || '',
            gallery: Array.isArray(profileResult.data.gallery) ? profileResult.data.gallery : [],
            introVideoUrl: profileResult.data.intro_video_url || '',
            email: profileResult.data.email || '',
          });

          // Store contestant ID for fan button
          if (contestantResult?.data?.id) {
            setContestantId(contestantResult.data.id);
          }

          // Build back URL from their competition (prefer contestant, fallback to nominee)
          const comp = contestantResult?.data?.competition || nomineeResult?.data?.competition;
          if (comp) {
            const orgSlug = comp.organization?.slug || 'most-eligible';
            if (comp.slug) {
              setBackUrl(getCompetitionUrl(orgSlug, comp.slug));
            } else if (comp.id) {
              setBackUrl(getCompetitionUrlById(orgSlug, comp.id));
            }
          }
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
    // location.key is 'default' when this is the first entry in the React
    // Router session (direct link, shared URL, notification). In that case,
    // navigate(-1) would exit the app, so route to the competition instead.
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      navigate(backUrl);
    }
  }, [navigate, backUrl, location.key]);

  const displayName = profileData
    ? `${profileData.firstName} ${profileData.lastName}`.trim() || 'Profile'
    : 'Profile';

  if (loading) {
    return <ProfileSkeleton />;
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
      <PageHeader title="View Competition" onBack={handleBack} />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <Suspense fallback={<ProfileSkeleton />}>
          <ProfilePage
            hostProfile={profileData}
            isEditing={false}
            contestantId={contestantId}
          />
        </Suspense>
      </div>
    </div>
  );
}
