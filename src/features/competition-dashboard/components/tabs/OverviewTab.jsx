import React, { useMemo, useState } from 'react';
import {
  Eye, Users, UserPlus, Star, Plus, Crown, Calendar, FileText, Pin, Edit, Trash2,
  Download, Loader, ExternalLink, Link2, Megaphone, Image as ImageIcon, Award,
  Settings as SettingsIcon, CheckCircle2, Circle, ArrowRight, Sparkles, Trophy,
  Building2,
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
  COMPETITION_STATUSES,
} from '../../../../utils/competitionPhase';
import TimelineCard from '../../../overview/components/TimelineCard';
import MetricCard from '../../../overview/components/MetricCard';

// =============================================================================
// CHRONOLOGICAL CHECKLIST — what the host should do next, ordered by phase
// =============================================================================

function buildActionChecklist({
  competition,
  contestants,
  nominees,
  events,
  prizes,
  judges,
  sponsors,
  announcements,
  phase,
  isLive,
  isCompleted,
  isDraftOrPublish,
  handlers,
}) {
  const minContestants = competition?.minContestants || 40;
  const contestantCount = contestants?.length || 0;
  const pendingNominees = (nominees || []).filter(n => n.status === 'pending').length;
  const upcomingEventCount = (events || []).filter(e => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    return e.date >= todayStr;
  }).length;

  const hasTimelineDates = !!(competition?.nominationEnd && (competition?.votingEnd || competition?.finalsDate));
  const hasPrizes = (prizes?.length || 0) > 0;
  const hasJudges = (judges?.length || 0) > 0;
  const hasSponsors = (sponsors?.length || 0) > 0;
  const hasAnnouncement = (announcements?.length || 0) > 0;
  const meetsMin = contestantCount >= minContestants;
  const hasUpcomingEvent = upcomingEventCount > 0;
  const hasFinalsEvent = (events || []).some(e => /final/i.test(e.name || ''));

  // Build the full ordered list. Each item can be 'done', 'todo', or 'urgent'.
  const all = [
    {
      id: 'set-timeline',
      group: 'Pre-launch',
      label: 'Set the competition timeline',
      sub: 'Lock in nomination, voting, and finals dates',
      icon: Calendar,
      done: hasTimelineDates,
      cta: 'Open Setup',
      onClick: () => handlers.navigate('setup'),
    },
    {
      id: 'add-prizes',
      group: 'Pre-launch',
      label: 'Add winner prizes',
      sub: 'Define what contestants are competing for',
      icon: Trophy,
      done: hasPrizes,
      cta: 'Add Prize',
      onClick: () => handlers.openPrizeModal(),
    },
    {
      id: 'invite-nominees',
      group: 'Nomination',
      label: 'Invite your first nominees',
      sub: 'Seed the competition with people in your network',
      icon: UserPlus,
      done: (nominees?.length || 0) > 0,
      cta: 'Add Nominee',
      onClick: () => handlers.openAddPersonModal('nominee'),
    },
    {
      id: 'review-pending',
      group: 'Nomination',
      label: 'Review pending nominations',
      sub: pendingNominees > 0 ? `${pendingNominees} waiting for your decision` : 'No pending nominations right now',
      icon: Users,
      done: pendingNominees === 0,
      urgent: pendingNominees >= 5,
      cta: 'Review',
      onClick: () => handlers.navigate('people'),
      hide: (nominees?.length || 0) === 0,
    },
    {
      id: 'min-contestants',
      group: 'Nomination',
      label: `Reach ${minContestants} contestants`,
      sub: meetsMin
        ? `${contestantCount} contestants confirmed`
        : `${contestantCount} of ${minContestants} confirmed — need ${minContestants - contestantCount} more`,
      icon: Crown,
      done: meetsMin,
      urgent: !meetsMin && phase === TIMELINE_PHASES.NOMINATION,
      cta: 'Manage People',
      onClick: () => handlers.navigate('people'),
    },
    {
      id: 'launch-event',
      group: 'Nomination',
      label: 'Schedule a launch event',
      sub: hasUpcomingEvent ? `${upcomingEventCount} event${upcomingEventCount === 1 ? '' : 's'} on the calendar` : 'Give voters something to rally around',
      icon: Calendar,
      done: hasUpcomingEvent,
      cta: 'Add Event',
      onClick: () => handlers.openEventModal(),
    },
    {
      id: 'first-announcement',
      group: 'Nomination',
      label: 'Post your first announcement',
      sub: 'Welcome contestants and set the tone',
      icon: Megaphone,
      done: hasAnnouncement,
      cta: 'Write Post',
      onClick: () => handlers.navigate('content'),
    },
    {
      id: 'recruit-sponsor',
      group: 'Voting',
      label: 'Recruit a sponsor',
      sub: hasSponsors ? `${sponsors.length} sponsor${sponsors.length === 1 ? '' : 's'} signed on` : 'Sponsors fund prizes and add credibility',
      icon: Building2,
      done: hasSponsors,
      cta: 'Add Sponsor',
      onClick: () => handlers.openSponsorModal(),
    },
    {
      id: 'add-judges',
      group: 'Judging',
      label: 'Add judges for the final round',
      sub: hasJudges ? `${judges.length} judge${judges.length === 1 ? '' : 's'} confirmed` : 'Judges score the finalists',
      icon: Award,
      done: hasJudges,
      cta: 'Add Judge',
      onClick: () => handlers.openJudgeModal(),
    },
    {
      id: 'finals-event',
      group: 'Judging',
      label: 'Schedule the finals event',
      sub: hasFinalsEvent ? 'Finals event on the calendar' : 'Set the date and venue for the finale',
      icon: Sparkles,
      done: hasFinalsEvent,
      cta: 'Add Event',
      onClick: () => handlers.openEventModal(),
    },
  ];

  return all.filter(item => !item.hide);
}

// =============================================================================
// HOST TOOLKIT — random-but-helpful shortcuts
// =============================================================================

function buildToolkit({ competition, handlers, onViewPublicSite }) {
  return [
    {
      id: 'view-public',
      label: 'View as Voter',
      sub: 'Open the public competition page',
      icon: Eye,
      onClick: onViewPublicSite,
      disabled: !onViewPublicSite,
    },
    {
      id: 'copy-link',
      label: 'Copy Public Link',
      sub: 'Share the competition URL',
      icon: Link2,
      onClick: handlers.copyPublicLink,
    },
    {
      id: 'announcement',
      label: 'Broadcast Announcement',
      sub: 'Notify everyone with a new post',
      icon: Megaphone,
      onClick: () => handlers.navigate('content'),
    },
    {
      id: 'add-event',
      label: 'Schedule Event',
      sub: 'Mixers, launches, finales',
      icon: Calendar,
      onClick: () => handlers.openEventModal(),
    },
    {
      id: 'add-sponsor',
      label: 'Add Sponsor',
      sub: 'Bring on a partner',
      icon: Building2,
      onClick: () => handlers.openSponsorModal(),
    },
    {
      id: 'manage-timeline',
      label: 'Manage Timeline',
      sub: 'Edit phases and dates',
      icon: SettingsIcon,
      onClick: () => handlers.navigate('setup'),
    },
  ];
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
  const isCompleted = computedPhase === COMPETITION_STATUSES.COMPLETED;
  const isDraftOrPublish = !isLive && !isCompleted;

  // -------------------------------------------------------------------------
  // Handlers shared by checklist + toolkit
  // -------------------------------------------------------------------------

  const handlers = useMemo(() => ({
    navigate: (tab) => onNavigateToTab?.(tab),
    openPrizeModal: () => onOpenPrizeModal?.(null, 'winner'),
    openJudgeModal: () => onOpenJudgeModal?.(null),
    openSponsorModal: () => onOpenSponsorModal?.(null),
    openEventModal: () => onOpenEventModal?.(null),
    openAddPersonModal: (type) => onOpenAddPersonModal?.(type),
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
  }), [competition, onNavigateToTab, onOpenPrizeModal, onOpenJudgeModal, onOpenSponsorModal, onOpenEventModal, onOpenAddPersonModal, toast]);

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const checklist = useMemo(() => buildActionChecklist({
    competition, contestants, nominees, events, prizes, judges, sponsors, announcements,
    phase: computedPhase, isLive, isCompleted, isDraftOrPublish, handlers,
  }), [competition, contestants, nominees, events, prizes, judges, sponsors, announcements, computedPhase, isLive, isCompleted, isDraftOrPublish, handlers]);

  const toolkit = useMemo(() => buildToolkit({
    competition, handlers, onViewPublicSite,
  }), [competition, handlers, onViewPublicSite]);

  const checklistDone = checklist.filter(i => i.done).length;
  const checklistTotal = checklist.length;
  const checklistProgress = checklistTotal > 0 ? (checklistDone / checklistTotal) * 100 : 0;
  const nextAction = checklist.find(i => !i.done);

  const rankedContestants = useMemo(() => {
    return [...(contestants || [])].sort((a, b) => (b.votes || 0) - (a.votes || 0));
  }, [contestants]);
  const topContestants = rankedContestants.slice(0, 5);

  const completedNominees = (nominees || []).filter(n => !(n.nominatedBy === 'self' && !n.claimedAt));
  const incompleteCount = (nominees || []).filter(n =>
    n.nominatedBy === 'self' && !n.claimedAt &&
    (n.status === 'pending' || n.status === 'awaiting_profile')
  ).length;
  const pendingNominees = completedNominees.filter(n => n.status === 'pending').length;
  const totalNominees = (nominees || []).length;
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
  // Renderers
  // -------------------------------------------------------------------------

  const renderChecklistItem = (item) => {
    const Icon = item.icon;
    const StatusIcon = item.done ? CheckCircle2 : Circle;
    const statusColor = item.done
      ? colors.status.success
      : item.urgent
        ? colors.status.warning
        : colors.text.muted;

    return (
      <div
        key={item.id}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.md,
          background: item.done
            ? 'rgba(34,197,94,0.04)'
            : item.urgent
              ? 'rgba(245,158,11,0.06)'
              : colors.background.secondary,
          borderRadius: borderRadius.lg,
          border: item.urgent && !item.done
            ? '1px solid rgba(245,158,11,0.25)'
            : '1px solid rgba(255,255,255,0.04)',
          transition: 'background 0.15s ease',
        }}
      >
        <StatusIcon size={18} style={{ color: statusColor, flexShrink: 0 }} />
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: borderRadius.md,
          background: item.done ? 'rgba(34,197,94,0.1)' : 'rgba(212,175,55,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          opacity: item.done ? 0.6 : 1,
        }}>
          <Icon size={15} style={{ color: item.done ? colors.status.success : colors.gold.primary }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            color: item.done ? colors.text.secondary : colors.text.primary,
            textDecoration: item.done ? 'line-through' : 'none',
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
        {!item.done && item.cta && (
          <button
            onClick={item.onClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              padding: `${spacing.xs} ${spacing.md}`,
              background: item.urgent
                ? 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.1))'
                : 'rgba(212,175,55,0.12)',
              border: `1px solid ${item.urgent ? 'rgba(245,158,11,0.4)' : 'rgba(212,175,55,0.3)'}`,
              borderRadius: borderRadius.md,
              color: item.urgent ? colors.status.warning : colors.gold.primary,
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.semibold,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {item.cta}
            <ArrowRight size={12} />
          </button>
        )}
      </div>
    );
  };

  const renderToolkitItem = (tool) => {
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
          minHeight: '56px',
        }}
        onMouseEnter={(e) => {
          if (tool.disabled) return;
          e.currentTarget.style.background = colors.background.cardHover;
          e.currentTarget.style.borderColor = 'rgba(212,175,55,0.25)';
        }}
        onMouseLeave={(e) => {
          if (tool.disabled) return;
          e.currentTarget.style.background = colors.background.secondary;
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
        }}
      >
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: borderRadius.md,
          background: 'rgba(212,175,55,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={16} style={{ color: colors.gold.primary }} />
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
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? spacing.lg : spacing.xl }}>
      {/* Phase / Timeline header */}
      <TimelineCard competition={competition} events={events} />

      {/* Hero: "Your Next Actions" chronological checklist */}
      <Panel
        title="Your Next Actions"
        icon={Sparkles}
        action={
          <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.xs }}>
            {checklistDone} of {checklistTotal} complete
          </span>
        }
        style={{ marginBottom: 0 }}
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {/* Progress bar */}
          <div style={{
            height: '4px',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: borderRadius.pill,
            overflow: 'hidden',
            marginBottom: spacing.lg,
          }}>
            <div style={{
              width: `${checklistProgress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #d4af37, #f4d03f)',
              borderRadius: borderRadius.pill,
              transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 0 8px rgba(212,175,55,0.3)',
            }} />
          </div>

          {/* Next-action callout */}
          {nextAction && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.md,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))',
              border: '1px solid rgba(212,175,55,0.25)',
              borderRadius: borderRadius.lg,
              marginBottom: spacing.lg,
            }}>
              <Sparkles size={16} style={{ color: colors.gold.primary, flexShrink: 0 }} />
              <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                Up next: <strong style={{ color: colors.gold.primary }}>{nextAction.label}</strong>
              </span>
            </div>
          )}

          {/* Checklist items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            {checklist.map(renderChecklistItem)}
          </div>
        </div>
      </Panel>

      {/* Two-column layout: metrics+toolkit+events on left; leaderboard+announcements on right */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: isMobile ? spacing.lg : spacing.xl,
        alignItems: 'start',
      }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? spacing.lg : spacing.xl }}>
          {/* Compact metrics row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: isMobile ? spacing.sm : spacing.md,
          }}>
            <MetricCard
              icon={UserPlus}
              label="Nominations"
              value={totalNominees}
              goal={300}
              goalLabel={[
                pendingNominees > 0 && `${pendingNominees} pending`,
                incompleteCount > 0 && `${incompleteCount} incomplete`,
              ].filter(Boolean).join(', ') || null}
              variant="default"
              cta="People →"
              onCtaClick={() => onNavigateToTab?.('people')}
            />
            <MetricCard
              icon={Users}
              label="Contestants"
              value={contestants?.length || 0}
              goal={competition?.minContestants || 40}
              warning={contestants?.length < (competition?.minContestants || 40)
                ? `Need ${(competition?.minContestants || 40) - contestants?.length} more`
                : null}
              variant={contestants?.length >= (competition?.minContestants || 40) ? 'success' : 'warning'}
              cta="People →"
              onCtaClick={() => onNavigateToTab?.('people')}
            />
            <MetricCard
              icon={Star}
              label="Sponsors"
              value={sponsors?.length || 0}
              goalLabel={sponsorRevenue > 0 ? formatCurrency(sponsorRevenue) : null}
              variant="gold"
              cta="+ Add"
              onCtaClick={() => onOpenSponsorModal?.(null)}
            />
          </div>

          {/* Host Toolkit */}
          <Panel title="Host Toolkit" icon={SettingsIcon} style={{ marginBottom: 0 }} collapsible>
            <div style={{ padding: isMobile ? spacing.md : spacing.lg }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                gap: spacing.sm,
              }}>
                {toolkit.map(renderToolkitItem)}
              </div>
            </div>
          </Panel>

          {/* Upcoming Events */}
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
          {/* Top Contestants */}
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

          {/* Announcements */}
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
