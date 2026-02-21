import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Supabase authentication hook
 * - Real authentication only (no demo mode)
 * - Single auth state change handler
 */
export default function useSupabaseAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);

  // Simple profile fetch — also checks if user hosts any competitions
  const fetchProfile = useCallback(async (userId) => {
    if (!supabase || !userId) return null;

    try {
      const [profileResult, hostResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('competitions')
          .select('id')
          .eq('host_id', userId)
          .limit(1),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (!profileResult.data) return null;

      return {
        ...profileResult.data,
        is_host: (hostResult.data?.length ?? 0) > 0,
      };
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

    if (!supabase) {
      setAuthLoading(false);
      setError('Supabase not configured');
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
  }, [loadProfile]);

  // Listen for external profile updates (e.g. entry flow writing profile after account creation).
  // Multiple components call useSupabaseAuth() independently — this event keeps them all in sync.
  useEffect(() => {
    const handler = () => {
      if (mountedRef.current && user) {
        loadProfile(user.id);
      }
    };
    window.addEventListener('profile-updated', handler);
    return () => window.removeEventListener('profile-updated', handler);
  }, [user, loadProfile]);

  // Sign in
  const signIn = useCallback(async (email, password) => {
    if (!supabase) return { user: null, error: 'Supabase not configured' };

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
  }, []);

  // Sign up
  const signUp = useCallback(async (email, password, metadata = {}) => {
    if (!supabase) return { user: null, error: 'Supabase not configured' };

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
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    if (!supabase) return;

    try {
      await supabase.auth.signOut();
    } catch {
      // Silent fail on signout
    }

    // Also clear local hook state (Supabase onAuthStateChange will fire,
    // but clearing eagerly avoids stale reads between the signOut call
    // and the async event callback)
    setUser(null);
    setProfile(null);
  }, []);

  // Update profile
  const updateProfile = useCallback(async (updates) => {
    if (!supabase) return { error: 'Supabase not configured' };
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
  }, [user]);

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
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
  };
}
