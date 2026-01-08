import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getActivityType } from '../utils/activityTypes';
import { formatRelativeTime } from '../utils/formatters';

/**
 * Hook for fetching and subscribing to competition activity feed
 *
 * @param {string} competitionId - Competition UUID
 * @param {object} options - Configuration options
 * @param {number} options.limit - Max items to fetch (default: 20)
 * @param {boolean} options.realtime - Enable real-time updates (default: true)
 * @param {string[]} options.types - Filter by activity types (default: all)
 * @returns {object} Activity feed data and controls
 */
export function useActivityFeed(competitionId, options = {}) {
  const { limit = 20, realtime = true, types = null } = options;

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const lastFetchedAt = useRef(null);

  const isDemoMode = !isSupabaseConfigured();

  // Fetch activities
  const fetchActivities = useCallback(
    async (loadMore = false) => {
      if (!competitionId || isDemoMode) {
        setLoading(false);
        return;
      }

      if (!loadMore) {
        setLoading(true);
      }
      setError(null);

      try {
        let query = supabase
          .from('competition_activity')
          .select(
            `
          id,
          activity_type,
          message,
          contestant_id,
          metadata,
          created_at,
          contestants:contestant_id (
            id,
            name,
            slug,
            avatar_url
          )
        `
          )
          .eq('competition_id', competitionId)
          .order('created_at', { ascending: false })
          .limit(limit + 1); // Fetch one extra to check if there's more

        // Filter by types if specified
        if (types && types.length > 0) {
          query = query.in('activity_type', types);
        }

        // Pagination for load more
        if (loadMore && lastFetchedAt.current) {
          query = query.lt('created_at', lastFetchedAt.current);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        const fetchedActivities = data || [];

        // Check if there are more items
        setHasMore(fetchedActivities.length > limit);

        // Only take the limit amount
        const trimmedActivities = fetchedActivities.slice(0, limit);

        // Update last fetched timestamp for pagination
        if (trimmedActivities.length > 0) {
          lastFetchedAt.current =
            trimmedActivities[trimmedActivities.length - 1].created_at;
        }

        // Map activities with type info
        const mappedActivities = trimmedActivities.map((activity) => ({
          ...activity,
          typeInfo: getActivityType(activity.activity_type),
          timeAgo: formatRelativeTime(activity.created_at),
        }));

        if (loadMore) {
          setActivities((prev) => [...prev, ...mappedActivities]);
        } else {
          setActivities(mappedActivities);
        }
      } catch (err) {
        console.error('Error fetching activity feed:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [competitionId, limit, types, isDemoMode]
  );

  // Initial fetch
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Real-time subscription
  useEffect(() => {
    if (!competitionId || !realtime || isDemoMode) return;

    const subscription = supabase
      .channel(`activity-${competitionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'competition_activity',
          filter: `competition_id=eq.${competitionId}`,
        },
        async (payload) => {
          // Filter by types if specified
          if (
            types &&
            types.length > 0 &&
            !types.includes(payload.new.activity_type)
          ) {
            return;
          }

          // Fetch contestant data if needed
          let contestant = null;
          if (payload.new.contestant_id) {
            const { data } = await supabase
              .from('contestants')
              .select('id, name, slug, avatar_url')
              .eq('id', payload.new.contestant_id)
              .single();
            contestant = data;
          }

          const newActivity = {
            ...payload.new,
            contestants: contestant,
            typeInfo: getActivityType(payload.new.activity_type),
            timeAgo: formatRelativeTime(payload.new.created_at),
          };

          // Prepend new activity
          setActivities((prev) => [newActivity, ...prev].slice(0, limit));
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [competitionId, realtime, limit, types, isDemoMode]);

  // Update relative times periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setActivities((prev) =>
        prev.map((activity) => ({
          ...activity,
          timeAgo: formatRelativeTime(activity.created_at),
        }))
      );
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Load more function
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchActivities(true);
    }
  }, [loading, hasMore, fetchActivities]);

  // Refetch function
  const refetch = useCallback(() => {
    lastFetchedAt.current = null;
    fetchActivities(false);
  }, [fetchActivities]);

  return {
    activities,
    loading,
    error,
    hasMore,
    loadMore,
    refetch,
  };
}

export default useActivityFeed;
