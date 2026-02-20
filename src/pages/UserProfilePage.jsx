/**
 * UserProfilePage - User profile view/edit wrapper
 * 
 * Handles viewing and editing the current user's profile.
 * Can also display public profiles when viewing other users.
 */

import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSupabaseAuth } from '../hooks';
import { DEFAULT_HOST_PROFILE } from '../constants';
import { ROLE, getUserRole } from '../routes/ProtectedRoute';
import LoadingScreen from '../components/common/LoadingScreen';

const ProfilePage = lazy(() => import('../features/profile/ProfilePage'));

export default function UserProfilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, updateProfile } = useSupabaseAuth();
  
  const userRole = useMemo(() => getUserRole(profile), [profile]);

  // Profile editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState(null);

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
        bio: editingData.bio,
        city: editingData.city,
        instagram: editingData.instagram,
        twitter: editingData.twitter,
        linkedin: editingData.linkedin,
        tiktok: editingData.tiktok,
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
        <Suspense fallback={<LoadingScreen message="Loading profile..." />}>
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
          />
        </Suspense>
      </div>
    </div>
  );
}
