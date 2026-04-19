import React, { useState } from 'react';
import {
  Crown, ArrowLeft, Star, LogOut, BarChart3, FileText, Settings as SettingsIcon,
  Eye, PlayCircle, Clock, AlertCircle
} from 'lucide-react';
import { Button, Badge, Avatar, NotificationBell } from '../../components/ui';
import { HostAssignmentModal, JudgeModal, SponsorModal, EventModal, PrizeModal, AddPersonModal, CharityModal } from '../../components/modals';
import { colors, gradients, spacing, borderRadius, typography, transitions } from '../../styles/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { useToast } from '../../contexts/ToastContext';
import { useCompetitionDashboard } from './hooks/useCompetitionDashboard';
import { SkeletonPulse, SkeletonCard } from '../../components/common/Skeleton';

// Import tab components
import { OverviewTab, PeopleTab, ContentTab, SetupTab, PreviewTab } from './components/tabs';

// Consolidated tab navigation
const TABS = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', icon: BarChart3 },
  { id: 'people', label: 'People', shortLabel: 'People', icon: Crown },
  { id: 'content', label: 'Content', shortLabel: 'Content', icon: FileText },
  { id: 'setup', label: 'Setup', shortLabel: 'Setup', icon: SettingsIcon },
  { id: 'preview', label: 'Preview', shortLabel: 'Preview', icon: Eye },
];

export default function CompetitionDashboard({
  competitionId,
  role = 'host',
  onBack,
  onLogout,
  onViewPublicSite,
  onPreviewVotingPage,
  onPreviewBetweenRounds,
  currentUserId,
}) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showHostAssignment, setShowHostAssignment] = useState(false);
  const isSuperAdmin = role === 'superadmin';
  const { isMobile } = useResponsive();

  // Fetch all dashboard data
  const dashboard = useCompetitionDashboard(competitionId);
  const {
    data,
    loading,
    error,
    refresh,
    addNominee,
    approveNominee,
    rejectNominee,
    removeContestant,
    restoreNominee,
    resendInvite,
    addContestant,
    addJudge,
    updateJudge,
    deleteJudge,
    updateCharity,
    removeCharity,
    addSponsor,
    updateSponsor,
    deleteSponsor,
    addEvent,
    updateEvent,
    deleteEvent,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    toggleAnnouncementPin,
    addRule,
    updateRule,
    deleteRule,
    addPrize,
    updatePrize,
    deletePrize,
    assignHost,
    removeHost,
    repairNomineeAccount,
    repairAllNomineeAccounts,
  } = dashboard;

  const competition = data.competition;
  const competitionName = competition?.name || 'Competition';

  // Add person modal state
  const [addPersonModal, setAddPersonModal] = useState({ isOpen: false, type: 'nominee' });

  const openAddPersonModal = (type) => {
    setAddPersonModal({ isOpen: true, type });
  };

  const closeAddPersonModal = () => {
    setAddPersonModal({ isOpen: false, type: 'nominee' });
  };

  const handleAddPerson = async (personData) => {
    const { type } = addPersonModal;
    try {
      if (type === 'contestant') {
        const result = await addContestant(personData);
        if (!result.success) {
          toast.error(result.error || 'Failed to add contestant');
          throw new Error(result.error);
        }
        toast.success(`${personData.name} added as contestant`);
      } else {
        const result = await addNominee(personData);
        if (!result.success) {
          toast.error(result.error || 'Failed to add nominee');
          throw new Error(result.error);
        }
        toast.success(`${personData.name} added as nominee`);
      }
    } catch (err) {
      console.error('Error adding person:', err);
      throw err;
    }
  };

  // Entity modals
  const [judgeModal, setJudgeModal] = useState({ isOpen: false, judge: null });
  const [sponsorModal, setSponsorModal] = useState({ isOpen: false, sponsor: null });
  const [eventModal, setEventModal] = useState({ isOpen: false, event: null });
  const [prizeModal, setPrizeModal] = useState({ isOpen: false, prize: null, prizeType: 'winner' });
  const [charityModal, setCharityModal] = useState(false);

  // ============================================================================
  // HEADER
  // ============================================================================

  const renderHeader = () => (
    <header style={{
      background: 'rgba(20,20,30,0.95)',
      borderBottom: '1px solid rgba(212,175,55,0.15)',
      padding: isMobile ? `${spacing.sm} ${spacing.md}` : `${spacing.md} ${spacing.xxl}`,
      position: 'sticky',
      top: 0,
      zIndex: 40,
      backdropFilter: 'blur(20px)',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: spacing.sm,
      }}>
        {/* Left side: Back, Logo, Name, Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? spacing.sm : spacing.md,
          minWidth: 0,
          flex: 1,
        }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: isMobile ? '32px' : '36px',
                height: isMobile ? '32px' : '36px',
                background: 'rgba(212,175,55,0.1)',
                border: '1px solid rgba(212,175,55,0.3)',
                borderRadius: borderRadius.md,
                color: colors.gold.primary,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <ArrowLeft size={isMobile ? 16 : 18} />
            </button>
          )}

          <div style={{
            width: isMobile ? '28px' : '40px',
            height: isMobile ? '28px' : '40px',
            background: 'linear-gradient(135deg, #d4af37, #f4d03f)',
            borderRadius: borderRadius.md,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0a0a0f',
            boxShadow: '0 0 20px rgba(212,175,55,0.3)',
            flexShrink: 0,
          }}>
            <Crown size={isMobile ? 16 : 22} />
          </div>

          {/* Name + Badge stacked on mobile */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: isMobile ? '1px' : spacing.md,
            minWidth: 0,
          }}>
            <span style={{
              fontSize: isMobile ? typography.fontSize.sm : typography.fontSize.xxl,
              fontWeight: typography.fontWeight.semibold,
              background: 'linear-gradient(135deg, #d4af37, #f4d03f)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: isMobile ? '100px' : 'none',
              lineHeight: 1.2,
            }}>
              {competitionName}
            </span>

            <span style={{
              padding: isMobile ? `1px ${spacing.xs}` : `${spacing.xs} ${spacing.md}`,
              background: 'rgba(212,175,55,0.15)',
              color: colors.gold.primary,
              borderRadius: borderRadius.sm,
              fontSize: isMobile ? '9px' : typography.fontSize.xs,
              fontWeight: typography.fontWeight.semibold,
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              whiteSpace: 'nowrap',
            }}>
              <Star size={isMobile ? 8 : 12} /> {isSuperAdmin ? 'ADMIN' : 'HOST'}
            </span>
          </div>
        </div>

        {/* Right side: Notifications + Preview + Logout */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? spacing.xs : spacing.md,
          flexShrink: 0,
        }}>
          <NotificationBell size={isMobile ? 32 : 36} />
          {onPreviewVotingPage && (
            <button
              onClick={onPreviewVotingPage}
              title="Preview what the public voting page will look like"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.xs,
                padding: isMobile ? `${spacing.xs} ${spacing.sm}` : `${spacing.sm} ${spacing.md}`,
                background: 'transparent',
                border: `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.md,
                color: colors.text.secondary,
                fontSize: isMobile ? '11px' : typography.fontSize.sm,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <PlayCircle size={isMobile ? 12 : 14} />
              {isMobile ? 'Voting' : 'Preview Voting'}
            </button>
          )}
          {onPreviewBetweenRounds && (
            <button
              onClick={onPreviewBetweenRounds}
              title="Preview the interim page between end of nominations and start of voting"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.xs,
                padding: isMobile ? `${spacing.xs} ${spacing.sm}` : `${spacing.sm} ${spacing.md}`,
                background: 'transparent',
                border: `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.md,
                color: colors.text.secondary,
                fontSize: isMobile ? '11px' : typography.fontSize.sm,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Clock size={isMobile ? 12 : 14} />
              {isMobile ? 'Between' : 'Preview Between Rounds'}
            </button>
          )}
          {onViewPublicSite && (
            <button
              onClick={onViewPublicSite}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.xs,
                padding: isMobile ? `${spacing.xs} ${spacing.sm}` : `${spacing.sm} ${spacing.md}`,
                background: 'rgba(212,175,55,0.1)',
                border: `1px solid ${colors.gold.primary}`,
                borderRadius: borderRadius.md,
                color: colors.gold.primary,
                fontSize: isMobile ? '11px' : typography.fontSize.sm,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Eye size={isMobile ? 12 : 14} />
              {isMobile ? 'View' : 'View Competition'}
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: isMobile ? spacing.xs : `${spacing.sm} ${spacing.md}`,
                background: 'transparent',
                border: `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.md,
                color: colors.text.secondary,
                fontSize: typography.fontSize.sm,
                cursor: 'pointer',
                minWidth: isMobile ? '32px' : 'auto',
                minHeight: isMobile ? '32px' : 'auto',
              }}
            >
              <LogOut size={16} />
              {!isMobile && <span style={{ marginLeft: spacing.sm }}>Logout</span>}
            </button>
          )}
        </div>
      </div>
    </header>
  );

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  const renderNavigation = () => (
    <nav style={{
      background: 'rgba(20,20,30,0.8)',
      borderBottom: `1px solid ${colors.border.lighter}`,
      padding: `0 ${isMobile ? spacing.md : spacing.xxl}`,
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        gap: '0',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch', // Smooth scroll on iOS
        scrollbarWidth: 'none', // Hide scrollbar on Firefox
        msOverflowStyle: 'none', // Hide scrollbar on IE/Edge
      }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: isMobile ? `${spacing.md} ${spacing.md}` : `${spacing.md} ${spacing.xl}`,
                color: isActive ? colors.gold.primary : colors.text.secondary,
                fontSize: isMobile ? typography.fontSize.sm : typography.fontSize.md,
                fontWeight: typography.fontWeight.medium,
                cursor: 'pointer',
                borderBottom: `2px solid ${isActive ? colors.gold.primary : 'transparent'}`,
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: isMobile ? '2px' : spacing.sm,
                transition: `all ${transitions.fast}`,
                whiteSpace: 'nowrap',
                minWidth: isMobile ? '60px' : 'auto',
                minHeight: '44px', // Touch-friendly
              }}
            >
              <Icon size={isMobile ? 20 : 18} />
              {isMobile ? (
                <span style={{ fontSize: '10px' }}>{tab.shortLabel || tab.label}</span>
              ) : (
                tab.label
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ padding: spacing.lg }}>
          {/* Tab bar skeleton */}
          <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.xl }}>
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonPulse key={i} width="100px" height="36px" radius={borderRadius.lg} />
            ))}
          </div>
          {/* Stat cards skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: spacing.md, marginBottom: spacing.xl }}>
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonCard key={i} height="100px" />
            ))}
          </div>
          {/* Content skeleton */}
          <SkeletonCard height="300px" />
        </div>
      );
    }

    if (error) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xxxl,
          gap: spacing.lg,
        }}>
          <AlertCircle size={48} style={{ color: '#ef4444' }} />
          <p style={{ color: '#ef4444', fontSize: typography.fontSize.lg }}>
            Error loading data: {error}
          </p>
          <Button onClick={refresh} variant="secondary">Try Again</Button>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <OverviewTab
            competition={competition}
            contestants={data.contestants}
            nominees={data.nominees}
            sponsors={data.sponsors}
            events={data.events}
            announcements={data.announcements}
            host={data.host}
            isSuperAdmin={isSuperAdmin}
            onViewPublicSite={onViewPublicSite}
            onNavigateToTab={setActiveTab}
            onOpenSponsorModal={(sponsor) => setSponsorModal({ isOpen: true, sponsor })}
            onOpenEventModal={(event) => setEventModal({ isOpen: true, event })}
            onAddAnnouncement={addAnnouncement}
            onUpdateAnnouncement={updateAnnouncement}
            onDeleteAnnouncement={deleteAnnouncement}
            onTogglePin={toggleAnnouncementPin}
          />
        );
      case 'people':
        return (
          <PeopleTab
            competition={competition}
            nominees={data.nominees}
            contestants={data.contestants}
            host={data.host}
            isSuperAdmin={isSuperAdmin}
            onRefresh={refresh}
            onApproveNominee={approveNominee}
            onRejectNominee={rejectNominee}
            onRemoveContestant={removeContestant}
            onRestoreNominee={restoreNominee}
            onOpenAddPersonModal={openAddPersonModal}
            onShowHostAssignment={() => setShowHostAssignment(true)}
            onRemoveHost={removeHost}
            onResendInvite={resendInvite}
            onRepairNomineeAccount={repairNomineeAccount}
            onRepairAllNomineeAccounts={repairAllNomineeAccounts}
          />
        );
      case 'content':
        return (
          <ContentTab
            competition={competition}
            announcements={data.announcements}
            host={data.host}
            isSuperAdmin={isSuperAdmin}
            onRefresh={refresh}
            onAddAnnouncement={addAnnouncement}
            onUpdateAnnouncement={updateAnnouncement}
            onDeleteAnnouncement={deleteAnnouncement}
            onTogglePin={toggleAnnouncementPin}
            organizationId={competition?.organizationId}
            organizationHeaderLogoUrl={competition?.organizationHeaderLogoUrl}
            organizationWebsiteUrl={competition?.organizationWebsiteUrl}
          />
        );
      case 'setup':
        return (
          <SetupTab
            competition={competition}
            judges={data.judges}
            sponsors={data.sponsors}
            events={data.events}
            prizes={data.prizes}
            isSuperAdmin={isSuperAdmin}
            onRefresh={refresh}
            onDeleteJudge={deleteJudge}
            onDeleteSponsor={deleteSponsor}
            onDeleteEvent={deleteEvent}
            onDeletePrize={deletePrize}
            onOpenJudgeModal={(judge) => setJudgeModal({ isOpen: true, judge })}
            onOpenSponsorModal={(sponsor) => setSponsorModal({ isOpen: true, sponsor })}
            onOpenEventModal={(event) => setEventModal({ isOpen: true, event })}
            onOpenPrizeModal={(prize, prizeType) => setPrizeModal({ isOpen: true, prize, prizeType: prize?.prizeType || prizeType || 'winner' })}
            onOpenCharityModal={() => setCharityModal(true)}
          />
        );
      case 'preview':
        return (
          <PreviewTab
            competition={competition}
            contestants={data.contestants}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div style={{ minHeight: '100vh', background: gradients.background }}>
        {renderHeader()}
        {renderNavigation()}
        <main style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: isMobile ? `${spacing.lg} ${spacing.md}` : `${spacing.xxxl} ${spacing.xxl}`,
        }}>
          {renderContent()}
        </main>
      </div>
      <HostAssignmentModal
        isOpen={showHostAssignment}
        onClose={() => setShowHostAssignment(false)}
        onAssign={async (userId) => {
          await assignHost(userId);
          setShowHostAssignment(false);
        }}
        currentHostId={data.host?.id}
      />
      <JudgeModal
        isOpen={judgeModal.isOpen}
        onClose={() => setJudgeModal({ isOpen: false, judge: null })}
        judge={judgeModal.judge}
        onSave={async (judgeData) => {
          if (judgeModal.judge) {
            await updateJudge(judgeModal.judge.id, judgeData);
          } else {
            await addJudge(judgeData);
          }
          setJudgeModal({ isOpen: false, judge: null });
        }}
      />
      <SponsorModal
        isOpen={sponsorModal.isOpen}
        onClose={() => setSponsorModal({ isOpen: false, sponsor: null })}
        sponsor={sponsorModal.sponsor}
        onSave={async (sponsorData) => {
          if (sponsorModal.sponsor) {
            await updateSponsor(sponsorModal.sponsor.id, sponsorData);
          } else {
            await addSponsor(sponsorData);
          }
          setSponsorModal({ isOpen: false, sponsor: null });
        }}
      />
      <CharityModal
        isOpen={charityModal}
        onClose={() => setCharityModal(false)}
        charity={competition?.charityName ? {
          name: competition.charityName,
          logoUrl: competition.charityLogoUrl,
          websiteUrl: competition.charityWebsiteUrl,
        } : null}
        onSave={async (charityData) => {
          await updateCharity(charityData);
          setCharityModal(false);
        }}
        onRemove={async () => {
          await removeCharity();
          setCharityModal(false);
        }}
      />
      <EventModal
        isOpen={eventModal.isOpen}
        onClose={() => setEventModal({ isOpen: false, event: null })}
        event={eventModal.event}
        onSave={async (eventData) => {
          let result;
          if (eventModal.event) {
            result = await updateEvent(eventModal.event.id, eventData);
          } else {
            result = await addEvent(eventData);
          }
          if (result?.success === false) {
            toast.error(result.error || 'Failed to save event');
            return;
          }
          toast.success(eventModal.event ? 'Event updated' : 'Event added');
          setEventModal({ isOpen: false, event: null });
        }}
      />
      <PrizeModal
        isOpen={prizeModal.isOpen}
        onClose={() => setPrizeModal({ isOpen: false, prize: null, prizeType: 'winner' })}
        prize={prizeModal.prize}
        prizeType={prizeModal.prizeType}
        onSave={async (prizeData) => {
          if (prizeModal.prize) {
            await updatePrize(prizeModal.prize.id, prizeData);
          } else {
            await addPrize(prizeData);
          }
          setPrizeModal({ isOpen: false, prize: null, prizeType: 'winner' });
        }}
      />
      <AddPersonModal
        isOpen={addPersonModal.isOpen}
        onClose={closeAddPersonModal}
        onAdd={handleAddPerson}
        type={addPersonModal.type}
      />
    </>
  );
}
