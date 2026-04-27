import { supabase } from './supabase';

// UTC-based day boundary, matching the server-side checks in
// api/cast-anonymous-vote.js and supabase/functions/stripe-webhook.
function todayUTCDate() {
  return new Date().toISOString().split('T')[0];
}

export async function isDoubleVoteDayForCompetition(competitionId) {
  if (!supabase || !competitionId) return false;

  const { data, error } = await supabase
    .from('competition_double_days')
    .select('id')
    .eq('competition_id', competitionId)
    .eq('date', todayUTCDate())
    .limit(1);

  if (error) {
    console.warn('Error checking double vote day:', error.message);
    return false;
  }
  return Array.isArray(data) && data.length > 0;
}

export async function listDoubleVoteDays(competitionId) {
  if (!supabase || !competitionId) return [];

  const { data, error } = await supabase
    .from('competition_double_days')
    .select('id, date')
    .eq('competition_id', competitionId)
    .order('date', { ascending: true });

  if (error) {
    console.warn('Error loading double vote days:', error.message);
    return [];
  }
  return data || [];
}
