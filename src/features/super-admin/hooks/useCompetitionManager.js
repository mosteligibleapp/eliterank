import { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export function useCompetitionManager() {
  const [competitions, setCompetitions] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch competitions from Supabase
  const fetchCompetitions = useCallback(async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('competitions')
        .select(`
          *,
          host:profiles!competitions_host_id_fkey(id, email, first_name, last_name),
          organization:organizations(id, name, slug, logo)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match expected format
      const transformed = data.map(comp => ({
        id: comp.id,
        name: comp.organization ? `${comp.organization.name} ${comp.city}` : comp.city,
        city: comp.city,
        season: comp.season,
        status: comp.status || 'draft',
        phase: comp.phase,
        maxContestants: comp.total_contestants || 30,
        votePrice: comp.vote_price,
        hostPayoutPercentage: comp.host_payout_percentage,
        organization: comp.organization,
        assignedHost: comp.host ? {
          id: comp.host.id,
          name: `${comp.host.first_name || ''} ${comp.host.last_name || ''}`.trim() || comp.host.email,
          email: comp.host.email,
        } : null,
        nominationStart: comp.nomination_start,
        nominationEnd: comp.nomination_end,
        votingStart: comp.voting_start,
        votingEnd: comp.voting_end,
        finalsDate: comp.finals_date,
      }));

      setCompetitions(transformed);
    } catch (err) {
      console.error('Error fetching competitions:', err);
      setError(err.message);
    }
  }, []);

  // Fetch organizations from Supabase
  const fetchOrganizations = useCallback(async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError(err.message);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCompetitions(), fetchOrganizations()]);
      setLoading(false);
    };
    loadData();
  }, [fetchCompetitions, fetchOrganizations]);

  // Create a new competition in Supabase
  const createCompetition = useCallback(async (templateData, hostId) => {
    if (!supabase) {
      console.error('Supabase not configured');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('competitions')
        .insert({
          host_id: hostId,
          organization_id: templateData.organization?.id || null,
          city: templateData.city,
          season: templateData.season || new Date().getFullYear(),
          status: 'upcoming',
          phase: 'setup',
          vote_price: templateData.votePrice || 1.00,
          host_payout_percentage: templateData.hostPayoutPercentage || 20,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh competitions list
      await fetchCompetitions();
      return data;
    } catch (err) {
      console.error('Error creating competition:', err);
      setError(err.message);
      return null;
    }
  }, [fetchCompetitions]);

  // Update an existing competition in Supabase
  const updateCompetition = useCallback(async (competitionId, updates) => {
    if (!supabase) return;

    try {
      const dbUpdates = {};
      if (updates.city) dbUpdates.city = updates.city;
      if (updates.season) dbUpdates.season = updates.season;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.phase) dbUpdates.phase = updates.phase;
      if (updates.votePrice) dbUpdates.vote_price = updates.votePrice;
      if (updates.hostPayoutPercentage) dbUpdates.host_payout_percentage = updates.hostPayoutPercentage;
      if (updates.organization?.id) dbUpdates.organization_id = updates.organization.id;
      if (updates.hostId) dbUpdates.host_id = updates.hostId;

      const { error } = await supabase
        .from('competitions')
        .update(dbUpdates)
        .eq('id', competitionId);

      if (error) throw error;

      await fetchCompetitions();
    } catch (err) {
      console.error('Error updating competition:', err);
      setError(err.message);
    }
  }, [fetchCompetitions]);

  // Delete a competition from Supabase
  const deleteCompetition = useCallback(async (competitionId) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('competitions')
        .delete()
        .eq('id', competitionId);

      if (error) throw error;

      await fetchCompetitions();
    } catch (err) {
      console.error('Error deleting competition:', err);
      setError(err.message);
    }
  }, [fetchCompetitions]);

  // Assign a host to a competition
  const assignHost = useCallback(async (competitionId, hostId) => {
    await updateCompetition(competitionId, { hostId, status: 'assigned' });
  }, [updateCompetition]);

  // Activate a competition
  const activateCompetition = useCallback(async (competitionId) => {
    await updateCompetition(competitionId, { status: 'active', phase: 'nomination' });
  }, [updateCompetition]);

  // Create a new organization in Supabase
  const createOrganization = useCallback(async (orgData) => {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name: orgData.name,
          slug: orgData.name.toLowerCase().replace(/\s+/g, '-'),
          logo: orgData.logo,
          description: orgData.description,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchOrganizations();
      return data;
    } catch (err) {
      console.error('Error creating organization:', err);
      setError(err.message);
      return null;
    }
  }, [fetchOrganizations]);

  // Get competitions by status
  const competitionsByStatus = useMemo(() => {
    return {
      draft: competitions.filter((t) => t.status === 'draft' || t.status === 'upcoming'),
      assigned: competitions.filter((t) => t.status === 'assigned'),
      active: competitions.filter((t) => t.status === 'active' || t.status === 'nomination' || t.status === 'voting'),
      completed: competitions.filter((t) => t.status === 'completed'),
    };
  }, [competitions]);

  // Get competition counts
  const competitionCounts = useMemo(() => {
    return {
      total: competitions.length,
      draft: competitionsByStatus.draft.length,
      assigned: competitionsByStatus.assigned.length,
      active: competitionsByStatus.active.length,
      completed: competitionsByStatus.completed.length,
    };
  }, [competitions, competitionsByStatus]);

  return {
    // State
    templates: competitions, // Keep 'templates' name for backward compatibility
    competitions,
    organizations,
    competitionsByStatus,
    competitionCounts,
    loading,
    error,

    // Competition actions
    createCompetition,
    updateCompetition,
    deleteCompetition,
    assignHost,
    activateCompetition,

    // Organization actions
    createOrganization,

    // Refresh data
    refreshCompetitions: fetchCompetitions,
    refreshOrganizations: fetchOrganizations,
  };
}

export default useCompetitionManager;
