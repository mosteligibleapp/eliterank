/**
 * UserProfilePage - User profile view/edit wrapper
 * 
 * Handles viewing and editing the current user's profile.
 * Can also display public profiles when viewing other users.
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSupabaseAuth } from '../hooks';
import { supabase } from '../lib/supabase';
import { DEFAULT_HOST_PROFILE } from '../constants';
import { ROLE, getUserRole } from '../routes/ProtectedRoute';
import { PageHeader } from '../components/ui';
import ProfileSkeleton from '../components/skeletons/ProfileSkeleton';

const ProfilePage = lazy(() => import('../features/profile/ProfilePage'));

export default function UserProfilePage() {
  const { user, profile, updateProfile } = useSupabaseAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const userRole = useMemo(() => getUserRole(profile), [profile]);

  // Profile editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState(null);

  // Fetch contestant ID for fan display
  const [contestantId, setContestantId] = useState(null);
  useEffect(() => {
    if (!user?.id || !supabase) return;
    supabase
      .from('contestants')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.id) setContestantId(data.id);
      });
  }, [user?.id]);

  // Convert database profile to UI format
  const hostProfile = useMemo(() => {
    if (!profile) return DEFAULT_HOST_PROFILE;

    return {
      id: profile.id,
      email: user?.email || '',
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      headline: profile.headline || '',
      bio: profile.bio || '',
      city: profile.city || '',
      instagram: profile.instagram || '',
      twitter: profile.twitter || '',
      linkedin: profile.linkedin || '',
      tiktok: profile.tiktok || '',
      website: profile.website || '',
      hobbies: Array.isArray(profile.interests) ? profile.interests : [],
      avatarUrl: profile.avatar_url || '',
      coverImage: profile.cover_image || '',
      gallery: Array.isArray(profile.gallery) ? profile.gallery : [],
      wins: profile.wins || 0,
      total_competitions: profile.total_competitions || 0,
    };
  }, [profile, user?.email]);

  const handleEdit = useCallback(() => {
    setEditingData({ ...hostProfile });
    setIsEditing(true);
  }, [hostProfile]);

  const handleSave = useCallback(async () => {
    if (!editingData) return;

    try {
      // Convert UI format to database format
      const dbUpdates = {
        first_name: editingData.firstName,
        last_name: editingData.lastName,
        headline: editingData.headline,
        bio: editingData.bio,
        city: editingData.city,
        instagram: editingData.instagram,
        twitter: editingData.twitter,
        linkedin: editingData.linkedin,
        tiktok: editingData.tiktok,
        website: editingData.website,
        interests: editingData.hobbies,
        avatar_url: editingData.avatarUrl,
        cover_image: editingData.coverImage,
        gallery: editingData.gallery,
      };

      // Remove undefined values
      Object.keys(dbUpdates).forEach((key) => {
        if (dbUpdates[key] === undefined) delete dbUpdates[key];
      });

      const result = await updateProfile(dbUpdates);

      if (result?.error) {
        alert(`Failed to save profile: ${result.error}`);
        return;
      }

      setIsEditing(false);
      setEditingData(null);
    } catch {
      alert('Failed to save profile. Please try again.');
    }
  }, [editingData, updateProfile]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditingData(null);
  }, []);

  const handleChange = useCallback((updates) => {
    setEditingData(updates);
  }, []);

  // Auto-enter edit mode when ?edit=true is in the URL
  useEffect(() => {
    if (searchParams.get('edit') === 'true' && profile && !isEditing) {
      handleEdit();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, profile, isEditing, handleEdit, setSearchParams]);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', overflow: 'auto' }}>
      <PageHeader title="" />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
        <Suspense fallback={<ProfileSkeleton />}>
          <ProfilePage
            hostProfile={isEditing ? editingData : hostProfile}
            isEditing={isEditing}
            onEdit={handleEdit}
            onSave={handleSave}
            onCancel={handleCancel}
            onChange={handleChange}
            hostCompetition={null}
            userRole={userRole}
            isHost={userRole === ROLE.HOST}
            contestantId={contestantId}
          />
        </Suspense>
      </div>
    </div>
  );
}
