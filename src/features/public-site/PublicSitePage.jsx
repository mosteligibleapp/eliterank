import React, { useState, useEffect } from 'react';
import { X, Crown, Users, Calendar, Sparkles, Award, UserPlus, Trophy, Clock } from 'lucide-react';
import { Button, Badge, OrganizationLogo } from '../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { supabase } from '../../lib/supabase';
import ContestantsTab from './components/ContestantsTab';
import EventsTab from './components/EventsTab';
import AnnouncementsTab from './components/AnnouncementsTab';
import AboutTab from './components/AboutTab';
import NominationTab from './components/NominationTab';
import WinnersTab from './components/WinnersTab';
import VoteModal from './components/VoteModal';
import CompetitionTeaser from './components/CompetitionTeaser';
import PublicProfileView from './components/PublicProfileView';

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
  contestants = [],
  events = [],
  announcements = [],
  judges = [],
  sponsors = [],
  host,
  winners = [],
  forceDoubleVoteDay = true,
  competition = null, // Competition object with timeline data
  isAuthenticated = false, // Whether user is logged in
  onLogin, // Callback to trigger login flow
  userEmail, // User's email for pre-filling forms
  userInstagram, // User's instagram for pre-filling forms
  user, // Full user object for forms
  canEditEvents = false, // Whether user can edit events (host/superadmin)
  onEditEvent, // Callback to edit an event
  onAddEvent, // Callback to add a new event
}) {
  // State for fetched data from database
  const [fetchedData, setFetchedData] = useState({
    contestants: [],
    events: [],
    announcements: [],
    judges: [],
    sponsors: [],
    host: null,
    loading: true,
  });

  // Fetch competition data from database
  useEffect(() => {
    const fetchCompetitionData = async () => {
      const competitionId = competition?.id;
      if (!competitionId || !supabase) {
        setFetchedData(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        // Fetch all data in parallel
        const [
          contestantsResult,
          eventsResult,
          announcementsResult,
          judgesResult,
          sponsorsResult,
          hostResult,
        ] = await Promise.all([
          supabase
            .from('contestants')
            .select('*')
            .eq('competition_id', competitionId)
            .order('votes', { ascending: false }),
          supabase
            .from('events')
            .select('*')
            .eq('competition_id', competitionId)
            .order('date'),
          supabase
            .from('announcements')
            .select('*')
            .eq('competition_id', competitionId)
            .order('pinned', { ascending: false })
            .order('published_at', { ascending: false }),
          supabase
            .from('judges')
            .select('*')
            .eq('competition_id', competitionId)
            .order('sort_order'),
          supabase
            .from('sponsors')
            .select('*')
            .eq('competition_id', competitionId)
            .order('sort_order'),
          // Get host profile if host_id exists
          competition?.host_id
            ? supabase
                .from('profiles')
                .select('*')
                .eq('id', competition.host_id)
                .single()
            : Promise.resolve({ data: null }),
        ]);

        // Transform host data
        const hostProfile = hostResult.data;
        const transformedHost = hostProfile ? {
          id: hostProfile.id,
          name: `${hostProfile.first_name || ''} ${hostProfile.last_name || ''}`.trim() || 'Host',
          title: 'Competition Host',
          bio: hostProfile.bio || '',
          avatar: hostProfile.avatar_url,
          instagram: hostProfile.instagram,
        } : null;

        setFetchedData({
          contestants: (contestantsResult.data || []).map((c, idx) => ({
            id: c.id,
            name: c.name,
            age: c.age,
            occupation: c.occupation,
            bio: c.bio,
            votes: c.votes || 0,
            rank: idx + 1,
            avatarUrl: c.avatar_url,
            instagram: c.instagram,
          })),
          events: (eventsResult.data || []).map(e => ({
            id: e.id,
            name: e.name,
            date: e.date,
            endDate: e.end_date,
            time: e.time,
            location: e.location,
            status: e.status,
            featured: e.featured,
          })),
          announcements: (announcementsResult.data || []).map(a => ({
            id: a.id,
            title: a.title,
            content: a.content,
            date: a.published_at,
            pinned: a.pinned,
          })),
          judges: (judgesResult.data || []).map(j => ({
            id: j.id,
            name: j.name,
            title: j.title,
            bio: j.bio,
            avatarUrl: j.avatar_url,
          })),
          sponsors: (sponsorsResult.data || []).map(s => ({
            id: s.id,
            name: s.name,
            tier: s.tier,
            logo: s.logo_url,
            website: s.website,
          })),
          host: transformedHost,
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching competition data:', error);
        setFetchedData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchCompetitionData();
  }, [competition?.id, competition?.host_id]);

  // Use fetched data if available, otherwise fall back to props
  const displayContestants = fetchedData.contestants.length > 0 ? fetchedData.contestants : contestants;
  const displayEvents = fetchedData.events.length > 0 ? fetchedData.events : events;
  const displayAnnouncements = fetchedData.announcements.length > 0 ? fetchedData.announcements : announcements;
  const displayJudges = fetchedData.judges.length > 0 ? fetchedData.judges : judges;
  const displaySponsors = fetchedData.sponsors.length > 0 ? fetchedData.sponsors : sponsors;
  const displayHost = fetchedData.host || host;

  // Check if this is a teaser page (publish status)
  const isTeaser = competition?.isTeaser === true || competition?.status === 'publish';

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

  // State for viewing profiles in full-page mode
  const [viewingProfile, setViewingProfile] = useState(null);
  const [viewingProfileRole, setViewingProfileRole] = useState('fan');

  // Handler for viewing a profile
  const handleViewProfile = (profile, role = 'fan') => {
    setViewingProfile(profile);
    setViewingProfileRole(role);
  };

  const handleCloseProfile = () => {
    setViewingProfile(null);
    setViewingProfileRole('fan');
  };

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

  const platinumSponsor = displaySponsors.find((s) => s.tier === 'Platinum');

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
              <OrganizationLogo
                logo={competition?.organization?.logo_url}
                size={40}
                style={{ borderRadius: borderRadius.md }}
              />
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
            competitionId={competition?.id}
            onViewProfile={(profile) => handleViewProfile(profile, 'winner')}
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
            contestants={displayContestants}
            events={displayEvents}
            forceDoubleVoteDay={forceDoubleVoteDay}
            onVote={setSelectedContestant}
            isAuthenticated={isAuthenticated}
            onLogin={onLogin}
            isJudgingPhase={isJudgingPhase}
            onViewProfile={(profile) => handleViewProfile(profile, 'contestant')}
          />
        )}
        {activeTab === 'events' && (
          <EventsTab
            events={displayEvents}
            city={city}
            season={season}
            phase={phase}
            canEdit={canEditEvents}
            onEditEvent={onEditEvent}
            onAddEvent={onAddEvent}
          />
        )}
        {activeTab === 'announcements' && <AnnouncementsTab announcements={displayAnnouncements} city={city} season={season} />}
        {activeTab === 'about' && (
          <AboutTab
            judges={displayJudges}
            sponsors={displaySponsors}
            events={displayEvents}
            host={displayHost}
            city={city}
            competition={competition}
            onViewProfile={handleViewProfile}
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

      {/* Full-page Profile View */}
      {viewingProfile && (
        <PublicProfileView
          profile={viewingProfile}
          role={viewingProfileRole}
          onBack={handleCloseProfile}
        />
      )}
    </div>
  );
}
