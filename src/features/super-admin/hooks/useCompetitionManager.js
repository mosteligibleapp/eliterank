import { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export function useCompetitionManager() {
  const [competitions, setCompetitions] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch competitions from Supabase
  const fetchCompetitions = useCallback(async () => {
    if (!supabase) {
      return;
    }

    try {
      // Fetch competitions
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching competitions:', error);
        setCompetitions([]);
        return;
      }

      // Get unique host IDs to fetch host profiles
      const hostIds = [...new Set((data || []).map(c => c.host_id).filter(Boolean))];

      // Fetch host profiles if there are any
      let hostsMap = {};
      if (hostIds.length > 0) {
        const { data: hostsData } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name')
          .in('id', hostIds);

        if (hostsData) {
          hostsMap = hostsData.reduce((acc, host) => {
            acc[host.id] = {
              id: host.id,
              name: `${host.first_name || ''} ${host.last_name || ''}`.trim() || host.email,
              email: host.email,
            };
            return acc;
          }, {});
        }
      }

      // Transform data to match expected format
      const transformed = (data || []).map(comp => ({
        id: comp.id,
        name: comp.city || 'Unnamed Competition',
        city: comp.city,
        season: comp.season,
        status: comp.status || 'upcoming',
        phase: comp.phase,
        // Form fields
        category: comp.category,
        contestantType: comp.contestant_type,
        hasHost: comp.has_host ?? true,
        hasEvents: comp.has_events ?? true,
        numberOfWinners: comp.number_of_winners || 5,
        selectionCriteria: comp.selection_criteria,
        voteWeight: comp.vote_weight || 50,
        judgeWeight: comp.judge_weight || 50,
        maxContestants: comp.total_contestants || 30,
        votePrice: comp.vote_price || 1.00,
        hostPayoutPercentage: comp.host_payout_percentage || 20,
        // IDs for related data
        hostId: comp.host_id,
        organizationId: comp.organization_id,
        organization: null, // Will be populated separately if needed
        assignedHost: comp.host_id ? hostsMap[comp.host_id] || null : null,
        // Dates
        nominationStart: comp.nomination_start,
        nominationEnd: comp.nomination_end,
        votingStart: comp.voting_start,
        votingEnd: comp.voting_end,
        finalsDate: comp.finals_date,
      }));

      setCompetitions(transformed);
    } catch (err) {
      console.error('Error fetching competitions:', err);
      setCompetitions([]);
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

      if (error) {
        // Table might not exist yet - that's ok
        console.warn('Organizations table error:', error);
        setOrganizations([]);
        return;
      }
      setOrganizations(data || []);
    } catch (err) {
      console.error('Error fetching organizations:', err);
      // Don't set error for organizations - not critical
      setOrganizations([]);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      console.log('CompetitionManager: Starting data load...');
      setLoading(true);

      // Failsafe timeout - ensure loading completes even if something hangs
      const timeout = setTimeout(() => {
        if (isMounted) {
          console.warn('CompetitionManager: Load timeout - forcing loading to false');
          setLoading(false);
        }
      }, 10000); // 10 second timeout

      try {
        await Promise.all([fetchCompetitions(), fetchOrganizations()]);
        console.log('CompetitionManager: Data load complete');
      } catch (err) {
        console.error('CompetitionManager: Error loading data:', err);
      } finally {
        clearTimeout(timeout);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [fetchCompetitions, fetchOrganizations]);

  // Create a new competition in Supabase
  const createCompetition = useCallback(async (templateData, hostId) => {
    if (!supabase) {
      console.error('Supabase not configured');
      return null;
    }

    try {
      // Build insert object with only columns that exist in the table
      const insertData = {
        host_id: hostId,
        organization_id: templateData.organization?.id || null,
        city: templateData.city,
        season: templateData.season || new Date().getFullYear(),
        status: 'upcoming',
        phase: 'setup',
        total_contestants: templateData.maxContestants || 30,
        vote_price: templateData.votePrice || 1.00,
        host_payout_percentage: templateData.hostPayoutPercentage || 20,
      };

      // Add optional columns if they exist in the database
      // These will fail gracefully if columns don't exist
      if (templateData.category) insertData.category = templateData.category;
      if (templateData.contestantType) insertData.contestant_type = templateData.contestantType;
      if (templateData.hasHost !== undefined) insertData.has_host = templateData.hasHost;
      if (templateData.hasEvents !== undefined) insertData.has_events = templateData.hasEvents;
      if (templateData.numberOfWinners) insertData.number_of_winners = templateData.numberOfWinners;
      if (templateData.selectionCriteria) insertData.selection_criteria = templateData.selectionCriteria;
      if (templateData.voteWeight !== undefined) insertData.vote_weight = templateData.voteWeight;
      if (templateData.judgeWeight !== undefined) insertData.judge_weight = templateData.judgeWeight;

      const { data, error } = await supabase
        .from('competitions')
        .insert(insertData)
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
    if (!supabase) {
      console.error('Supabase not configured');
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const dbUpdates = {};
      // Basic fields
      if (updates.city) dbUpdates.city = updates.city;
      if (updates.season) dbUpdates.season = updates.season;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.phase) dbUpdates.phase = updates.phase;
      if (updates.organization?.id) dbUpdates.organization_id = updates.organization.id;
      if (updates.hostId) dbUpdates.host_id = updates.hostId;
      // Form fields
      if (updates.category) dbUpdates.category = updates.category;
      if (updates.contestantType) dbUpdates.contestant_type = updates.contestantType;
      if (updates.hasHost !== undefined) dbUpdates.has_host = updates.hasHost;
      if (updates.hasEvents !== undefined) dbUpdates.has_events = updates.hasEvents;
      if (updates.numberOfWinners) dbUpdates.number_of_winners = updates.numberOfWinners;
      if (updates.selectionCriteria) dbUpdates.selection_criteria = updates.selectionCriteria;
      if (updates.voteWeight !== undefined) dbUpdates.vote_weight = updates.voteWeight;
      if (updates.judgeWeight !== undefined) dbUpdates.judge_weight = updates.judgeWeight;
      if (updates.maxContestants) dbUpdates.total_contestants = updates.maxContestants;
      if (updates.votePrice) dbUpdates.vote_price = updates.votePrice;
      if (updates.hostPayoutPercentage) dbUpdates.host_payout_percentage = updates.hostPayoutPercentage;

      console.log('Updating competition:', competitionId, 'with:', dbUpdates);

      const { data, error } = await supabase
        .from('competitions')
        .update(dbUpdates)
        .eq('id', competitionId)
        .select();

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      console.log('Update result:', data);
      await fetchCompetitions();
      return { success: true, data };
    } catch (err) {
      console.error('Error updating competition:', err);
      setError(err.message);
      return { success: false, error: err.message };
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
    console.log('Assigning host:', hostId, 'to competition:', competitionId);
    const result = await updateCompetition(competitionId, { hostId, status: 'assigned' });
    return result;
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
