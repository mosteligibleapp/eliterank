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
        name: `Competition ${comp.season}`,
        season: comp.season,
        status: comp.status || 'draft',
        // Form fields
        hasEvents: comp.has_events ?? false,
        numberOfWinners: comp.number_of_winners || 5,
        selectionCriteria: comp.selection_criteria || 'votes',
        entryType: comp.entry_type || 'nominations',
        description: comp.description || '',
        rulesDocUrl: comp.rules_doc_url,
        // IDs for related data
        hostId: comp.host_id,
        organizationId: comp.organization_id,
        cityId: comp.city_id,
        assignedHost: comp.host_id ? hostsMap[comp.host_id] || null : null,
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
      setLoading(true);

      // Failsafe timeout - ensure loading completes even if something hangs
      const timeout = setTimeout(() => {
        if (isMounted) {
          setLoading(false);
        }
      }, 10000); // 10 second timeout

      try {
        await Promise.all([fetchCompetitions(), fetchOrganizations()]);
      } catch (err) {
        console.error('Error loading competition data:', err.message);
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
      // Build insert object with current schema columns
      const insertData = {
        host_id: hostId,
        organization_id: templateData.organizationId || templateData.organization?.id || null,
        city_id: templateData.cityId || null,
        season: templateData.season || new Date().getFullYear(),
        status: 'draft',
        entry_type: templateData.entryType || 'nominations',
        has_events: templateData.hasEvents ?? false,
        number_of_winners: templateData.numberOfWinners || 5,
        selection_criteria: templateData.selectionCriteria || 'votes',
        description: templateData.description || '',
      };

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
      if (updates.season) dbUpdates.season = updates.season;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.organizationId) dbUpdates.organization_id = updates.organizationId;
      if (updates.organization?.id) dbUpdates.organization_id = updates.organization.id;
      if (updates.cityId) dbUpdates.city_id = updates.cityId;
      if (updates.hostId) dbUpdates.host_id = updates.hostId;
      // Form fields
      if (updates.hasEvents !== undefined) dbUpdates.has_events = updates.hasEvents;
      if (updates.numberOfWinners) dbUpdates.number_of_winners = updates.numberOfWinners;
      if (updates.selectionCriteria) dbUpdates.selection_criteria = updates.selectionCriteria;
      if (updates.entryType) dbUpdates.entry_type = updates.entryType;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.rulesDocUrl !== undefined) dbUpdates.rules_doc_url = updates.rulesDocUrl;

      const { data, error } = await supabase
        .from('competitions')
        .update(dbUpdates)
        .eq('id', competitionId)
        .select();

      if (error) throw error;

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

  // Assign a host to a competition (does not change status)
  const assignHost = useCallback(async (competitionId, hostId) => {
    const result = await updateCompetition(competitionId, { hostId });
    return result;
  }, [updateCompetition]);

  // Activate a competition - sets status to 'active' so timeline dates take effect
  const activateCompetition = useCallback(async (competitionId) => {
    await updateCompetition(competitionId, { status: 'active' });
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
  // Status values: draft, publish, active, complete, archive
  const competitionsByStatus = useMemo(() => {
    return {
      draft: competitions.filter((t) => t.status === 'draft'),
      publish: competitions.filter((t) => t.status === 'publish'),
      active: competitions.filter((t) => t.status === 'active'),
      complete: competitions.filter((t) => t.status === 'complete'),
      archive: competitions.filter((t) => t.status === 'archive'),
    };
  }, [competitions]);

  // Get competition counts
  const competitionCounts = useMemo(() => {
    return {
      total: competitions.length,
      draft: competitionsByStatus.draft.length,
      publish: competitionsByStatus.publish.length,
      active: competitionsByStatus.active.length,
      complete: competitionsByStatus.complete.length,
      archive: competitionsByStatus.archive.length,
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
