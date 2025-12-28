import React, { useState, useEffect } from 'react';
import { X, Crown, Users, Calendar, Sparkles, Award, UserPlus, Trophy, Clock } from 'lucide-react';
import { Button, Badge } from '../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import ContestantsTab from './components/ContestantsTab';
import EventsTab from './components/EventsTab';
import AnnouncementsTab from './components/AnnouncementsTab';
import AboutTab from './components/AboutTab';
import NominationTab from './components/NominationTab';
import WinnersTab from './components/WinnersTab';
import VoteModal from './components/VoteModal';
import CompetitionTeaser from './components/CompetitionTeaser';

const VOTING_TABS = [
  { id: 'contestants', label: 'Contestants', icon: Users },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'announcements', label: 'Announcements', icon: Sparkles },
  { id: 'about', label: 'About', icon: Award },
];

const NOMINATION_TABS = [
  { id: 'nominate', label: 'Nominate', icon: UserPlus },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'announcements', label: 'Announcements', icon: Sparkles },
  { id: 'about', label: 'About', icon: Award },
];

const COMPLETED_TABS = [
  { id: 'winners', label: 'Winners', icon: Trophy },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'announcements', label: 'Announcements', icon: Sparkles },
  { id: 'about', label: 'About', icon: Award },
];

export default function PublicSitePage({
  isOpen,
  onClose,
  city = 'New York',
  season = '2026',
  phase = 'voting', // Timeline phase: 'nomination', 'voting', 'judging', 'completed' or status: 'draft', 'publish', 'complete'
  contestants,
  events,
  announcements,
  judges,
  sponsors,
  host,
  winners = [],
  forceDoubleVoteDay = true,
  competition = null, // Competition object with timeline data
  isAuthenticated = false, // Whether user is logged in
  onLogin, // Callback to trigger login flow
  userEmail, // User's email for pre-filling forms
  userInstagram, // User's instagram for pre-filling forms
  user, // Full user object for forms
}) {
  // Check if this is a teaser page (publish status)
  // Defensive: check both isTeaser prop AND status to ensure published competitions show teaser
  const isTeaser = competition?.isTeaser === true || competition?.status === 'publish';

  // Debug logging for troubleshooting
  if (isOpen) {
    console.log('[PublicSitePage] Rendering with:', {
      isOpen,
      isTeaser,
      competitionStatus: competition?.status,
      competitionIsTeaser: competition?.isTeaser,
      city: competition?.city,
    });
  }

  // If teaser mode, render the teaser component
  if (isOpen && isTeaser) {
    return (
      <CompetitionTeaser
        competition={competition}
        onClose={onClose}
        isAuthenticated={isAuthenticated}
        onLogin={onLogin}
        user={user}
      />
    );
  }

  // Determine phase categories based on computed phase from timeline
  // 'draft' status shouldn't reach here (not accessible), but handle gracefully
  const isDraftPhase = phase === 'draft';
  const isNominationPhase = phase === 'nomination';
  const isVotingPhase = phase === 'voting';
  const isJudgingPhase = phase === 'judging';
  const isCompletedPhase = phase === 'completed' || phase === 'complete';

  // Determine which tabs to show based on phase
  let TABS;
  let defaultTab;

  if (isCompletedPhase) {
    TABS = COMPLETED_TABS;
    defaultTab = 'winners';
  } else if (isNominationPhase || isDraftPhase) {
    // Show nomination tabs for nomination phase
    TABS = NOMINATION_TABS;
    defaultTab = 'nominate';
  } else {
    // Voting or judging phase - show contestants
    TABS = VOTING_TABS;
    defaultTab = 'contestants';
  }
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [selectedContestant, setSelectedContestant] = useState(null);
  const [voteCount, setVoteCount] = useState(1);

  // Reset active tab when phase or city changes
  useEffect(() => {
    // Determine correct default tab based on phase
    let newDefaultTab;
    if (phase === 'completed' || phase === 'complete') {
      newDefaultTab = 'winners';
    } else if (phase === 'nomination' || phase === 'draft') {
      newDefaultTab = 'nominate';
    } else {
      newDefaultTab = 'contestants';
    }
    setActiveTab(newDefaultTab);
  }, [phase, city]);

  if (!isOpen) return null;

  const platinumSponsor = sponsors.find((s) => s.tier === 'Platinum');

  const headerStyle = {
    background: 'linear-gradient(135deg, rgba(212,175,55,0.1), transparent)',
    borderBottom: `1px solid rgba(212,175,55,0.2)`,
    padding: `${spacing.lg} ${spacing.xxl}`,
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backdropFilter: 'blur(20px)',
  };

  const navStyle = {
    background: 'rgba(20,20,30,0.8)',
    borderBottom: `1px solid ${colors.border.lighter}`,
    padding: `0 ${spacing.xxl}`,
    position: 'sticky',
    top: '73px',
    zIndex: 9,
  };

  const getTabStyle = (isActive) => ({
    padding: `${spacing.md} ${spacing.xl}`,
    color: isActive ? colors.gold.primary : colors.text.secondary,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    borderBottom: `2px solid ${isActive ? colors.gold.primary : 'transparent'}`,
    background: 'none',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0a0f',
        zIndex: 100,
        overflow: 'auto',
      }}
    >
      {/* Header */}
      <header style={headerStyle}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #d4af37, #f4d03f)',
                  borderRadius: borderRadius.md,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Crown size={22} style={{ color: '#0a0a0f' }} />
              </div>
              <div>
                <p style={{ fontSize: typography.fontSize.xs, color: colors.gold.primary, fontWeight: typography.fontWeight.semibold, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Most Eligible
                </p>
                <p style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: '#fff' }}>
                  {city}
                </p>
              </div>
            </div>
            {platinumSponsor && (
              <a
                href={platinumSponsor.websiteUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  marginLeft: spacing.lg,
                  paddingLeft: spacing.lg,
                  borderLeft: `1px solid ${colors.border.light}`,
                  textDecoration: 'none',
                  cursor: platinumSponsor.websiteUrl ? 'pointer' : 'default',
                }}
              >
                <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Presented by
                </span>
                {platinumSponsor.logoUrl ? (
                  <div
                    style={{
                      height: '32px',
                      padding: `${spacing.xs} ${spacing.md}`,
                      background: '#fff',
                      borderRadius: borderRadius.sm,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src={platinumSponsor.logoUrl}
                      alt={platinumSponsor.name}
                      style={{ maxHeight: '24px', maxWidth: '100px', objectFit: 'contain' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                ) : (
                  <span style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: colors.tier.platinum }}>
                    {platinumSponsor.name}
                  </span>
                )}
              </a>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
            {isCompletedPhase ? (
              <Badge variant="default" size="md" pill>
                <Trophy size={12} /> SEASON {season} COMPLETE
              </Badge>
            ) : isJudgingPhase ? (
              <Badge variant="info" size="md" pill>
                <Award size={12} /> JUDGING IN PROGRESS
              </Badge>
            ) : isNominationPhase ? (
              <Badge variant="warning" size="md" pill>
                <Sparkles size={12} /> NOMINATIONS OPEN
              </Badge>
            ) : isVotingPhase ? (
              <Badge variant="success" size="md" pill>
                ● VOTING LIVE
              </Badge>
            ) : (
              <Badge variant="success" size="md" pill>
                ● LIVE
              </Badge>
            )}
            <Button variant="secondary" onClick={onClose} icon={X} style={{ width: 'auto', padding: `${spacing.sm} ${spacing.lg}` }}>
              Exit Preview
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav style={navStyle}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '0' }}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} style={getTabStyle(activeTab === tab.id)} onClick={() => setActiveTab(tab.id)}>
                <Icon size={18} /> {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: `${spacing.xxxl} ${spacing.xxl}` }}>
        {activeTab === 'winners' && (
          <WinnersTab
            city={city}
            season={season}
            winners={winners}
          />
        )}
        {activeTab === 'nominate' && (
          <NominationTab
            city={city}
            competitionId={competition?.id}
            onNominationSubmit={onClose}
            isAuthenticated={isAuthenticated}
            onLogin={onLogin}
            userEmail={userEmail}
            userInstagram={userInstagram}
          />
        )}
        {activeTab === 'contestants' && (
          <ContestantsTab
            contestants={contestants}
            events={events}
            forceDoubleVoteDay={forceDoubleVoteDay}
            onVote={setSelectedContestant}
            isAuthenticated={isAuthenticated}
            onLogin={onLogin}
            isJudgingPhase={isJudgingPhase}
          />
        )}
        {activeTab === 'events' && <EventsTab events={events} city={city} season={season} phase={phase} />}
        {activeTab === 'announcements' && <AnnouncementsTab announcements={announcements} />}
        {activeTab === 'about' && (
          <AboutTab
            judges={judges}
            sponsors={sponsors}
            events={events}
            host={host}
            city={city}
            competition={competition}
          />
        )}
      </main>

      {/* Vote Modal */}
      <VoteModal
        isOpen={!!selectedContestant}
        onClose={() => setSelectedContestant(null)}
        contestant={selectedContestant}
        voteCount={voteCount}
        onVoteCountChange={setVoteCount}
        forceDoubleVoteDay={forceDoubleVoteDay}
        isAuthenticated={isAuthenticated}
        onLogin={onLogin}
      />
    </div>
  );
}
