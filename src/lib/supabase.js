import { createClient } from '@supabase/supabase-js';

// Supabase configuration - requires VITE_ prefix for Vite to expose them
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logging - show partial values for verification
console.log('=== SUPABASE CONFIG DEBUG ===');
console.log('VITE_SUPABASE_URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NOT SET');
console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'NOT SET');
console.log('All env vars:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in Vercel Environment Variables for the Preview environment.');
}

// Create Supabase client - always create if we have credentials
export const supabase = supabaseUrl && supabaseAnonKey
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
