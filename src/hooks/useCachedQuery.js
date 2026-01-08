import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getCached, setCache, invalidateTable, dedupeRequest } from '../lib/queryCache';

/**
 * Hook for cached Supabase queries
 * Prevents duplicate API calls and caches results
 *
 * Usage:
 *   const { data, loading, error, refetch } = useCachedQuery({
 *     table: 'cities',
 *     select: '*',
 *     order: { column: 'name', ascending: true },
 *     ttl: 60000, // optional, default 30s
 *   });
 */
export function useCachedQuery({
  table,
  select = '*',
  eq,
  order,
  limit,
  single = false,
  enabled = true,
  ttl = 30000,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  // Build query params for cache key
  const queryParams = { select, eq, order, limit, single };
  const cacheKey = `${table}:${JSON.stringify(queryParams)}`;

  const fetchData = useCallback(async (skipCache = false) => {
    if (!supabase || !enabled) {
      setLoading(false);
      return;
    }

    // Check cache first (unless skipCache)
    if (!skipCache) {
      const cached = getCached(table, queryParams);
      if (cached !== null) {
        if (mountedRef.current) {
          setData(cached);
          setLoading(false);
          setError(null);
        }
        return;
      }
    }

    // Dedupe concurrent requests
    try {
      const result = await dedupeRequest(cacheKey, async () => {
        let query = supabase.from(table).select(select);

        // Apply filters
        if (eq) {
          Object.entries(eq).forEach(([column, value]) => {
            query = query.eq(column, value);
          });
        }

        // Apply ordering
        if (order) {
          query = query.order(order.column, { ascending: order.ascending ?? true });
        }

        // Apply limit
        if (limit) {
          query = query.limit(limit);
        }

        // Single row
        if (single) {
          query = query.single();
        }

        return query;
      });

      if (mountedRef.current) {
        if (result.error) {
          setError(result.error.message);
          setData(null);
        } else {
          setData(result.data);
          setError(null);
          // Cache the result
          setCache(table, queryParams, result.data, ttl);
        }
        setLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message);
        setLoading(false);
      }
    }
  }, [table, cacheKey, enabled, ttl]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    fetchData();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  // Manual refetch (bypasses cache)
  const refetch = useCallback(() => {
    setLoading(true);
    invalidateTable(table);
    return fetchData(true);
  }, [fetchData, table]);

  return { data, loading, error, refetch };
}

/**
 * Hook for static data that rarely changes (cities, organizations)
 * Uses longer TTL (5 minutes)
 */
export function useStaticData(table, select = '*', order) {
  return useCachedQuery({
    table,
    select,
    order,
    ttl: 300000, // 5 minutes
  });
}

/**
 * Prebuilt hooks for common queries
 */
export function useCities() {
  return useStaticData('cities', '*', { column: 'name', ascending: true });
}

export function useOrganizations() {
  return useStaticData('organizations', '*', { column: 'name', ascending: true });
}

export function useCompetitions(filters = {}) {
  return useCachedQuery({
    table: 'competitions',
    select: '*, organization:organizations(*), city:cities(*)',
    eq: filters,
    order: { column: 'created_at', ascending: false },
    ttl: 30000,
  });
}

/**
 * Hook for fetching voting rounds (cached for 5 minutes)
 */
export function useVotingRounds(competitionId) {
  return useCachedQuery({
    table: 'voting_rounds',
    select: '*',
    eq: competitionId ? { competition_id: competitionId } : undefined,
    order: { column: 'round_order', ascending: true },
    ttl: 300000, // 5 minutes
    enabled: !!competitionId,
  });
}

/**
 * Hook for fetching events (cached for 2 minutes)
 */
export function useEvents(competitionId) {
  return useCachedQuery({
    table: 'events',
    select: '*',
    eq: competitionId ? { competition_id: competitionId } : undefined,
    order: { column: 'date', ascending: true },
    ttl: 120000, // 2 minutes
    enabled: !!competitionId,
  });
}

/**
 * Hook for fetching announcements (cached for 1 minute)
 */
export function useAnnouncements(competitionId) {
  return useCachedQuery({
    table: 'announcements',
    select: '*',
    eq: competitionId ? { competition_id: competitionId } : undefined,
    order: { column: 'published_at', ascending: false },
    ttl: 60000, // 1 minute
    enabled: !!competitionId,
  });
}

/**
 * Hook for fetching sponsors (cached for 5 minutes)
 */
export function useSponsors(competitionId) {
  return useCachedQuery({
    table: 'sponsors',
    select: '*',
    eq: competitionId ? { competition_id: competitionId } : undefined,
    order: { column: 'sort_order', ascending: true },
    ttl: 300000, // 5 minutes
    enabled: !!competitionId,
  });
}

/**
 * Hook for fetching competition settings
 * @deprecated Competition settings have been merged into the competitions table.
 * Use the competitions query directly to access settings fields.
 */
export function useCompetitionSettings(competitionId) {
  // Return empty data since competition_settings table no longer exists
  // Settings are now directly on the competitions table
  return { data: null, loading: false, error: null, refetch: () => {} };
}

/**
 * Hook for fetching competition rules (cached for 10 minutes)
 */
export function useCompetitionRules(competitionId) {
  return useCachedQuery({
    table: 'competition_rules',
    select: '*',
    eq: competitionId ? { competition_id: competitionId } : undefined,
    order: { column: 'sort_order', ascending: true },
    ttl: 600000, // 10 minutes
    enabled: !!competitionId,
  });
}

/**
 * Hook for fetching all profiles (cached for 2 minutes)
 * Useful for admin dashboards
 */
export function useProfiles() {
  return useCachedQuery({
    table: 'profiles',
    select: 'id, email, first_name, last_name, avatar_url, bio, instagram, city, gallery',
    ttl: 120000, // 2 minutes
  });
}

/**
 * Hook for fetching a single profile by ID (cached for 2 minutes)
 */
export function useProfile(profileId) {
  return useCachedQuery({
    table: 'profiles',
    select: '*',
    eq: profileId ? { id: profileId } : undefined,
    single: true,
    ttl: 120000, // 2 minutes
    enabled: !!profileId,
  });
}
