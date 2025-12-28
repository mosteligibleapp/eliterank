import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

/**
 * Hook to fetch all dashboard data for a specific competition
 * Fetches contestants, nominees, judges, sponsors, events, announcements, and revenue data
 */
export function useCompetitionDashboard(competitionId) {
  const [data, setData] = useState({
    contestants: [],
    nominees: [],
    judges: [],
    sponsors: [],
    events: [],
    announcements: [],
    revenue: { total: 0, paidVotes: 0, sponsorships: 0, eventTickets: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    if (!competitionId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel for better performance
      const [
        contestantsResult,
        nomineesResult,
        judgesResult,
        sponsorsResult,
        eventsResult,
        announcementsResult,
        votesResult,
        competitionResult,
      ] = await Promise.all([
        // Contestants ordered by votes (for leaderboard)
        supabase
          .from('contestants')
          .select('*')
          .eq('competition_id', competitionId)
          .order('votes', { ascending: false }),

        // Nominees ordered by creation date
        supabase
          .from('nominees')
          .select('*')
          .eq('competition_id', competitionId)
          .order('created_at', { ascending: false }),

        // Judges ordered by sort_order
        supabase
          .from('judges')
          .select('*')
          .eq('competition_id', competitionId)
          .order('sort_order'),

        // Sponsors ordered by tier and sort_order
        supabase
          .from('sponsors')
          .select('*')
          .eq('competition_id', competitionId)
          .order('sort_order'),

        // Events ordered by date
        supabase
          .from('events')
          .select('*')
          .eq('competition_id', competitionId)
          .order('date'),

        // Announcements ordered by pinned and date
        supabase
          .from('announcements')
          .select('*')
          .eq('competition_id', competitionId)
          .order('pinned', { ascending: false })
          .order('published_at', { ascending: false }),

        // Get vote totals for revenue
        supabase
          .from('votes')
          .select('amount_paid')
          .eq('competition_id', competitionId),

        // Get competition for total_revenue
        supabase
          .from('competitions')
          .select('total_revenue, total_votes')
          .eq('id', competitionId)
          .single(),
      ]);

      // Check for errors
      const errors = [
        contestantsResult.error,
        nomineesResult.error,
        judgesResult.error,
        sponsorsResult.error,
        eventsResult.error,
        announcementsResult.error,
        votesResult.error,
        competitionResult.error,
      ].filter(Boolean);

      if (errors.length > 0) {
        console.error('Errors fetching dashboard data:', errors);
        setError(errors[0]?.message || 'Error fetching data');
      }

      // Transform contestants for leaderboard
      const contestants = (contestantsResult.data || []).map((c, index) => ({
        id: c.id,
        name: c.name,
        age: c.age,
        occupation: c.occupation,
        votes: c.votes || 0,
        status: c.status,
        interests: c.interests || [],
        trend: c.trend || 'same',
        rank: index + 1,
        avatarUrl: c.avatar_url,
        bio: c.bio,
        instagram: c.instagram,
      }));

      // Transform nominees
      const nominees = (nomineesResult.data || []).map((n) => ({
        id: n.id,
        name: n.name,
        email: n.email,
        nominatedBy: n.nominator_name || (n.nominated_by === 'self' ? 'Self' : 'Anonymous'),
        status: n.status,
        nominations: 1, // Could aggregate if we track multiple nominations
        age: n.age,
        occupation: n.occupation,
        bio: n.bio,
        city: n.city,
        createdAt: n.created_at,
      }));

      // Transform judges
      const judges = (judgesResult.data || []).map((j) => ({
        id: j.id,
        name: j.name,
        role: j.title || 'Judge',
        bio: j.bio,
        avatarUrl: j.avatar_url,
      }));

      // Transform sponsors and calculate sponsorship revenue
      const sponsors = (sponsorsResult.data || []).map((s) => ({
        id: s.id,
        name: s.name,
        tier: s.tier?.toLowerCase() || 'gold',
        amount: parseFloat(s.amount) || 0,
        logoUrl: s.logo_url,
        websiteUrl: s.website_url,
      }));

      const sponsorshipTotal = sponsors.reduce((sum, s) => sum + s.amount, 0);

      // Transform events
      const events = (eventsResult.data || []).map((e) => ({
        id: e.id,
        name: e.name,
        date: e.date,
        endDate: e.end_date,
        time: e.time,
        venue: e.location,
        location: e.location,
        status: e.status,
        isDoubleVoteDay: e.is_double_vote_day,
        publicVisible: e.public_visible,
      }));

      // Transform announcements
      const announcements = (announcementsResult.data || []).map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        pinned: a.pinned,
        type: a.type,
        date: a.published_at,
        createdAt: a.created_at,
      }));

      // Calculate revenue
      const paidVotes = (votesResult.data || []).reduce(
        (sum, v) => sum + (parseFloat(v.amount_paid) || 0),
        0
      );
      const totalRevenue = parseFloat(competitionResult.data?.total_revenue) || paidVotes + sponsorshipTotal;

      const revenue = {
        total: totalRevenue,
        paidVotes: paidVotes,
        sponsorships: sponsorshipTotal,
        eventTickets: 0, // Would need separate tracking for ticket sales
      };

      setData({
        contestants,
        nominees,
        judges,
        sponsors,
        events,
        announcements,
        revenue,
      });
    } catch (err) {
      console.error('Error in useCompetitionDashboard:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [competitionId]);

  // Initial fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Refresh function for manual refetch
  const refresh = useCallback(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    data,
    loading,
    error,
    refresh,
  };
}

export default useCompetitionDashboard;
