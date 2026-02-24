import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Loader } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import WinnersShowcase from './WinnersShowcase';

/**
 * WinnersTab - Public winners display for competition pages
 * 
 * This component wraps WinnersShowcase and handles data fetching
 * for integration with PublicSitePage.
 * 
 * Features:
 * - Auto-fetches winners from competition.winners array
 * - Fetches competition stats (total votes, contestants)
 * - Fetches past seasons for historical display
 * - Supports both passed-in winners prop and auto-fetch
 * 
 * @param {Object} props
 * @param {string} props.city - City name for display
 * @param {string} props.season - Season identifier (e.g., "2025")
 * @param {Array} props.winners - Pre-loaded winners (optional)
 * @param {string} props.competitionId - Competition ID for auto-fetch
 * @param {Function} props.onViewProfile - Callback when viewing a profile
 * @param {string} props.variant - Display variant: 'full' | 'compact' | 'hero-only'
 */
export default function WinnersTab({
  city = '',
  season = '',
  winners: propWinners = [],
  competitionId,
  onViewProfile,
  variant = 'full',
  competition: propCompetition = null,
  organization: propOrganization = null,
}) {
  const [winners, setWinners] = useState([]);
  const [stats, setStats] = useState({});
  const [pastSeasons, setPastSeasons] = useState([]);
  const [competition, setCompetition] = useState(propCompetition);
  const [organization, setOrganization] = useState(propOrganization);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch winners and related data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // If winners already provided as full profiles, use them
        if (propWinners.length > 0 && propWinners[0]?.first_name) {
          // Ensure winners have vote counts if available
          const winnersWithVotes = propWinners.map((w, i) => ({
            ...w,
            votes: w.votes || w.total_votes || 0,
            rank: w.rank || i + 1,
          }));
          setWinners(winnersWithVotes);
          setLoading(false);
          return;
        }

        // If competitionId provided, fetch from database
        if (competitionId && supabase) {
          // Fetch competition with winners array and stats
          const { data: compData, error: compError } = await supabase
            .from('competitions')
            .select(`
              id,
              name,
              city,
              season,
              slug,
              winners,
              organization_id,
              theme_primary
            `)
            .eq('id', competitionId)
            .single();
          
          // Store competition data for share cards
          if (compData) {
            setCompetition(compData);
          }

          if (compError) {
            console.error('Error fetching competition:', compError);
            setWinners([]);
            setLoading(false);
            return;
          }

          if (!compData?.winners?.length) {
            setWinners([]);
            setLoading(false);
            return;
          }

          // Fetch winner profiles
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', compData.winners);

          if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
            setWinners([]);
            setLoading(false);
            return;
          }

          // Fetch vote counts for winners from contestants table
          const { data: contestantData } = await supabase
            .from('contestants')
            .select('profile_id, votes, rank')
            .eq('competition_id', competitionId)
            .in('profile_id', compData.winners);

          // Build vote lookup
          const voteLookup = {};
          if (contestantData) {
            contestantData.forEach(c => {
              voteLookup[c.profile_id] = {
                votes: c.votes || 0,
                rank: c.rank,
              };
            });
          }

          // Maintain order from winner IDs and add vote data
          const orderedWinners = compData.winners
            .map((id, index) => {
              const profile = profiles?.find(p => p.id === id);
              if (!profile) return null;
              
              const voteData = voteLookup[id] || {};
              return {
                ...profile,
                votes: voteData.votes || 0,
                rank: voteData.rank || index + 1,
              };
            })
            .filter(Boolean);

          setWinners(orderedWinners);

          // Fetch competition stats
          const { data: statsData } = await supabase
            .from('contestants')
            .select('votes')
            .eq('competition_id', competitionId);

          if (statsData) {
            const totalVotes = statsData.reduce((sum, c) => sum + (c.votes || 0), 0);
            setStats({
              totalVotes,
              totalContestants: statsData.length,
              // Could add totalVoters if tracked separately
            });
          }

          // Fetch organization for share cards
          if (compData.organization_id) {
            const { data: orgData } = await supabase
              .from('organizations')
              .select('id, name, logo_url')
              .eq('id', compData.organization_id)
              .single();
            
            if (orgData) {
              setOrganization(orgData);
            }
          }

          // Fetch past seasons (other completed competitions for same org/city)
          if (compData.organization_id && compData.city) {
            const { data: pastData } = await supabase
              .from('competitions')
              .select(`
                id,
                season,
                city,
                winners
              `)
              .eq('organization_id', compData.organization_id)
              .eq('city', compData.city)
              .eq('status', 'completed')
              .neq('id', competitionId)
              .order('season', { ascending: false })
              .limit(5);

            if (pastData && pastData.length > 0) {
              // Fetch champion profiles for past seasons
              const championIds = pastData
                .map(p => p.winners?.[0])
                .filter(Boolean);

              if (championIds.length > 0) {
                const { data: championProfiles } = await supabase
                  .from('profiles')
                  .select('id, first_name, last_name, avatar_url')
                  .in('id', championIds);

                const champLookup = {};
                if (championProfiles) {
                  championProfiles.forEach(p => {
                    champLookup[p.id] = p;
                  });
                }

                const pastWithChamps = pastData.map(p => ({
                  ...p,
                  champion: p.winners?.[0] ? champLookup[p.winners[0]] : null,
                }));

                setPastSeasons(pastWithChamps);
              } else {
                setPastSeasons(pastData);
              }
            }
          }
        } else {
          // No competition ID and no pre-loaded winners
          setWinners([]);
        }
      } catch (err) {
        console.error('Error in WinnersTab fetch:', err);
        setError(err.message);
        setWinners([]);
      }

      setLoading(false);
    };

    fetchData();
  }, [competitionId, propWinners]);

  // Loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        minHeight: '400px',
      }}>
        <Loader
          size={48}
          style={{
            animation: 'spin 1s linear infinite',
            color: '#d4af37',
            marginBottom: '16px',
          }}
        />
        <p style={{ color: '#a1a1aa' }}>Loading winners...</p>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        textAlign: 'center',
      }}>
        <Trophy size={48} style={{ color: '#71717a', marginBottom: '16px' }} />
        <h3 style={{ color: '#ffffff', marginBottom: '8px' }}>
          Unable to load winners
        </h3>
        <p style={{ color: '#a1a1aa' }}>
          Please try again later.
        </p>
      </div>
    );
  }

  // Empty state
  if (!winners || winners.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        textAlign: 'center',
        minHeight: '400px',
      }}>
        <Trophy size={64} style={{ color: '#71717a', marginBottom: '16px' }} />
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          color: '#ffffff',
          marginBottom: '8px',
        }}>
          Winners Coming Soon
        </h2>
        <p style={{
          fontSize: '1rem',
          color: '#a1a1aa',
          maxWidth: '400px',
        }}>
          {city ? `${city}'s ` : ''}winners haven't been announced yet.
          Check back soon!
        </p>
      </div>
    );
  }

  // Render the showcase
  return (
    <WinnersShowcase
      competitionId={competitionId}
      city={city}
      season={season}
      winners={winners}
      pastSeasons={pastSeasons}
      stats={stats}
      onViewProfile={onViewProfile}
      variant={variant}
      competition={competition}
      organization={organization}
    />
  );
}
