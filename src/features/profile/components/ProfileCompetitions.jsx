import React, { useState, useEffect } from 'react';
import { Trophy, Crown, MapPin, Star, ExternalLink, UserPlus, Clock } from 'lucide-react';
import { Panel, Badge, Button, EliteRankCrown } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { getHostedCompetitions, getContestantCompetitions, getNominationsForUser } from '../../../lib/competition-history';
import { useResponsive } from '../../../hooks/useResponsive';
import AcceptNominationModal from '../../../components/modals/AcceptNominationModal';
import { generateCompetitionSlug, getCompetitionUrl, slugify } from '../../../utils/slugs';

const STATUS_LABELS = {
  upcoming: 'Upcoming',
  nomination: 'Nominations',
  voting: 'Voting',
  completed: 'Completed',
  live: 'Live',
  publish: 'Coming Soon',
};

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

function RoleBadge({ role }) {
  switch (role) {
    case 'nominee':
      return (
        <Badge variant="gold" size="sm" pill>
          <UserPlus size={10} style={{ marginRight: '4px' }} />
          Nominee
        </Badge>
      );
    case 'host':
      return (
        <Badge variant="purple" size="sm" pill>
          <Crown size={10} style={{ marginRight: '4px' }} />
          Host
        </Badge>
      );
    case 'winner':
      return (
        <Badge variant="gold" size="sm" pill>
          <Trophy size={10} style={{ marginRight: '4px' }} />
          Winner
        </Badge>
      );
    case 'contestant':
      return (
        <Badge variant="success" size="sm" pill>
          <Star size={10} style={{ marginRight: '4px' }} />
          Contestant
        </Badge>
      );
    default:
      return null;
  }
}

function CompetitionRow({ name, url, role, status, isUnclaimed, nomination, onAcceptClick, nominatorName, isCompact }) {
  const isActive = ['voting', 'nomination', 'live'].includes(status);
  const isWinner = role === 'winner';

  const bgColor = isUnclaimed
    ? 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))'
    : isWinner
    ? 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))'
    : isActive
    ? 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02))'
    : 'rgba(255,255,255,0.03)';

  const borderColor = isUnclaimed
    ? '1px solid rgba(212,175,55,0.3)'
    : isWinner
    ? '1px solid rgba(212,175,55,0.25)'
    : isActive
    ? '1px solid rgba(34,197,94,0.2)'
    : '1px solid rgba(255,255,255,0.05)';

  return (
    <div
      style={{
        background: bgColor,
        border: borderColor,
        borderRadius: borderRadius.lg,
        padding: isCompact ? spacing.md : spacing.lg,
        overflow: 'hidden',
      }}
    >
      <div style={{
        display: 'flex',
        flexDirection: isCompact ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isCompact ? 'flex-start' : 'center',
        gap: spacing.sm,
      }}>
        <a
          href={url}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            textDecoration: 'none',
            color: colors.text.primary,
            minWidth: 0,
            maxWidth: '100%',
          }}
        >
          <MapPin size={14} style={{ color: colors.gold.primary, flexShrink: 0 }} />
          <span style={{
            fontWeight: typography.fontWeight.semibold,
            fontSize: typography.fontSize.sm,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {name}
          </span>
          <ExternalLink size={12} style={{ color: colors.text.tertiary, flexShrink: 0 }} />
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
          <RoleBadge role={role} />
          {isUnclaimed && nomination ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onAcceptClick(nomination)}
              style={{ fontSize: typography.fontSize.xs }}
            >
              Accept or Decline
            </Button>
          ) : status ? (
            <Badge variant={isActive ? 'success' : 'default'} size="sm" pill>
              {isActive && '● '}{STATUS_LABELS[status] || status}
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Show nominator info for unclaimed nominations */}
      {isUnclaimed && nominatorName && (
        <p style={{
          marginTop: spacing.sm,
          fontSize: typography.fontSize.xs,
          color: colors.text.secondary,
        }}>
          Nominated by {nominatorName}
        </p>
      )}
    </div>
  );
}

export default function ProfileCompetitions({ userId, userEmail, user, profile }) {
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
    return (
      <Panel style={{ marginBottom: spacing.xl }}>
        <div style={{ padding: spacing.xl, textAlign: 'center', color: colors.text.muted }}>
          <Trophy size={32} style={{ marginBottom: spacing.md, opacity: 0.3 }} />
          <p style={{ fontSize: typography.fontSize.sm }}>No competitions yet</p>
        </div>
      </Panel>
    );
  }

  // Build unified list of all competition entries
  const entries = [];

  // Add nominations
  nominations.forEach(nom => {
    const competition = nom?.competition;
    entries.push({
      id: `nom-${nom.id}`,
      name: competition?.name || 'Competition',
      url: getCompetitionLink(competition),
      role: 'nominee',
      status: competition?.status,
      isUnclaimed: !nom.claimed_at,
      nomination: nom,
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
    });
  });

  return (
    <>
      <Panel style={{ marginBottom: spacing.xl }}>
        <div style={{ padding: isSmall ? spacing.lg : spacing.xl }}>
          <h3 style={{
            fontSize: isSmall ? typography.fontSize.lg : typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            marginBottom: spacing.lg,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
          }}>
            <EliteRankCrown size={isSmall ? 18 : 22} /> Competitions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, alignItems: 'flex-start' }}>
            {entries.map(entry => (
              <CompetitionRow
                key={entry.id}
                name={entry.name}
                url={entry.url}
                role={entry.role}
                status={entry.status}
                isUnclaimed={entry.isUnclaimed}
                nomination={entry.nomination}
                onAcceptClick={handleOpenAcceptModal}
                nominatorName={entry.nominatorName}
                isCompact={isSmall}
              />
            ))}
          </div>
        </div>
      </Panel>

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
