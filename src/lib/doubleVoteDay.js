import { supabase } from './supabase';

export async function isDoubleVoteDayForCompetition(competitionId) {
  if (!supabase || !competitionId) return false;

  // Single source of truth: the is_double_vote_day Postgres function uses
  // the competition's stored timezone, so a host in LA picking April 28
  // gets activation across the LA calendar day, not UTC's. See
  // supabase/migrations/051_competition_timezone_and_helpers.sql.
  const { data, error } = await supabase.rpc('is_double_vote_day', {
    p_competition_id: competitionId,
  });

  if (error) {
    console.warn('Error checking double vote day:', error.message);
    return false;
  }
  return data === true;
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
