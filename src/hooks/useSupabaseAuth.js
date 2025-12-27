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

  // Fetch user profile from database with timeout
  const fetchProfile = useCallback(async (userId) => {
    if (!supabase || !userId) return null;

    console.log('Auth: Fetching profile for user:', userId);

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Profile fetch timeout')), 5000);
    });

    try {
      // Race between the query and the timeout
      const result = await Promise.race([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single(),
        timeoutPromise
      ]);

      const { data: profileData, error: profileError } = result;

      if (profileError) {
        console.error('Auth: Error fetching profile:', profileError);
        return null;
      }

      console.log('Auth: Profile fetched successfully');
      return profileData;
    } catch (err) {
      console.error('Auth: Profile fetch failed:', err.message);
      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    if (isDemoMode) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Failsafe timeout - ensure loading completes
    const timeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('Auth: Load timeout - forcing loading to false');
        setLoading(false);
      }
    }, 10000);

    const initAuth = async () => {
      console.log('Auth: Initializing...');
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Auth: Session error:', sessionError);
        }

        if (isMounted) {
          setUser(session?.user ?? null);

          if (session?.user) {
            const profileData = await fetchProfile(session.user.id);
            if (isMounted) {
              setProfile(profileData);
            }
          }
          console.log('Auth: Initialization complete');
        }
      } catch (err) {
        console.error('Auth: Error during initialization:', err);
      } finally {
        clearTimeout(timeout);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth: State changed -', event);
        if (isMounted) {
          setUser(session?.user ?? null);
          if (session?.user) {
            const profileData = await fetchProfile(session.user.id);
            if (isMounted) {
              setProfile(profileData);
            }
          } else {
            setProfile(null);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
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
      console.error('SignUp error:', err);
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
