import React, { useState, useEffect } from 'react';
import { Trophy, Crown, MapPin, Star, UserPlus, Calendar, ArrowRight } from 'lucide-react';
import { Panel, Badge, Button, EliteRankCrown, OrganizationLogo } from '../../../components/ui';
import { colors, spacing, borderRadius, typography, styleHelpers } from '../../../styles/theme';
import { getHostedCompetitions, getContestantCompetitions, getNominationsForUser } from '../../../lib/competition-history';
import { useResponsive } from '../../../hooks/useResponsive';
import AcceptNominationModal from '../../../components/modals/AcceptNominationModal';
import { generateCompetitionSlug, getCompetitionUrl, slugify } from '../../../utils/slugs';
import { getCityImage } from '../../../utils/cityImages';
import { getPhaseDisplayConfig } from '../../../utils/competitionPhase';

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

function CompetitionCard({ entry, onAcceptClick, isMobile }) {
  const [isHovered, setIsHovered] = useState(false);
  const competition = entry.competition || {};
  const cityName = competition.city?.name || competition.city || '';
  const cityImage = competition.cover_image || getCityImage(cityName, competition.name);
  const org = competition.organization;
  const statusConfig = getPhaseDisplayConfig(competition.status);
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
          position: 'relative',
          borderRadius: borderRadius.xl,
          overflow: 'hidden',
          cursor: 'pointer',
          transform: isHovered ? 'translateY(-3px) scale(1.01)' : 'translateY(0) scale(1)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isHovered
            ? '0 16px 32px -10px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.2)'
            : '0 6px 18px -6px rgba(0, 0, 0, 0.3)',
          aspectRatio: isMobile ? '16/7' : '16/7',
          background: colors.background.card,
        }}
      >
        {/* Background Image */}
        {cityImage && (
          <img
            src={cityImage}
            alt={competition.name}
            loading="lazy"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isHovered ? 'scale(1.06)' : 'scale(1)',
            }}
          />
        )}

        {/* Gradient Overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.4) 100%)',
          transition: 'opacity 0.3s',
          opacity: isHovered ? 0.9 : 1,
        }} />

        {/* Content */}
        <div style={{
          position: 'relative',
          height: '100%',
          padding: isMobile ? spacing.md : spacing.lg,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Top Row: Status + Role + Org Logo */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
              {statusConfig && (
                <Badge variant={statusConfig.variant} size="sm" pill dot={statusConfig.pulse}>
                  {statusConfig.label}
                </Badge>
              )}
              <RoleBadge role={entry.role} />
            </div>
            {org?.logo_url && (
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: borderRadius.lg,
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <OrganizationLogo logo={org.logo_url} size={22} />
              </div>
            )}
          </div>

          {/* Bottom Content */}
          <div style={{ marginTop: 'auto' }}>
            {org?.name && (
              <p style={{
                fontSize: typography.fontSize.xs,
                color: colors.gold.primary,
                fontWeight: typography.fontWeight.medium,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: spacing.xs,
                opacity: 0.9,
              }}>
                {org.name}
              </p>
            )}

            <h3 style={{
              fontSize: isMobile ? typography.fontSize.base : typography.fontSize.lg,
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
              marginBottom: spacing.sm,
              lineHeight: 1.2,
              textShadow: '0 2px 10px rgba(0,0,0,0.3)',
            }}>
              {competition.name || entry.name}
            </h3>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.lg,
              marginBottom: entry.isUnclaimed ? spacing.md : 0,
            }}>
              {cityName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                  <MapPin size={14} style={{ color: colors.gold.primary }} />
                  <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                    {cityName}
                  </span>
                </div>
              )}
              {competition.season && (
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                  <Calendar size={14} style={{ color: colors.text.secondary }} />
                  <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                    Season {competition.season}
                  </span>
                </div>
              )}
              {entry.votes > 0 && (
                <Badge variant="gold" size="sm" pill>
                  {entry.votes.toLocaleString()} votes
                </Badge>
              )}
            </div>

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
                  padding: `${spacing.sm} ${spacing.lg}`,
                  background: isHovered ? colors.gold.primary : 'rgba(212, 175, 55, 0.15)',
                  border: `1.5px solid ${colors.gold.primary}`,
                  borderRadius: borderRadius.lg,
                  color: isHovered ? colors.text.inverse : colors.gold.primary,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                }}
              >
                Accept or Decline
                <ArrowRight size={14} />
              </div>
            )}
          </div>
        </div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
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
