import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, User, Star, Plus, Trash2, Edit2, Lock, MapPin, DollarSign, Users, Tag, ChevronDown, ChevronUp, Gift, CheckCircle, XCircle } from 'lucide-react';
import { Button, Badge, Avatar, Panel } from '../../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../../styles/theme';
import { useResponsive } from '../../../../hooks/useResponsive';
import TimelineSettings from '../TimelineSettings';
import { getBonusVoteTasks, setupDefaultBonusTasks, updateBonusVoteTask, getBonusVoteCompletionStats, createBonusVoteTask, deleteBonusVoteTask, BONUS_TASK_KEYS } from '../../../../lib/bonusVotes';
import { isSupabaseConfigured } from '../../../../lib/supabase';

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
  isSuperAdmin = false,
  onRefresh,
  onDeleteJudge,
  onDeleteSponsor,
  onDeleteEvent,
  onOpenJudgeModal,
  onOpenSponsorModal,
  onOpenEventModal,
}) {
  const { isMobile } = useResponsive();
  const [showCompetitionDetails, setShowCompetitionDetails] = useState(true);

  // Bonus votes state
  const [bonusTasks, setBonusTasks] = useState([]);
  const [bonusStats, setBonusStats] = useState(null);
  const [bonusLoading, setBonusLoading] = useState(false);
  const [settingUp, setSettingUp] = useState(false);

  // Custom task form state
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [newTaskLabel, setNewTaskLabel] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskVotes, setNewTaskVotes] = useState(5);
  const [creatingTask, setCreatingTask] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const competitionId = competition?.id;

  // Built-in task keys that cannot be deleted
  const BUILT_IN_TASK_KEYS = new Set(Object.values(BONUS_TASK_KEYS));

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

  useEffect(() => {
    loadBonusTasks();
  }, [loadBonusTasks]);

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

  const handleCreateTask = async () => {
    if (!competitionId || !newTaskLabel.trim()) return;
    setCreatingTask(true);
    // Generate a task_key from the label: lowercase, underscored, prefixed with "custom_"
    const taskKey = 'custom_' + newTaskLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
    const result = await createBonusVoteTask(competitionId, {
      taskKey,
      label: newTaskLabel.trim(),
      description: newTaskDescription.trim() || null,
      votesAwarded: parseInt(newTaskVotes, 10) || 5,
    });
    if (result.success) {
      setNewTaskLabel('');
      setNewTaskDescription('');
      setNewTaskVotes(5);
      setShowAddTaskForm(false);
      await loadBonusTasks();
    }
    setCreatingTask(false);
  };

  const handleDeleteTask = async (taskId) => {
    setDeletingTaskId(taskId);
    const result = await deleteBonusVoteTask(taskId);
    if (result.success) {
      setBonusTasks(prev => prev.filter(t => t.id !== taskId));
    }
    setDeletingTaskId(null);
  };

  const handleStartEditTask = (task) => {
    setEditingTaskId(task.id);
    setEditLabel(task.label);
    setEditDescription(task.description || '');
  };

  const handleSaveEditTask = async (taskId) => {
    if (!editLabel.trim()) return;
    await updateBonusVoteTask(taskId, {
      label: editLabel.trim(),
      description: editDescription.trim() || null,
    });
    setBonusTasks(prev => prev.map(t => t.id === taskId ? { ...t, label: editLabel.trim(), description: editDescription.trim() || null } : t));
    setEditingTaskId(null);
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
                Contestants earn bonus votes by completing these tasks. Toggle tasks on/off, adjust votes, or add your own custom tasks.
              </p>

              {/* Task list */}
              <div style={{ display: 'grid', gap: spacing.sm }}>
                {bonusTasks.map((task) => {
                  const isCustom = !BUILT_IN_TASK_KEYS.has(task.task_key);
                  const isEditing = editingTaskId === task.id;

                  return (
                    <div key={task.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.md,
                      padding: spacing.md,
                      background: task.enabled ? colors.background.secondary : 'rgba(100,100,100,0.08)',
                      borderRadius: borderRadius.lg,
                      border: `1px solid ${task.enabled ? colors.border.primary : 'rgba(100,100,100,0.15)'}`,
                      opacity: task.enabled ? 1 : 0.6,
                      flexWrap: isEditing ? 'wrap' : 'nowrap',
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
                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                            <input
                              type="text"
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              placeholder="Task name"
                              style={{
                                padding: `${spacing.xs} ${spacing.sm}`,
                                background: colors.background.card,
                                border: `1px solid ${colors.border.primary}`,
                                borderRadius: borderRadius.sm,
                                color: colors.text.primary,
                                fontSize: typography.fontSize.sm,
                              }}
                            />
                            <input
                              type="text"
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              placeholder="Description (optional)"
                              style={{
                                padding: `${spacing.xs} ${spacing.sm}`,
                                background: colors.background.card,
                                border: `1px solid ${colors.border.primary}`,
                                borderRadius: borderRadius.sm,
                                color: colors.text.secondary,
                                fontSize: typography.fontSize.xs,
                              }}
                            />
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                              <p style={{ fontWeight: typography.fontWeight.medium, fontSize: typography.fontSize.base }}>
                                {task.label}
                              </p>
                              {isCustom && (
                                <Badge variant="secondary" size="sm">Custom</Badge>
                              )}
                            </div>
                            <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs }}>
                              {task.description || task.task_key}
                            </p>
                          </>
                        )}
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

                      {/* Edit / Delete actions */}
                      <div style={{ display: 'flex', gap: spacing.xs, flexShrink: 0 }}>
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveEditTask(task.id)}
                              style={{
                                padding: spacing.xs,
                                background: 'rgba(34,197,94,0.15)',
                                border: `1px solid rgba(34,197,94,0.3)`,
                                borderRadius: borderRadius.sm,
                                color: colors.status.success,
                                cursor: 'pointer',
                                minWidth: '32px',
                                minHeight: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: typography.fontSize.xs,
                              }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingTaskId(null)}
                              style={{
                                padding: spacing.xs,
                                background: 'transparent',
                                border: `1px solid ${colors.border.primary}`,
                                borderRadius: borderRadius.sm,
                                color: colors.text.muted,
                                cursor: 'pointer',
                                minWidth: '32px',
                                minHeight: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: typography.fontSize.xs,
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartEditTask(task)}
                              style={{
                                padding: spacing.xs,
                                background: 'transparent',
                                border: `1px solid ${colors.border.primary || 'rgba(255,255,255,0.15)'}`,
                                borderRadius: borderRadius.sm,
                                color: colors.text.secondary,
                                cursor: 'pointer',
                                minWidth: '32px',
                                minHeight: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Edit2 size={12} />
                            </button>
                            {isCustom && (
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                disabled={deletingTaskId === task.id}
                                style={{
                                  padding: spacing.xs,
                                  background: 'transparent',
                                  border: `1px solid rgba(239,68,68,0.3)`,
                                  borderRadius: borderRadius.sm,
                                  color: '#ef4444',
                                  cursor: deletingTaskId === task.id ? 'wait' : 'pointer',
                                  minWidth: '32px',
                                  minHeight: '32px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  opacity: deletingTaskId === task.id ? 0.5 : 1,
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Custom Task */}
              {!showAddTaskForm ? (
                <Button
                  size="sm"
                  icon={Plus}
                  onClick={() => setShowAddTaskForm(true)}
                  style={{ marginTop: spacing.md }}
                >
                  Add Custom Task
                </Button>
              ) : (
                <div style={{
                  marginTop: spacing.md,
                  padding: spacing.lg,
                  background: 'rgba(212,175,55,0.05)',
                  borderRadius: borderRadius.lg,
                  border: `1px solid rgba(212,175,55,0.2)`,
                }}>
                  <p style={{
                    fontWeight: typography.fontWeight.semibold,
                    fontSize: typography.fontSize.sm,
                    marginBottom: spacing.md,
                    color: colors.text.primary,
                  }}>
                    New Bonus Task
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                    <input
                      type="text"
                      value={newTaskLabel}
                      onChange={(e) => setNewTaskLabel(e.target.value)}
                      placeholder="Task name (e.g. 'Attend the launch party')"
                      maxLength={100}
                      style={{
                        padding: `${spacing.sm} ${spacing.md}`,
                        background: colors.background.card,
                        border: `1px solid ${colors.border.primary}`,
                        borderRadius: borderRadius.md,
                        color: colors.text.primary,
                        fontSize: typography.fontSize.sm,
                      }}
                    />
                    <input
                      type="text"
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                      placeholder="Description (optional)"
                      maxLength={200}
                      style={{
                        padding: `${spacing.sm} ${spacing.md}`,
                        background: colors.background.card,
                        border: `1px solid ${colors.border.primary}`,
                        borderRadius: borderRadius.md,
                        color: colors.text.secondary,
                        fontSize: typography.fontSize.sm,
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                      <label style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>Votes:</label>
                      <input
                        type="number"
                        value={newTaskVotes}
                        onChange={(e) => setNewTaskVotes(e.target.value)}
                        min="1"
                        max="100"
                        style={{
                          width: '64px',
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
                    </div>
                    <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.xs }}>
                      <Button
                        size="sm"
                        onClick={handleCreateTask}
                        disabled={creatingTask || !newTaskLabel.trim()}
                      >
                        {creatingTask ? 'Adding...' : 'Add Task'}
                      </Button>
                      <button
                        onClick={() => { setShowAddTaskForm(false); setNewTaskLabel(''); setNewTaskDescription(''); setNewTaskVotes(5); }}
                        style={{
                          padding: `${spacing.xs} ${spacing.md}`,
                          background: 'transparent',
                          border: `1px solid ${colors.border.primary}`,
                          borderRadius: borderRadius.md,
                          color: colors.text.secondary,
                          cursor: 'pointer',
                          fontSize: typography.fontSize.sm,
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
