import React, { useState } from 'react';

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
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

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
  const [hostProfile, setHostProfile] = useState(DEFAULT_HOST_PROFILE);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Modal state
  const [judgeModal, setJudgeModal] = useState({ isOpen: false, judge: null });
  const [sponsorModal, setSponsorModal] = useState({ isOpen: false, sponsor: null });
  const [eliteRankCityOpen, setEliteRankCityOpen] = useState(false);
  const [eventModal, setEventModal] = useState({ isOpen: false, event: null });
  const [announcementModal, setAnnouncementModal] = useState({ isOpen: false, announcement: null });
  const [convertModal, setConvertModal] = useState({ isOpen: false, nominee: null });
  const [approveModal, setApproveModal] = useState({ isOpen: false, nominee: null });

  // ============================================
  // Nominee Handlers
  // ============================================
  const handleConvertNominee = (nominee) => {
    setConvertModal({ isOpen: true, nominee });
  };

  const handleConfirmConvert = () => {
    const nominee = convertModal.nominee;
    if (!nominee) return;

    // Update nominee status to approved
    setNominees((prev) =>
      prev.map((n) =>
        n.id === nominee.id ? { ...n, status: 'approved' } : n
      )
    );

    // Add to contestants if not already there
    const existingContestant = contestants.find((c) => c.name === nominee.name);
    if (!existingContestant) {
      setContestants((prev) => [
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
      ]);
    }

    setConvertModal({ isOpen: false, nominee: null });
  };

  const handleApproveNominee = (nominee) => {
    setApproveModal({ isOpen: true, nominee });
  };

  const handleConfirmApprove = () => {
    const nominee = approveModal.nominee;
    if (!nominee) return;

    // Update nominee status to pending (awaiting profile completion)
    setNominees((prev) =>
      prev.map((n) =>
        n.id === nominee.id ? { ...n, status: 'pending' } : n
      )
    );

    setApproveModal({ isOpen: false, nominee: null });
  };

  const handleRejectNominee = (nomineeId) => {
    setNominees((prev) => prev.filter((n) => n.id !== nomineeId));
  };

  const handleSimulateComplete = (nomineeId) => {
    setNominees((prev) =>
      prev.map((n) =>
        n.id === nomineeId ? { ...n, status: 'profile-complete' } : n
      )
    );
  };

  const handleResendInvite = (nomineeId) => {
    // In a real app, this would trigger an email resend
    console.log('Resending invite to nominee:', nomineeId);
  };

  // ============================================
  // Judge Handlers
  // ============================================
  const handleAddJudge = () => {
    setJudgeModal({ isOpen: true, judge: null });
  };

  const handleEditJudge = (judge) => {
    setJudgeModal({ isOpen: true, judge });
  };

  const handleSaveJudge = (judgeData) => {
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
    setJudgeModal({ isOpen: false, judge: null });
  };

  const handleDeleteJudge = (judgeId) => {
    setJudges((prev) => prev.filter((j) => j.id !== judgeId));
  };

  // ============================================
  // Sponsor Handlers
  // ============================================
  const handleAddSponsor = () => {
    setSponsorModal({ isOpen: true, sponsor: null });
  };

  const handleEditSponsor = (sponsor) => {
    setSponsorModal({ isOpen: true, sponsor });
  };

  const handleSaveSponsor = (sponsorData) => {
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
    setSponsorModal({ isOpen: false, sponsor: null });
  };

  const handleDeleteSponsor = (sponsorId) => {
    setSponsors((prev) => prev.filter((s) => s.id !== sponsorId));
  };

  // ============================================
  // Event Handlers
  // ============================================
  const handleEditEvent = (event) => {
    setEventModal({ isOpen: true, event });
  };

  const handleSaveEvent = (eventData) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventModal.event.id ? { ...e, ...eventData } : e
      )
    );
    setEventModal({ isOpen: false, event: null });
  };

  // ============================================
  // Announcement Handlers
  // ============================================
  const handleCreateAnnouncement = () => {
    setAnnouncementModal({ isOpen: true, announcement: null });
  };

  const handleEditAnnouncement = (announcement) => {
    setAnnouncementModal({ isOpen: true, announcement });
  };

  const handleSaveAnnouncement = (announcementData) => {
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
    setAnnouncementModal({ isOpen: false, announcement: null });
  };

  const handleDeleteAnnouncement = (announcementId) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));
  };

  const handleTogglePin = (announcementId) => {
    setAnnouncements((prev) =>
      prev.map((a) =>
        a.id === announcementId ? { ...a, pinned: !a.pinned } : a
      )
    );
  };

  // ============================================
  // Profile Handlers
  // ============================================
  const handleEditProfile = () => {
    setIsEditingProfile(true);
  };

  const handleSaveProfile = () => {
    setIsEditingProfile(false);
  };

  const handleCancelProfile = () => {
    setIsEditingProfile(false);
  };

  const handleProfileChange = (updates) => {
    setHostProfile((prev) => ({ ...prev, ...updates }));
  };

  // ============================================
  // Authentication Handlers
  // ============================================
  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setActiveTab('overview');
  };

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
            onViewEliteRankCity={() => setEliteRankCityOpen(true)}
          />
        );

      case 'nominations':
        return (
          <NominationsPage
            nominees={nominees}
            onConvert={handleConvertNominee}
            onApprove={handleApproveNominee}
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
            onCreateAnnouncement={handleCreateAnnouncement}
            onEditAnnouncement={handleEditAnnouncement}
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
            onAddJudge={handleAddJudge}
            onEditJudge={handleEditJudge}
            onDeleteJudge={handleDeleteJudge}
            onAddSponsor={handleAddSponsor}
            onEditSponsor={handleEditSponsor}
            onDeleteSponsor={handleDeleteSponsor}
            onEditEvent={handleEditEvent}
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
        onClose={() => setJudgeModal({ isOpen: false, judge: null })}
        judge={judgeModal.judge}
        onSave={handleSaveJudge}
      />

      <SponsorModal
        isOpen={sponsorModal.isOpen}
        onClose={() => setSponsorModal({ isOpen: false, sponsor: null })}
        sponsor={sponsorModal.sponsor}
        onSave={handleSaveSponsor}
      />

      <EventModal
        isOpen={eventModal.isOpen}
        onClose={() => setEventModal({ isOpen: false, event: null })}
        event={eventModal.event}
        onSave={handleSaveEvent}
      />

      <AnnouncementModal
        isOpen={announcementModal.isOpen}
        onClose={() => setAnnouncementModal({ isOpen: false, announcement: null })}
        announcement={announcementModal.announcement}
        onSave={handleSaveAnnouncement}
      />

      <ConvertNomineeModal
        isOpen={convertModal.isOpen}
        onClose={() => setConvertModal({ isOpen: false, nominee: null })}
        nominee={convertModal.nominee}
        onConfirm={handleConfirmConvert}
      />

      <ApproveNomineeModal
        isOpen={approveModal.isOpen}
        onClose={() => setApproveModal({ isOpen: false, nominee: null })}
        nominee={approveModal.nominee}
        onConfirm={handleConfirmApprove}
      />

      <EliteRankCityModal
        isOpen={eliteRankCityOpen}
        onClose={() => setEliteRankCityOpen(false)}
        onOpenCompetition={(competition) => {
          // Close Elite Rank City and open the competition's public site
          setEliteRankCityOpen(false);
          if (competition.city === 'New York') {
            setShowPublicSite(true);
          }
        }}
      />
    </>
  );
}
