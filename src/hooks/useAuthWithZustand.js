/**
 * useAuthWithZustand - Bridge hook connecting Supabase auth with Zustand store
 * 
 * This hook:
 * 1. Initializes auth state from Supabase on mount
 * 2. Syncs Supabase auth changes to Zustand store
 * 3. Provides auth actions (signIn, signOut, etc.) that update both Supabase and Zustand
 * 4. Keeps the Zustand store as the source of truth for UI
 * 
 * Usage:
 * - Call this hook ONCE at the app root (e.g., in App.jsx or a top-level provider)
 * - Other components can just use useAuthStore() directly for reading state
 */
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores';

export default function useAuthWithZustand() {
  const mountedRef = useRef(true);
  
  // Get store actions
  const setUser = useAuthStore((state) => state.setUser);
  const setProfile = useAuthStore((state) => state.setProfile);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setError = useAuthStore((state) => state.setError);
  const signOutStore = useAuthStore((state) => state.signOut);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const updateProfileField = useAuthStore((state) => state.updateProfileField);
  
  // Get current state for actions
  const user = useAuthStore((state) => state.user);
  
  // ========== Profile Fetching ==========
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
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  }, []);

  const loadProfile = useCallback(async (userId) => {
    if (!userId || !mountedRef.current) return;

    const profileData = await fetchProfile(userId);

    if (mountedRef.current) {
      setProfile(profileData);
    }
  }, [fetchProfile, setProfile]);

  // ========== Initialize Auth ==========
  useEffect(() => {
    mountedRef.current = true;

    if (!supabase) {
      setLoading(false);
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
          setLoading(false);

          if (currentUser) {
            loadProfile(currentUser.id);
          }
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err.message);
          setLoading(false);
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
          // Use clearAuth (not signOutStore) to avoid calling supabase.auth.signOut()
          // again, which would trigger another onAuthStateChange and loop.
          clearAuth();
        }
      }
    );

    initAuth();

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [setUser, setProfile, setLoading, setError, clearAuth, loadProfile]);

  // Listen for external profile updates
  useEffect(() => {
    const handler = () => {
      if (mountedRef.current && user) {
        loadProfile(user.id);
      }
    };
    window.addEventListener('profile-updated', handler);
    return () => window.removeEventListener('profile-updated', handler);
  }, [user, loadProfile]);

  // ========== Auth Actions ==========
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
  }, [setError]);

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
  }, [setError]);

  const signOut = useCallback(async () => {
    await signOutStore();
  }, [signOutStore]);

  const updateProfile = useCallback(async (updates) => {
    if (!supabase) return { error: 'Supabase not configured' };
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update Zustand store
      updateProfileField(updates);
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  }, [user, updateProfileField]);

  const refreshProfile = useCallback(() => {
    if (user) {
      loadProfile(user.id);
    }
  }, [user, loadProfile]);

  // Return actions (state comes from useAuthStore directly)
  return {
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
  };
}
