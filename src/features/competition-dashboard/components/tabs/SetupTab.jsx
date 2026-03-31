import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, User, Star, Plus, Trash2, Edit2, Lock, MapPin, DollarSign, Users, Tag, ChevronDown, ChevronUp, Gift, Trophy, CheckCircle, XCircle, ExternalLink, Check, X, Clock, Upload, Download } from 'lucide-react';
import { Button, Badge, Avatar, Panel } from '../../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../../styles/theme';
import { useResponsive } from '../../../../hooks/useResponsive';
import TimelineSettings from '../TimelineSettings';
import { getBonusVoteTasks, setupDefaultBonusTasks, updateBonusVoteTask, getBonusVoteCompletionStats, createCustomBonusTask, deleteCustomBonusTask, getPendingSubmissions, reviewBonusSubmission } from '../../../../lib/bonusVotes';
import { isSupabaseConfigured } from '../../../../lib/supabase';
import { useAuthStore } from '../../../../stores';
import CustomBonusTaskModal from '../../../../components/modals/CustomBonusTaskModal';
import VideoPromptModal from '../../../../components/modals/VideoPromptModal';
import VideoPlayer from '../../../../components/VideoPlayer';
import { getVideoPrompts, getVideoResponses, createVideoPrompt, deleteVideoPrompt, reviewVideoResponse, notifyContestantsOfPrompt } from '../../../../lib/videoPrompts';
import { useAuthContextSafe } from '../../../../contexts/AuthContext';

// Helper to format currency from cents
const formatCurrency = (cents) => {
  const dollars = (cents || 0) / 100;
  return dollars.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
};

// Helper to format radius display
const formatRadius = (miles) => {
  if (miles === 0) return 'No restriction';
  return `${miles} miles`;
};

// Helper to determine event status
const parseDateLocal = (dateStr) => {
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + 'T00:00:00');
  }
  return new Date(dateStr);
};

const getEventStatus = (event) => {
  if (event.status === 'completed') return 'completed';
  if (!event.date && !event.startDate) return 'upcoming';
  const eventDate = parseDateLocal(event.date || event.startDate);
  const now = new Date();
  if (eventDate < now) return 'completed';
  if (event.endDate) {
    const endDate = parseDateLocal(event.endDate);
    if (eventDate <= now && now <= endDate) return 'active';
  }
  return 'upcoming';
};

/**
 * SetupTab - Configuration settings tab
 * Contains competition details, timeline, judges, sponsors, and events
 */
export default function SetupTab({
  competition,
  judges,
  sponsors,
  events,
  prizes = [],
  isSuperAdmin = false,
  onRefresh,
  onDeleteJudge,
  onDeleteSponsor,
  onDeleteEvent,
  onDeletePrize,
  onOpenJudgeModal,
  onOpenSponsorModal,
  onOpenCharityModal,
  onOpenEventModal,
  onOpenPrizeModal,
}) {
  const { isMobile } = useResponsive();
  const { profile: currentUser } = useAuthContextSafe();
  const authStoreUser = useAuthStore(s => s.user);
  const reviewerId = currentUser?.id || authStoreUser?.id;
  const [showCompetitionDetails, setShowCompetitionDetails] = useState(true);

  // Bonus votes state
  const [bonusTasks, setBonusTasks] = useState([]);
  const [bonusStats, setBonusStats] = useState(null);
  const [bonusLoading, setBonusLoading] = useState(false);
  const [settingUp, setSettingUp] = useState(false);

  // Custom task modal state
  const [showCustomTaskModal, setShowCustomTaskModal] = useState(false);
  const [editingCustomTask, setEditingCustomTask] = useState(null);

  // Submission review state
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Video prompts state
  const [videoPrompts, setVideoPrompts] = useState([]);
  const [videoResponses, setVideoResponses] = useState([]);
  const [showVideoPromptModal, setShowVideoPromptModal] = useState(false);
  const [videoRejectingId, setVideoRejectingId] = useState(null);
  const [videoRejectionReason, setVideoRejectionReason] = useState('');

  const competitionId = competition?.id;

  const loadBonusTasks = useCallback(async () => {
    if (!competitionId || !isSupabaseConfigured()) return;
    setBonusLoading(true);
    const [tasksResult, statsResult] = await Promise.all([
      getBonusVoteTasks(competitionId),
      getBonusVoteCompletionStats(competitionId),
    ]);
    setBonusTasks(tasksResult.tasks);
    setBonusStats(statsResult.stats);
    setBonusLoading(false);
  }, [competitionId]);

  const loadSubmissions = useCallback(async () => {
    if (!competitionId || !isSupabaseConfigured()) return;
    setSubmissionsLoading(true);
    const result = await getPendingSubmissions(competitionId);
    setSubmissions(result.submissions);
    setSubmissionsLoading(false);
  }, [competitionId]);

  // Video prompts data
  const loadVideoData = useCallback(async () => {
    if (!competitionId) return;
    const [pResult, rResult] = await Promise.all([
      getVideoPrompts(competitionId),
      getVideoResponses(competitionId),
    ]);
    setVideoPrompts(pResult.prompts);
    setVideoResponses(rResult.responses);
  }, [competitionId]);

  useEffect(() => {
    loadBonusTasks();
    loadSubmissions();
    loadVideoData();
  }, [loadBonusTasks, loadSubmissions, loadVideoData]);

  const handleCreateVideoPrompt = async (data) => {
    const result = await createVideoPrompt(competitionId, { ...data, createdBy: reviewerId });
    if (result.success) {
      notifyContestantsOfPrompt(competitionId, data.promptText).catch(() => {});
    }
    setShowVideoPromptModal(false);
    loadVideoData();
  };

  const handleDeleteVideoPrompt = async (promptId) => {
    if (!confirm('Delete this video prompt and all responses?')) return;
    await deleteVideoPrompt(promptId);
    loadVideoData();
  };

  const handleReviewVideoResponse = async (responseId, action, reason) => {
    const result = await reviewVideoResponse(responseId, reviewerId, action, reason);
    if (!result.success) {
      console.error('Video review failed:', result.error);
      alert(`Review failed: ${result.error || 'Unknown error'}`);
    }
    loadVideoData();
  };

  const pendingVideoResponses = videoResponses.filter(r => r.status === 'pending');

  const handleSetupBonusTasks = async () => {
    if (!competitionId) return;
    setSettingUp(true);
    await setupDefaultBonusTasks(competitionId);
    await loadBonusTasks();
    setSettingUp(false);
  };

  const handleToggleBonusTask = async (taskId, currentEnabled) => {
    await updateBonusVoteTask(taskId, { enabled: !currentEnabled });
    setBonusTasks(prev => prev.map(t => t.id === taskId ? { ...t, enabled: !currentEnabled } : t));
  };

  const handleUpdateBonusVotes = async (taskId, newVotes) => {
    const votes = parseInt(newVotes, 10);
    if (isNaN(votes) || votes < 0) return;
    await updateBonusVoteTask(taskId, { votes_awarded: votes });
    setBonusTasks(prev => prev.map(t => t.id === taskId ? { ...t, votes_awarded: votes } : t));
  };

  const handleSaveCustomTask = async (data) => {
    if (!competitionId) return;
    if (editingCustomTask) {
      await updateBonusVoteTask(editingCustomTask.id, {
        label: data.label,
        description: data.description,
        votes_awarded: data.votesAwarded,
        proof_label: data.proofLabel,
      });
    } else {
      await createCustomBonusTask(competitionId, {
        ...data,
        createdBy: currentUser?.id || null,
      });
    }
    setShowCustomTaskModal(false);
    setEditingCustomTask(null);
    await loadBonusTasks();
  };

  const handleDeleteCustomTask = async (taskId) => {
    if (!window.confirm('Delete this custom task? Any pending submissions will also be removed.')) return;
    await deleteCustomBonusTask(taskId);
    setBonusTasks(prev => prev.filter(t => t.id !== taskId));
    await loadSubmissions();
  };

  const handleApproveSubmission = async (submissionId) => {
    if (!currentUser?.id) return;
    setReviewingId(submissionId);
    await reviewBonusSubmission(submissionId, currentUser.id, 'approve');
    setReviewingId(null);
    await Promise.all([loadSubmissions(), loadBonusTasks()]);
    if (onRefresh) onRefresh();
  };

  const handleRejectSubmission = async (submissionId) => {
    if (!currentUser?.id) return;
    setReviewingId(submissionId);
    await reviewBonusSubmission(submissionId, currentUser.id, 'reject', rejectionReason);
    setReviewingId(null);
    setRejectingId(null);
    setRejectionReason('');
    await loadSubmissions();
  };

  // View-only field component - stacked layout for better mobile display
  const ViewOnlyField = ({ label, value, icon: Icon }) => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: spacing.xs,
      padding: isMobile ? spacing.md : `${spacing.md} ${spacing.lg}`,
      background: colors.background.secondary,
      borderRadius: borderRadius.md,
      border: `1px solid ${colors.border.lighter}`,
      minHeight: '44px', // Touch-friendly
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.xs,
        color: colors.text.muted,
        fontSize: typography.fontSize.xs,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {Icon && <Icon size={12} />}
        <span>{label}</span>
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{
          fontWeight: typography.fontWeight.medium,
          fontSize: typography.fontSize.base,
          wordBreak: 'break-word',
        }}>
          {value || '—'}
        </span>
        <Lock size={14} style={{ color: colors.text.muted, opacity: 0.4, flexShrink: 0, marginLeft: spacing.sm }} />
      </div>
    </div>
  );

  return (
    <div>
      {/* Competition Details - View Only (Admin Controlled) - Open by default */}
      <Panel
        title="Competition Details"
        icon={Lock}
        action={
          <button
            onClick={() => setShowCompetitionDetails(!showCompetitionDetails)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              background: 'none',
              border: 'none',
              color: colors.text.secondary,
              cursor: 'pointer',
              fontSize: typography.fontSize.sm,
            }}
          >
            {showCompetitionDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showCompetitionDetails ? 'Hide' : 'Show'}
          </button>
        }
      >
        {showCompetitionDetails && (
          <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
            <p style={{
              color: colors.text.muted,
              fontSize: typography.fontSize.sm,
              marginBottom: spacing.md,
            }}>
              These settings are managed by the admin.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: spacing.sm,
            }}>
              {/* Slot Fields */}
              <ViewOnlyField
                label="Category"
                value={competition?.categoryName}
                icon={Tag}
              />
              <ViewOnlyField
                label="Demographic"
                value={competition?.demographicName}
                icon={Users}
              />
              <ViewOnlyField
                label="City"
                value={typeof competition?.city === 'object' ? competition?.city?.name : competition?.city}
                icon={MapPin}
              />
              <ViewOnlyField
                label="Season"
                value={competition?.season}
                icon={Calendar}
              />

              {/* Economics Fields */}
              <ViewOnlyField
                label="Price per Vote"
                value={competition?.pricePerVote ? `$${competition.pricePerVote.toFixed(2)}` : '$1.00'}
                icon={DollarSign}
              />
              <ViewOnlyField
                label="Minimum Prize"
                value={formatCurrency(competition?.minimumPrizeCents)}
                icon={DollarSign}
              />
              <ViewOnlyField
                label="Number of Winners"
                value={competition?.numberOfWinners}
                icon={Star}
              />
              <ViewOnlyField
                label="Eligibility Radius"
                value={formatRadius(competition?.eligibilityRadiusMiles)}
                icon={MapPin}
              />

              {/* Contestant Limits */}
              <ViewOnlyField
                label="Min Contestants"
                value={competition?.minContestants || 40}
                icon={Users}
              />
              <ViewOnlyField
                label="Max Contestants"
                value={competition?.maxContestants || 'No limit'}
                icon={Users}
              />
            </div>
          </div>
        )}
        {!showCompetitionDetails && (
          <div style={{
            padding: isMobile ? spacing.md : spacing.lg,
            color: colors.text.muted,
            fontSize: typography.fontSize.sm,
          }}>
            <Lock size={14} style={{ display: 'inline', marginRight: spacing.xs, verticalAlign: 'middle' }} />
            Admin-managed slot and economics settings. Click "Show" to view.
          </div>
        )}
      </Panel>

      {/* Timeline & Status Settings */}
      <Panel title="Timeline & Status" icon={Calendar} collapsible defaultCollapsed>
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          <TimelineSettings competition={competition} onSave={onRefresh} isSuperAdmin={isSuperAdmin} />
        </div>
      </Panel>

      {/* Judges Section */}
      <Panel
        title={`Judges (${judges.length})`}
        icon={User}
        action={<Button size="sm" icon={Plus} onClick={() => onOpenJudgeModal(null)}>Add Judge</Button>}
        collapsible
        defaultCollapsed
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {judges.length === 0 ? (
            <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
              <User size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
              <p>No judges assigned yet</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: spacing.lg }}>
              {judges.map((judge) => (
                <div key={judge.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.lg,
                  background: colors.background.secondary,
                  borderRadius: borderRadius.lg,
                }}>
                  <Avatar name={judge.name} size={isMobile ? 40 : 48} src={judge.avatarUrl} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: typography.fontWeight.medium, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{judge.name}</p>
                    <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{judge.title}</p>
                  </div>
                  <button
                    onClick={() => onDeleteJudge(judge.id)}
                    style={{
                      padding: spacing.sm,
                      background: 'transparent',
                      border: `1px solid rgba(239,68,68,0.3)`,
                      borderRadius: borderRadius.md,
                      color: '#ef4444',
                      cursor: 'pointer',
                      minWidth: '36px',
                      minHeight: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>

      {/* Sponsors Section */}
      <Panel
        title={`Sponsors (${sponsors.length})`}
        icon={Star}
        action={<Button size="sm" icon={Plus} onClick={() => onOpenSponsorModal(null)}>Add Sponsor</Button>}
        collapsible
        defaultCollapsed
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {sponsors.length === 0 ? (
            <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
              <Star size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
              <p>No sponsors yet</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: spacing.md }}>
              {sponsors.map((sponsor) => (
                <div key={sponsor.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.lg,
                  padding: spacing.lg,
                  background: colors.background.secondary,
                  borderRadius: borderRadius.lg,
                  flexWrap: isMobile ? 'wrap' : 'nowrap',
                }}>
                  {sponsor.logoUrl ? (
                    <img src={sponsor.logoUrl} alt={sponsor.name} style={{ width: 48, height: 48, borderRadius: borderRadius.md, objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: 48, height: 48, background: 'rgba(212,175,55,0.2)', borderRadius: borderRadius.md, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Star size={24} style={{ color: colors.gold.primary }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: typography.fontWeight.medium }}>{sponsor.name}</p>
                    <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                      {sponsor.tier.charAt(0).toUpperCase() + sponsor.tier.slice(1)} Tier • ${sponsor.amount.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => onDeleteSponsor(sponsor.id)}
                    style={{
                      padding: spacing.sm,
                      background: 'transparent',
                      border: `1px solid rgba(239,68,68,0.3)`,
                      borderRadius: borderRadius.md,
                      color: '#ef4444',
                      cursor: 'pointer',
                      minWidth: '36px',
                      minHeight: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>

      {/* Charity Section */}
      <Panel
        title="Charity Partner"
        icon={Gift}
        action={
          <Button size="sm" icon={competition?.charityName ? Edit2 : Plus} onClick={onOpenCharityModal}>
            {competition?.charityName ? 'Edit' : 'Add Charity'}
          </Button>
        }
        collapsible
        defaultCollapsed
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {!competition?.charityName ? (
            <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
              <Gift size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
              <p>No charity partner set</p>
              <p style={{ fontSize: typography.fontSize.sm, marginTop: spacing.sm }}>
                Highlight a charity that benefits from competition proceeds
              </p>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.lg,
              padding: spacing.lg,
              background: colors.background.secondary,
              borderRadius: borderRadius.lg,
              flexWrap: isMobile ? 'wrap' : 'nowrap',
            }}>
              {competition.charityLogoUrl ? (
                <img src={competition.charityLogoUrl} alt={competition.charityName} style={{ width: 48, height: 48, borderRadius: borderRadius.md, objectFit: 'contain' }} />
              ) : (
                <div style={{ width: 48, height: 48, background: colors.gold.muted, borderRadius: borderRadius.md, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Gift size={24} style={{ color: colors.gold.primary }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: typography.fontWeight.medium }}>{competition.charityName}</p>
                {competition.charityWebsiteUrl && (
                  <a
                    href={competition.charityWebsiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, textDecoration: 'underline' }}
                  >
                    {competition.charityWebsiteUrl}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </Panel>

      {/* Events Section */}
      <Panel
        title={`Events (${events.length})`}
        icon={Calendar}
        action={<Button size="sm" icon={Plus} onClick={() => onOpenEventModal(null)}>Add Event</Button>}
        collapsible
        defaultCollapsed
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
              <Calendar size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
              <p>No events scheduled yet</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: spacing.md }}>
              {events.map((event) => {
                const status = getEventStatus(event);
                return (
                  <div key={event.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.lg,
                    padding: spacing.lg,
                    background: colors.background.secondary,
                    borderRadius: borderRadius.lg,
                    flexWrap: isMobile ? 'wrap' : 'nowrap',
                  }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      background: status === 'active' ? 'rgba(212,175,55,0.2)' : status === 'completed' ? 'rgba(34,197,94,0.2)' : 'rgba(59,130,246,0.2)',
                      borderRadius: borderRadius.lg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Calendar size={24} style={{ color: status === 'active' ? colors.gold.primary : status === 'completed' ? '#22c55e' : '#3b82f6' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: typography.fontWeight.medium }}>{event.name}</p>
                      <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                        {event.date ? parseDateLocal(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'No date set'}
                        {event.location && ` • ${event.location}`}
                      </p>
                    </div>
                    <Badge variant={status === 'active' ? 'gold' : status === 'completed' ? 'success' : 'secondary'} size="sm">
                      {status}
                    </Badge>
                    <button
                      onClick={() => onOpenEventModal(event)}
                      style={{
                        padding: spacing.sm,
                        background: 'transparent',
                        border: `1px solid ${colors.border.primary || 'rgba(255,255,255,0.15)'}`,
                        borderRadius: borderRadius.md,
                        color: colors.text.secondary,
                        cursor: 'pointer',
                        minWidth: '36px',
                        minHeight: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => onDeleteEvent(event.id)}
                      style={{
                        padding: spacing.sm,
                        background: 'transparent',
                        border: `1px solid rgba(239,68,68,0.3)`,
                        borderRadius: borderRadius.md,
                        color: '#ef4444',
                        cursor: 'pointer',
                        minWidth: '36px',
                        minHeight: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Panel>

      {/* Winner's Prize Package */}
      {(() => {
        const winnerPrizes = prizes.filter(p => (p.prizeType || 'winner') === 'winner');
        return (
          <Panel
            title={`Winner's Prize Package (${winnerPrizes.length})`}
            icon={Trophy}
            action={<Button size="sm" icon={Plus} onClick={() => onOpenPrizeModal(null, 'winner')}>Add Prize</Button>}
            collapsible
            defaultCollapsed
          >
            <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
              {winnerPrizes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
                  <Trophy size={48} style={{ marginBottom: spacing.md, opacity: 0.5, color: colors.gold.primary }} />
                  <p>No winner prizes added yet</p>
                  <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted, marginTop: spacing.sm }}>
                    Add prizes that will be awarded to the competition winner(s).
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: spacing.md }}>
                  {winnerPrizes.map((prize) => (
                    <div key={prize.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.lg,
                      padding: spacing.lg,
                      background: colors.background.secondary,
                      borderRadius: borderRadius.lg,
                      flexWrap: isMobile ? 'wrap' : 'nowrap',
                    }}>
                      {prize.imageUrl ? (
                        <img src={prize.imageUrl} alt={prize.title} style={{ width: 48, height: 48, borderRadius: borderRadius.md, objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 48, height: 48, background: 'rgba(212,175,55,0.2)', borderRadius: borderRadius.md, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Trophy size={24} style={{ color: colors.gold.primary }} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: typography.fontWeight.medium }}>{prize.title}</p>
                        <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {prize.sponsorName ? `by ${prize.sponsorName}` : ''}
                          {prize.sponsorName && prize.value ? ' · ' : ''}
                          {prize.value ? `$${Number(prize.value).toLocaleString()}` : ''}
                          {(prize.sponsorName || prize.value) && prize.description ? ' · ' : ''}
                          {prize.description || ''}
                        </p>
                      </div>
                      <button
                        onClick={() => onOpenPrizeModal(prize)}
                        style={{
                          padding: spacing.sm,
                          background: 'transparent',
                          border: `1px solid ${colors.border.primary || 'rgba(255,255,255,0.15)'}`,
                          borderRadius: borderRadius.md,
                          color: colors.text.secondary,
                          cursor: 'pointer',
                          minWidth: '36px',
                          minHeight: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => onDeletePrize(prize.id)}
                        style={{
                          padding: spacing.sm,
                          background: 'transparent',
                          border: `1px solid rgba(239,68,68,0.3)`,
                          borderRadius: borderRadius.md,
                          color: '#ef4444',
                          cursor: 'pointer',
                          minWidth: '36px',
                          minHeight: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>
        );
      })()}

      {/* Contestant Rewards */}
      {(() => {
        const contestantRewards = prizes.filter(p => p.prizeType === 'contestant');
        return (
          <Panel
            title={`Contestant Rewards (${contestantRewards.length})`}
            icon={Gift}
            action={<Button size="sm" icon={Plus} onClick={() => onOpenPrizeModal(null, 'contestant')}>Add Reward</Button>}
            collapsible
            defaultCollapsed
          >
            <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
              {contestantRewards.length === 0 ? (
                <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
                  <Gift size={48} style={{ marginBottom: spacing.md, opacity: 0.5, color: colors.gold.primary }} />
                  <p>No contestant rewards added yet</p>
                  <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted, marginTop: spacing.sm }}>
                    Add rewards that all contestants/nominees receive for participating.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: spacing.md }}>
                  {contestantRewards.map((prize) => (
                    <div key={prize.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.lg,
                      padding: spacing.lg,
                      background: colors.background.secondary,
                      borderRadius: borderRadius.lg,
                      flexWrap: isMobile ? 'wrap' : 'nowrap',
                    }}>
                      {prize.imageUrl ? (
                        <img src={prize.imageUrl} alt={prize.title} style={{ width: 48, height: 48, borderRadius: borderRadius.md, objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 48, height: 48, background: 'rgba(212,175,55,0.2)', borderRadius: borderRadius.md, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Gift size={24} style={{ color: colors.gold.primary }} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: typography.fontWeight.medium }}>{prize.title}</p>
                        <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {prize.sponsorName ? `by ${prize.sponsorName}` : ''}
                          {prize.sponsorName && prize.value ? ' · ' : ''}
                          {prize.value ? `$${Number(prize.value).toLocaleString()}` : ''}
                          {(prize.sponsorName || prize.value) && prize.description ? ' · ' : ''}
                          {prize.description || ''}
                        </p>
                      </div>
                      <button
                        onClick={() => onOpenPrizeModal(prize)}
                        style={{
                          padding: spacing.sm,
                          background: 'transparent',
                          border: `1px solid ${colors.border.primary || 'rgba(255,255,255,0.15)'}`,
                          borderRadius: borderRadius.md,
                          color: colors.text.secondary,
                          cursor: 'pointer',
                          minWidth: '36px',
                          minHeight: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => onDeletePrize(prize.id)}
                        style={{
                          padding: spacing.sm,
                          background: 'transparent',
                          border: `1px solid rgba(239,68,68,0.3)`,
                          borderRadius: borderRadius.md,
                          color: '#ef4444',
                          cursor: 'pointer',
                          minWidth: '36px',
                          minHeight: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>
        );
      })()}

      {/* Bonus Votes Section */}
      <Panel
        title="Bonus Votes"
        icon={Gift}
        collapsible
        defaultCollapsed={false}
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {bonusLoading ? (
            <p style={{ color: colors.text.secondary, textAlign: 'center', padding: spacing.lg }}>
              Loading bonus vote tasks...
            </p>
          ) : bonusTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: spacing.xl }}>
              <Gift size={48} style={{ marginBottom: spacing.md, opacity: 0.5, color: colors.gold.primary }} />
              <p style={{ color: colors.text.secondary, marginBottom: spacing.lg }}>
                Bonus votes reward contestants for completing tasks like filling out their profile or reviewing competition info. Set up the default tasks to get started.
              </p>
              <Button
                onClick={handleSetupBonusTasks}
                disabled={settingUp}
                icon={Plus}
              >
                {settingUp ? 'Setting up...' : 'Enable Bonus Votes'}
              </Button>
            </div>
          ) : (
            <>
              {/* Stats summary */}
              {bonusStats && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
                  gap: spacing.sm,
                  marginBottom: spacing.lg,
                }}>
                  <div style={{
                    padding: spacing.md,
                    background: 'rgba(212,175,55,0.08)',
                    borderRadius: borderRadius.lg,
                    border: '1px solid rgba(212,175,55,0.15)',
                  }}>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.xs }}>Active Tasks</p>
                    <p style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.gold.primary }}>
                      {bonusTasks.filter(t => t.enabled).length}
                    </p>
                  </div>
                  <div style={{
                    padding: spacing.md,
                    background: 'rgba(34,197,94,0.08)',
                    borderRadius: borderRadius.lg,
                    border: '1px solid rgba(34,197,94,0.15)',
                  }}>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.xs }}>Total Completions</p>
                    <p style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.status.success }}>
                      {bonusStats.totalCompletions}
                    </p>
                  </div>
                  <div style={{
                    padding: spacing.md,
                    background: 'rgba(59,130,246,0.08)',
                    borderRadius: borderRadius.lg,
                    border: '1px solid rgba(59,130,246,0.15)',
                    ...(isMobile ? { gridColumn: 'span 2' } : {}),
                  }}>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.xs }}>Bonus Votes Awarded</p>
                    <p style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.status.info }}>
                      {bonusStats.totalBonusVotes}
                    </p>
                  </div>
                </div>
              )}

              <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, marginBottom: spacing.lg }}>
                Contestants earn bonus votes by completing these tasks. Toggle tasks on/off or adjust the vote reward.
              </p>

              {/* Task list */}
              <div style={{ display: 'grid', gap: spacing.sm }}>
                {bonusTasks.map((task) => (
                  <div key={task.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.md,
                    background: task.enabled ? colors.background.secondary : 'rgba(100,100,100,0.08)',
                    borderRadius: borderRadius.lg,
                    border: `1px solid ${task.enabled ? (task.is_custom ? 'rgba(212,175,55,0.2)' : colors.border.primary) : 'rgba(100,100,100,0.15)'}`,
                    opacity: task.enabled ? 1 : 0.6,
                  }}>
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggleBonusTask(task.id, task.enabled)}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: borderRadius.md,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: task.enabled ? 'rgba(34,197,94,0.15)' : 'rgba(100,100,100,0.15)',
                        border: 'none',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      {task.enabled ? (
                        <CheckCircle size={18} style={{ color: colors.status.success }} />
                      ) : (
                        <XCircle size={18} style={{ color: colors.text.muted }} />
                      )}
                    </button>

                    {/* Task info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                        <p style={{ fontWeight: typography.fontWeight.medium, fontSize: typography.fontSize.base }}>
                          {task.label}
                        </p>
                        {task.is_custom && (
                          <Badge variant="gold" size="sm" style={{ fontSize: '10px' }}>
                            Requires Approval
                          </Badge>
                        )}
                      </div>
                      <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs }}>
                        {task.description || task.task_key}
                      </p>
                    </div>

                    {/* Vote amount editor */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, flexShrink: 0 }}>
                      <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>+</span>
                      <input
                        type="number"
                        value={task.votes_awarded}
                        onChange={(e) => handleUpdateBonusVotes(task.id, e.target.value)}
                        min="0"
                        max="100"
                        style={{
                          width: '48px',
                          padding: `${spacing.xs} ${spacing.sm}`,
                          background: colors.background.card,
                          border: `1px solid ${colors.border.primary}`,
                          borderRadius: borderRadius.sm,
                          color: colors.gold.primary,
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.semibold,
                          textAlign: 'center',
                        }}
                      />
                      <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>votes</span>
                    </div>

                    {/* Completion count */}
                    {bonusStats?.completionsByTask?.[task.id] && (
                      <Badge variant="success" size="sm">
                        {bonusStats.completionsByTask[task.id]} done
                      </Badge>
                    )}

                    {/* Edit / Delete for custom tasks */}
                    {task.is_custom && (
                      <div style={{ display: 'flex', gap: spacing.xs, flexShrink: 0 }}>
                        <button
                          onClick={() => { setEditingCustomTask(task); setShowCustomTaskModal(true); }}
                          style={{
                            padding: spacing.sm,
                            background: 'transparent',
                            border: `1px solid ${colors.border.primary}`,
                            borderRadius: borderRadius.md,
                            color: colors.text.secondary,
                            cursor: 'pointer',
                            minWidth: '36px',
                            minHeight: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomTask(task.id)}
                          style={{
                            padding: spacing.sm,
                            background: 'transparent',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: borderRadius.md,
                            color: '#ef4444',
                            cursor: 'pointer',
                            minWidth: '36px',
                            minHeight: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Custom Task button */}
              <div style={{ marginTop: spacing.lg }}>
                <Button
                  onClick={() => { setEditingCustomTask(null); setShowCustomTaskModal(true); }}
                  variant="secondary"
                  icon={Plus}
                  size="sm"
                >
                  Add Custom Task
                </Button>
              </div>

              {/* Pending Submissions Review */}
              {(() => {
                const pendingSubs = submissions.filter(s => s.status === 'pending');
                if (pendingSubs.length === 0) return null;
                return (
                  <div style={{ marginTop: spacing.xl }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.sm,
                      marginBottom: spacing.md,
                    }}>
                      <Clock size={18} style={{ color: colors.gold.primary }} />
                      <h4 style={{
                        fontSize: typography.fontSize.base,
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.text.primary,
                      }}>
                        Pending Submissions
                      </h4>
                      <Badge variant="gold" size="sm">{pendingSubs.length}</Badge>
                    </div>
                    <div style={{ display: 'grid', gap: spacing.sm }}>
                      {pendingSubs.map((sub) => (
                        <div key={sub.id} style={{
                          padding: spacing.md,
                          background: 'rgba(212,175,55,0.04)',
                          borderRadius: borderRadius.lg,
                          border: '1px solid rgba(212,175,55,0.15)',
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: isMobile ? 'flex-start' : 'center',
                            gap: spacing.md,
                            flexDirection: isMobile ? 'column' : 'row',
                          }}>
                            {/* Contestant info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{
                                fontWeight: typography.fontWeight.medium,
                                fontSize: typography.fontSize.sm,
                                color: colors.text.primary,
                              }}>
                                {sub.contestant?.name || 'Unknown'}
                              </p>
                              <p style={{
                                fontSize: typography.fontSize.xs,
                                color: colors.text.muted,
                                marginTop: '2px',
                              }}>
                                {sub.task?.label} — +{sub.task?.votes_awarded} votes
                              </p>
                            </div>

                            {/* Proof link */}
                            <a
                              href={sub.proof_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: typography.fontSize.xs,
                                color: colors.gold.primary,
                                textDecoration: 'none',
                                maxWidth: '200px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink size={12} />
                              View proof
                            </a>

                            {/* Action buttons */}
                            {rejectingId === sub.id ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, flexShrink: 0 }}>
                                <input
                                  type="text"
                                  placeholder="Reason (optional)"
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  style={{
                                    width: isMobile ? '120px' : '160px',
                                    padding: `${spacing.xs} ${spacing.sm}`,
                                    background: colors.background.card,
                                    border: `1px solid ${colors.border.primary}`,
                                    borderRadius: borderRadius.sm,
                                    color: colors.text.primary,
                                    fontSize: typography.fontSize.xs,
                                  }}
                                />
                                <button
                                  onClick={() => handleRejectSubmission(sub.id)}
                                  disabled={reviewingId === sub.id}
                                  style={{
                                    padding: `${spacing.xs} ${spacing.sm}`,
                                    background: 'rgba(239,68,68,0.15)',
                                    border: '1px solid rgba(239,68,68,0.3)',
                                    borderRadius: borderRadius.sm,
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    fontSize: typography.fontSize.xs,
                                    fontWeight: typography.fontWeight.medium,
                                  }}
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => { setRejectingId(null); setRejectionReason(''); }}
                                  style={{
                                    padding: spacing.xs,
                                    background: 'transparent',
                                    border: 'none',
                                    color: colors.text.muted,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: spacing.xs, flexShrink: 0 }}>
                                <button
                                  onClick={() => handleApproveSubmission(sub.id)}
                                  disabled={reviewingId === sub.id}
                                  style={{
                                    padding: `${spacing.xs} ${spacing.sm}`,
                                    background: 'rgba(34,197,94,0.15)',
                                    border: '1px solid rgba(34,197,94,0.3)',
                                    borderRadius: borderRadius.sm,
                                    color: colors.status.success,
                                    cursor: 'pointer',
                                    fontSize: typography.fontSize.xs,
                                    fontWeight: typography.fontWeight.medium,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <Check size={12} /> Approve
                                </button>
                                <button
                                  onClick={() => setRejectingId(sub.id)}
                                  disabled={reviewingId === sub.id}
                                  style={{
                                    padding: `${spacing.xs} ${spacing.sm}`,
                                    background: 'rgba(239,68,68,0.08)',
                                    border: '1px solid rgba(239,68,68,0.2)',
                                    borderRadius: borderRadius.sm,
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    fontSize: typography.fontSize.xs,
                                    fontWeight: typography.fontWeight.medium,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <X size={12} /> Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </Panel>

      {/* Custom Bonus Task Modal */}
      <CustomBonusTaskModal
        isOpen={showCustomTaskModal}
        onClose={() => { setShowCustomTaskModal(false); setEditingCustomTask(null); }}
        task={editingCustomTask}
        onSave={handleSaveCustomTask}
      />

      {/* Video Prompts Section */}
      <Panel
        title="Video Prompts"
        icon={Upload}
        action={<Button size="sm" icon={Plus} onClick={() => setShowVideoPromptModal(true)}>Add Prompt</Button>}
        collapsible
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {videoPrompts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
              <Upload size={40} style={{ marginBottom: spacing.md, opacity: 0.4, color: colors.gold.primary }} />
              <p style={{ fontSize: typography.fontSize.sm, marginBottom: spacing.md }}>No video prompts yet</p>
              <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.lg }}>
                Create interview-style prompts for your contestants to respond to with video.
              </p>
              <Button size="sm" icon={Plus} onClick={() => setShowVideoPromptModal(true)}>Add Video Prompt</Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              {videoPrompts.map(vp => {
                const responseCount = videoResponses.filter(r => r.prompt_id === vp.id).length;
                const pendingCount = videoResponses.filter(r => r.prompt_id === vp.id && r.status === 'pending').length;
                return (
                  <div key={vp.id} style={{
                    padding: spacing.md,
                    background: colors.background.secondary,
                    borderRadius: borderRadius.lg,
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.md,
                  }}>
                    <Upload size={18} style={{ color: colors.gold.primary, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontWeight: typography.fontWeight.medium,
                        fontSize: typography.fontSize.sm,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{vp.prompt_text}</p>
                      <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                        {responseCount} {responseCount === 1 ? 'response' : 'responses'}
                        {pendingCount > 0 && <span style={{ color: '#fbbf24' }}> ({pendingCount} pending)</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteVideoPrompt(vp.id)}
                      style={{
                        padding: spacing.xs, background: 'none', border: 'none',
                        color: colors.text.muted, cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pending video responses for review */}
          {pendingVideoResponses.length > 0 && (
            <div style={{ marginTop: spacing.xl }}>
              <h4 style={{
                fontSize: typography.fontSize.md,
                fontWeight: typography.fontWeight.semibold,
                marginBottom: spacing.md,
                display: 'flex', alignItems: 'center', gap: spacing.sm,
              }}>
                <Clock size={16} style={{ color: '#fbbf24' }} />
                Pending Review ({pendingVideoResponses.length})
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: spacing.md }}>
                {pendingVideoResponses.map(resp => (
                  <div key={resp.id} style={{
                    background: colors.background.secondary,
                    borderRadius: borderRadius.lg,
                    overflow: 'hidden',
                    border: `1px solid ${colors.border.primary}`,
                  }}>
                    {/* 4:3 video */}
                    <div style={{ position: 'relative', paddingTop: '75%', background: '#000' }}>
                      <video
                        src={resp.video_url}
                        controls
                        playsInline
                        preload="metadata"
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>
                    {/* Info + actions */}
                    <div style={{ padding: spacing.md }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
                        <Avatar name={resp.contestant?.name} src={resp.contestant?.avatar_url} size={28} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: typography.fontWeight.medium, fontSize: typography.fontSize.sm, margin: 0 }}>
                            {resp.contestant?.name}
                          </p>
                          <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {resp.prompt?.prompt_text}
                          </p>
                        </div>
                        <a
                          href={resp.video_url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Download video"
                          style={{
                            padding: spacing.sm,
                            background: 'rgba(255,255,255,0.05)',
                            border: `1px solid ${colors.border.primary}`,
                            borderRadius: borderRadius.md,
                            color: colors.text.secondary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textDecoration: 'none',
                            flexShrink: 0,
                          }}
                        >
                          <Download size={14} />
                        </a>
                      </div>
                      {videoRejectingId === resp.id ? (
                        <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center' }}>
                          <input
                            type="text"
                            placeholder="Reason (optional)"
                            value={videoRejectionReason}
                            onChange={(e) => setVideoRejectionReason(e.target.value)}
                            autoFocus
                            style={{
                              flex: 1,
                              padding: `${spacing.sm} ${spacing.md}`,
                              background: colors.background.card,
                              border: `1px solid ${colors.border.primary}`,
                              borderRadius: borderRadius.md,
                              color: colors.text.primary,
                              fontSize: typography.fontSize.xs,
                              fontFamily: 'inherit',
                              minWidth: 0,
                            }}
                          />
                          <button
                            onClick={() => { setVideoRejectingId(null); setVideoRejectionReason(''); }}
                            style={{
                              padding: spacing.sm, background: 'none', border: 'none',
                              color: colors.text.muted, cursor: 'pointer', flexShrink: 0,
                            }}
                          >
                            <X size={14} />
                          </button>
                          <Button
                            size="sm"
                            variant="secondary"
                            style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.5)', flexShrink: 0 }}
                            onClick={() => {
                              handleReviewVideoResponse(resp.id, 'reject', videoRejectionReason);
                              setVideoRejectingId(null);
                              setVideoRejectionReason('');
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end' }}>
                          <Button
                            size="sm"
                            variant="secondary"
                            style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.5)' }}
                            onClick={() => setVideoRejectingId(resp.id)}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            icon={CheckCircle}
                            onClick={() => handleReviewVideoResponse(resp.id, 'approve')}
                          >
                            Approve
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Panel>

      <VideoPromptModal
        isOpen={showVideoPromptModal}
        onClose={() => setShowVideoPromptModal(false)}
        onSave={handleCreateVideoPrompt}
      />
    </div>
  );
}
