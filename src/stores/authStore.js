/**
 * Auth Store - Centralized authentication state with Zustand
 * 
 * Consolidates auth state that was previously scattered across:
 * - AuthContext.jsx
 * - useSupabaseAuth.js
 * - Various useState calls in App.jsx
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

// User roles (aligned with database schema)
export const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  HOST: 'host',
  FAN: 'fan',
});

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // ========== Core Auth State ==========
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      // ========== Derived/Computed Values ==========
      // Note: Zustand doesn't have true computed properties like MobX,
      // so we use getter functions that consumers call

      // ========== Actions ==========
      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user,
        error: null,
      }),

      setProfile: (profile) => set({ profile }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      // Update profile partially (for real-time profile edits)
      updateProfileField: (updates) => set((state) => ({
        profile: state.profile ? { ...state.profile, ...updates } : null,
      })),

      // Clear auth state without calling Supabase signOut.
      // Used by onAuthStateChange(SIGNED_OUT) to avoid triggering another signOut cycle.
      clearAuth: () => set({
        user: null,
        profile: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      }),

      // Sign out - clear Supabase session and all auth state
      signOut: async () => {
        if (supabase) {
          try {
            await supabase.auth.signOut({ scope: 'local' });
          } catch {
            // If signOut API fails, manually clear Supabase tokens from localStorage
            try {
              const keys = Object.keys(localStorage);
              for (const key of keys) {
                if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                  localStorage.removeItem(key);
                }
              }
            } catch { /* storage not available */ }
          }
        }
        set({
          user: null,
          profile: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      // ========== Selectors (Computed-like) ==========
      // These are functions that compute values from state
      // Call them like: useAuthStore.getState().getUserRole()
      
      getUserRole: () => {
        const { profile } = get();
        if (!profile) return ROLES.FAN;
        if (profile.is_super_admin) return ROLES.SUPER_ADMIN;
        if (profile.is_host) return ROLES.HOST;
        return ROLES.FAN;
      },

      getIsSuperAdmin: () => {
        const { profile } = get();
        return profile?.is_super_admin === true;
      },

      getIsHost: () => {
        const { profile } = get();
        return profile?.is_host === true;
      },

      getHasDashboardAccess: () => {
        const role = get().getUserRole();
        return role === ROLES.HOST || role === ROLES.SUPER_ADMIN;
      },

      // Get display-friendly host profile format
      getHostProfile: () => {
        const { user, profile } = get();
        if (!profile) {
          return {
            id: null,
            email: '',
            firstName: '',
            lastName: '',
            bio: '',
            city: '',
            instagram: '',
            twitter: '',
            linkedin: '',
            tiktok: '',
            hobbies: [],
            avatarUrl: '',
            coverImage: '',
            gallery: [],
            wins: 0,
            total_competitions: 0,
          };
        }

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
      },

      // Get user display name
      getUserName: () => {
        const { user, profile } = get();
        if (profile?.first_name) return profile.first_name;
        if (user?.email) {
          const emailParts = user.email.split('@');
          return emailParts[0] || 'User';
        }
        return 'User';
      },

      // Get full name
      getFullName: () => {
        const { user, profile } = get();
        if (profile?.first_name || profile?.last_name) {
          return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
        }
        if (user?.email) {
          return user.email.split('@')[0];
        }
        return 'User';
      },
    }),
    {
      name: 'eliterank-auth',
      storage: createJSONStorage(() => sessionStorage), // Use sessionStorage for auth
      partialize: (state) => ({
        // Only persist non-sensitive data
        // User and profile will be rehydrated from Supabase session
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ========== Convenience Hooks ==========
// These provide reactive access to computed values

export const useUserRole = () => useAuthStore((state) => {
  if (!state.profile) return ROLES.FAN;
  if (state.profile.is_super_admin) return ROLES.SUPER_ADMIN;
  if (state.profile.is_host) return ROLES.HOST;
  return ROLES.FAN;
});

export const useIsSuperAdmin = () => useAuthStore((state) => 
  state.profile?.is_super_admin === true
);

export const useIsHost = () => useAuthStore((state) => 
  state.profile?.is_host === true
);

export const useHasDashboardAccess = () => {
  const role = useUserRole();
  return role === ROLES.HOST || role === ROLES.SUPER_ADMIN;
};

export const useHostProfile = () => useAuthStore((state) => {
  const { user, profile } = state;
  if (!profile) {
    return {
      id: null,
      email: '',
      firstName: '',
      lastName: '',
      bio: '',
      city: '',
      instagram: '',
      twitter: '',
      linkedin: '',
      tiktok: '',
      hobbies: [],
      avatarUrl: '',
      coverImage: '',
      gallery: [],
      wins: 0,
      total_competitions: 0,
    };
  }

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
});

export const useUserName = () => useAuthStore((state) => {
  if (state.profile?.first_name) return state.profile.first_name;
  if (state.user?.email) {
    const emailParts = state.user.email.split('@');
    return emailParts[0] || 'User';
  }
  return 'User';
});

export default useAuthStore;
