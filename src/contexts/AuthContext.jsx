import React, { createContext, useContext, useMemo } from 'react';
import { useSupabaseAuth } from '../hooks';
import { DEFAULT_HOST_PROFILE } from '../constants';

const AuthContext = createContext(null);

// User roles
export const USER_ROLES = {
  HOST: 'host',
  SUPER_ADMIN: 'super_admin',
  CONTESTANT: 'contestant',
  FAN: 'fan',
};

export function AuthProvider({ children }) {
  // Supabase authentication (real auth only)
  const {
    user,
    profile,
    loading: authLoading,
    isAuthenticated,
    signIn,
    signOut,
    signUp,
    updateProfile,
  } = useSupabaseAuth();

  // Check if user is super admin from Supabase profile
  const isSuperAdmin = profile?.is_super_admin === true;

  // Check if user is host
  const isHost = profile?.is_host === true || (profile && !isSuperAdmin);

  // Derive host profile from Supabase profile
  const hostProfile = useMemo(() => {
    if (profile) {
      return {
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        bio: profile.bio || '',
        city: profile.city || '',
        instagram: profile.instagram || '',
        twitter: profile.twitter || '',
        linkedin: profile.linkedin || '',
        tiktok: profile.tiktok || '',
        hobbies: profile.interests || [],
      };
    }
    return DEFAULT_HOST_PROFILE;
  }, [profile]);

  // Full name helper
  const fullName = useMemo(() => {
    if (hostProfile.firstName || hostProfile.lastName) {
      return `${hostProfile.firstName} ${hostProfile.lastName}`.trim();
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  }, [hostProfile, user]);

  // Update profile handler with format conversion
  const handleProfileUpdate = async (updates) => {
    // Convert from UI format to database format
    const dbUpdates = {
      first_name: updates.firstName,
      last_name: updates.lastName,
      bio: updates.bio,
      city: updates.city,
      instagram: updates.instagram,
      twitter: updates.twitter,
      linkedin: updates.linkedin,
      tiktok: updates.tiktok,
      interests: updates.hobbies,
    };
    // Remove undefined values
    Object.keys(dbUpdates).forEach((key) => {
      if (dbUpdates[key] === undefined) delete dbUpdates[key];
    });
    await updateProfile(dbUpdates);
  };

  const value = useMemo(
    () => ({
      // State
      user,
      profile,
      hostProfile,
      fullName,
      isAuthenticated,
      isSuperAdmin,
      isHost,
      loading: authLoading,

      // Actions
      login: signIn,
      logout: signOut,
      signIn,
      signUp,
      updateProfile: handleProfileUpdate,
    }),
    [
      user,
      profile,
      hostProfile,
      fullName,
      isAuthenticated,
      isSuperAdmin,
      isHost,
      authLoading,
      signIn,
      signOut,
      signUp,
      updateProfile,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

// Safe version that returns null values instead of throwing
export function useAuthContextSafe() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      profile: null,
      hostProfile: null,
      fullName: null,
      isAuthenticated: false,
      isSuperAdmin: false,
      isHost: false,
      loading: false,
      login: () => {},
      logout: () => {},
      signIn: () => {},
      signUp: () => {},
      updateProfile: () => {},
    };
  }
  return context;
}

export default AuthContext;
