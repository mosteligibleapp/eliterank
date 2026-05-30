/**
 * DashboardPage - Host competition dashboard
 * 
 * Fetches the host's assigned competition and renders the competition dashboard.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores';
import { CompetitionDashboard } from '../features/competition-dashboard';
import DashboardSkeleton from '../components/skeletons/DashboardSkeleton';
import ErrorState from '../components/common/ErrorState';
import { getCompetitionUrl, generateCompetitionSlug, slugify } from '../utils/slugs';

/**
 * Build competition display name from city and season
 */
function buildCompetitionName(competition) {
  if (!competition) return 'Unknown Competition';

  const city = competition.city || 'Unknown';
  const season = competition.season || new Date().getFullYear();

  // If city already includes "Most Eligible", use as-is
  if (city.toLowerCase().includes('most eligible')) {
    return city;
  }

  return `${city} Most Eligible ${season}`.trim();
}

/**
 * DashboardPage Component
 */
export default function DashboardPage() {
  const navigate = useNavigate();
  
  // Use Zustand store for auth state
  const user = useAuthStore(s => s.user);
  const signOut = useAuthStore(s => s.signOut);
  
  // A host may run several competitions (primary host or co-host). We load all
  // of them so the dashboard can offer a switcher, and track which one is
  // currently selected.
  const [competitions, setCompetitions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Fetch all competitions this user hosts (primary + co-hosted) from Supabase
  useEffect(() => {
    const fetchHostCompetitions = async () => {
      if (!user?.id || !supabase) {
        setCompetitions([]);
        setLoading(false);
        return;
      }

      try {
        const { data: coHostRows } = await supabase
          .from('competition_co_hosts')
          .select('competition_id')
          .eq('user_id', user.id);

        const coHostIds = (coHostRows ?? []).map((r) => r.competition_id);
        const filter = coHostIds.length > 0
          ? `host_id.eq.${user.id},id.in.(${coHostIds.join(',')})`
          : `host_id.eq.${user.id}`;

        const { data, error } = await supabase
          .from('competitions')
          .select(`
            *,
            voting_rounds:voting_rounds(*),
            nomination_periods:nomination_periods(*),
            organization:organizations(slug, name)
          `)
          .or(filter)
          .order('created_at', { ascending: false });

        if (error) {
          setCompetitions([]);
          setLoading(false);
          return;
        }

        const list = (data ?? []).map((competition) => ({
          ...competition,
          // Prefer the stored name so the switcher matches the dashboard
          // header; fall back to a city + season label when it's blank.
          name: competition.name?.trim() || buildCompetitionName(competition),
        }));
        setCompetitions(list);
        // Keep the current selection if it's still in the list, otherwise
        // default to the most recent competition.
        setSelectedId((prev) =>
          prev && list.some((c) => c.id === prev) ? prev : list[0]?.id ?? null
        );
      } catch (err) {
        setCompetitions([]);
        setFetchError(err);
      }
      setLoading(false);
    };

    fetchHostCompetitions();
  }, [user?.id]);

  const selectedCompetition = competitions.find((c) => c.id === selectedId) || null;

  const handleBack = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    await signOut();
    navigate('/');
  }, [signOut, navigate]);

  const handleViewPublicSite = useCallback(() => {
    if (!selectedCompetition) return;

    const orgSlug = selectedCompetition?.organization?.slug || 'most-eligible';

    // Priority 1: Use the database slug directly (preferred)
    if (selectedCompetition?.slug) {
      window.open(getCompetitionUrl(orgSlug, selectedCompetition.slug), '_blank');
      return;
    }

    // Priority 2: Use the competition ID — the most reliable lookup
    if (selectedCompetition?.id) {
      window.open(`/${orgSlug}/id/${selectedCompetition.id}`, '_blank');
      return;
    }

    // Priority 3: Generate the slug from competition data
    const cityName = selectedCompetition?.city?.name || selectedCompetition?.city || '';
    const generatedSlug = generateCompetitionSlug({
      name: selectedCompetition?.name,
      citySlug: slugify(cityName),
      season: selectedCompetition?.season,
    });
    window.open(getCompetitionUrl(orgSlug, generatedSlug), '_blank');
  }, [selectedCompetition]);


  if (loading) {
    return <DashboardSkeleton />;
  }

  if (fetchError) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0c' }}>
        <ErrorState
          title="Failed to load dashboard"
          message="We couldn't load your competition data. Please try again."
          onRetry={() => { setFetchError(null); setLoading(true); }}
        />
      </div>
    );
  }

  // Host must have an assigned competition to view the dashboard
  if (!selectedCompetition) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
          color: '#fff',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            marginBottom: '1.5rem',
            background: 'rgba(212, 175, 55, 0.2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
          }}
        >
          👑
        </div>
        <h1 style={{ color: '#d4af37', marginBottom: '0.75rem', fontSize: '1.5rem' }}>
          No Competition Assigned
        </h1>
        <p style={{ color: '#9ca3af', marginBottom: '2rem', maxWidth: '400px' }}>
          You don't have a competition assigned yet. Contact an administrator to get started.
        </p>
        <button
          onClick={handleBack}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #d4af37, #f4d03f)',
            color: '#0a0a0f',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Back to Competitions
        </button>
      </div>
    );
  }

  return (
    <CompetitionDashboard
      competitionId={selectedCompetition.id}
      role="host"
      onBack={handleBack}
      onLogout={handleLogout}
      currentUserId={user?.id}
      onViewPublicSite={handleViewPublicSite}
      competitions={competitions}
      selectedCompetitionId={selectedCompetition.id}
      onSelectCompetition={setSelectedId}
    />
  );
}
