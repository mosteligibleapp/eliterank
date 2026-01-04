import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  INITIAL_COMPETITIONS,
  INITIAL_CONTESTANTS,
  INITIAL_NOMINEES,
  INITIAL_JUDGES,
  INITIAL_SPONSORS,
  INITIAL_EVENTS,
  INITIAL_ANNOUNCEMENTS,
} from '../constants';

/**
 * Custom hook for competition data management
 * Falls back to mock data if Supabase is not configured
 */
export default function useCompetition(competitionId = null) {
  const [competition, setCompetition] = useState(null);
  const [contestants, setContestants] = useState([]);
  const [nominees, setNominees] = useState([]);
  const [judges, setJudges] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isDemoMode = !isSupabaseConfigured();

  // Load all competition data
  const loadCompetitionData = useCallback(async () => {
    if (isDemoMode) {
      // Use mock data
      setCompetition(INITIAL_COMPETITIONS[0]);
      setContestants(INITIAL_CONTESTANTS);
      setNominees(INITIAL_NOMINEES);
      setJudges(INITIAL_JUDGES);
      setSponsors(INITIAL_SPONSORS);
      setEvents(INITIAL_EVENTS);
      setAnnouncements(INITIAL_ANNOUNCEMENTS);
      setLoading(false);
      return;
    }

    if (!competitionId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [
        competitionRes,
        contestantsRes,
        nomineesRes,
        judgesRes,
        sponsorsRes,
        eventsRes,
        announcementsRes,
      ] = await Promise.all([
        supabase.from('competitions').select('*').eq('id', competitionId).maybeSingle(),
        supabase.from('contestants').select('*, profile:profiles!user_id(*)').eq('competition_id', competitionId).order('rank'),
        supabase.from('nominees').select('*').eq('competition_id', competitionId).order('created_at', { ascending: false }),
        supabase.from('judges').select('*, profile:profiles!user_id(*)').eq('competition_id', competitionId).order('sort_order'),
        supabase.from('sponsors').select('*').eq('competition_id', competitionId).order('sort_order'),
        supabase.from('events').select('*').eq('competition_id', competitionId).order('date'),
        supabase.from('announcements').select('*').eq('competition_id', competitionId).order('pinned', { ascending: false }).order('published_at', { ascending: false }),
      ]);

      if (competitionRes.error) throw competitionRes.error;
      if (!competitionRes.data) throw new Error('Competition not found');

      setCompetition(competitionRes.data);
      setContestants(contestantsRes.data || []);
      setNominees(nomineesRes.data || []);
      setJudges(judgesRes.data || []);
      setSponsors(sponsorsRes.data || []);
      setEvents(eventsRes.data || []);
      setAnnouncements(announcementsRes.data || []);
    } catch (err) {
      setError(err.message);
      console.error('Error loading competition data:', err);
    } finally {
      setLoading(false);
    }
  }, [competitionId, isDemoMode]);

  useEffect(() => {
    loadCompetitionData();
  }, [loadCompetitionData]);

  // CRUD operations for contestants
  const addContestant = useCallback(async (data) => {
    if (isDemoMode) {
      const newContestant = { id: Date.now(), ...data };
      setContestants((prev) => [...prev, newContestant]);
      return { data: newContestant, error: null };
    }

    const { data: result, error } = await supabase
      .from('contestants')
      .insert({ ...data, competition_id: competitionId })
      .select()
      .single();

    if (!error) setContestants((prev) => [...prev, result]);
    return { data: result, error };
  }, [isDemoMode, competitionId]);

  const updateContestant = useCallback(async (id, updates) => {
    if (isDemoMode) {
      setContestants((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
      return { error: null };
    }

    const { error } = await supabase.from('contestants').update(updates).eq('id', id);
    if (!error) setContestants((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    return { error };
  }, [isDemoMode]);

  const deleteContestant = useCallback(async (id) => {
    if (isDemoMode) {
      setContestants((prev) => prev.filter((c) => c.id !== id));
      return { error: null };
    }

    const { error } = await supabase.from('contestants').delete().eq('id', id);
    if (!error) setContestants((prev) => prev.filter((c) => c.id !== id));
    return { error };
  }, [isDemoMode]);

  // CRUD operations for nominees
  const updateNominee = useCallback(async (id, updates) => {
    if (isDemoMode) {
      setNominees((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
      return { error: null };
    }

    const { error } = await supabase.from('nominees').update(updates).eq('id', id);
    if (!error) setNominees((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
    return { error };
  }, [isDemoMode]);

  const deleteNominee = useCallback(async (id) => {
    if (isDemoMode) {
      setNominees((prev) => prev.filter((n) => n.id !== id));
      return { error: null };
    }

    const { error } = await supabase.from('nominees').delete().eq('id', id);
    if (!error) setNominees((prev) => prev.filter((n) => n.id !== id));
    return { error };
  }, [isDemoMode]);

  const convertNomineeToContestant = useCallback(async (nomineeId) => {
    const nominee = nominees.find((n) => n.id === nomineeId);
    if (!nominee) return { error: 'Nominee not found' };

    // Update nominee status
    await updateNominee(nomineeId, { status: 'approved' });

    // Add as contestant
    const contestantData = {
      name: nominee.name,
      email: nominee.email,
      age: nominee.age,
      occupation: nominee.occupation,
      bio: nominee.bio,
      instagram: nominee.instagram,
      interests: nominee.interests,
      votes: 0,
      rank: contestants.length + 1,
    };

    return addContestant(contestantData);
  }, [nominees, contestants, updateNominee, addContestant]);

  // CRUD operations for judges
  const addJudge = useCallback(async (data) => {
    if (isDemoMode) {
      const newJudge = { id: Date.now(), ...data };
      setJudges((prev) => [...prev, newJudge]);
      return { data: newJudge, error: null };
    }

    const { data: result, error } = await supabase
      .from('judges')
      .insert({ ...data, competition_id: competitionId })
      .select()
      .single();

    if (!error) setJudges((prev) => [...prev, result]);
    return { data: result, error };
  }, [isDemoMode, competitionId]);

  const updateJudge = useCallback(async (id, updates) => {
    if (isDemoMode) {
      setJudges((prev) => prev.map((j) => (j.id === id ? { ...j, ...updates } : j)));
      return { error: null };
    }

    const { error } = await supabase.from('judges').update(updates).eq('id', id);
    if (!error) setJudges((prev) => prev.map((j) => (j.id === id ? { ...j, ...updates } : j)));
    return { error };
  }, [isDemoMode]);

  const deleteJudge = useCallback(async (id) => {
    if (isDemoMode) {
      setJudges((prev) => prev.filter((j) => j.id !== id));
      return { error: null };
    }

    const { error } = await supabase.from('judges').delete().eq('id', id);
    if (!error) setJudges((prev) => prev.filter((j) => j.id !== id));
    return { error };
  }, [isDemoMode]);

  // CRUD operations for sponsors
  const addSponsor = useCallback(async (data) => {
    if (isDemoMode) {
      const newSponsor = { id: Date.now(), ...data };
      setSponsors((prev) => [...prev, newSponsor]);
      return { data: newSponsor, error: null };
    }

    const { data: result, error } = await supabase
      .from('sponsors')
      .insert({ ...data, competition_id: competitionId })
      .select()
      .single();

    if (!error) setSponsors((prev) => [...prev, result]);
    return { data: result, error };
  }, [isDemoMode, competitionId]);

  const updateSponsor = useCallback(async (id, updates) => {
    if (isDemoMode) {
      setSponsors((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
      return { error: null };
    }

    const { error } = await supabase.from('sponsors').update(updates).eq('id', id);
    if (!error) setSponsors((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    return { error };
  }, [isDemoMode]);

  const deleteSponsor = useCallback(async (id) => {
    if (isDemoMode) {
      setSponsors((prev) => prev.filter((s) => s.id !== id));
      return { error: null };
    }

    const { error } = await supabase.from('sponsors').delete().eq('id', id);
    if (!error) setSponsors((prev) => prev.filter((s) => s.id !== id));
    return { error };
  }, [isDemoMode]);

  // CRUD operations for events
  const updateEvent = useCallback(async (id, updates) => {
    if (isDemoMode) {
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
      return { error: null };
    }

    const { error } = await supabase.from('events').update(updates).eq('id', id);
    if (!error) setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
    return { error };
  }, [isDemoMode]);

  // CRUD operations for announcements
  const addAnnouncement = useCallback(async (data) => {
    if (isDemoMode) {
      const newAnnouncement = { id: Date.now(), published_at: new Date().toISOString(), ...data };
      setAnnouncements((prev) => [newAnnouncement, ...prev]);
      return { data: newAnnouncement, error: null };
    }

    const { data: result, error } = await supabase
      .from('announcements')
      .insert({ ...data, competition_id: competitionId })
      .select()
      .single();

    if (!error) setAnnouncements((prev) => [result, ...prev]);
    return { data: result, error };
  }, [isDemoMode, competitionId]);

  const updateAnnouncement = useCallback(async (id, updates) => {
    if (isDemoMode) {
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
      return { error: null };
    }

    const { error } = await supabase.from('announcements').update(updates).eq('id', id);
    if (!error) setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
    return { error };
  }, [isDemoMode]);

  const deleteAnnouncement = useCallback(async (id) => {
    if (isDemoMode) {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      return { error: null };
    }

    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (!error) setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    return { error };
  }, [isDemoMode]);

  const toggleAnnouncementPin = useCallback(async (id) => {
    const announcement = announcements.find((a) => a.id === id);
    if (!announcement) return { error: 'Announcement not found' };
    return updateAnnouncement(id, { pinned: !announcement.pinned });
  }, [announcements, updateAnnouncement]);

  return {
    // Data
    competition,
    contestants,
    nominees,
    judges,
    sponsors,
    events,
    announcements,
    loading,
    error,
    isDemoMode,
    // Actions
    refresh: loadCompetitionData,
    // Contestant actions
    addContestant,
    updateContestant,
    deleteContestant,
    // Nominee actions
    updateNominee,
    deleteNominee,
    convertNomineeToContestant,
    // Judge actions
    addJudge,
    updateJudge,
    deleteJudge,
    // Sponsor actions
    addSponsor,
    updateSponsor,
    deleteSponsor,
    // Event actions
    updateEvent,
    // Announcement actions
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    toggleAnnouncementPin,
  };
}
