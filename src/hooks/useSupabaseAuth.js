import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Custom hook for Supabase authentication
 *
 * Best practices implemented:
 * 1. Auth state and profile state are separate concerns
 * 2. Auth completes quickly - profile loads in background
 * 3. Profile fetch failures don't block the app
 * 4. Uses AbortController for proper request cancellation
 * 5. Retry mechanism for profile fetch
 * 6. No timeout hacks - proper error handling
 */
export default function useSupabaseAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState(null);

  // Track if component is mounted
  const mountedRef = useRef(true);
  // Track current profile fetch to prevent race conditions
  const profileFetchRef = useRef(null);

  const isDemoMode = !isSupabaseConfigured();

  // Fetch user profile - separate from auth
  const fetchProfile = useCallback(async (userId, retryCount = 0) => {
    if (!supabase || !userId) return null;

    // Cancel any pending profile fetch
    if (profileFetchRef.current) {
      profileFetchRef.current.abort();
    }

    const controller = new AbortController();
    profileFetchRef.current = controller;

    setProfileLoading(true);

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        .abortSignal(controller.signal);

      if (fetchError) {
        // If profile doesn't exist, that's okay - user might be new
        if (fetchError.code === 'PGRST116') {
          console.log('Auth: No profile found for user, may need to create one');
          return null;
        }
        throw fetchError;
      }

      return data;
    } catch (err) {
      // Don't log aborted requests
      if (err.name === 'AbortError') return null;

      console.error('Auth: Profile fetch error:', err.message);

      // Retry up to 2 times for transient errors
      if (retryCount < 2 && !controller.signal.aborted) {
        console.log(`Auth: Retrying profile fetch (attempt ${retryCount + 2})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return fetchProfile(userId, retryCount + 1);
      }

      return null;
    } finally {
      if (mountedRef.current) {
        setProfileLoading(false);
      }
      profileFetchRef.current = null;
    }
  }, []);

  // Load profile for a user (called after auth is confirmed)
  const loadProfile = useCallback(async (userId) => {
    if (!userId || !mountedRef.current) return;

    const profileData = await fetchProfile(userId);

    if (mountedRef.current) {
      setProfile(profileData);
    }
  }, [fetchProfile]);

  // Initialize auth state
  useEffect(() => {
    mountedRef.current = true;

    if (isDemoMode) {
      setAuthLoading(false);
      return;
    }

    let authSubscription = null;

    const initAuth = async () => {
      try {
        // Get current session - this should be fast
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Auth: Session error:', sessionError);
          setError(sessionError.message);
        }

        if (mountedRef.current) {
          const currentUser = session?.user ?? null;
          setUser(currentUser);
          setAuthLoading(false);

          // Load profile in background AFTER auth is complete
          if (currentUser) {
            loadProfile(currentUser.id);
          }
        }
      } catch (err) {
        console.error('Auth: Init error:', err);
        if (mountedRef.current) {
          setError(err.message);
          setAuthLoading(false);
        }
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth: State changed -', event);

        if (!mountedRef.current) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (event === 'SIGNED_IN' && currentUser) {
          loadProfile(currentUser.id);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
        } else if (event === 'TOKEN_REFRESHED' && currentUser && !profile) {
          // If we have a user but no profile (e.g., after token refresh), load it
          loadProfile(currentUser.id);
        }
      }
    );

    authSubscription = subscription;

    // Then initialize
    initAuth();

    return () => {
      mountedRef.current = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
      if (profileFetchRef.current) {
        profileFetchRef.current.abort();
      }
    };
  }, [isDemoMode, loadProfile, profile]);

  // Sign in with email/password
  const signIn = useCallback(async (email, password) => {
    if (isDemoMode) {
      const demoUser = {
        id: 'demo-user-id',
        email,
        user_metadata: { first_name: 'Demo', last_name: 'User' },
      };
      const demoProfile = {
        id: 'demo-user-id',
        email,
        first_name: 'James',
        last_name: 'Davidson',
        bio: 'Award-winning event host with 10+ years of experience.',
        city: 'New York',
        is_host: true,
        hobbies: ['Travel', 'Fine Dining', 'Golf'],
      };
      setUser(demoUser);
      setProfile(demoProfile);
      return { user: demoUser, error: null };
    }

    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      // Profile will be loaded by onAuthStateChange listener
      return { user: data.user, error: null };
    } catch (err) {
      setError(err.message);
      return { user: null, error: err.message };
    }
  }, [isDemoMode]);

  // Sign up with email/password
  const signUp = useCallback(async (email, password, metadata = {}) => {
    if (isDemoMode) {
      return signIn(email, password);
    }

    setError(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (signUpError) throw signUpError;

      return { user: data.user, error: null };
    } catch (err) {
      console.error('SignUp error:', err);
      setError(err.message);
      return { user: null, error: err.message };
    }
  }, [isDemoMode, signIn]);

  // Sign out
  const signOut = useCallback(async () => {
    if (isDemoMode) {
      setUser(null);
      setProfile(null);
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }

    setUser(null);
    setProfile(null);
  }, [isDemoMode]);

  // Update profile
  const updateProfile = useCallback(async (updates) => {
    if (isDemoMode) {
      setProfile((prev) => ({ ...prev, ...updates }));
      return { error: null };
    }

    if (!user) return { error: 'Not authenticated' };

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update local state
      setProfile((prev) => ({ ...prev, ...updates }));
      return { error: null };
    } catch (err) {
      console.error('Profile update error:', err);
      return { error: err.message };
    }
  }, [isDemoMode, user]);

  // Refresh profile manually (useful after profile creation)
  const refreshProfile = useCallback(() => {
    if (user) {
      loadProfile(user.id);
    }
  }, [user, loadProfile]);

  return {
    user,
    profile,
    loading: authLoading, // Main loading state is auth loading
    profileLoading,
    error,
    isDemoMode,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
  };
}
