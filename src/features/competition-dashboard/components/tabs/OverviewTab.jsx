import React, { useMemo, useState } from 'react';
import {
  Eye, Users, UserPlus, Star, Plus, Crown, Calendar, FileText, Pin, Edit, Trash2,
  Download, Loader, ExternalLink, Link2, Megaphone, Award, Settings as SettingsIcon,
  CheckCircle2, Circle, ArrowRight, Sparkles, Trophy, Building2, Palette, Image as ImageIcon,
  Globe, User, ChevronDown, ChevronUp, DollarSign, TrendingUp, ListChecks,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { colors, spacing, borderRadius, typography } from '../../../../styles/theme';
import { useResponsive } from '../../../../hooks/useResponsive';
import { useToast } from '../../../../contexts/ToastContext';
import { Button, Panel, Avatar, Badge } from '../../../../components/ui';
import { formatNumber, formatCurrency, formatRelativeTime, daysUntil, formatDate } from '../../../../utils/formatters';
import { generateAchievementCard } from '../../../achievement-cards/generateAchievementCard';
import {
  computeCompetitionPhase,
  isLive as checkIsLive,
  TIMELINE_PHASES,
} from '../../../../utils/competitionPhase';
import TimelineCard from '../../../overview/components/TimelineCard';
import MetricCard from '../../../overview/components/MetricCard';

// =============================================================================
// STAGE DEFINITIONS — chronological setup journey
// =============================================================================

function buildStages({
  competition, host, events, doubleDays, prizes, judges, sponsors,
  nominees, contestants, announcements, phase, handlers,
}) {
  const minContestants = competition?.minContestants || 40;
  const contestantCount = contestants?.length || 0;
  const pendingNominees = (nominees || []).filter(n => n.status === 'pending').length;
  const pinnedAnnouncements = (announcements || []).filter(a => a.pinned).length;

  // Stage 1 — Identity
  const identityItems = [
    {
      id: 'theme',
      label: 'Theme color',
      sub: competition?.themePrimary ? 'Set' : 'Pick a brand color',
      icon: Palette,
      done: !!competition?.themePrimary,
      onClick: () => handlers.navigate('setup'),
    },
    {
      id: 'logo',
      label: 'Organization logo',
      sub: (competition?.organizationHeaderLogoUrl || competition?.organizationLogoUrl) ? 'Uploaded' : 'Add a logo for the page header',
      icon: ImageIcon,
      done: !!(competition?.organizationHeaderLogoUrl || competition?.organizationLogoUrl),
      onClick: () => handlers.navigate('setup'),
    },
    {
      id: 'website',
      label: 'Organization website',
      sub: competition?.organizationWebsiteUrl || 'Link out to your main site',
      icon: Globe,
      done: !!competition?.organizationWebsiteUrl,
      onClick: () => handlers.navigate('setup'),
    },
    {
      id: 'host-profile',
      label: 'Host profile',
      sub: host?.bio
        ? `${host.name} — bio set`
        : host?.id
          ? `${host.name} — add a bio so contestants know you`
          : 'No host assigned yet',
      icon: User,
      done: !!(host?.id && host?.bio && host?.avatar),
      onClick: () => host?.id && handlers.openHostProfile(host.id),
    },
  ];

  // Stage 2 — Schedule
  const hasNominationDates = !!(competition?.nominationStart && competition?.nominationEnd);
  const hasVotingDates = !!(competition?.votingStart && competition?.votingEnd);
  const hasFinalsDate = !!competition?.finalsDate;
  const hasDoubleDay = (doubleDays?.length || 0) > 0;

  const scheduleItems = [
    {
      id: 'nomination-dates',
      label: 'Nomination dates',
      sub: hasNominationDates ? 'Set' : 'When can people nominate contestants?',
      icon: UserPlus,
      done: hasNominationDates,
      onClick: () => handlers.navigate('setup'),
    },
    {
      id: 'voting-dates',
      label: 'Voting dates',
      sub: hasVotingDates ? 'Set' : 'When do voters cast their picks?',
      icon: Calendar,
      done: hasVotingDates,
      onClick: () => handlers.navigate('setup'),
    },
    {
      id: 'finals-date',
      label: 'Finals date',
      sub: hasFinalsDate ? formatDate(competition.finalsDate, { month: 'short', day: 'numeric', year: 'numeric' }) : 'When does the competition wrap?',
      icon: Trophy,
      done: hasFinalsDate,
      onClick: () => handlers.navigate('setup'),
    },
    {
      id: 'double-day',
      label: 'Double day',
      sub: hasDoubleDay ? `${doubleDays.length} scheduled` : 'Double-vote days drive momentum',
      icon: Sparkles,
      done: hasDoubleDay,
      onClick: () => handlers.navigate('setup'),
    },
  ];

  // Stage 3 — Collaborators
  const collaboratorItems = [
    {
      id: 'prize',
      label: 'Add a prize',
      sub: (prizes?.length || 0) > 0 ? `${prizes.length} prize${prizes.length === 1 ? '' : 's'}` : 'Define what contestants compete for',
      icon: Trophy,
      done: (prizes?.length || 0) > 0,
      onClick: () => handlers.openPrizeModal(),
    },
    {
      id: 'judge',
      label: 'Add a judge',
      sub: (judges?.length || 0) > 0 ? `${judges.length} judge${judges.length === 1 ? '' : 's'}` : 'Judges score the finalists',
      icon: Award,
      done: (judges?.length || 0) > 0,
      onClick: () => handlers.openJudgeModal(),
    },
    {
      id: 'sponsor',
      label: 'Add a sponsor',
      sub: (sponsors?.length || 0) > 0 ? `${sponsors.length} sponsor${sponsors.length === 1 ? '' : 's'}` : 'Sponsors fund prizes and add credibility',
      icon: Building2,
      done: (sponsors?.length || 0) > 0,
      onClick: () => handlers.openSponsorModal(),
    },
  ];

  // Stage 4 — People
  const meetsMin = contestantCount >= minContestants;
  const peopleItems = [
    {
      id: 'invite',
      label: 'Invite first nominees',
      sub: (nominees?.length || 0) > 0 ? `${nominees.length} nominated` : 'Seed the competition with your network',
      icon: UserPlus,
      done: (nominees?.length || 0) > 0,
      onClick: () => handlers.openAddPersonModal('nominee'),
    },
    {
      id: 'review',
      label: 'Review pending',
      sub: pendingNominees > 0 ? `${pendingNominees} waiting for your decision` : 'No pending right now',
      icon: ListChecks,
      done: pendingNominees === 0 && (nominees?.length || 0) > 0,
      urgent: pendingNominees >= 5,
      onClick: () => handlers.navigate('people'),
      hide: (nominees?.length || 0) === 0,
    },
    {
      id: 'min',
      label: `Reach ${minContestants} contestants`,
      sub: meetsMin
        ? `${contestantCount} confirmed — minimum met`
        : `${contestantCount} of ${minContestants} confirmed`,
      icon: Crown,
      done: meetsMin,
      urgent: !meetsMin && phase === TIMELINE_PHASES.NOMINATION,
      onClick: () => handlers.navigate('people'),
    },
  ];

  // Stage 5 — Communications
  const commsItems = [
    {
      id: 'announcement',
      label: 'Post an announcement',
      sub: (announcements?.length || 0) > 0 ? `${announcements.length} posted` : 'Welcome contestants and set the tone',
      icon: Megaphone,
      done: (announcements?.length || 0) > 0,
      onClick: () => handlers.navigate('content'),
    },
    {
      id: 'pin',
      label: 'Pin your best update',
      sub: pinnedAnnouncements > 0 ? `${pinnedAnnouncements} pinned` : 'Pin so it stays at the top',
      icon: Pin,
      done: pinnedAnnouncements > 0,
      onClick: () => handlers.navigate('content'),
    },
  ];

  return [
    {
      id: 'identity',
      number: 1,
      title: 'Identity',
      subtitle: 'Who you are and what this competition looks like',
      icon: Palette,
      items: identityItems,
      primaryCta: { label: 'Edit branding', onClick: () => handlers.navigate('setup') },
      secondaryCta: host?.id ? { label: 'Edit host profile', onClick: () => handlers.openHostProfile(host.id) } : null,
    },
    {
      id: 'schedule',
      number: 2,
      title: 'Schedule',
      subtitle: 'Phase dates, double days, and key events',
      icon: Calendar,
      items: scheduleItems,
      primaryCta: { label: 'Open Setup', onClick: () => handlers.navigate('setup') },
    },
    {
      id: 'collaborators',
      number: 3,
      title: 'Collaborators',
      subtitle: 'Prizes, judges, and sponsors that bring the competition to life',
      icon: Award,
      items: collaboratorItems,
      primaryCta: { label: 'Manage collaborators', onClick: () => handlers.navigate('setup') },
    },
    {
      id: 'people',
      number: 4,
      title: 'People',
      subtitle: 'Recruit nominees and approve contestants',
      icon: Users,
      items: peopleItems.filter(i => !i.hide),
      primaryCta: { label: 'Manage people', onClick: () => handlers.navigate('people') },
    },
    {
      id: 'communications',
      number: 5,
      title: 'Communications',
      subtitle: 'Keep everyone in the loop',
      icon: Megaphone,
      items: commsItems,
      primaryCta: { label: 'Manage announcements', onClick: () => handlers.navigate('content') },
    },
  ];
}

// =============================================================================
// HOST TOOLKIT — day-to-day shortcuts
// =============================================================================

function buildToolkit({ handlers, onViewPublicSite }) {
  return [
    { id: 'view-public', label: 'View as Voter', sub: 'Open the public page', icon: Eye, onClick: onViewPublicSite, disabled: !onViewPublicSite },
    { id: 'copy-link', label: 'Copy Public Link', sub: 'Share the URL', icon: Link2, onClick: handlers.copyPublicLink },
    { id: 'announcement', label: 'New Announcement', sub: 'Post an update', icon: Megaphone, onClick: () => handlers.navigate('content') },
    { id: 'add-event', label: 'Schedule Event', sub: 'Mixers, launches, finales', icon: Calendar, onClick: () => handlers.openEventModal() },
    { id: 'add-sponsor', label: 'Add Sponsor', sub: 'Bring on a partner', icon: Building2, onClick: () => handlers.openSponsorModal() },
    { id: 'manage-timeline', label: 'Manage Timeline', sub: 'Edit phases and dates', icon: SettingsIcon, onClick: () => handlers.navigate('setup') },
  ];
}

// =============================================================================
// STAGE PANEL
// =============================================================================

function StagePanel({ stage, defaultExpanded, isMobile }) {
  const total = stage.items.length;
  const done = stage.items.filter(i => i.done).length;
  const isComplete = total > 0 && done === total;
  const progress = total > 0 ? (done / total) * 100 : 0;

  const [expanded, setExpanded] = useState(defaultExpanded);

  // Auto-collapse complete stages, but allow user to toggle.
  const showCollapsed = isComplete && !expanded;

  const statusPill = isComplete
    ? { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: colors.status.success, label: 'Complete' }
    : done === 0
      ? { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)', color: colors.text.muted, label: 'Not started' }
      : { bg: 'rgba(212,175,55,0.12)', border: 'rgba(212,175,55,0.3)', color: colors.gold.primary, label: `In progress · ${done}/${total}` };

  const numberStyle = isComplete
    ? {
        background: 'linear-gradient(135deg, #d4af37, #f4d03f)',
        color: '#0a0a0c',
        border: 'none',
        boxShadow: '0 2px 8px rgba(212,175,55,0.25)',
      }
    : done > 0
      ? {
          background: 'rgba(212,175,55,0.15)',
          color: colors.gold.primary,
          border: `1px solid ${colors.gold.primary}`,
        }
      : {
          background: 'rgba(255,255,255,0.04)',
          color: colors.text.muted,
          border: '1px solid rgba(255,255,255,0.08)',
        };

  return (
    <div style={{
      background: colors.background.secondary,
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%',
          padding: isMobile ? spacing.md : spacing.lg,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? spacing.sm : spacing.md,
          textAlign: 'left',
        }}
      >
        {/* Number circle */}
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: typography.fontWeight.bold,
          fontSize: typography.fontSize.md,
          flexShrink: 0,
          ...numberStyle,
        }}>
          {isComplete ? '✓' : stage.number}
        </div>

        {/* Title + subtitle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
            }}>
              {stage.title}
            </span>
            <span style={{
              padding: `2px ${spacing.sm}`,
              background: statusPill.bg,
              border: `1px solid ${statusPill.border}`,
              borderRadius: borderRadius.pill,
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.semibold,
              color: statusPill.color,
            }}>
              {statusPill.label}
            </span>
          </div>
          <div style={{
            fontSize: typography.fontSize.xs,
            color: colors.text.muted,
            marginTop: '2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {stage.subtitle}
          </div>
        </div>

        {/* Chevron */}
        <div style={{ flexShrink: 0, color: colors.text.muted }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {/* Progress bar */}
      <div style={{
        height: '3px',
        background: 'rgba(255,255,255,0.05)',
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: isComplete
            ? 'linear-gradient(90deg, #22c55e, #4ade80)'
            : 'linear-gradient(90deg, #d4af37, #f4d03f)',
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Body */}
      {!showCollapsed && (
        <div style={{ padding: isMobile ? spacing.md : spacing.lg }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: spacing.sm,
            marginBottom: spacing.md,
          }}>
            {stage.items.map(item => {
              const Icon = item.icon;
              const StatusIcon = item.done ? CheckCircle2 : Circle;
              const statusColor = item.done
                ? colors.status.success
                : item.urgent
                  ? colors.status.warning
                  : colors.text.muted;

              return (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  disabled={!item.onClick}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    padding: spacing.md,
                    background: item.done
                      ? 'rgba(34,197,94,0.04)'
                      : item.urgent
                        ? 'rgba(245,158,11,0.06)'
                        : 'rgba(255,255,255,0.02)',
                    border: item.urgent && !item.done
                      ? '1px solid rgba(245,158,11,0.25)'
                      : '1px solid rgba(255,255,255,0.04)',
                    borderRadius: borderRadius.lg,
                    color: colors.text.primary,
                    textAlign: 'left',
                    cursor: item.onClick ? 'pointer' : 'default',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <StatusIcon size={16} style={{ color: statusColor, flexShrink: 0 }} />
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: borderRadius.md,
                    background: item.done ? 'rgba(34,197,94,0.1)' : 'rgba(212,175,55,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    opacity: item.done ? 0.6 : 1,
                  }}>
                    <Icon size={14} style={{ color: item.done ? colors.status.success : colors.gold.primary }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.semibold,
                      color: item.done ? colors.text.secondary : colors.text.primary,
                      marginBottom: '2px',
                    }}>
                      {item.label}
                    </div>
                    <div style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.text.muted,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {item.sub}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Stage CTAs */}
          {(stage.primaryCta || stage.secondaryCta) && (
            <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {stage.secondaryCta && (
                <button
                  onClick={stage.secondaryCta.onClick}
                  style={{
                    padding: `${spacing.xs} ${spacing.md}`,
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: borderRadius.md,
                    color: colors.text.secondary,
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.medium,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.xs,
                  }}
                >
                  {stage.secondaryCta.label}
                  <ArrowRight size={12} />
                </button>
              )}
              {stage.primaryCta && (
                <button
                  onClick={stage.primaryCta.onClick}
                  style={{
                    padding: `${spacing.xs} ${spacing.md}`,
                    background: 'rgba(212,175,55,0.12)',
                    border: '1px solid rgba(212,175,55,0.3)',
                    borderRadius: borderRadius.md,
                    color: colors.gold.primary,
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.semibold,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.xs,
                  }}
                >
                  {stage.primaryCta.label}
                  <ArrowRight size={12} />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function OverviewTab({
  competition,
  contestants,
  nominees,
  sponsors,
  events,
  announcements,
  prizes,
  judges,
  doubleDays,
  host,
  isSuperAdmin,
  onViewPublicSite,
  onNavigateToTab,
  onOpenSponsorModal,
  onOpenEventModal,
  onOpenPrizeModal,
  onOpenJudgeModal,
  onOpenAddPersonModal,
  onAddAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
  onTogglePin,
}) {
  const { isMobile } = useResponsive();
  const navigate = useNavigate();
  const toast = useToast();

  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '' });
  const [generatingCardId, setGeneratingCardId] = useState(null);

  const computedPhase = computeCompetitionPhase(competition);
  const isLive = checkIsLive(competition?.status);

  // -------------------------------------------------------------------------
  // Shared handlers
  // -------------------------------------------------------------------------

  const handlers = useMemo(() => ({
    navigate: (tab) => onNavigateToTab?.(tab),
    openPrizeModal: () => onOpenPrizeModal?.(null, 'winner'),
    openJudgeModal: () => onOpenJudgeModal?.(null),
    openSponsorModal: () => onOpenSponsorModal?.(null),
    openEventModal: () => onOpenEventModal?.(null),
    openAddPersonModal: (type) => onOpenAddPersonModal?.(type),
    openHostProfile: (hostId) => navigate(`/profile/${hostId}`),
    copyPublicLink: async () => {
      const orgSlug = competition?.organizationSlug || competition?.organization?.slug || 'most-eligible';
      const cityName = competition?.city?.name || competition?.city || 'competition';
      const citySlug = String(cityName).toLowerCase().replace(/\s+/g, '-').replace(/,/g, '');
      const year = competition?.season || new Date().getFullYear();
      const url = `${window.location.origin}/${orgSlug}/${citySlug}-${year}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Public link copied to clipboard');
      } catch {
        toast.error('Could not copy link');
      }
    },
  }), [competition, onNavigateToTab, onOpenPrizeModal, onOpenJudgeModal, onOpenSponsorModal, onOpenEventModal, onOpenAddPersonModal, navigate, toast]);

  // -------------------------------------------------------------------------
  // Stages + pulse metrics
  // -------------------------------------------------------------------------

  const stages = useMemo(() => buildStages({
    competition, host, events, doubleDays, prizes, judges, sponsors,
    nominees, contestants, announcements, phase: computedPhase, handlers,
  }), [competition, host, events, doubleDays, prizes, judges, sponsors, nominees, contestants, announcements, computedPhase, handlers]);

  const totalItems = stages.reduce((sum, s) => sum + s.items.length, 0);
  const itemsDone = stages.reduce((sum, s) => sum + s.items.filter(i => i.done).length, 0);
  const stagesComplete = stages.filter(s => s.items.length > 0 && s.items.every(i => i.done)).length;
  const setupPercent = totalItems > 0 ? Math.round((itemsDone / totalItems) * 100) : 0;
  const firstIncompleteStageId = stages.find(s => !s.items.every(i => i.done))?.id;

  // -------------------------------------------------------------------------
  // Derived data for day-to-day section
  // -------------------------------------------------------------------------

  const toolkit = useMemo(() => buildToolkit({ handlers, onViewPublicSite }), [handlers, onViewPublicSite]);

  const rankedContestants = useMemo(() => {
    return [...(contestants || [])].sort((a, b) => (b.votes || 0) - (a.votes || 0));
  }, [contestants]);
  const topContestants = rankedContestants.slice(0, 5);

  const minContestants = competition?.minContestants || 40;
  const sponsorRevenue = (sponsors || []).reduce((sum, s) => sum + (s.amount || 0), 0);

  const upcomingEvents = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    return (events || [])
      .filter(e => e.date >= todayStr)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 3);
  }, [events]);

  const sortedAnnouncements = useMemo(() => {
    return [...(announcements || [])].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.publishedAt) - new Date(a.publishedAt);
    }).slice(0, 3);
  }, [announcements]);

  const authorName = isSuperAdmin ? 'EliteRank' : (host?.name || 'Host');
  const authorAvatar = isSuperAdmin ? null : host?.avatar;

  // -------------------------------------------------------------------------
  // Action handlers (announcements, share cards)
  // -------------------------------------------------------------------------

  const handleViewProfile = (profileId) => {
    if (!profileId) return;
    navigate(`/profile/${profileId}`);
  };

  const handleDownloadCard = async (person) => {
    setGeneratingCardId(person.id);
    try {
      const blob = await generateAchievementCard({
        achievementType: 'contestant',
        name: person.name,
        photoUrl: person.avatarUrl,
        handle: person.instagram,
        competitionName: competition?.name || `Most Eligible ${competition?.city}`,
        cityName: competition?.city,
        season: competition?.season?.toString(),
        organizationName: competition?.organizationName || 'Most Eligible',
        organizationLogoUrl: competition?.organizationLogoUrl,
        accentColor: competition?.themePrimary || '#d4af37',
        voteUrl: competition?.slug ? `mosteligible.co/${competition.slug}` : 'mosteligible.co',
        votingStartDate: competition?.votingStart,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${person.name.replace(/\s+/g, '-').toLowerCase()}-card.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Card generation failed:', err);
    } finally {
      setGeneratingCardId(null);
    }
  };

  const handleSubmitAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) return;
    if (editingAnnouncement) {
      await onUpdateAnnouncement?.(editingAnnouncement.id, announcementForm);
      setEditingAnnouncement(null);
    } else {
      await onAddAnnouncement?.(announcementForm);
    }
    setAnnouncementForm({ title: '', content: '' });
    setShowAnnouncementForm(false);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? spacing.lg : spacing.xl }}>
      {/* Phase / Timeline header */}
      <TimelineCard competition={competition} events={events} />

      {/* Performance Pulse */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: isMobile ? spacing.sm : spacing.md,
      }}>
        <MetricCard
          icon={ListChecks}
          label="Setup"
          value={`${stagesComplete} / 5`}
          goal={5}
          goalLabel={`${setupPercent}% of items done`}
          variant="gold"
          cta={firstIncompleteStageId ? 'Continue setup →' : 'All set ✓'}
          onCtaClick={firstIncompleteStageId ? () => {
            const el = document.getElementById(`stage-${firstIncompleteStageId}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } : undefined}
        />
        <MetricCard
          icon={TrendingUp}
          label="Recruitment"
          value={contestants?.length || 0}
          goal={minContestants}
          goalLabel={`${nominees?.length || 0} nominated`}
          warning={(contestants?.length || 0) < minContestants
            ? `Need ${minContestants - (contestants?.length || 0)} more`
            : null}
          variant={(contestants?.length || 0) >= minContestants ? 'success' : 'warning'}
          cta="Manage people →"
          onCtaClick={() => onNavigateToTab?.('people')}
        />
        <MetricCard
          icon={DollarSign}
          label="Revenue"
          value={sponsorRevenue > 0 ? formatCurrency(sponsorRevenue) : '$0'}
          goalLabel={(sponsors?.length || 0) > 0 ? `${sponsors.length} sponsor${sponsors.length === 1 ? '' : 's'}` : 'No sponsors yet'}
          variant="default"
          cta={(sponsors?.length || 0) > 0 ? 'Manage sponsors →' : '+ Add sponsor'}
          onCtaClick={() => (sponsors?.length || 0) > 0 ? onNavigateToTab?.('setup') : onOpenSponsorModal?.(null)}
        />
      </div>

      {/* Setup Journey */}
      <Panel title="Setup Journey" icon={Sparkles} style={{ marginBottom: 0 }}>
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          <p style={{
            color: colors.text.secondary,
            fontSize: typography.fontSize.sm,
            marginBottom: spacing.lg,
            lineHeight: 1.5,
          }}>
            Five stages to launch a great competition. Work through them in order — each stage auto-collapses when you complete it.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            {stages.map(stage => (
              <div key={stage.id} id={`stage-${stage.id}`}>
                <StagePanel
                  stage={stage}
                  defaultExpanded={stage.id === firstIncompleteStageId}
                  isMobile={isMobile}
                />
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* Day-to-day section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: isMobile ? spacing.lg : spacing.xl,
        alignItems: 'start',
      }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? spacing.lg : spacing.xl }}>
          <Panel title="Host Toolkit" icon={SettingsIcon} style={{ marginBottom: 0 }} collapsible>
            <div style={{ padding: isMobile ? spacing.md : spacing.lg }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                gap: spacing.sm,
              }}>
                {toolkit.map(tool => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      onClick={tool.onClick}
                      disabled={tool.disabled}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.md,
                        padding: spacing.md,
                        background: colors.background.secondary,
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: borderRadius.lg,
                        color: colors.text.primary,
                        textAlign: 'left',
                        cursor: tool.disabled ? 'not-allowed' : 'pointer',
                        opacity: tool.disabled ? 0.5 : 1,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: borderRadius.md,
                        background: 'rgba(212,175,55,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Icon size={14} style={{ color: colors.gold.primary }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.semibold,
                          marginBottom: '2px',
                        }}>
                          {tool.label}
                        </div>
                        <div style={{
                          fontSize: typography.fontSize.xs,
                          color: colors.text.muted,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {tool.sub}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </Panel>

          <Panel
            title="Upcoming Events"
            icon={Calendar}
            style={{ marginBottom: 0 }}
            action={<Button size="sm" icon={Plus} onClick={() => onOpenEventModal?.(null)}>Add Event</Button>}
            collapsible
          >
            <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
              {upcomingEvents.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: spacing.xl,
                  background: 'rgba(212,175,55,0.05)',
                  borderRadius: borderRadius.lg,
                  border: '1px dashed rgba(212,175,55,0.25)',
                }}>
                  <Calendar size={28} style={{ color: colors.gold.primary, marginBottom: spacing.sm, opacity: 0.7 }} />
                  <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, marginBottom: spacing.md }}>
                    No events scheduled
                  </p>
                  <Button size="sm" icon={Plus} onClick={() => onOpenEventModal?.(null)}>Add Event</Button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                  {upcomingEvents.map(event => {
                    const eventDays = daysUntil(event.date);
                    return (
                      <div
                        key={event.id}
                        style={{
                          padding: spacing.md,
                          background: colors.background.secondary,
                          borderRadius: borderRadius.lg,
                          display: 'flex',
                          alignItems: 'center',
                          gap: spacing.md,
                          border: '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: borderRadius.md,
                          background: 'rgba(212,175,55,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Calendar size={18} style={{ color: colors.gold.primary }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontWeight: typography.fontWeight.medium,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {event.name}
                          </p>
                          <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                            {formatDate(event.date, { weekday: 'short', month: 'short', day: 'numeric' })}
                            {event.time && ` · ${event.time}`}
                          </p>
                        </div>
                        <Badge variant={eventDays <= 3 ? 'error' : eventDays <= 7 ? 'warning' : 'secondary'}>
                          {eventDays === 0 ? 'Today' : eventDays === 1 ? '1 day' : `${eventDays} days`}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? spacing.lg : spacing.xl }}>
          <Panel
            title="Top Contestants"
            icon={Crown}
            style={{ marginBottom: 0 }}
            action={
              <button
                onClick={() => onNavigateToTab?.('people')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.gold.primary,
                  fontSize: typography.fontSize.sm,
                  cursor: 'pointer',
                }}
              >
                View All →
              </button>
            }
            collapsible
          >
            <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
              {topContestants.length === 0 ? (
                <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
                  <Users size={40} style={{ marginBottom: spacing.md, opacity: 0.4 }} />
                  <p style={{ fontSize: typography.fontSize.sm }}>
                    {isLive ? 'Rankings appear when voting begins' : 'No contestants yet'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                  {topContestants.map((contestant, index) => {
                    const rankColors = [
                      { bg: 'rgba(212,175,55,0.12)', border: 'rgba(212,175,55,0.25)', text: colors.gold.primary, rowBg: 'rgba(212,175,55,0.06)' },
                      { bg: 'rgba(192,192,210,0.12)', border: 'rgba(192,192,210,0.25)', text: '#c0c0d2', rowBg: 'rgba(192,192,210,0.04)' },
                      { bg: 'rgba(205,127,50,0.12)', border: 'rgba(205,127,50,0.25)', text: '#cd7f32', rowBg: 'rgba(205,127,50,0.04)' },
                    ];
                    const rankStyle = index < 3 ? rankColors[index] : null;
                    return (
                      <div
                        key={contestant.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: spacing.md,
                          padding: `${spacing.sm} ${spacing.md}`,
                          background: rankStyle ? rankStyle.rowBg : 'transparent',
                          borderRadius: borderRadius.lg,
                        }}
                      >
                        <div style={{
                          width: '30px',
                          height: '30px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: typography.fontWeight.bold,
                          fontSize: typography.fontSize.sm,
                          color: rankStyle ? rankStyle.text : colors.text.muted,
                          background: rankStyle ? rankStyle.bg : 'transparent',
                          border: rankStyle ? `1px solid ${rankStyle.border}` : 'none',
                          borderRadius: borderRadius.md,
                        }}>
                          {index === 0 ? <Crown size={14} style={{ color: colors.gold.primary }} /> : index + 1}
                        </div>
                        <Avatar name={contestant.name} size={36} src={contestant.avatarUrl} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {contestant.userId ? (
                            <button
                              onClick={() => handleViewProfile(contestant.userId)}
                              style={{
                                fontWeight: typography.fontWeight.medium,
                                display: 'flex',
                                alignItems: 'center',
                                gap: spacing.xs,
                                background: 'none',
                                border: 'none',
                                color: '#fff',
                                cursor: 'pointer',
                                padding: 0,
                                fontSize: 'inherit',
                                maxWidth: '100%',
                              }}
                            >
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {contestant.name}
                              </span>
                              <ExternalLink size={10} style={{ opacity: 0.4, flexShrink: 0 }} />
                            </button>
                          ) : (
                            <span style={{
                              fontWeight: typography.fontWeight.medium,
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {contestant.name}
                            </span>
                          )}
                        </div>
                        <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                          {formatNumber(contestant.votes || 0)} votes
                        </span>
                        <button
                          onClick={() => handleDownloadCard(contestant)}
                          disabled={generatingCardId === contestant.id}
                          title="Download share card"
                          style={{
                            padding: spacing.xs,
                            background: 'rgba(212,175,55,0.1)',
                            border: 'none',
                            borderRadius: borderRadius.sm,
                            cursor: generatingCardId === contestant.id ? 'wait' : 'pointer',
                            color: colors.gold.primary,
                            minWidth: '28px',
                            minHeight: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {generatingCardId === contestant.id ? (
                            <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <Download size={14} />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Panel>

          <Panel
            title="Announcements"
            icon={FileText}
            style={{ marginBottom: 0 }}
            action={<Button size="sm" icon={Plus} onClick={() => setShowAnnouncementForm(true)}>New Post</Button>}
            collapsible
          >
            <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
              {showAnnouncementForm && (
                <div style={{
                  marginBottom: spacing.lg,
                  padding: spacing.md,
                  background: colors.background.secondary,
                  borderRadius: borderRadius.lg,
                }}>
                  <input
                    type="text"
                    placeholder="Announcement title..."
                    value={announcementForm.title}
                    onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      background: colors.background.primary,
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: borderRadius.md,
                      color: '#fff',
                      fontSize: '16px',
                      marginBottom: spacing.sm,
                    }}
                  />
                  <textarea
                    placeholder="Write your announcement..."
                    value={announcementForm.content}
                    onChange={(e) => setAnnouncementForm(prev => ({ ...prev, content: e.target.value }))}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      background: colors.background.primary,
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: borderRadius.md,
                      color: '#fff',
                      fontSize: '16px',
                      resize: 'vertical',
                      marginBottom: spacing.md,
                    }}
                  />
                  <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end' }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setShowAnnouncementForm(false);
                        setEditingAnnouncement(null);
                        setAnnouncementForm({ title: '', content: '' });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSubmitAnnouncement}
                      disabled={!announcementForm.title.trim() || !announcementForm.content.trim()}
                    >
                      {editingAnnouncement ? 'Update' : 'Post'}
                    </Button>
                  </div>
                </div>
              )}

              {sortedAnnouncements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
                  <FileText size={40} style={{ marginBottom: spacing.md, opacity: 0.4 }} />
                  <p style={{ fontSize: typography.fontSize.sm }}>No announcements yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                  {sortedAnnouncements.map(post => (
                    <div
                      key={post.id}
                      style={{
                        padding: spacing.md,
                        background: post.pinned ? 'rgba(212,175,55,0.05)' : colors.background.secondary,
                        borderRadius: borderRadius.lg,
                        border: post.pinned ? '1px solid rgba(212,175,55,0.25)' : '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                        <Avatar name={authorName} src={authorAvatar} size={28} />
                        <span style={{ fontWeight: typography.fontWeight.medium, fontSize: typography.fontSize.sm }}>
                          {authorName}
                        </span>
                        <span style={{ color: colors.text.muted, fontSize: typography.fontSize.xs }}>
                          · {formatRelativeTime(post.publishedAt)}
                        </span>
                        {post.pinned && <Pin size={12} style={{ color: colors.gold.primary }} />}
                      </div>
                      <h4 style={{
                        fontSize: typography.fontSize.md,
                        fontWeight: typography.fontWeight.semibold,
                        marginBottom: spacing.xs,
                      }}>
                        {post.title}
                      </h4>
                      <p style={{
                        color: colors.text.secondary,
                        fontSize: typography.fontSize.sm,
                        lineHeight: 1.5,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        {post.content}
                      </p>
                      <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.sm, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => onTogglePin?.(post.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: post.pinned ? colors.gold.primary : colors.text.muted,
                            cursor: 'pointer',
                            padding: spacing.xs,
                          }}
                        >
                          <Pin size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingAnnouncement(post);
                            setAnnouncementForm({ title: post.title, content: post.content });
                            setShowAnnouncementForm(true);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: colors.text.muted,
                            cursor: 'pointer',
                            padding: spacing.xs,
                          }}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => onDeleteAnnouncement?.(post.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: colors.text.muted,
                            cursor: 'pointer',
                            padding: spacing.xs,
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {announcements?.length > 3 && (
                    <button
                      onClick={() => onNavigateToTab?.('content')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: colors.gold.primary,
                        fontSize: typography.fontSize.sm,
                        cursor: 'pointer',
                        textAlign: 'center',
                        padding: spacing.sm,
                      }}
                    >
                      View all {announcements.length} announcements →
                    </button>
                  )}
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* Keyframes for loader animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
