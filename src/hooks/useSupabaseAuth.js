import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Simplified Supabase authentication hook
 * - No retry logic (causes state loops)
 * - No profile dependency in effects
 * - Single auth state change handler
 */
export default function useSupabaseAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);
  const isDemoMode = !isSupabaseConfigured();

  // Simple profile fetch - no retries
  const fetchProfile = useCallback(async (userId) => {
    if (!supabase || !userId) return null;

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      return data;
    } catch {
      return null;
    }
  }, []);

  // Load profile for user
  const loadProfile = useCallback(async (userId) => {
    if (!userId || !mountedRef.current) return;

    setProfileLoading(true);
    const profileData = await fetchProfile(userId);

    if (mountedRef.current) {
      setProfile(profileData);
      setProfileLoading(false);
    }
  }, [fetchProfile]);

  // Initialize auth - runs once
  useEffect(() => {
    mountedRef.current = true;

    if (isDemoMode) {
      setAuthLoading(false);
      return;
    }

    // Get initial session
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (mountedRef.current) {
          const currentUser = session?.user ?? null;
          setUser(currentUser);
          setAuthLoading(false);

          if (currentUser) {
            loadProfile(currentUser.id);
          }
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err.message);
          setAuthLoading(false);
        }
      }
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mountedRef.current) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (event === 'SIGNED_IN' && currentUser) {
          loadProfile(currentUser.id);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );

    initAuth();

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [isDemoMode, loadProfile]);

  // Sign in
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
        interests: ['Travel', 'Fine Dining', 'Golf'],
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
      return { user: data.user, error: null };
    } catch (err) {
      setError(err.message);
      return { user: null, error: err.message };
    }
  }, [isDemoMode]);

  // Sign up
  const signUp = useCallback(async (email, password, metadata = {}) => {
    if (isDemoMode) {
      return signIn(email, password);
    }

    setError(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
      });

      if (signUpError) throw signUpError;
      return { user: data.user, error: null };
    } catch (err) {
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
    } catch {
      // Silent fail on signout
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

      setProfile((prev) => ({ ...prev, ...updates }));
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  }, [isDemoMode, user]);

  // Refresh profile
  const refreshProfile = useCallback(() => {
    if (user) {
      loadProfile(user.id);
    }
  }, [user, loadProfile]);

  return {
    user,
    profile,
    loading: authLoading,
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
