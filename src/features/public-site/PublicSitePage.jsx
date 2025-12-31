import React, { useState, useEffect, useCallback } from 'react';
import { X, Crown, Users, Calendar, Sparkles, Award, UserPlus, Trophy, Clock, ChevronLeft, Home } from 'lucide-react';
import { Button, Badge, OrganizationLogo } from '../../components/ui';
import { colors, spacing, borderRadius, typography, transitions, shadows, gradients, components, styleHelpers } from '../../styles/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { supabase } from '../../lib/supabase';
import { COMPETITION_STATUSES } from '../../utils/competitionPhase';
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
  { id: 'contestants', label: 'Vote', mobileLabel: 'Vote', icon: Users },
  { id: 'events', label: 'Events', mobileLabel: 'Events', icon: Calendar },
  { id: 'announcements', label: 'News', mobileLabel: 'News', icon: Sparkles },
  { id: 'about', label: 'About', mobileLabel: 'About', icon: Award },
];

const NOMINATION_TABS = [
  { id: 'nominate', label: 'Nominate', mobileLabel: 'Nominate', icon: UserPlus },
  { id: 'events', label: 'Events', mobileLabel: 'Events', icon: Calendar },
  { id: 'announcements', label: 'News', mobileLabel: 'News', icon: Sparkles },
  { id: 'about', label: 'About', mobileLabel: 'About', icon: Award },
];

const COMPLETED_TABS = [
  { id: 'winners', label: 'Winners', mobileLabel: 'Winners', icon: Trophy },
  { id: 'events', label: 'Events', mobileLabel: 'Events', icon: Calendar },
  { id: 'announcements', label: 'News', mobileLabel: 'News', icon: Sparkles },
  { id: 'about', label: 'About', mobileLabel: 'About', icon: Award },
];

export default function PublicSitePage({
  isOpen,
  onClose,
  city = 'New York',
  season = '2026',
  phase = 'voting',
  contestants = [],
  events = [],
  announcements = [],
  judges = [],
  sponsors = [],
  host,
  winners = [],
  forceDoubleVoteDay = true,
  competition = null,
  isAuthenticated = false,
  onLogin,
  userEmail,
  userInstagram,
  user,
  canEditEvents = false,
  onEditEvent,
  onAddEvent,
}) {
  const { isMobile, isTablet } = useResponsive();

  // State for fetched data
  const [fetchedData, setFetchedData] = useState({
    contestants: [],
    events: [],
    announcements: [],
    judges: [],
    sponsors: [],
    host: null,
    loading: true,
  });

  // Fetch competition data
  useEffect(() => {
    const fetchCompetitionData = async () => {
      const competitionId = competition?.id;
      if (!competitionId || !supabase) {
        setFetchedData(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        const [contestantsResult, eventsResult, announcementsResult, judgesResult, sponsorsResult, hostResult] = await Promise.all([
          supabase.from('contestants').select('*').eq('competition_id', competitionId).order('votes', { ascending: false }),
          supabase.from('events').select('*').eq('competition_id', competitionId).order('date'),
          supabase.from('announcements').select('*').eq('competition_id', competitionId).order('pinned', { ascending: false }).order('published_at', { ascending: false }),
          supabase.from('judges').select('*').eq('competition_id', competitionId).order('sort_order'),
          supabase.from('sponsors').select('*').eq('competition_id', competitionId).order('sort_order'),
          competition?.host_id ? supabase.from('profiles').select('*').eq('id', competition.host_id).single() : Promise.resolve({ data: null }),
        ]);

        const hostProfile = hostResult.data;
        const transformedHost = hostProfile ? {
          // Pass through all original fields for full profile view
          ...hostProfile,
          // Add transformed/aliased fields for component compatibility
          id: hostProfile.id,
          name: `${hostProfile.first_name || ''} ${hostProfile.last_name || ''}`.trim() || 'Host',
          first_name: hostProfile.first_name,
          last_name: hostProfile.last_name,
          title: hostProfile.occupation || 'Competition Host',
          bio: hostProfile.bio || '',
          avatar: hostProfile.avatar_url,
          avatar_url: hostProfile.avatar_url,
          instagram: hostProfile.instagram,
          twitter: hostProfile.twitter,
          linkedin: hostProfile.linkedin,
          city: hostProfile.city,
          hobbies: hostProfile.hobbies || [],
          gallery: hostProfile.gallery || [],
          occupation: hostProfile.occupation,
        } : null;

        setFetchedData({
          contestants: (contestantsResult.data || []).map((c, idx) => ({
            ...c, // Pass through all fields for full profile view
            id: c.id, name: c.name, age: c.age, occupation: c.occupation, bio: c.bio,
            votes: c.votes || 0, rank: idx + 1,
            avatarUrl: c.avatar_url, avatar_url: c.avatar_url,
            instagram: c.instagram, twitter: c.twitter, linkedin: c.linkedin,
            city: c.city, hobbies: c.hobbies || [], gallery: c.gallery || [],
          })),
          events: (eventsResult.data || []).map(e => ({
            id: e.id, name: e.name, date: e.date, endDate: e.end_date, time: e.time,
            location: e.location, status: e.status, featured: e.featured,
          })),
          announcements: (announcementsResult.data || []).map(a => ({
            id: a.id, title: a.title, content: a.content, date: a.published_at, pinned: a.pinned,
          })),
          judges: (judgesResult.data || []).map(j => ({
            ...j, // Pass through all fields for full profile view
            id: j.id, name: j.name, title: j.title, bio: j.bio,
            avatarUrl: j.avatar_url, avatar_url: j.avatar_url,
            instagram: j.instagram, twitter: j.twitter, linkedin: j.linkedin,
            city: j.city, hobbies: j.hobbies || [], gallery: j.gallery || [],
          })),
          sponsors: (sponsorsResult.data || []).map(s => ({
            id: s.id, name: s.name, tier: s.tier, logo: s.logo_url, website: s.website,
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

  // Real-time subscription for contestant vote updates
  useEffect(() => {
    const competitionId = competition?.id;
    if (!competitionId || !supabase) return;

    const channel = supabase
      .channel(`competition-${competitionId}-votes`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contestants',
          filter: `competition_id=eq.${competitionId}`,
        },
        (payload) => {
          // Update the specific contestant in state with new vote count
          setFetchedData((prev) => {
            const updatedContestants = prev.contestants
              .map((c) =>
                c.id === payload.new.id
                  ? { ...c, votes: payload.new.votes }
                  : c
              )
              .sort((a, b) => (b.votes || 0) - (a.votes || 0)) // Re-sort by votes
              .map((c, idx) => ({ ...c, rank: idx + 1 })); // Update ranks

            return {
              ...prev,
              contestants: updatedContestants,
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [competition?.id]);

  // Callback to refresh contestant data after voting
  const handleVoteSuccess = useCallback(async () => {
    const competitionId = competition?.id;
    if (!competitionId || !supabase) return;

    try {
      const { data: contestantsData } = await supabase
        .from('contestants')
        .select('*')
        .eq('competition_id', competitionId)
        .order('votes', { ascending: false });

      if (contestantsData) {
        setFetchedData((prev) => ({
          ...prev,
          contestants: contestantsData.map((c, idx) => ({
            ...c,
            id: c.id,
            name: c.name,
            age: c.age,
            occupation: c.occupation,
            bio: c.bio,
            votes: c.votes || 0,
            rank: idx + 1,
            avatarUrl: c.avatar_url,
            avatar_url: c.avatar_url,
            instagram: c.instagram,
            twitter: c.twitter,
            linkedin: c.linkedin,
            city: c.city,
            hobbies: c.hobbies || [],
            gallery: c.gallery || [],
          })),
        }));
      }
    } catch (error) {
      console.error('Error refreshing contestant data:', error);
    }
  }, [competition?.id]);

  // Use fetched data or fall back to props
  const displayContestants = fetchedData.contestants.length > 0 ? fetchedData.contestants : contestants;
  const displayEvents = fetchedData.events.length > 0 ? fetchedData.events : events;
  const displayAnnouncements = fetchedData.announcements.length > 0 ? fetchedData.announcements : announcements;
  const displayJudges = fetchedData.judges.length > 0 ? fetchedData.judges : judges;
  const displaySponsors = fetchedData.sponsors.length > 0 ? fetchedData.sponsors : sponsors;
  const displayHost = fetchedData.host || host;

  // Check if teaser page
  const isTeaser = competition?.isTeaser === true || competition?.status === COMPETITION_STATUSES.PUBLISH;

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

  // Phase detection
  const isDraftPhase = phase === 'draft';
  const isNominationPhase = phase === 'nomination';
  const isVotingPhase = phase === 'voting';
  const isJudgingPhase = phase === 'judging';
  const isCompletedPhase = phase === 'completed' || phase === 'complete';

  // Determine tabs based on phase
  let TABS, defaultTab;
  if (isCompletedPhase) {
    TABS = COMPLETED_TABS;
    defaultTab = 'winners';
  } else if (isNominationPhase || isDraftPhase) {
    TABS = NOMINATION_TABS;
    defaultTab = 'nominate';
  } else {
    TABS = VOTING_TABS;
    defaultTab = 'contestants';
  }

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [selectedContestant, setSelectedContestant] = useState(null);
  const [voteCount, setVoteCount] = useState(1);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [viewingProfileRole, setViewingProfileRole] = useState('fan');

  const handleViewProfile = (profile, role = 'fan') => {
    setViewingProfile(profile);
    setViewingProfileRole(role);
  };

  const handleCloseProfile = () => {
    setViewingProfile(null);
    setViewingProfileRole('fan');
  };

  // Reset tab when phase changes
  useEffect(() => {
    let newDefaultTab;
    if (phase === 'completed' || phase === 'complete') newDefaultTab = 'winners';
    else if (phase === 'nomination' || phase === 'draft') newDefaultTab = 'nominate';
    else newDefaultTab = 'contestants';
    setActiveTab(newDefaultTab);
  }, [phase, city]);

  if (!isOpen) return null;

  const platinumSponsor = displaySponsors.find((s) => s.tier === 'Platinum');

  // Get status badge config
  const getStatusBadge = () => {
    if (isCompletedPhase) return { variant: 'gold', icon: Trophy, label: 'COMPLETED' };
    if (isJudgingPhase) return { variant: 'info', icon: Award, label: 'JUDGING' };
    if (isNominationPhase) return { variant: 'warning', icon: Sparkles, label: 'NOMINATING' };
    return { variant: 'success', icon: null, label: 'VOTING LIVE', dot: true };
  };

  const statusConfig = getStatusBadge();

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: colors.background.primary,
      zIndex: 100,
      overflow: 'auto',
      fontFamily: typography.fontFamily.sans,
    }}>
      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(10, 10, 12, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${colors.border.secondary}`,
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: isMobile ? `${spacing.md} ${spacing.lg}` : `${spacing.lg} ${spacing.xxl}`,
          ...styleHelpers.flexBetween,
        }}>
          {/* Left: Back + Title */}
          <div style={{ ...styleHelpers.flexStart, gap: spacing.md, flex: 1, minWidth: 0 }}>
            <button
              onClick={onClose}
              style={{
                ...styleHelpers.flexCenter,
                width: '36px',
                height: '36px',
                background: colors.background.card,
                border: `1px solid ${colors.border.primary}`,
                borderRadius: borderRadius.lg,
                color: colors.text.secondary,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <ChevronLeft size={20} />
            </button>

            <div style={{ ...styleHelpers.flexStart, gap: spacing.md, minWidth: 0 }}>
              <OrganizationLogo
                logo={competition?.organization?.logo_url}
                size={isMobile ? 32 : 40}
                style={{ borderRadius: borderRadius.md, flexShrink: 0 }}
              />
              <div style={{ minWidth: 0 }}>
                <p style={{
                  fontSize: typography.fontSize.xs,
                  color: colors.gold.primary,
                  fontWeight: typography.fontWeight.semibold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {competition?.organization?.name || 'Elite Rank'}
                </p>
                <p style={{
                  fontSize: isMobile ? typography.fontSize.md : typography.fontSize.lg,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.text.primary,
                  ...styleHelpers.truncate,
                }}>
                  {city} · Season {season}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Status Badge */}
          <div style={{ ...styleHelpers.flexStart, gap: spacing.md, flexShrink: 0 }}>
            <Badge variant={statusConfig.variant} size={isMobile ? 'sm' : 'md'} pill dot={statusConfig.dot}>
              {statusConfig.icon && <statusConfig.icon size={12} />}
              {!isMobile && statusConfig.label}
              {isMobile && statusConfig.label.split(' ')[0]}
            </Badge>
          </div>
        </div>
      </header>

      {/* Navigation - Desktop: under header, Mobile: bottom */}
      {!isMobile && (
        <nav style={{
          position: 'sticky',
          top: '73px',
          zIndex: 40,
          background: 'rgba(10, 10, 12, 0.9)',
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${colors.border.secondary}`,
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: `0 ${spacing.xxl}`,
            display: 'flex',
            gap: 0,
          }}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    ...styleHelpers.flexCenter,
                    gap: spacing.sm,
                    padding: `${spacing.lg} ${spacing.xl}`,
                    background: 'none',
                    border: 'none',
                    borderBottom: `2px solid ${isActive ? colors.gold.primary : 'transparent'}`,
                    color: isActive ? colors.gold.primary : colors.text.secondary,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    cursor: 'pointer',
                    transition: `all ${transitions.fast}`,
                  }}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: isMobile ? `${spacing.lg} ${spacing.lg} 100px` : `${spacing.xxl} ${spacing.xxl}`,
        minHeight: isMobile ? 'calc(100vh - 140px)' : 'auto',
      }}>
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
        {activeTab === 'announcements' && (
          <AnnouncementsTab announcements={displayAnnouncements} city={city} season={season} />
        )}
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

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: components.bottomBar.height,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          background: 'rgba(10, 10, 12, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: `1px solid ${colors.border.secondary}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 100,
        }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  ...styleHelpers.flexColumn,
                  ...styleHelpers.flexCenter,
                  gap: '2px',
                  padding: spacing.sm,
                  background: 'none',
                  border: 'none',
                  color: isActive ? colors.gold.primary : colors.text.muted,
                  cursor: 'pointer',
                  transition: `all ${transitions.fast}`,
                  flex: 1,
                }}
              >
                <tab.icon size={22} />
                <span style={{
                  fontSize: '10px',
                  fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.normal,
                }}>
                  {tab.mobileLabel}
                </span>
              </button>
            );
          })}
        </nav>
      )}

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
        competitionId={competition?.id}
        user={user}
        onVoteSuccess={handleVoteSuccess}
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
