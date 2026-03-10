import React, { useState, useEffect } from 'react';
import { Trophy, Crown, MapPin, Star, UserPlus, Calendar, ArrowRight, Clock, ChevronRight } from 'lucide-react';
import { Panel, Badge, Button, EliteRankCrown, OrganizationLogo } from '../../../components/ui';
import { colors, spacing, borderRadius, typography, styleHelpers } from '../../../styles/theme';
import { getHostedCompetitions, getContestantCompetitions, getNominationsForUser } from '../../../lib/competition-history';
import { useResponsive } from '../../../hooks/useResponsive';
import AcceptNominationModal from '../../../components/modals/AcceptNominationModal';
import { generateCompetitionSlug, getCompetitionUrl, slugify } from '../../../utils/slugs';
import { getCityImage } from '../../../utils/cityImages';
import { getPhaseDisplayConfig, computeCompetitionPhase } from '../../../utils/competitionPhase';

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

function RoleBadge({ role, size = 'sm' }) {
  switch (role) {
    case 'nominee':
      return (
        <Badge variant="gold" size={size} pill>
          <UserPlus size={10} style={{ marginRight: '4px' }} />
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
          <Star size={10} style={{ marginRight: '4px' }} />
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
      return new Date(first.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }
  const votingStart = competition?.settings?.voting_start || competition?.voting_start;
  if (votingStart) {
    return new Date(votingStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return null;
}

function CompetitionCard({ entry, onAcceptClick, isMobile }) {
  const [isHovered, setIsHovered] = useState(false);
  const competition = entry.competition || {};
  const cityName = competition.city?.name || competition.city || '';
  const org = competition.organization;
  const votingDate = getVotingStartDate(competition);
  const url = entry.url;

  return (
    <a
      href={url}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={{
          padding: isMobile ? spacing.md : spacing.lg,
          borderRadius: borderRadius.lg,
          background: isHovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${isHovered ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.06)'}`,
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.sm,
        }}
      >
        {/* Row 1: Org logo + org name + role badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          {org?.logo_url && <OrganizationLogo logo={org.logo_url} size={32} />}
          {org?.name && (
            <span style={{
              fontSize: typography.fontSize.sm,
              color: colors.gold.primary,
              fontWeight: typography.fontWeight.medium,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              {org.name}
            </span>
          )}
          <RoleBadge role={entry.role} />
        </div>

        {/* Row 2: Competition name + season + location */}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' }}>
          <h4 style={{
            fontSize: isMobile ? typography.fontSize.base : typography.fontSize.md,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            lineHeight: 1.3,
          }}>
            {competition.name || entry.name}
          </h4>
          {competition.season && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
              <Calendar size={13} />
              <span>Season {competition.season}</span>
            </div>
          )}
          {cityName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
              <MapPin size={13} />
              <span>{cityName}</span>
            </div>
          )}
        </div>

        {/* Row 3: Voting start + navigate link */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          color: colors.text.secondary,
          fontSize: typography.fontSize.sm,
        }}>
          {votingDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={13} />
              <span>Voting starts {votingDate}</span>
            </div>
          )}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            color: colors.gold.primary,
            fontWeight: typography.fontWeight.medium,
            marginLeft: 'auto',
          }}>
            <span>View</span>
            <ChevronRight size={14} />
          </div>
        </div>

        {entry.votes > 0 && (
          <Badge variant="gold" size="sm" pill style={{ alignSelf: 'flex-start' }}>
            {entry.votes.toLocaleString()} votes
          </Badge>
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
    </a>
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
      competition: competition,
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            {entries.map(entry => (
              <CompetitionCard
                key={entry.id}
                entry={entry}
                onAcceptClick={handleOpenAcceptModal}
                isMobile={isMobile}
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
