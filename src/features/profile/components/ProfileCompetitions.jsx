import React, { useState, useEffect } from 'react';
import { Trophy, Crown, MapPin, Star, Award, Sparkles, ExternalLink, Users } from 'lucide-react';
import { Panel, Badge, Button, Avatar } from '../../../components/ui';
import { colors, spacing, borderRadius, typography, gradients } from '../../../styles/theme';
import { getAllUserCompetitions } from '../../../lib/competition-history';
import { useResponsive } from '../../../hooks/useResponsive';
import { formatNumber } from '../../../utils/formatters';

// Human-readable status labels
const STATUS_LABELS = {
  setup: 'Setup',
  assigned: 'Assigned',
  nomination: 'Nominations Open',
  voting: 'Voting Open',
  judging: 'Judging',
  completed: 'Completed',
  upcoming: 'Upcoming',
  active: 'Active',
  live: 'Live',
  publish: 'Coming Soon',
  draft: 'Draft',
  archive: 'Archived',
};

// Status badge variants
const STATUS_VARIANTS = {
  setup: 'default',
  assigned: 'info',
  nomination: 'warning',
  voting: 'success',
  judging: 'info',
  completed: 'purple',
  upcoming: 'default',
  active: 'success',
  live: 'success',
  publish: 'warning',
  draft: 'default',
  archive: 'default',
};

// Role display config
const ROLE_CONFIG = {
  host: { label: 'Host', icon: Crown, color: colors.accent.purple },
  contestant: { label: 'Contestant', icon: Star, color: colors.gold.primary },
};

/**
 * Inline vote card for active competitions
 */
function InlineVoteCard({ entry, onVote }) {
  const { isMobile } = useResponsive();
  const isActive = entry.competition?.phase === 'voting' || entry.competition?.status === 'voting';

  if (!isActive || entry.role !== 'contestant') return null;

  return (
    <div
      style={{
        marginTop: spacing.md,
        padding: spacing.md,
        background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.05))',
        border: '1px solid rgba(34,197,94,0.2)',
        borderRadius: borderRadius.lg,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <Sparkles size={16} style={{ color: colors.status.success }} />
          <span style={{ fontSize: typography.fontSize.sm, color: colors.status.success, fontWeight: typography.fontWeight.medium }}>
            Voting is open!
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
            {formatNumber(entry.votes || 0)} votes
          </span>
          <Button
            size="sm"
            onClick={() => onVote?.(entry)}
            style={{
              background: gradients.gold,
              color: '#0a0a0f',
              padding: `${spacing.xs} ${spacing.md}`,
              fontWeight: typography.fontWeight.semibold,
            }}
          >
            Vote
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Single competition card
 */
function CompetitionCard({ entry, onVote, onViewCompetition }) {
  const { isMobile } = useResponsive();

  // Determine role (users can only be one role per competition)
  const isHost = entry.role === 'host' || entry.isHost;
  const isContestant = entry.role === 'contestant';

  // Get appropriate role config for display
  const roleConfig = isHost ? ROLE_CONFIG.host : ROLE_CONFIG.contestant;
  const RoleIcon = roleConfig.icon;

  const competition = entry.competition || entry;
  const city = competition.city || entry.city || 'Unknown';
  const season = competition.season || entry.season || '';
  const status = competition.status || competition.phase || entry.status || entry.phase || 'upcoming';
  const isActive = status === 'voting' || status === 'nomination' || status === 'live' || status === 'active';

  // Generate competition URL
  const getCompetitionUrl = () => {
    const orgSlug = entry.organization?.slug || competition.organization?.slug || 'most-eligible';
    const citySlug = city.toLowerCase().replace(/\s+/g, '-').replace(/,/g, '');
    return `/${orgSlug}/${citySlug}-${season}`;
  };

  return (
    <div
      style={{
        background: entry.isWinner
          ? 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))'
          : isActive
          ? 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02))'
          : 'rgba(255,255,255,0.03)',
        border: entry.isWinner
          ? '1px solid rgba(212,175,55,0.3)'
          : isActive
          ? '1px solid rgba(34,197,94,0.2)'
          : '1px solid rgba(255,255,255,0.05)',
        borderRadius: borderRadius.lg,
        padding: isMobile ? spacing.md : spacing.lg,
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: spacing.sm,
        marginBottom: spacing.sm,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
            <MapPin size={14} style={{ color: roleConfig.color, flexShrink: 0 }} />
            <span style={{
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              fontSize: isMobile ? typography.fontSize.sm : typography.fontSize.md,
            }}>
              {city} {season}
            </span>
          </div>

          {/* Role badge */}
          <Badge
            variant={isHost ? 'purple' : 'gold'}
            size="sm"
            style={{
              background: 'transparent',
              border: `1px solid ${roleConfig.color}40`,
            }}
          >
            {isHost ? (
              <><Crown size={10} style={{ marginRight: '4px' }} />Host</>
            ) : (
              <><Star size={10} style={{ marginRight: '4px' }} />Contestant</>
            )}
          </Badge>
        </div>

        {/* Status / Result badges */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: spacing.xs }}>
          {entry.isWinner ? (
            <Badge variant="gold" size="sm">
              <Trophy size={12} /> Winner
            </Badge>
          ) : entry.placement ? (
            <Badge variant="info" size="sm">
              #{entry.placement}
            </Badge>
          ) : (
            <Badge variant={STATUS_VARIANTS[status] || 'default'} size="sm" pill>
              {isActive && '● '}{STATUS_LABELS[status] || status}
            </Badge>
          )}
        </div>
      </div>

      {/* Stats row for contestants */}
      {isContestant && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.lg,
          fontSize: typography.fontSize.xs,
          color: colors.text.secondary,
          marginTop: spacing.sm,
        }}>
          {typeof entry.votes === 'number' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
              <Users size={12} />
              {formatNumber(entry.votes)} votes
            </span>
          )}
        </div>
      )}

      {/* Vote card for active competitions where user is contestant */}
      {isContestant && (status === 'voting' || competition.phase === 'voting') && (
        <InlineVoteCard entry={entry} onVote={onVote} />
      )}

      {/* View competition link */}
      <div style={{ marginTop: spacing.md }}>
        <a
          href={getCompetitionUrl()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.xs,
            fontSize: typography.fontSize.xs,
            color: colors.text.tertiary,
            textDecoration: 'none',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = colors.gold.primary}
          onMouseLeave={(e) => e.currentTarget.style.color = colors.text.tertiary}
        >
          <ExternalLink size={12} />
          View Competition
        </a>
      </div>
    </div>
  );
}

/**
 * ProfileCompetitions - Displays all competitions user is part of
 */
export default function ProfileCompetitions({ userId, onVote }) {
  const { isMobile } = useResponsive();
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompetitions = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const data = await getAllUserCompetitions(userId);
        setCompetitions(data);
      } catch (err) {
        console.error('Error fetching competitions:', err);
      }
      setLoading(false);
    };

    fetchCompetitions();
  }, [userId]);

  // Group competitions by active vs past
  const activeCompetitions = competitions.filter(c => {
    const status = c.competition?.status || c.status;
    return ['voting', 'nomination', 'live', 'active', 'judging'].includes(status);
  });

  const pastCompetitions = competitions.filter(c => {
    const status = c.competition?.status || c.status;
    return !['voting', 'nomination', 'live', 'active', 'judging'].includes(status);
  });

  if (loading) {
    return (
      <Panel style={{ marginBottom: isMobile ? spacing.md : spacing.xl }}>
        <div style={{ padding: isMobile ? spacing.lg : spacing.xxl }}>
          <h3 style={{
            fontSize: isMobile ? typography.fontSize.lg : typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            marginBottom: spacing.lg,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md
          }}>
            <Trophy size={isMobile ? 18 : 20} style={{ color: colors.gold.primary }} /> Competitions
          </h3>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: spacing.xl,
            color: colors.text.muted,
          }}>
            Loading competitions...
          </div>
        </div>
      </Panel>
    );
  }

  if (competitions.length === 0) {
    return (
      <Panel style={{ marginBottom: isMobile ? spacing.md : spacing.xl }}>
        <div style={{ padding: isMobile ? spacing.lg : spacing.xxl }}>
          <h3 style={{
            fontSize: isMobile ? typography.fontSize.lg : typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            marginBottom: spacing.lg,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md
          }}>
            <Trophy size={isMobile ? 18 : 20} style={{ color: colors.gold.primary }} /> Competitions
          </h3>
          <div style={{
            textAlign: 'center',
            padding: spacing.xl,
            color: colors.text.muted,
            fontSize: typography.fontSize.sm,
          }}>
            <Trophy size={32} style={{ marginBottom: spacing.md, opacity: 0.3 }} />
            <p>No competitions yet</p>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel style={{ marginBottom: isMobile ? spacing.md : spacing.xl }}>
      <div style={{ padding: isMobile ? spacing.lg : spacing.xxl }}>
        <h3 style={{
          fontSize: isMobile ? typography.fontSize.lg : typography.fontSize.xl,
          fontWeight: typography.fontWeight.semibold,
          marginBottom: spacing.lg,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md
        }}>
          <Trophy size={isMobile ? 18 : 20} style={{ color: colors.gold.primary }} /> Competitions
        </h3>

        {/* Active Competitions */}
        {activeCompetitions.length > 0 && (
          <div style={{ marginBottom: pastCompetitions.length > 0 ? spacing.xl : 0 }}>
            <p style={{
              fontSize: typography.fontSize.xs,
              color: colors.status.success,
              fontWeight: typography.fontWeight.semibold,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: spacing.md,
            }}>
              Active ({activeCompetitions.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {activeCompetitions.map((entry) => (
                <CompetitionCard
                  key={entry.id}
                  entry={entry}
                  onVote={onVote}
                />
              ))}
            </div>
          </div>
        )}

        {/* Past Competitions */}
        {pastCompetitions.length > 0 && (
          <div>
            {activeCompetitions.length > 0 && (
              <p style={{
                fontSize: typography.fontSize.xs,
                color: colors.text.muted,
                fontWeight: typography.fontWeight.semibold,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: spacing.md,
              }}>
                Past ({pastCompetitions.length})
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {pastCompetitions.map((entry) => (
                <CompetitionCard
                  key={entry.id}
                  entry={entry}
                  onVote={onVote}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
