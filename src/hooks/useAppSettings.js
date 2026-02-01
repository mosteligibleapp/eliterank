import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook to fetch and manage app-wide settings
 * @param {string} key - The setting key to fetch (e.g., 'hall_of_winners')
 * @returns {Object} - { data, loading, error, refetch, update }
 */
export default function useAppSettings(key) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSetting = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: setting, error: fetchError } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', key)
        .single();

      if (fetchError) {
        // If not found, return null (setting doesn't exist yet)
        if (fetchError.code === 'PGRST116') {
          setData(null);
        } else {
          throw fetchError;
        }
      } else {
        setData(setting?.value || null);
      }
    } catch (err) {
      console.error(`Error fetching app setting "${key}":`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [key]);

  const updateSetting = useCallback(async (newValue) => {
    try {
      setError(null);

      const { error: upsertError } = await supabase
        .from('app_settings')
        .upsert(
          { key, value: newValue, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );

      if (upsertError) throw upsertError;

      setData(newValue);
      return { success: true };
    } catch (err) {
      console.error(`Error updating app setting "${key}":`, err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [key]);

  useEffect(() => {
    fetchSetting();
  }, [fetchSetting]);

  return {
    data,
    loading,
    error,
    refetch: fetchSetting,
    update: updateSetting,
  };
}
