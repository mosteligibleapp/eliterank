import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
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
  // Local auth state for mock login
  const [mockUser, setMockUser] = useState(null);

  // Supabase authentication
  const {
    user,
    profile,
    loading: authLoading,
    isAuthenticated: supabaseAuthenticated,
    isDemoMode,
    signIn,
    signOut: supabaseSignOut,
    updateProfile,
  } = useSupabaseAuth();

  // Combined auth - either Supabase or mock
  const isAuthenticated = supabaseAuthenticated || !!mockUser;

  // Check if user is super admin
  const isSuperAdmin = mockUser?.role === USER_ROLES.SUPER_ADMIN;

  // Check if user is host
  const isHost = mockUser?.role === USER_ROLES.HOST || (profile && !isSuperAdmin);

  // Derive host profile from Supabase profile or use default for demo
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
    // Fallback to demo profile
    return DEFAULT_HOST_PROFILE;
  }, [profile]);

  // Full name helper
  const fullName = useMemo(() => {
    if (mockUser?.name) return mockUser.name;
    if (hostProfile.firstName || hostProfile.lastName) {
      return `${hostProfile.firstName} ${hostProfile.lastName}`.trim();
    }
    return 'User';
  }, [mockUser, hostProfile]);

  // Handle login (mock or Supabase)
  const login = useCallback((userData) => {
    // Handle mock login (host or super admin)
    if (userData.id === 'mock-host-id' || userData.id === 'mock-super-admin-id') {
      setMockUser(userData);
    }
  }, []);

  // Handle logout
  const logout = useCallback(async () => {
    setMockUser(null);
    await supabaseSignOut();
  }, [supabaseSignOut]);

  // Update profile handler with format conversion
  const handleProfileUpdate = useCallback(async (updates) => {
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
  }, [updateProfile]);

  const value = useMemo(
    () => ({
      // State
      user: user || mockUser,
      profile,
      hostProfile,
      fullName,
      isAuthenticated,
      isSuperAdmin,
      isHost,
      isDemoMode,
      loading: authLoading,

      // Actions
      login,
      logout,
      signIn,
      updateProfile: handleProfileUpdate,
    }),
    [
      user,
      mockUser,
      profile,
      hostProfile,
      fullName,
      isAuthenticated,
      isSuperAdmin,
      isHost,
      isDemoMode,
      authLoading,
      login,
      logout,
      signIn,
      handleProfileUpdate,
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

export default AuthContext;
