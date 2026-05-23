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
  
  const [hostCompetition, setHostCompetition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Fetch host's assigned competition from Supabase
  useEffect(() => {
    const fetchHostCompetition = async () => {
      if (!user?.id || !supabase) {
        setHostCompetition(null);
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
          .limit(1);

        if (error) {
          setHostCompetition(null);
          setLoading(false);
          return;
        }

        const competition = data?.[0];
        if (competition) {
          setHostCompetition({
            ...competition,
            name: buildCompetitionName(competition),
          });
        } else {
          setHostCompetition(null);
        }
      } catch (err) {
        setHostCompetition(null);
        setFetchError(err);
      }
      setLoading(false);
    };

    fetchHostCompetition();
  }, [user?.id]);

  const handleBack = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    await signOut();
    navigate('/');
  }, [signOut, navigate]);

  const handleViewPublicSite = useCallback(() => {
    if (!hostCompetition) return;

    const orgSlug = hostCompetition?.organization?.slug || 'most-eligible';

    // Priority 1: Use the database slug directly (preferred)
    if (hostCompetition?.slug) {
      window.open(getCompetitionUrl(orgSlug, hostCompetition.slug), '_blank');
      return;
    }

    // Priority 2: Use the competition ID — the most reliable lookup
    if (hostCompetition?.id) {
      window.open(`/${orgSlug}/id/${hostCompetition.id}`, '_blank');
      return;
    }

    // Priority 3: Generate the slug from competition data
    const cityName = hostCompetition?.city?.name || hostCompetition?.city || '';
    const generatedSlug = generateCompetitionSlug({
      name: hostCompetition?.name,
      citySlug: slugify(cityName),
      season: hostCompetition?.season,
    });
    window.open(getCompetitionUrl(orgSlug, generatedSlug), '_blank');
  }, [hostCompetition]);


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
  if (!hostCompetition) {
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
      competitionId={hostCompetition.id}
      role="host"
      onBack={handleBack}
      onLogout={handleLogout}
      currentUserId={user?.id}
      onViewPublicSite={handleViewPublicSite}
    />
  );
}
