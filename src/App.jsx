import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';

// Layout components
import { MainLayout, PageHeader } from './components/layout';

// Feature pages
import { OverviewPage } from './features/overview';
import { NominationsPage } from './features/nominations';
import { CommunityPage } from './features/community';
import { SettingsPage } from './features/settings';
import { ProfilePage } from './features/profile';
import { PublicSitePage } from './features/public-site';
import { LoginPage } from './features/auth';
import { SuperAdminPage } from './features/super-admin';

// Modals
import {
  JudgeModal,
  SponsorModal,
  EventModal,
  AnnouncementModal,
  ConvertNomineeModal,
  ApproveNomineeModal,
  EliteRankCityModal,
} from './components/modals';

// Hooks
import { useModals, useSupabaseAuth } from './hooks';

// Supabase client
import { supabase } from './lib/supabase';

// Constants and initial state
import {
  ADMIN_TABS,
  DEFAULT_HOST_PROFILE,
  INITIAL_COMPETITIONS,
  INITIAL_NOMINEES,
  INITIAL_CONTESTANTS,
  INITIAL_JUDGES,
  INITIAL_SPONSORS,
  INITIAL_EVENTS,
  INITIAL_ANNOUNCEMENTS,
  COMPETITION_RANKINGS,
} from './constants';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // View state - 'public' is default, 'login' for auth, 'dashboard' for admin views
  const [currentView, setCurrentView] = useState('public');

  // Authentication (Supabase hook)
  const {
    user,
    profile,
    loading: authLoading,
    isAuthenticated,
    signOut,
    updateProfile
  } = useSupabaseAuth();

  // Determine user role from Supabase profile
  const userRole = useMemo(() => {
    if (profile?.is_super_admin) return 'super_admin';
    if (profile?.is_host) return 'host';
    return 'fan';
  }, [profile]);

  // Host's assigned competition
  const [hostCompetition, setHostCompetition] = useState(null);

  // Fetch host's assigned competition from Supabase
  // Fetches for anyone who can access the host dashboard (hosts and super_admins)
  useEffect(() => {
    const fetchHostCompetition = async () => {
      if (!user?.id || !supabase) {
        setHostCompetition(null);
        return;
      }

      try {
        // Use .limit(1) instead of .single() to avoid 406 errors
        const { data, error } = await supabase
          .from('competitions')
          .select('*')
          .eq('host_id', user.id)
          .limit(1);

        if (error) {
          console.error('Error fetching host competition:', error);
          setHostCompetition(null);
          return;
        }

        const competition = data?.[0];
        if (competition) {
          // Transform raw data to include computed name
          // If city already includes "Most Eligible", use it as-is
          // Otherwise build the full name
          const cityIncludesName = competition.city?.toLowerCase().includes('most eligible');
          const name = cityIncludesName
            ? competition.city
            : `${competition.city || 'Unknown'} Most Eligible ${competition.season || ''}`.trim();

          setHostCompetition({
            ...competition,
            name,
          });
        } else {
          setHostCompetition(null);
        }
      } catch (err) {
        console.error('Error fetching host competition:', err);
        setHostCompetition(null);
      }
    };

    fetchHostCompetition();
  }, [user?.id]);

  // Handle initial URL on app load - check if /c/:citySlug
  useEffect(() => {
    const handleInitialUrl = async () => {
      const match = location.pathname.match(/^\/c\/([^/]+)\/?$/);

      if (match && supabase) {
        const slug = match[1];
        const cityName = slugToCity(slug);

        // Try to find the competition by city name
        const { data: competitions, error } = await supabase
          .from('competitions')
          .select('*')
          .ilike('city', `%${cityName}%`)
          .limit(1);

        if (!error && competitions?.[0]) {
          const competition = competitions[0];
          setSelectedCompetition({
            id: competition.id,
            city: competition.city,
            season: competition.season || '2026',
            phase: competition.status === 'active' ? 'voting' : competition.status,
            status: competition.status,
            host: null,
            winners: [],
            isTeaser: competition.status !== 'active',
            nomination_start: competition.nomination_start,
            nomination_end: competition.nomination_end,
            voting_start: competition.voting_start,
            voting_end: competition.voting_end,
            finals_date: competition.finals_date,
          });
          setShowPublicSite(true);
        }
      }

      setInitialUrlHandled(true);
    };

    handleInitialUrl();
  }, []); // Only run once on mount

  // Modal management (custom hook)
  const {
    judgeModal,
    sponsorModal,
    eventModal,
    announcementModal,
    convertModal,
    approveModal,
    eliteRankCityOpen,
    openJudgeModal,
    closeJudgeModal,
    openSponsorModal,
    closeSponsorModal,
    openEventModal,
    closeEventModal,
    openAnnouncementModal,
    closeAnnouncementModal,
    openConvertModal,
    closeConvertModal,
    openApproveModal,
    closeApproveModal,
    openEliteRankCity,
    closeEliteRankCity,
  } = useModals();

  // URL helpers
  const cityToSlug = (city) => city?.toLowerCase().replace(/\s+/g, '-') || '';
  const slugToCity = (slug) => slug?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || '';

  // State to track if we've handled the initial URL
  const [initialUrlHandled, setInitialUrlHandled] = useState(false);

  // Navigation state
  const [activeTab, setActiveTab] = useState('overview');
  const [showPublicSite, setShowPublicSite] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState({
    id: null,
    city: 'New York',
    season: '2026',
    phase: 'voting',
    status: 'active',
    host: null,
    winners: [],
    isTeaser: false,
    nomination_start: null,
    nomination_end: null,
    voting_start: null,
    voting_end: null,
    finals_date: null,
  });

  // URL sync: Update URL when competition is opened/closed
  useEffect(() => {
    if (!initialUrlHandled) return; // Don't sync until initial URL is handled

    if (showPublicSite && selectedCompetition.city) {
      const slug = cityToSlug(selectedCompetition.city);
      const targetPath = `/c/${slug}`;
      if (location.pathname !== targetPath) {
        navigate(targetPath, { replace: true });
      }
    } else if (!showPublicSite && location.pathname.startsWith('/c/')) {
      navigate('/', { replace: true });
    }
  }, [showPublicSite, selectedCompetition.city, initialUrlHandled, location.pathname, navigate]);

  // Data state
  const [nominees, setNominees] = useState(INITIAL_NOMINEES);
  const [contestants, setContestants] = useState(INITIAL_CONTESTANTS);
  const [judges, setJudges] = useState(INITIAL_JUDGES);
  const [sponsors, setSponsors] = useState(INITIAL_SPONSORS);
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [announcements, setAnnouncements] = useState(INITIAL_ANNOUNCEMENTS);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editingProfileData, setEditingProfileData] = useState(null);

  // Derive host profile from Supabase profile
  const hostProfile = useMemo(() => {
    if (profile) {
      return {
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        bio: profile.bio || '',
        city: profile.city || '',
        instagram: profile.instagram || '',
        twitter: profile.twitter || '',
        linkedin: profile.linkedin || '',
        tiktok: profile.tiktok || '',
        hobbies: profile.hobbies || [],
        avatarUrl: profile.avatar_url || '',
        coverImage: profile.cover_image || '',
        gallery: profile.gallery || [],
      };
    }
    return DEFAULT_HOST_PROFILE;
  }, [profile]);

  // ============================================
  // Nominee Handlers
  // ============================================
  const handleConfirmConvert = useCallback(() => {
    const nominee = convertModal.nominee;
    if (!nominee) return;

    setNominees((prev) =>
      prev.map((n) =>
        n.id === nominee.id ? { ...n, status: 'approved' } : n
      )
    );

    setContestants((prev) => {
      const existingContestant = prev.find((c) => c.name === nominee.name);
      if (existingContestant) return prev;
      return [
        ...prev,
        {
          id: `c${Date.now()}`,
          name: nominee.name,
          age: nominee.age,
          occupation: nominee.occupation,
          bio: nominee.bio || '',
          votes: 0,
          interests: nominee.interests || [],
        },
      ];
    });

    closeConvertModal();
  }, [convertModal.nominee, closeConvertModal]);

  const handleConfirmApprove = useCallback(() => {
    const nominee = approveModal.nominee;
    if (!nominee) return;

    setNominees((prev) =>
      prev.map((n) =>
        n.id === nominee.id ? { ...n, status: 'pending' } : n
      )
    );

    closeApproveModal();
  }, [approveModal.nominee, closeApproveModal]);

  const handleRejectNominee = useCallback((nomineeId) => {
    setNominees((prev) => prev.filter((n) => n.id !== nomineeId));
  }, []);

  const handleSimulateComplete = useCallback((nomineeId) => {
    setNominees((prev) =>
      prev.map((n) =>
        n.id === nomineeId ? { ...n, status: 'profile-complete' } : n
      )
    );
  }, []);

  const handleResendInvite = useCallback((nomineeId) => {
    console.log('Resending invite to nominee:', nomineeId);
  }, []);

  // ============================================
  // Judge Handlers
  // ============================================
  const handleSaveJudge = useCallback((judgeData) => {
    if (judgeModal.judge) {
      setJudges((prev) =>
        prev.map((j) =>
          j.id === judgeModal.judge.id ? { ...j, ...judgeData } : j
        )
      );
    } else {
      setJudges((prev) => [
        ...prev,
        { id: `j${Date.now()}`, ...judgeData },
      ]);
    }
    closeJudgeModal();
  }, [judgeModal.judge, closeJudgeModal]);

  const handleDeleteJudge = useCallback((judgeId) => {
    setJudges((prev) => prev.filter((j) => j.id !== judgeId));
  }, []);

  // ============================================
  // Sponsor Handlers
  // ============================================
  const handleSaveSponsor = useCallback((sponsorData) => {
    if (sponsorModal.sponsor) {
      setSponsors((prev) =>
        prev.map((s) =>
          s.id === sponsorModal.sponsor.id ? { ...s, ...sponsorData } : s
        )
      );
    } else {
      setSponsors((prev) => [
        ...prev,
        { id: `s${Date.now()}`, ...sponsorData },
      ]);
    }
    closeSponsorModal();
  }, [sponsorModal.sponsor, closeSponsorModal]);

  const handleDeleteSponsor = useCallback((sponsorId) => {
    setSponsors((prev) => prev.filter((s) => s.id !== sponsorId));
  }, []);

  // ============================================
  // Event Handlers
  // ============================================
  const handleSaveEvent = useCallback((eventData) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventModal.event.id ? { ...e, ...eventData } : e
      )
    );
    closeEventModal();
  }, [eventModal.event, closeEventModal]);

  // ============================================
  // Announcement Handlers
  // ============================================
  const handleSaveAnnouncement = useCallback((announcementData) => {
    if (announcementModal.announcement) {
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === announcementModal.announcement.id
            ? { ...a, ...announcementData }
            : a
        )
      );
    } else {
      setAnnouncements((prev) => [
        ...prev,
        {
          id: `a${Date.now()}`,
          date: new Date().toISOString(),
          ...announcementData,
        },
      ]);
    }
    closeAnnouncementModal();
  }, [announcementModal.announcement, closeAnnouncementModal]);

  const handleDeleteAnnouncement = useCallback((announcementId) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));
  }, []);

  const handleTogglePin = useCallback((announcementId) => {
    setAnnouncements((prev) =>
      prev.map((a) =>
        a.id === announcementId ? { ...a, pinned: !a.pinned } : a
      )
    );
  }, []);

  // ============================================
  // Profile Handlers
  // ============================================
  const handleEditProfile = useCallback(() => {
    // Start editing with a copy of current profile
    setEditingProfileData({ ...hostProfile });
    setIsEditingProfile(true);
  }, [hostProfile]);

  const handleSaveProfile = useCallback(async () => {
    if (!editingProfileData) return;

    // Save to Supabase
    const dbUpdates = {
      first_name: editingProfileData.firstName,
      last_name: editingProfileData.lastName,
      bio: editingProfileData.bio,
      city: editingProfileData.city,
      instagram: editingProfileData.instagram,
      twitter: editingProfileData.twitter,
      linkedin: editingProfileData.linkedin,
      tiktok: editingProfileData.tiktok,
      hobbies: editingProfileData.hobbies,
      avatar_url: editingProfileData.avatarUrl,
      cover_image: editingProfileData.coverImage,
      gallery: editingProfileData.gallery,
    };
    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key] === undefined) delete dbUpdates[key];
    });

    await updateProfile(dbUpdates);
    setIsEditingProfile(false);
    setEditingProfileData(null);
  }, [editingProfileData, updateProfile]);

  const handleCancelProfile = useCallback(() => {
    setIsEditingProfile(false);
    setEditingProfileData(null);
  }, []);

  const handleProfileChange = useCallback((updates) => {
    // Only update local state - fast, no DB calls
    setEditingProfileData(updates);
  }, []);

  // ============================================
  // Authentication Handlers
  // ============================================
  const handleLogin = useCallback(() => {
    // After login, navigate based on user role (determined by profile)
    // Role will be checked after profile is loaded
    setCurrentView('public');
    setActiveTab('overview');
  }, []);

  const handleLogout = useCallback(async () => {
    await signOut();
    setCurrentView('public');
    setActiveTab('overview');
  }, [signOut]);

  // Navigate to login
  const handleShowLogin = useCallback(() => {
    setCurrentView('login');
  }, []);

  // Navigate back to public
  const handleBackToPublic = useCallback(() => {
    setCurrentView('public');
  }, []);

  // Navigate to dashboard (for authorized users)
  const handleGoToDashboard = useCallback(() => {
    if (userRole === 'super_admin') {
      setCurrentView('super_admin');
    } else if (userRole === 'host') {
      setCurrentView('host_dashboard');
    }
  }, [userRole]);

  // ============================================
  // Render Dashboard Content
  // ============================================
  const renderDashboardContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewPage
            hostCompetition={hostCompetition}
            contestants={contestants}
            sponsors={sponsors}
            events={events}
            competitionRankings={COMPETITION_RANKINGS}
            onViewPublicSite={() => {
              const cityName = hostCompetition?.city || hostCompetition?.name?.split(' ')[0] || 'Your City';
              setSelectedCompetition({
                id: hostCompetition?.id,
                city: cityName,
                season: hostCompetition?.season || '2026',
                phase: hostCompetition?.status || 'voting',
                status: hostCompetition?.status,
                host: {
                  name: `${hostProfile.firstName} ${hostProfile.lastName}`.trim() || 'Host',
                  title: 'Competition Host',
                  bio: hostProfile.bio || `Your dedicated host for ${hostCompetition?.name || 'this competition'}.`,
                  instagram: hostProfile.instagram,
                  twitter: hostProfile.twitter,
                  linkedin: hostProfile.linkedin,
                },
                winners: [],
                nomination_start: hostCompetition?.nomination_start,
                nomination_end: hostCompetition?.nomination_end,
                voting_start: hostCompetition?.voting_start,
                voting_end: hostCompetition?.voting_end,
                finals_date: hostCompetition?.finals_date,
              });
              setShowPublicSite(true);
              navigate(`/c/${cityToSlug(cityName)}`);
            }}
            onViewEliteRankCity={openEliteRankCity}
          />
        );

      case 'nominations':
        return (
          <NominationsPage
            nominees={nominees}
            onConvert={openConvertModal}
            onApprove={openApproveModal}
            onReject={handleRejectNominee}
            onSimulateComplete={handleSimulateComplete}
            onResend={handleResendInvite}
          />
        );

      case 'community':
        return (
          <CommunityPage
            announcements={announcements}
            hostProfile={hostProfile}
            onCreateAnnouncement={() => openAnnouncementModal(null)}
            onEditAnnouncement={openAnnouncementModal}
            onDeleteAnnouncement={handleDeleteAnnouncement}
            onTogglePin={handleTogglePin}
          />
        );

      case 'settings':
        return (
          <SettingsPage
            judges={judges}
            sponsors={sponsors}
            events={events}
            hostCompetition={hostCompetition}
            onAddJudge={() => openJudgeModal(null)}
            onEditJudge={openJudgeModal}
            onDeleteJudge={handleDeleteJudge}
            onAddSponsor={() => openSponsorModal(null)}
            onEditSponsor={openSponsorModal}
            onDeleteSponsor={handleDeleteSponsor}
            onEditEvent={openEventModal}
            onCompetitionUpdate={async () => {
              // Refresh host competition from Supabase
              if (!user?.id) return;
              const { data, error } = await supabase
                .from('competitions')
                .select('*')
                .eq('host_id', user.id)
                .limit(1);
              if (error) {
                console.error('Error refreshing host competition:', error.message);
                return;
              }
              const competition = data?.[0];
              if (competition) {
                const cityIncludesName = competition.city?.toLowerCase().includes('most eligible');
                const name = cityIncludesName
                  ? competition.city
                  : `${competition.city || 'Unknown'} Most Eligible ${competition.season || ''}`.trim();
                setHostCompetition({ ...competition, name });
              }
            }}
          />
        );

      case 'profile':
        return (
          <ProfilePage
            hostProfile={isEditingProfile ? editingProfileData : hostProfile}
            isEditing={isEditingProfile}
            onEdit={handleEditProfile}
            onSave={handleSaveProfile}
            onCancel={handleCancelProfile}
            onChange={handleProfileChange}
            hostCompetition={hostCompetition}
          />
        );

      default:
        return null;
    }
  };

  const getPageTitle = () => {
    const tabConfig = ADMIN_TABS.find((t) => t.id === activeTab);
    return tabConfig?.label || 'Dashboard';
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
        color: '#d4af37',
        fontSize: '1.25rem',
      }}>
        Loading...
      </div>
    );
  }

  // ============================================
  // View Routing
  // ============================================

  // Login view
  if (currentView === 'login') {
    return (
      <LoginPage
        onLogin={handleLogin}
        onBack={handleBackToPublic}
      />
    );
  }

  // Super Admin Dashboard
  if (currentView === 'super_admin' && userRole === 'super_admin') {
    return <SuperAdminPage onLogout={handleLogout} />;
  }

  // Host Dashboard
  if (currentView === 'host_dashboard' && (userRole === 'host' || userRole === 'super_admin')) {
    return (
      <>
        <MainLayout
          activeTab={activeTab}
          onTabChange={setActiveTab}
          hostProfile={hostProfile}
          onLogout={handleLogout}
        >
          <PageHeader
            tab={activeTab}
            competitionName={hostCompetition?.name}
            showCompetitionLabel={activeTab === 'overview'}
          />
          {renderDashboardContent()}
        </MainLayout>

        {/* Public Site Preview */}
        <PublicSitePage
          isOpen={showPublicSite}
          onClose={() => {
            setShowPublicSite(false);
            navigate('/', { replace: true });
          }}
          city={selectedCompetition.city}
          season={selectedCompetition.season}
          phase={selectedCompetition.phase}
          contestants={contestants}
          events={events}
          announcements={announcements}
          judges={judges}
          sponsors={sponsors}
          host={selectedCompetition.host}
          winners={selectedCompetition.winners}
          competition={hostCompetition}
          isAuthenticated={isAuthenticated}
          onLogin={handleShowLogin}
          userEmail={user?.email}
          userInstagram={profile?.instagram}
        />

        {/* Modals */}
        <JudgeModal
          isOpen={judgeModal.isOpen}
          onClose={closeJudgeModal}
          judge={judgeModal.judge}
          onSave={handleSaveJudge}
        />

        <SponsorModal
          isOpen={sponsorModal.isOpen}
          onClose={closeSponsorModal}
          sponsor={sponsorModal.sponsor}
          onSave={handleSaveSponsor}
        />

        <EventModal
          isOpen={eventModal.isOpen}
          onClose={closeEventModal}
          event={eventModal.event}
          onSave={handleSaveEvent}
        />

        <AnnouncementModal
          isOpen={announcementModal.isOpen}
          onClose={closeAnnouncementModal}
          announcement={announcementModal.announcement}
          onSave={handleSaveAnnouncement}
        />

        <ConvertNomineeModal
          isOpen={convertModal.isOpen}
          onClose={closeConvertModal}
          nominee={convertModal.nominee}
          onConfirm={handleConfirmConvert}
        />

        <ApproveNomineeModal
          isOpen={approveModal.isOpen}
          onClose={closeApproveModal}
          nominee={approveModal.nominee}
          onConfirm={handleConfirmApprove}
        />

        <EliteRankCityModal
          isOpen={eliteRankCityOpen}
          onClose={closeEliteRankCity}
          onOpenCompetition={(competition) => {
            closeEliteRankCity();
            setSelectedCompetition({
              id: competition.id,
              city: competition.city,
              season: competition.season || '2026',
              phase: competition.phase || 'voting',
              status: competition.status,
              host: competition.host || null,
              winners: competition.winners || [],
              isTeaser: competition.isTeaser || false,
              nomination_start: competition.nomination_start,
              nomination_end: competition.nomination_end,
              voting_start: competition.voting_start,
              voting_end: competition.voting_end,
              finals_date: competition.finals_date,
            });
            setShowPublicSite(true);
            navigate(`/c/${cityToSlug(competition.city)}`);
          }}
        />
      </>
    );
  }

  // Default: Public Home Page (competitions listing)
  return (
    <>
      <EliteRankCityModal
        isOpen={true}
        onClose={() => {}} // Can't close - it's the main view
        isFullPage={true}
        onOpenCompetition={(competition) => {
          setSelectedCompetition({
            id: competition.id,
            city: competition.city,
            season: competition.season || '2026',
            phase: competition.phase || 'voting',
            status: competition.status,
            host: competition.host || null,
            winners: competition.winners || [],
            isTeaser: competition.isTeaser || false,
            nomination_start: competition.nomination_start,
            nomination_end: competition.nomination_end,
            voting_start: competition.voting_start,
            voting_end: competition.voting_end,
            finals_date: competition.finals_date,
          });
          setShowPublicSite(true);
          navigate(`/c/${cityToSlug(competition.city)}`);
        }}
        onLogin={handleShowLogin}
        onDashboard={isAuthenticated && (userRole === 'host' || userRole === 'super_admin') ? handleGoToDashboard : null}
        isAuthenticated={isAuthenticated}
        userRole={userRole}
        userName={profile?.first_name || user?.email?.split('@')[0]}
        onLogout={handleLogout}
      />

      {/* Public Site Preview for specific competition */}
      <PublicSitePage
        isOpen={showPublicSite}
        onClose={() => {
          setShowPublicSite(false);
          navigate('/', { replace: true });
        }}
        city={selectedCompetition.city}
        season={selectedCompetition.season}
        phase={selectedCompetition.phase}
        contestants={contestants}
        events={events}
        announcements={announcements}
        judges={judges}
        sponsors={sponsors}
        host={selectedCompetition.host}
        winners={selectedCompetition.winners}
        competition={selectedCompetition}
        isAuthenticated={isAuthenticated}
        onLogin={handleShowLogin}
        userEmail={user?.email}
        userInstagram={profile?.instagram}
        user={user}
      />
    </>
  );
}
