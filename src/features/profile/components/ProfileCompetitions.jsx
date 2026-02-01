import React, { useState, useEffect } from 'react';
import { Trophy, Crown, MapPin, Star, ExternalLink, UserPlus, Clock } from 'lucide-react';
import { Panel, Badge, Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { getHostedCompetitions, getContestantCompetitions, getNominationsForUser } from '../../../lib/competition-history';
import { useResponsive } from '../../../hooks/useResponsive';
import AcceptNominationModal from '../../../components/modals/AcceptNominationModal';

const STATUS_LABELS = {
  upcoming: 'Upcoming',
  nomination: 'Nominations',
  voting: 'Voting',
  completed: 'Completed',
  live: 'Live',
  publish: 'Coming Soon',
};

function NominationCard({ nomination, onAcceptClick }) {
  const { isMobile } = useResponsive();
  const competition = nomination?.competition;
  const cityName = competition?.city?.name || 'Competition';
  const season = competition?.season || '';
  const isUnclaimed = !nomination.claimed_at;

  const url = `/most-eligible/${cityName.toLowerCase().replace(/\s+/g, '-')}-${season}`;

  return (
    <div
      style={{
        background: isUnclaimed
          ? 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))'
          : 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(139,92,246,0.05))',
        border: isUnclaimed
          ? '1px solid rgba(212,175,55,0.3)'
          : '1px solid rgba(139,92,246,0.2)',
        borderRadius: borderRadius.lg,
        padding: isMobile ? spacing.md : spacing.lg,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
        <a
          href={url}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            textDecoration: 'none',
            color: colors.text.primary,
          }}
        >
          <MapPin size={14} style={{ color: isUnclaimed ? colors.gold.primary : colors.accent.purple }} />
          <span style={{ fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm }}>
            {cityName} {season}
          </span>
          <ExternalLink size={12} style={{ color: colors.text.tertiary }} />
        </a>

        {isUnclaimed ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onAcceptClick(nomination)}
            style={{ fontSize: typography.fontSize.xs }}
          >
            Accept or Decline
          </Button>
        ) : (
          <Badge variant="purple" size="sm" pill>
            <Clock size={10} style={{ marginRight: '4px' }} />
            Awaiting Approval
          </Badge>
        )}
      </div>

      {/* Show nominator info for unclaimed */}
      {isUnclaimed && nomination.nominator_name && !nomination.nominator_anonymous && (
        <p style={{
          marginTop: spacing.sm,
          fontSize: typography.fontSize.xs,
          color: colors.text.secondary,
        }}>
          Nominated by {nomination.nominator_name}
        </p>
      )}
    </div>
  );
}

function CompetitionCard({ competition, role, contestantData }) {
  const { isMobile } = useResponsive();
  const isHost = role === 'host';
  const city = competition?.city || 'Competition';
  const season = competition?.season || '';
  const status = competition?.status || 'upcoming';
  const isActive = ['voting', 'nomination', 'live'].includes(status);
  const isWinner = contestantData?.status === 'winner';

  const url = `/most-eligible/${city.toLowerCase().replace(/\s+/g, '-')}-${season}`;

  return (
    <a
      href={url}
      style={{
        display: 'block',
        background: isWinner
          ? 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))'
          : isActive
          ? 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02))'
          : 'rgba(255,255,255,0.03)',
        border: isWinner
          ? '1px solid rgba(212,175,55,0.3)'
          : isActive
          ? '1px solid rgba(34,197,94,0.2)'
          : '1px solid rgba(255,255,255,0.05)',
        borderRadius: borderRadius.lg,
        padding: isMobile ? spacing.md : spacing.lg,
        textDecoration: 'none',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
            <MapPin size={14} style={{ color: isHost ? colors.accent.purple : colors.gold.primary }} />
            <span style={{ fontWeight: typography.fontWeight.semibold, color: colors.text.primary, fontSize: typography.fontSize.sm }}>
              {city} {season}
            </span>
          </div>
          {contestantData && (
            <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
              {contestantData.votes?.toLocaleString() || 0} votes
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          {isWinner ? (
            <Badge variant="gold" size="sm"><Trophy size={12} /> Winner</Badge>
          ) : (
            <Badge variant={isActive ? 'success' : 'default'} size="sm" pill>
              {isActive && '● '}{STATUS_LABELS[status] || status}
            </Badge>
          )}
          <ExternalLink size={14} style={{ color: colors.text.tertiary }} />
        </div>
      </div>
    </a>
  );
}

export default function ProfileCompetitions({ userId, userEmail, user, profile }) {
  const { isMobile } = useResponsive();
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
    // Remove the accepted nomination from the list (it's now claimed)
    setNominations(prev => prev.filter(n => n.id !== selectedNomination?.id));
    setSelectedNomination(null);
  };

  const handleDecline = () => {
    // Remove the declined nomination from the list
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

  return (
    <>
      {/* Nominations Section */}
      {hasNominations && (
        <Panel style={{ marginBottom: spacing.xl }}>
          <div style={{ padding: isMobile ? spacing.lg : spacing.xl }}>
            <h3 style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.semibold,
              marginBottom: spacing.lg,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm
            }}>
              <UserPlus size={18} style={{ color: colors.gold.primary }} /> Nominations
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {nominations.map(nom => (
                <NominationCard
                  key={nom.id}
                  nomination={nom}
                  onAcceptClick={handleOpenAcceptModal}
                />
              ))}
            </div>
          </div>
        </Panel>
      )}

      {/* Hosting Section */}
      {hasHosted && (
        <Panel style={{ marginBottom: spacing.xl }}>
          <div style={{ padding: isMobile ? spacing.lg : spacing.xl }}>
            <h3 style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.semibold,
              marginBottom: spacing.lg,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm
            }}>
              <Crown size={18} style={{ color: colors.accent.purple }} /> Hosting
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {hostedCompetitions.map(comp => (
                <CompetitionCard key={comp.id} competition={comp} role="host" />
              ))}
            </div>
          </div>
        </Panel>
      )}

      {/* Contestant Section */}
      {hasContestant && (
        <Panel style={{ marginBottom: spacing.xl }}>
          <div style={{ padding: isMobile ? spacing.lg : spacing.xl }}>
            <h3 style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.semibold,
              marginBottom: spacing.lg,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm
            }}>
              <Star size={18} style={{ color: colors.gold.primary }} /> Competed
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {contestantEntries.map(entry => (
                <CompetitionCard
                  key={entry.id}
                  competition={entry.competition}
                  role="contestant"
                  contestantData={entry}
                />
              ))}
            </div>
          </div>
        </Panel>
      )}

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
