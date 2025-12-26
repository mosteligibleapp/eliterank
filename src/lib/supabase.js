import { createClient } from '@supabase/supabase-js';

// Supabase configuration - requires VITE_ prefix for Vite to expose them
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate configuration
const isConfigured = supabaseUrl && supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key-here';

if (!isConfigured) {
  console.warn(
    '⚠️ Supabase not configured. Running in demo mode.\n' +
    'To connect to Supabase:\n' +
    '1. Copy .env.example to .env\n' +
    '2. Add your Supabase project URL and anon key\n' +
    '3. Restart the dev server'
  );
}

// Create Supabase client only if properly configured
export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const isSupabaseConfigured = () => !!supabase;

// Helper to check connection
export const checkConnection = async () => {
  if (!supabase) return { connected: false, error: 'Not configured' };

  try {
    const { error } = await supabase.from('profiles').select('count').limit(1);
    if (error) throw error;
    return { connected: true, error: null };
  } catch (err) {
    return { connected: false, error: err.message };
  }
};
