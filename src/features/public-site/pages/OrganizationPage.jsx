import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2, Crown, MapPin, Calendar, ChevronRight, Loader, ExternalLink
} from 'lucide-react';
import { Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { supabase } from '../../../lib/supabase';
import { STATUS_CONFIG, COMPETITION_STATUS } from '../../../types/competition';

export default function OrganizationPage() {
  const { orgSlug } = useParams();
  const navigate = useNavigate();

  const [organization, setOrganization] = useState(null);
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (orgSlug) {
      fetchOrganization();
    }
  }, [orgSlug]);

  const fetchOrganization = async () => {
    if (!supabase) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch organization by slug
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', orgSlug)
        .single();

      if (orgError) {
        if (orgError.code === 'PGRST116') {
          setError('Organization not found');
        } else {
          throw orgError;
        }
        return;
      }

      setOrganization(orgData);

      // Fetch visible competitions for this organization (settings now on competitions table)
      const { data: compData, error: compError } = await supabase
        .from('competitions')
        .select(`
          *,
          city:cities(*)
        `)
        .eq('organization_id', orgData.id)
        .in('status', [COMPETITION_STATUS.PUBLISH, COMPETITION_STATUS.LIVE, COMPETITION_STATUS.COMPLETED])
        .order('season', { ascending: false });

      if (compError) throw compError;

      setCompetitions(compData || []);
    } catch (err) {
      console.error('Error fetching organization:', err);
      setError('Failed to load organization');
    } finally {
      setLoading(false);
    }
  };

  const handleCompetitionClick = (comp) => {
    navigate(`/org/${orgSlug}/${comp.city.slug}-${comp.season}`);
  };

  // Group competitions by status
  const liveCompetitions = competitions.filter(c => c.status === COMPETITION_STATUS.LIVE);
  const upcomingCompetitions = competitions.filter(c => c.status === COMPETITION_STATUS.PUBLISH);
  const completedCompetitions = competitions.filter(c => c.status === COMPETITION_STATUS.COMPLETED);

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
          <Building2 size={64} style={{ color: colors.text.muted, marginBottom: spacing.lg }} />
          <h1 style={{ fontSize: typography.fontSize.xxl, marginBottom: spacing.md }}>
            {error === 'Organization not found' ? 'Organization Not Found' : 'Error'}
          </h1>
          <p style={{ color: colors.text.secondary, marginBottom: spacing.xl }}>
            {error === 'Organization not found'
              ? "We couldn't find an organization with that URL."
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
            {/* Logo */}
            <div style={{
              width: 120,
              height: 120,
              borderRadius: borderRadius.xl,
              background: colors.background.secondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              border: `2px solid ${colors.border.light}`,
              flexShrink: 0,
            }}>
              {organization.logo_url ? (
                <img
                  src={organization.logo_url}
                  alt={organization.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Crown size={48} style={{ color: colors.gold.primary }} />
              )}
            </div>

            {/* Info */}
            <div>
              <h1 style={{
                fontSize: typography.fontSize.hero,
                fontWeight: typography.fontWeight.bold,
                marginBottom: spacing.sm,
              }}>
                {organization.name}
              </h1>
              {organization.description && (
                <p style={{
                  fontSize: typography.fontSize.lg,
                  color: colors.text.secondary,
                  maxWidth: '600px',
                }}>
                  {organization.description}
                </p>
              )}
              <p style={{
                marginTop: spacing.md,
                fontSize: typography.fontSize.sm,
                color: colors.text.muted,
              }}>
                {competitions.length} competition{competitions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Competitions Section */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: spacing.xxl }}>
        {/* Live Competitions */}
        {liveCompetitions.length > 0 && (
          <div style={{ marginBottom: spacing.xxl }}>
            <h2 style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              marginBottom: spacing.lg,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#22c55e',
                animation: 'pulse 2s infinite',
              }} />
              Live Competitions
            </h2>
            <div style={{ display: 'grid', gap: spacing.md }}>
              {liveCompetitions.map(comp => (
                <CompetitionCard
                  key={comp.id}
                  competition={comp}
                  onClick={() => handleCompetitionClick(comp)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Competitions */}
        {upcomingCompetitions.length > 0 && (
          <div style={{ marginBottom: spacing.xxl }}>
            <h2 style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              marginBottom: spacing.lg,
            }}>
              Coming Soon
            </h2>
            <div style={{ display: 'grid', gap: spacing.md }}>
              {upcomingCompetitions.map(comp => (
                <CompetitionCard
                  key={comp.id}
                  competition={comp}
                  onClick={() => handleCompetitionClick(comp)}
                  isTeaser
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed Competitions */}
        {completedCompetitions.length > 0 && (
          <div>
            <h2 style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              marginBottom: spacing.lg,
              color: colors.text.secondary,
            }}>
              Past Competitions
            </h2>
            <div style={{ display: 'grid', gap: spacing.md }}>
              {completedCompetitions.map(comp => (
                <CompetitionCard
                  key={comp.id}
                  competition={comp}
                  onClick={() => handleCompetitionClick(comp)}
                  isPast
                />
              ))}
            </div>
          </div>
        )}

        {/* No competitions */}
        {competitions.length === 0 && (
          <div style={{ textAlign: 'center', padding: spacing.xxxl }}>
            <Crown size={64} style={{ color: colors.text.muted, marginBottom: spacing.lg }} />
            <h3 style={{ fontSize: typography.fontSize.xl, marginBottom: spacing.md }}>
              No Competitions Yet
            </h3>
            <p style={{ color: colors.text.secondary }}>
              This organization hasn't launched any public competitions yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Competition Card Component
function CompetitionCard({ competition, onClick, isTeaser, isPast }) {
  const statusConfig = STATUS_CONFIG[competition.status];

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
            width: 56,
            height: 56,
            borderRadius: borderRadius.lg,
            background: isTeaser
              ? 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))'
              : 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {isTeaser ? (
              <Calendar size={24} style={{ color: colors.gold.primary }} />
            ) : (
              <Crown size={24} style={{ color: isPast ? colors.text.muted : '#22c55e' }} />
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
              <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>
                {competition.city?.name}, {competition.city?.state}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, color: colors.text.secondary }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                <Calendar size={14} />
                Season {competition.season}
              </span>
              {competition.number_of_winners && (
                <span>
                  {competition.number_of_winners} winner{competition.number_of_winners > 1 ? 's' : ''}
                </span>
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
