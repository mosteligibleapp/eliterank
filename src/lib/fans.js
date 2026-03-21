import { supabase } from './supabase';

export async function checkIsFan(fanId, profileId) {
  if (!supabase || !fanId || !profileId) return false;

  const { data } = await supabase
    .from('fans')
    .select('id')
    .eq('fan_id', fanId)
    .eq('profile_id', profileId)
    .maybeSingle();

  return !!data;
}

export async function addFan(fanId, profileId) {
  if (!supabase || !fanId || !profileId) return { error: 'Missing data' };

  const { error } = await supabase
    .from('fans')
    .insert({ fan_id: fanId, profile_id: profileId });

  if (error) console.error('addFan error:', error.message, error.code);
  return { error };
}

export async function removeFan(fanId, profileId) {
  if (!supabase || !fanId || !profileId) return { error: 'Missing data' };

  const { error } = await supabase
    .from('fans')
    .delete()
    .eq('fan_id', fanId)
    .eq('profile_id', profileId);

  return { error };
}

export async function getFanCount(profileId) {
  if (!supabase || !profileId) return 0;

  const { data } = await supabase
    .from('profiles')
    .select('fan_count')
    .eq('id', profileId)
    .maybeSingle();

  return data?.fan_count || 0;
}
