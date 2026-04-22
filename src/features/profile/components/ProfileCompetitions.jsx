import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Crown, Star, Award, ArrowRight, ChevronRight, Clock } from 'lucide-react';
import { Panel, Badge, Button, EliteRankCrown, OrganizationLogo } from '../../../components/ui';
import { colors, spacing, borderRadius, typography, styleHelpers } from '../../../styles/theme';
import { getHostedCompetitions, getContestantCompetitions, getNominationsForUser } from '../../../lib/competition-history';

import { useResponsive } from '../../../hooks/useResponsive';
import { useLeaderboard } from '../../../hooks';
import useCountdown from '../../../hooks/useCountdown';
import { formatNumber } from '../../../utils/formatters';
import AcceptNominationModal from '../../../components/modals/AcceptNominationModal';
import { generateCompetitionSlug, getCompetitionUrl, slugify } from '../../../utils/slugs';
import { getCityImage } from '../../../utils/cityImages';
import { getPhaseDisplayConfig, computeCompetitionPhase } from '../../../utils/competitionPhase';
import CompetitionCardVoting from './CompetitionCardVoting';

/**
 * Given a competition with a voting_rounds join, return the currently active
 * voting round (one whose [start_date, end_date) window contains `now`).
 * Returns null if no active round.
 */
function findActiveVotingRound(competition) {
  const rounds = competition?.voting_rounds || [];
  if (!rounds.length) return null;
  const now = Date.now();
  const active = rounds.find((r) => {
    if (r.round_type && r.round_type !== 'voting') return false;
    const start = r.start_date ? new Date(r.start_date).getTime() : null;
    const end = r.end_date ? new Date(r.end_date).getTime() : null;
    return start && end && now >= start && now < end;
  });
  return active || null;
}

/**
 * In preview mode, synthesize a plausible active round so the inline voting
 * panel renders even when the real voting window hasn't opened. Real
 * mutations are blocked downstream by the isPreview flag — this exists only
 * to drive the UI.
 */
function synthesizePreviewRound(competition) {
  const rounds = competition?.voting_rounds || [];
  const sorted = [...rounds]
    .filter((r) => !r.round_type || r.round_type === 'voting')
    .sort((a, b) => (a.round_order || 0) - (b.round_order || 0));
  const first = sorted[0];
  return {
    id: first?.id || 'preview-round',
    round_order: first?.round_order || 1,
    round_type: 'voting',
    start_date: first?.start_date || null,
    end_date: first?.end_date || null,
    isActive: true,
  };
}

function getCompetitionLink(competition) {
  const orgSlug = competition?.organization?.slug || 'most-eligible';
  if (competition?.slug) {
    return getCompetitionUrl(orgSlug, competition.slug);
  }
  if (competition?.id) {
    return `/${orgSlug}/id/${competition.id}`;
  }
  const cityName = competition?.city?.name || competition?.city || '';
  const generatedSlug = generateCompetitionSlug({
    name: competition?.name,
    citySlug: slugify(cityName),
    season: competition?.season || '',
  });
  return getCompetitionUrl(orgSlug, generatedSlug);
}

function StatBox({ label, value, suffix, icon, accent = false }) {
  return (
    <div style={{
      padding: spacing.md,
      background: accent ? 'rgba(212,175,55,0.06)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${accent ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: borderRadius.md,
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      minWidth: 0,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.xs,
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.semibold,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: accent ? colors.gold.primary : colors.text.muted,
        minWidth: 0,
      }}>
        {icon}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: spacing.xs,
        lineHeight: 1,
      }}>
        <span style={{
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.bold,
          color: accent ? colors.gold.primary : colors.text.primary,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {value}
        </span>
        {suffix && (
          <span style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.muted,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function RoleBadge({ role, size = 'sm' }) {
  switch (role) {
    case 'nominee':
      return (
        <Badge variant="gold" size={size} pill>
          <Award size={10} style={{ marginRight: '4px' }} />
          Nominee
        </Badge>
      );
    case 'host':
      return (
        <Badge variant="purple" size={size} pill>
          <Crown size={10} style={{ marginRight: '4px' }} />
          Host
        </Badge>
      );
    case 'winner':
      return (
        <Badge variant="gold" size={size} pill>
          <Trophy size={10} style={{ marginRight: '4px' }} />
          Winner
        </Badge>
      );
    case 'contestant':
      return (
        <Badge variant="success" size={size} pill>
          <Crown size={10} style={{ marginRight: '4px' }} />
          Contestant
        </Badge>
      );
    default:
      return null;
  }
}

function getVotingStartDate(competition) {
  const rounds = competition?.voting_rounds || [];
  if (rounds.length > 0) {
    const sorted = [...rounds].sort((a, b) => (a.round_order || 0) - (b.round_order || 0));
    const first = sorted[0];
    if (first?.start_date) {
      return new Date(first.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }
  const votingStart = competition?.settings?.voting_start || competition?.voting_start;
  if (votingStart) {
    return new Date(votingStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return null;
}

function CompetitionCard({ entry, onAcceptClick, isMobile, isPreview = false }) {
  const [isHovered, setIsHovered] = useState(false);
  const competition = entry.competition || {};
  const cityName = competition.city?.name || competition.city || '';
  const org = competition.organization;
  const url = entry.url;

  // Inline voting is only shown for contestant entries during an active
  // voting round. Nominations / between-rounds / completed phases keep the
  // card as-is — unless the host is previewing the voting phase via the
  // dashboard Preview tab (isPreview), in which case we synthesize an
  // active round from the first voting_rounds row so the panel renders.
  const isContestantEntry = entry.role === 'contestant' || entry.role === 'winner';
  const realRound = isContestantEntry ? findActiveVotingRound(competition) : null;
  const previewRound = isContestantEntry && isPreview && !realRound
    ? synthesizePreviewRound(competition)
    : null;
  const activeRound = realRound || previewRound;
  const showInlineVoting = !!activeRound && !!entry.contestant?.id;

  // Leaderboard is fetched at the card level so the stats row and the
  // voting panel share a single round trip. realtime:false — the rank in
  // the stats bar doesn't need to update live.
  const { contestants: leaderboard } = useLeaderboard(
    showInlineVoting ? competition.id : null,
    { realtime: false },
  );

  // Countdown to the active round's end_date — drives the ROUND ENDS stat.
  const countdown = useCountdown(activeRound?.end_date || null);

  // Contestant's current rank + total, derived from the fresh leaderboard
  // snapshot so the stats bar matches the payload the voting panel sees.
  const rankStats = useMemo(() => {
    if (!showInlineVoting || !leaderboard?.length || !entry.contestant?.id) return null;
    const byVotes = [...leaderboard].sort((a, b) => (b.votes || 0) - (a.votes || 0));
    const idx = byVotes.findIndex((c) => c.id === entry.contestant.id);
    if (idx === -1) return null;
    return { current: idx + 1, total: byVotes.length };
  }, [showInlineVoting, leaderboard, entry.contestant?.id]);

  const voteCount = entry.contestant?.votes ?? entry.votes ?? 0;

  // When the voting panel is visible, the outer <a> causes button clicks
  // to bubble and trigger navigation. Split the card into a clickable
  // "link area" (top of card) and a non-link "voting area" (bottom) that
  // are siblings — so button clicks in the voting panel never reach the
  // link. When there's no voting panel, the old anchor-wrapped layout is
  // fine and keeps full-card-click behavior.
  const CardBody = (
    <div
      style={{
        padding: isMobile ? spacing.md : spacing.lg,
        borderRadius: borderRadius.lg,
        background: isHovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isHovered ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.06)'}`,
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.sm,
        overflow: 'hidden',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <a
        href={url}
        style={{
          textDecoration: 'none',
          color: 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          cursor: 'pointer',
          minWidth: 0,
        }}
      >
        {/* Large org logo as its own column, vertically centered and
            sized to match the content stack height. */}
        {org?.logo_url && (
          <OrganizationLogo
            logo={org.logo_url}
            size={isMobile ? 72 : 84}
            alt={org?.name || 'Organization'}
          />
        )}

        {/* Content column: name + badge + meta, stacked. */}
        <div style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.xs,
        }}>
          {/* Row 1: Competition name on its own line, full width. */}
          <h4 style={{
            fontSize: isMobile ? typography.fontSize.base : typography.fontSize.md,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            lineHeight: 1.3,
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            letterSpacing: typography.letterSpacing.tight,
          }}>
            {competition.name || entry.name}
          </h4>

          {/* Row 2: Role badge as a label beneath the title. Skipped when
              the role doesn't map to a badge so we don't leave an empty
              gap in the stack. */}
          {entry.role && (
            <div style={{ display: 'flex' }}>
              <RoleBadge role={entry.role} />
            </div>
          )}

          {/* Row 3: Meta (city · season) — kept tight because rank / votes
              / round-end now live in the stats row below. */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.xs,
            fontSize: typography.fontSize.xs,
            color: colors.text.secondary,
            whiteSpace: 'nowrap',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {cityName && (
              <span style={{ flexShrink: 0 }}>{cityName}</span>
            )}
            {cityName && competition.season && (
              <span style={{ color: colors.text.muted, flexShrink: 0 }}>·</span>
            )}
            {competition.season && (
              <span style={{ flexShrink: 0 }}>{competition.season}</span>
            )}
          </div>
        </div>

        {/* Chevron only for non-contestant entries — contestant cards are
            primarily about the inline voting panel, so the navigational
            affordance would compete with the primary CTA. */}
        {!showInlineVoting && (
          <ChevronRight
            size={18}
            style={{
              flexShrink: 0,
              color: isHovered ? colors.gold.primary : colors.text.tertiary,
              transition: 'color 0.2s ease',
            }}
          />
        )}
      </a>

      {/* Stats row: rank / votes / round-ends — rendered only for contestant
          entries with an active voting round, since the data only makes
          sense there. */}
      {showInlineVoting && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: spacing.sm,
        }}>
          <StatBox
            label="Rank"
            value={rankStats ? `#${rankStats.current}` : '—'}
            suffix={rankStats ? `/ ${rankStats.total}` : undefined}
          />
          <StatBox
            label="Votes"
            value={formatNumber(voteCount)}
          />
          <StatBox
            label="Round ends"
            value={countdown?.isExpired ? 'Ended' : (countdown?.display?.primary || '—')}
            icon={<Clock size={12} />}
            accent
          />
        </div>
      )}

      {/* Inline voting panel — sibling to the link, not inside it, so
          button clicks never bubble into the <a>'s navigation. */}
      {showInlineVoting && (
        <CompetitionCardVoting
          contestant={entry.contestant}
          competition={competition}
          currentRound={activeRound}
          isPreview={isPreview}
          leaderboard={leaderboard}
        />
      )}

      {/* Unclaimed CTA */}
      {entry.isUnclaimed && entry.nomination && (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAcceptClick(entry.nomination);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.sm,
            padding: `${spacing.xs} ${spacing.md}`,
            background: 'rgba(212, 175, 55, 0.15)',
            border: `1px solid ${colors.gold.primary}`,
            borderRadius: borderRadius.md,
            color: colors.gold.primary,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            cursor: 'pointer',
            marginTop: spacing.xs,
            alignSelf: 'flex-start',
          }}
        >
          Accept or Decline
          <ArrowRight size={13} />
        </div>
      )}
    </div>
  );

  return CardBody;
}

export default function ProfileCompetitions({ userId, userEmail, user, profile, isOwnProfile = false, isPreview = false }) {
  const { isMobile, isSmall } = useResponsive();
  const [hostedCompetitions, setHostedCompetitions] = useState([]);
  const [contestantEntries, setContestantEntries] = useState([]);
  const [nominations, setNominations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNomination, setSelectedNomination] = useState(null);

  const handleOpenAcceptModal = (nomination) => {
    setSelectedNomination(nomination);
  };

  const handleCloseAcceptModal = () => {
    setSelectedNomination(null);
  };

  const handleAccept = () => {
    setNominations(prev => prev.filter(n => n.id !== selectedNomination?.id));
    setSelectedNomination(null);
  };

  const handleDecline = () => {
    setNominations(prev => prev.filter(n => n.id !== selectedNomination?.id));
    setSelectedNomination(null);
  };

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    Promise.all([
      getHostedCompetitions(userId),
      getContestantCompetitions(userId),
      getNominationsForUser(userId, userEmail),
    ]).then(([hosted, contestant, noms]) => {
      setHostedCompetitions(hosted);
      setContestantEntries(contestant);
      setNominations(noms);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId, userEmail]);

  const hasHosted = hostedCompetitions.length > 0;
  const hasContestant = contestantEntries.length > 0;
  const hasNominations = nominations.length > 0;

  if (loading) {
    return (
      <Panel style={{ marginBottom: spacing.xl }}>
        <div style={{ padding: spacing.xl, textAlign: 'center', color: colors.text.muted }}>
          Loading competitions...
        </div>
      </Panel>
    );
  }

  if (!hasHosted && !hasContestant && !hasNominations) {
    return null;
  }

  // Build unified list of all competition entries
  const entries = [];

  // Track competition IDs that already have a contestant entry, to
  // avoid showing duplicate cards when a nomination was converted.
  const contestantCompetitionIds = new Set(
    contestantEntries.map(e => e.competition_id).filter(Boolean)
  );

  // Add nominations — skip if the nominee was converted AND we already
  // have a matching contestant entry for that competition.
  nominations.forEach(nom => {
    const competition = nom?.competition;
    const competitionId = competition?.id;

    if (nom.converted_to_contestant && competitionId && contestantCompetitionIds.has(competitionId)) {
      return; // Already shown as contestant
    }

    // Only treat as converted if the nominee flag is set AND a matching
    // contestant record actually exists. This handles cases where the
    // contestant row was removed but the nominee flag wasn't cleared.
    const isConverted = nom.converted_to_contestant && competitionId && contestantCompetitionIds.has(competitionId);

    entries.push({
      id: `nom-${nom.id}`,
      name: competition?.name || 'Competition',
      url: getCompetitionLink(competition),
      role: isConverted ? 'contestant' : 'nominee',
      status: competition?.status,
      competition: competition,
      isUnclaimed: !isConverted && !nom.claimed_at && nom.status !== 'approved',
      nomination: isConverted ? null : nom,
      nominatorName: !nom.nominator_anonymous ? nom.nominator_name : null,
    });
  });

  // Add hosted competitions
  hostedCompetitions.forEach(comp => {
    entries.push({
      id: `host-${comp.id}`,
      name: comp?.name || `${comp?.city?.name || comp?.city || 'Competition'} ${comp?.season || ''}`.trim(),
      url: getCompetitionLink(comp),
      role: 'host',
      status: comp?.status,
      competition: comp,
    });
  });

  // Add contestant entries
  contestantEntries.forEach(entry => {
    const comp = entry.competition;
    const isWinner = entry?.status === 'winner';
    entries.push({
      id: `contestant-${entry.id}`,
      name: comp?.name || `${comp?.city?.name || comp?.city || 'Competition'} ${comp?.season || ''}`.trim(),
      url: getCompetitionLink(comp),
      role: isWinner ? 'winner' : 'contestant',
      status: comp?.status,
      competition: comp,
      votes: entry.votes || 0,
      contestant: {
        id: entry.id,
        name: entry.name,
        avatarUrl: entry.avatar_url,
        votes: entry.votes,
      },
    });
  });

  return (
    <>
      <div style={{ borderTop: `1px solid ${colors.border.secondary}` }} />
      <div style={{ padding: isSmall ? spacing.lg : spacing.xxl }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            {entries.map(entry => (
              <CompetitionCard
                key={entry.id}
                entry={entry}
                onAcceptClick={handleOpenAcceptModal}
                isMobile={isMobile}
                isPreview={isPreview}
              />
            ))}
          </div>
      </div>

      {/* Accept Nomination Modal */}
      {selectedNomination && (
        <AcceptNominationModal
          isOpen={true}
          onClose={handleCloseAcceptModal}
          nomination={selectedNomination}
          profile={profile}
          user={user}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      )}
    </>
  );
}
