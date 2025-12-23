import React, { useState, useCallback, useEffect, useMemo } from 'react';

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

// Constants and mock data
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
  // Authentication (Supabase hook)
  const {
    user,
    profile,
    loading: authLoading,
    isAuthenticated,
    isDemoMode,
    signIn,
    signOut,
    updateProfile
  } = useSupabaseAuth();

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

  // Navigation state
  const [activeTab, setActiveTab] = useState('overview');
  const [showPublicSite, setShowPublicSite] = useState(false);

  // Data state
  const [nominees, setNominees] = useState(INITIAL_NOMINEES);
  const [contestants, setContestants] = useState(INITIAL_CONTESTANTS);
  const [judges, setJudges] = useState(INITIAL_JUDGES);
  const [sponsors, setSponsors] = useState(INITIAL_SPONSORS);
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [announcements, setAnnouncements] = useState(INITIAL_ANNOUNCEMENTS);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Derive host profile from Supabase profile or use default for demo
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
      };
    }
    // Fallback to demo profile
    return DEFAULT_HOST_PROFILE;
  }, [profile]);

  // ============================================
  // Nominee Handlers
  // ============================================
  const handleConfirmConvert = useCallback(() => {
    const nominee = convertModal.nominee;
    if (!nominee) return;

    // Update nominee status to approved
    setNominees((prev) =>
      prev.map((n) =>
        n.id === nominee.id ? { ...n, status: 'approved' } : n
      )
    );

    // Add to contestants if not already there
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

    // Update nominee status to pending (awaiting profile completion)
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
    // In a real app, this would trigger an email resend
    console.log('Resending invite to nominee:', nomineeId);
  }, []);

  // ============================================
  // Judge Handlers
  // ============================================
  const handleSaveJudge = useCallback((judgeData) => {
    if (judgeModal.judge) {
      // Edit existing
      setJudges((prev) =>
        prev.map((j) =>
          j.id === judgeModal.judge.id ? { ...j, ...judgeData } : j
        )
      );
    } else {
      // Add new
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
      // Edit existing
      setSponsors((prev) =>
        prev.map((s) =>
          s.id === sponsorModal.sponsor.id ? { ...s, ...sponsorData } : s
        )
      );
    } else {
      // Add new
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
      // Edit existing
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === announcementModal.announcement.id
            ? { ...a, ...announcementData }
            : a
        )
      );
    } else {
      // Add new
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
    setIsEditingProfile(true);
  }, []);

  const handleSaveProfile = useCallback(() => {
    setIsEditingProfile(false);
  }, []);

  const handleCancelProfile = useCallback(() => {
    setIsEditingProfile(false);
  }, []);

  const handleProfileChange = useCallback(async (updates) => {
    // Convert from UI format to database format
    const dbUpdates = {
      first_name: updates.firstName,
      last_name: updates.lastName,
      bio: updates.bio,
      city: updates.city,
      instagram: updates.instagram,
      twitter: updates.twitter,
      linkedin: updates.linkedin,
      tiktok: updates.tiktok,
      hobbies: updates.hobbies,
    };
    // Remove undefined values
    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key] === undefined) delete dbUpdates[key];
    });
    await updateProfile(dbUpdates);
  }, [updateProfile]);

  // ============================================
  // Authentication Handlers
  // ============================================
  const handleLogin = useCallback(async (userData) => {
    // Called by LoginPage after successful auth
    // The useSupabaseAuth hook will automatically update state
    // when Supabase auth state changes
    setActiveTab('overview');
  }, []);

  const handleLogout = useCallback(async () => {
    await signOut();
    setActiveTab('overview');
  }, [signOut]);

  // ============================================
  // Render Content
  // ============================================
  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewPage
            competitions={INITIAL_COMPETITIONS}
            contestants={contestants}
            sponsors={sponsors}
            events={events}
            competitionRankings={COMPETITION_RANKINGS}
            onViewPublicSite={() => setShowPublicSite(true)}
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
            onAddJudge={() => openJudgeModal(null)}
            onEditJudge={openJudgeModal}
            onDeleteJudge={handleDeleteJudge}
            onAddSponsor={() => openSponsorModal(null)}
            onEditSponsor={openSponsorModal}
            onDeleteSponsor={handleDeleteSponsor}
            onEditEvent={openEventModal}
          />
        );

      case 'profile':
        return (
          <ProfilePage
            hostProfile={hostProfile}
            isEditing={isEditingProfile}
            onEdit={handleEditProfile}
            onSave={handleSaveProfile}
            onCancel={handleCancelProfile}
            onChange={handleProfileChange}
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

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <>
      <MainLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hostProfile={hostProfile}
        onLogout={handleLogout}
      >
        <PageHeader title={getPageTitle()} />
        {renderContent()}
      </MainLayout>

      {/* Public Site Preview */}
      <PublicSitePage
        isOpen={showPublicSite}
        onClose={() => setShowPublicSite(false)}
        contestants={contestants}
        events={events}
        announcements={announcements}
        judges={judges}
        sponsors={sponsors}
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
          // Close Elite Rank City and open the competition's public site
          closeEliteRankCity();
          if (competition.city === 'New York') {
            setShowPublicSite(true);
          }
        }}
      />
    </>
  );
}
