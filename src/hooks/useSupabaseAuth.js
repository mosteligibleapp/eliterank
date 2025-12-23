import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Custom hook for Supabase authentication
 * Falls back to demo mode if Supabase is not configured
 */
export default function useSupabaseAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if we're in demo mode
  const isDemoMode = !isSupabaseConfigured();

  // Fetch user profile from database
  const fetchProfile = useCallback(async (userId) => {
    if (!supabase || !userId) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    if (isDemoMode) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setProfile(profile);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [isDemoMode, fetchProfile]);

  // Sign in with email/password
  const signIn = useCallback(async (email, password) => {
    if (isDemoMode) {
      // Demo mode: simulate login
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
        role: 'host',
        hobbies: ['Travel', 'Fine Dining', 'Golf'],
      };
      setUser(demoUser);
      setProfile(demoProfile);
      return { user: demoUser, error: null };
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { user: data.user, error: null };
    } catch (err) {
      setError(err.message);
      return { user: null, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [isDemoMode]);

  // Sign up with email/password
  const signUp = useCallback(async (email, password, metadata = {}) => {
    if (isDemoMode) {
      return signIn(email, password);
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (error) throw error;

      return { user: data.user, error: null };
    } catch (err) {
      setError(err.message);
      return { user: null, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, signIn]);

  // Sign out
  const signOut = useCallback(async () => {
    if (isDemoMode) {
      setUser(null);
      setProfile(null);
      return;
    }

    await supabase.auth.signOut();
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
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      setProfile((prev) => ({ ...prev, ...updates }));
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  }, [isDemoMode, user]);

  return {
    user,
    profile,
    loading,
    error,
    isDemoMode,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };
}
