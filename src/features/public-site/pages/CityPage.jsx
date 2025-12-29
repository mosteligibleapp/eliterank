import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin, Crown, Calendar, ChevronRight, Loader, Building2
} from 'lucide-react';
import { Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { supabase } from '../../../lib/supabase';
import { STATUS_CONFIG, COMPETITION_STATUS, US_STATES } from '../../../types/competition';

export default function CityPage() {
  const { citySlug } = useParams();
  const navigate = useNavigate();

  const [city, setCity] = useState(null);
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (citySlug) {
      fetchCity();
    }
  }, [citySlug]);

  const fetchCity = async () => {
    if (!supabase) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch city by slug
      const { data: cityData, error: cityError } = await supabase
        .from('cities')
        .select('*')
        .eq('slug', citySlug)
        .single();

      if (cityError) {
        if (cityError.code === 'PGRST116') {
          setError('City not found');
        } else {
          throw cityError;
        }
        return;
      }

      setCity(cityData);

      // Fetch visible competitions for this city
      const { data: compData, error: compError } = await supabase
        .from('competitions')
        .select(`
          *,
          organization:organizations(*),
          settings:competition_settings(*)
        `)
        .eq('city_id', cityData.id)
        .in('status', [COMPETITION_STATUS.PUBLISH, COMPETITION_STATUS.LIVE, COMPETITION_STATUS.COMPLETED])
        .order('season', { ascending: false });

      if (compError) throw compError;

      setCompetitions(compData || []);
    } catch {
      setError('Failed to load city');
    } finally {
      setLoading(false);
    }
  };

  const handleCompetitionClick = (comp) => {
    navigate(`/org/${comp.organization.slug}/${citySlug}-${comp.season}`);
  };

  // Get state name
  const getStateName = (code) => {
    const state = US_STATES.find(s => s.code === code);
    return state ? state.name : code;
  };

  // Group competitions by organization
  const competitionsByOrg = competitions.reduce((acc, comp) => {
    const orgId = comp.organization?.id || 'unknown';
    if (!acc[orgId]) {
      acc[orgId] = {
        organization: comp.organization,
        competitions: [],
      };
    }
    acc[orgId].competitions.push(comp);
    return acc;
  }, {});

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.background.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: colors.gold.primary }} />
          <p style={{ marginTop: spacing.md, color: colors.text.secondary }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.background.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center', padding: spacing.xxl }}>
          <MapPin size={64} style={{ color: colors.text.muted, marginBottom: spacing.lg }} />
          <h1 style={{ fontSize: typography.fontSize.xxl, marginBottom: spacing.md }}>
            {error === 'City not found' ? 'City Not Found' : 'Error'}
          </h1>
          <p style={{ color: colors.text.secondary, marginBottom: spacing.xl }}>
            {error === 'City not found'
              ? "We couldn't find a city with that URL."
              : 'Something went wrong. Please try again.'}
          </p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.background.primary,
    }}>
      {/* Header Section */}
      <div style={{
        background: `linear-gradient(135deg, ${colors.background.card} 0%, ${colors.background.primary} 100%)`,
        borderBottom: `1px solid ${colors.border.light}`,
        padding: `${spacing.xxxl} ${spacing.xl}`,
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xl }}>
            {/* Icon */}
            <div style={{
              width: 100,
              height: 100,
              borderRadius: borderRadius.xl,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px solid rgba(212,175,55,0.3)`,
              flexShrink: 0,
            }}>
              <MapPin size={48} style={{ color: colors.gold.primary }} />
            </div>

            {/* Info */}
            <div>
              <h1 style={{
                fontSize: typography.fontSize.hero,
                fontWeight: typography.fontWeight.bold,
                marginBottom: spacing.xs,
              }}>
                {city.name}
              </h1>
              <p style={{
                fontSize: typography.fontSize.xl,
                color: colors.text.secondary,
              }}>
                {getStateName(city.state)}
              </p>
              <p style={{
                marginTop: spacing.md,
                fontSize: typography.fontSize.sm,
                color: colors.text.muted,
              }}>
                {competitions.length} competition{competitions.length !== 1 ? 's' : ''} from{' '}
                {Object.keys(competitionsByOrg).length} organization{Object.keys(competitionsByOrg).length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Competitions Section */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: spacing.xxl }}>
        {Object.keys(competitionsByOrg).length === 0 ? (
          <div style={{ textAlign: 'center', padding: spacing.xxxl }}>
            <Crown size={64} style={{ color: colors.text.muted, marginBottom: spacing.lg }} />
            <h3 style={{ fontSize: typography.fontSize.xl, marginBottom: spacing.md }}>
              No Competitions Yet
            </h3>
            <p style={{ color: colors.text.secondary }}>
              No public competitions are running in {city.name} yet.
            </p>
          </div>
        ) : (
          Object.values(competitionsByOrg).map(({ organization, competitions: orgComps }) => (
            <div key={organization?.id || 'unknown'} style={{ marginBottom: spacing.xxl }}>
              {/* Organization Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  marginBottom: spacing.lg,
                  cursor: 'pointer',
                }}
                onClick={() => organization && navigate(`/org/${organization.slug}`)}
              >
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: borderRadius.lg,
                  background: colors.background.secondary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  {organization?.logo_url ? (
                    <img
                      src={organization.logo_url}
                      alt={organization.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Building2 size={24} style={{ color: colors.text.muted }} />
                  )}
                </div>
                <div>
                  <h2 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>
                    {organization?.name || 'Unknown Organization'}
                  </h2>
                  <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>
                    {orgComps.length} competition{orgComps.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <ChevronRight size={20} style={{ color: colors.text.muted, marginLeft: 'auto' }} />
              </div>

              {/* Competition Cards */}
              <div style={{ display: 'grid', gap: spacing.md }}>
                {orgComps.map(comp => (
                  <CompetitionCard
                    key={comp.id}
                    competition={comp}
                    onClick={() => handleCompetitionClick(comp)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Competition Card Component
function CompetitionCard({ competition, onClick }) {
  const statusConfig = STATUS_CONFIG[competition.status];
  const isTeaser = competition.status === COMPETITION_STATUS.PUBLISH;
  const isPast = competition.status === COMPETITION_STATUS.COMPLETED;

  return (
    <div
      onClick={onClick}
      style={{
        background: colors.background.card,
        border: `1px solid ${colors.border.light}`,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        cursor: 'pointer',
        transition: 'border-color 0.2s, transform 0.2s',
        opacity: isPast ? 0.7 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = colors.gold.primary;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = colors.border.light;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: borderRadius.lg,
            background: isTeaser
              ? 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))'
              : isPast
                ? 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.1))'
                : 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Crown
              size={24}
              style={{
                color: isTeaser ? colors.gold.primary : isPast ? '#8b5cf6' : '#22c55e'
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
              <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>
                Season {competition.season}
              </h3>
              <span style={{
                padding: `${spacing.xs} ${spacing.sm}`,
                background: statusConfig?.bg,
                color: statusConfig?.color,
                borderRadius: borderRadius.pill,
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.medium,
              }}>
                {statusConfig?.label}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
              {competition.number_of_winners && (
                <span>
                  {competition.number_of_winners} winner{competition.number_of_winners > 1 ? 's' : ''}
                </span>
              )}
              {competition.has_events && (
                <span>Includes events</span>
              )}
            </div>
          </div>
        </div>

        <ChevronRight size={24} style={{ color: colors.text.muted }} />
      </div>

      {isTeaser && (
        <p style={{
          marginTop: spacing.md,
          padding: spacing.md,
          background: 'rgba(212,175,55,0.1)',
          borderRadius: borderRadius.md,
          color: colors.gold.primary,
          fontSize: typography.fontSize.sm,
        }}>
          Coming soon! Express your interest in hosting, sponsoring, competing, or judging.
        </p>
      )}
    </div>
  );
}
