import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, User, Star, Plus, Trash2, Lock, MapPin, DollarSign, Users, Tag, ChevronDown, ChevronUp, Gift, CheckCircle, XCircle, Check, Edit } from 'lucide-react';
import { Button, Badge, Avatar, Panel } from '../../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../../styles/theme';
import { useResponsive } from '../../../../hooks/useResponsive';
import TimelineSettings from '../TimelineSettings';
import { getBonusVoteTasks, setupDefaultBonusTasks, updateBonusVoteTask, getBonusVoteCompletionStats } from '../../../../lib/bonusVotes';
import { supabase, isSupabaseConfigured } from '../../../../lib/supabase';
import { isFieldEditable, isFieldEditableForHost, getLockedReason } from '../../../../utils/fieldEditability';
import { useToast } from '../../../../contexts/ToastContext';

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
const getEventStatus = (event) => {
  if (event.status === 'completed') return 'completed';
  if (!event.date && !event.startDate) return 'upcoming';
  const eventDate = new Date(event.date || event.startDate);
  const now = new Date();
  if (eventDate < now) return 'completed';
  if (event.endDate) {
    const endDate = new Date(event.endDate);
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
  const toast = useToast();
  const [showCompetitionDetails, setShowCompetitionDetails] = useState(true);
  const status = competition?.status || 'draft';

  // Host-editable field state
  const [compName, setCompName] = useState('');
  const [numberOfWinners, setNumberOfWinners] = useState(5);
  const [eligibilityRadius, setEligibilityRadius] = useState(100);
  const [minContestants, setMinContestants] = useState(40);
  const [maxContestants, setMaxContestants] = useState('');
  const [hasCashPrize, setHasCashPrize] = useState(false);
  const [cashPrizeSponsor, setCashPrizeSponsor] = useState('');
  const [cashPrizeAmount, setCashPrizeAmount] = useState('');
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsSaved, setDetailsSaved] = useState(false);

  // Initialize editable fields from competition
  useEffect(() => {
    if (competition) {
      setCompName(competition.name || '');
      setNumberOfWinners(competition.numberOfWinners || 5);
      setEligibilityRadius(competition.eligibilityRadiusMiles ?? 100);
      setMinContestants(competition.minContestants || 40);
      setMaxContestants(competition.maxContestants || '');
      setHasCashPrize(competition.hasCashPrize || false);
      setCashPrizeSponsor(competition.cashPrizeSponsor || '');
      setCashPrizeAmount(competition.cashPrizeAmount || '');
    }
  }, [competition]);

  // Check editability for each field
  const canEditName = isFieldEditable('name', status);
  const canEditWinners = isFieldEditable('number_of_winners', status);
  const canEditRadius = isFieldEditable('eligibility_radius', status);
  const canEditMinContestants = isFieldEditableForHost('min_contestants', status, competition);
  const canEditMaxContestants = isFieldEditableForHost('max_contestants', status, competition);
  const canEditCashPrize = isFieldEditableForHost('has_cash_prize', status, competition);

  const hasAnyEditableDetails = canEditName || canEditWinners || canEditRadius ||
    canEditMinContestants || canEditMaxContestants || canEditCashPrize;

  // Check if any editable details have changed
  const hasDetailChanges = () => {
    if (!competition) return false;
    return (
      (canEditName && compName !== (competition.name || '')) ||
      (canEditWinners && numberOfWinners !== (competition.numberOfWinners || 5)) ||
      (canEditRadius && eligibilityRadius !== (competition.eligibilityRadiusMiles ?? 100)) ||
      (canEditMinContestants && minContestants !== (competition.minContestants || 40)) ||
      (canEditMaxContestants && String(maxContestants) !== String(competition.maxContestants || '')) ||
      (canEditCashPrize && hasCashPrize !== (competition.hasCashPrize || false)) ||
      (canEditCashPrize && cashPrizeSponsor !== (competition.cashPrizeSponsor || '')) ||
      (canEditCashPrize && String(cashPrizeAmount) !== String(competition.cashPrizeAmount || ''))
    );
  };

  // Save editable competition details
  const saveDetails = async () => {
    if (!competition?.id) return;
    setDetailsSaving(true);

    try {
      const updates = {};

      if (canEditName && compName !== (competition.name || '')) {
        updates.name = compName || null;
      }
      if (canEditWinners && numberOfWinners !== (competition.numberOfWinners || 5)) {
        updates.number_of_winners = numberOfWinners;
      }
      if (canEditRadius && eligibilityRadius !== (competition.eligibilityRadiusMiles ?? 100)) {
        updates.eligibility_radius_miles = eligibilityRadius;
      }
      if (canEditMinContestants && minContestants !== (competition.minContestants || 40)) {
        updates.min_contestants = parseInt(minContestants, 10) || 40;
      }
      if (canEditMaxContestants && String(maxContestants) !== String(competition.maxContestants || '')) {
        updates.max_contestants = maxContestants ? parseInt(maxContestants, 10) : null;
      }
      if (canEditCashPrize) {
        if (hasCashPrize !== (competition.hasCashPrize || false)) {
          updates.has_cash_prize = hasCashPrize;
        }
        if (cashPrizeSponsor !== (competition.cashPrizeSponsor || '')) {
          updates.cash_prize_sponsor = cashPrizeSponsor || null;
        }
        if (String(cashPrizeAmount) !== String(competition.cashPrizeAmount || '')) {
          updates.cash_prize_amount = cashPrizeAmount ? parseFloat(cashPrizeAmount) : null;
        }
      }

      if (Object.keys(updates).length === 0) return;

      const { error: updateError } = await supabase
        .from('competitions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', competition.id);

      if (updateError) throw updateError;

      setDetailsSaved(true);
      setTimeout(() => setDetailsSaved(false), 2000);
      toast.success('Competition details saved');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error saving competition details:', err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setDetailsSaving(false);
    }
  };

  // Bonus votes state
  const [bonusTasks, setBonusTasks] = useState([]);
  const [bonusStats, setBonusStats] = useState(null);
  const [bonusLoading, setBonusLoading] = useState(false);
  const [settingUp, setSettingUp] = useState(false);

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

  // Shared input style for editable fields
  const editInputStyle = {
    width: '100%',
    padding: `${spacing.xs} ${spacing.sm}`,
    background: 'rgba(255, 255, 255, 0.05)',
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.md,
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
    outline: 'none',
    boxSizing: 'border-box',
  };

  // Editable field wrapper - matches ViewOnlyField layout
  const EditableField = ({ label, icon: Icon, children }) => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: spacing.xs,
      padding: isMobile ? spacing.md : `${spacing.md} ${spacing.lg}`,
      background: colors.background.secondary,
      borderRadius: borderRadius.md,
      border: `1px solid rgba(212,175,55,0.3)`,
      minHeight: '44px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.xs,
        color: colors.gold.primary,
        fontSize: typography.fontSize.xs,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {Icon && <Icon size={12} />}
        <span>{label}</span>
      </div>
      {children}
    </div>
  );

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
      {/* Competition Details - Mixed editable/view-only */}
      <Panel
        title="Competition Details"
        icon={hasAnyEditableDetails ? Edit : Lock}
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
            {/* Admin-locked slot fields */}
            <p style={{
              color: colors.text.muted,
              fontSize: typography.fontSize.xs,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: spacing.sm,
            }}>
              Franchise Slot (Admin Only)
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: spacing.sm,
              marginBottom: spacing.lg,
            }}>
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
            </div>

            {/* Host-editable fields */}
            <p style={{
              color: colors.text.muted,
              fontSize: typography.fontSize.xs,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: spacing.sm,
            }}>
              Host Settings {!hasAnyEditableDetails && '(Locked)'}
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: spacing.sm,
              marginBottom: spacing.md,
            }}>
              {/* Competition Name */}
              {canEditName ? (
                <EditableField
                  label="Competition Name"
                  icon={Tag}
                  isMobile={isMobile}
                >
                  <input
                    type="text"
                    value={compName}
                    onChange={(e) => setCompName(e.target.value)}
                    placeholder="Enter competition name"
                    style={editInputStyle}
                  />
                </EditableField>
              ) : (
                <ViewOnlyField
                  label="Competition Name"
                  value={competition?.name}
                  icon={Tag}
                />
              )}

              {/* Number of Winners */}
              {canEditWinners ? (
                <EditableField
                  label="Number of Winners"
                  icon={Star}
                  isMobile={isMobile}
                >
                  <select
                    value={numberOfWinners}
                    onChange={(e) => setNumberOfWinners(parseInt(e.target.value, 10))}
                    style={editInputStyle}
                  >
                    {[1, 3, 5, 10, 15, 20].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </EditableField>
              ) : (
                <ViewOnlyField
                  label="Number of Winners"
                  value={competition?.numberOfWinners}
                  icon={Star}
                />
              )}

              {/* Eligibility Radius */}
              {canEditRadius ? (
                <EditableField
                  label="Eligibility Radius"
                  icon={MapPin}
                  isMobile={isMobile}
                >
                  <select
                    value={eligibilityRadius}
                    onChange={(e) => setEligibilityRadius(parseInt(e.target.value, 10))}
                    style={editInputStyle}
                  >
                    <option value={0}>No restriction</option>
                    <option value={10}>10 miles</option>
                    <option value={25}>25 miles</option>
                    <option value={50}>50 miles</option>
                    <option value={100}>100 miles</option>
                  </select>
                </EditableField>
              ) : (
                <ViewOnlyField
                  label="Eligibility Radius"
                  value={formatRadius(competition?.eligibilityRadiusMiles)}
                  icon={MapPin}
                />
              )}

              {/* Min Contestants */}
              {canEditMinContestants ? (
                <EditableField
                  label="Min Contestants"
                  icon={Users}
                  isMobile={isMobile}
                >
                  <input
                    type="number"
                    min={10}
                    value={minContestants}
                    onChange={(e) => setMinContestants(parseInt(e.target.value, 10) || 10)}
                    style={editInputStyle}
                  />
                </EditableField>
              ) : (
                <ViewOnlyField
                  label="Min Contestants"
                  value={competition?.minContestants || 40}
                  icon={Users}
                />
              )}

              {/* Max Contestants */}
              {canEditMaxContestants ? (
                <EditableField
                  label="Max Contestants"
                  icon={Users}
                  isMobile={isMobile}
                >
                  <input
                    type="number"
                    min={minContestants + 1}
                    value={maxContestants}
                    onChange={(e) => setMaxContestants(e.target.value)}
                    placeholder="No limit"
                    style={editInputStyle}
                  />
                </EditableField>
              ) : (
                <ViewOnlyField
                  label="Max Contestants"
                  value={competition?.maxContestants || 'No limit'}
                  icon={Users}
                />
              )}
            </div>

            {/* Cash Prize Section */}
            <div style={{
              padding: spacing.md,
              background: colors.background.secondary,
              borderRadius: borderRadius.md,
              border: `1px solid ${colors.border.lighter}`,
              marginBottom: spacing.md,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: hasCashPrize ? spacing.md : 0,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}>
                  <DollarSign size={14} style={{ color: colors.text.muted }} />
                  <span style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                  }}>
                    Cash Prize
                  </span>
                  {!canEditCashPrize && (
                    <Lock size={12} style={{ color: colors.text.muted, opacity: 0.4 }} />
                  )}
                </div>
                <button
                  onClick={() => canEditCashPrize && setHasCashPrize(!hasCashPrize)}
                  disabled={!canEditCashPrize}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.xs,
                    padding: `${spacing.xs} ${spacing.sm}`,
                    background: hasCashPrize ? 'rgba(34,197,94,0.15)' : 'rgba(100,100,100,0.15)',
                    border: 'none',
                    borderRadius: borderRadius.md,
                    cursor: canEditCashPrize ? 'pointer' : 'not-allowed',
                    opacity: canEditCashPrize ? 1 : 0.5,
                    color: hasCashPrize ? colors.status.success : colors.text.muted,
                    fontSize: typography.fontSize.sm,
                  }}
                >
                  {hasCashPrize ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  {hasCashPrize ? 'Yes' : 'No'}
                </button>
              </div>

              {hasCashPrize && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: spacing.sm,
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: typography.fontSize.xs,
                      color: colors.text.muted,
                      marginBottom: spacing.xs,
                    }}>
                      Sponsor (optional)
                    </label>
                    <input
                      type="text"
                      value={cashPrizeSponsor}
                      onChange={(e) => setCashPrizeSponsor(e.target.value)}
                      placeholder="Sponsor name"
                      disabled={!canEditCashPrize}
                      style={editInputStyle}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: typography.fontSize.xs,
                      color: colors.text.muted,
                      marginBottom: spacing.xs,
                    }}>
                      Amount
                    </label>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${colors.border.primary}`,
                      borderRadius: borderRadius.md,
                      overflow: 'hidden',
                    }}>
                      <span style={{
                        padding: `${spacing.xs} ${spacing.sm}`,
                        background: colors.background.tertiary,
                        borderRight: `1px solid ${colors.border.primary}`,
                        color: colors.text.muted,
                        fontSize: typography.fontSize.sm,
                      }}>
                        $
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={cashPrizeAmount}
                        onChange={(e) => setCashPrizeAmount(e.target.value)}
                        placeholder="0"
                        disabled={!canEditCashPrize}
                        style={{
                          ...editInputStyle,
                          border: 'none',
                          borderRadius: 0,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Save Button for editable details */}
            {hasAnyEditableDetails && (
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                paddingTop: spacing.md,
                borderTop: `1px solid ${colors.border.primary}`,
              }}>
                <Button
                  onClick={saveDetails}
                  disabled={!hasDetailChanges() || detailsSaving}
                  icon={detailsSaved ? Check : null}
                  size="sm"
                >
                  {detailsSaving ? 'Saving...' : detailsSaved ? 'Saved' : 'Save Changes'}
                </Button>
              </div>
            )}
          </div>
        )}
        {!showCompetitionDetails && (
          <div style={{
            padding: isMobile ? spacing.md : spacing.lg,
            color: colors.text.muted,
            fontSize: typography.fontSize.sm,
          }}>
            {hasAnyEditableDetails ? (
              <>
                <Edit size={14} style={{ display: 'inline', marginRight: spacing.xs, verticalAlign: 'middle' }} />
                Competition details. Some fields are editable. Click "Show" to view.
              </>
            ) : (
              <>
                <Lock size={14} style={{ display: 'inline', marginRight: spacing.xs, verticalAlign: 'middle' }} />
                Competition details are locked. Click "Show" to view.
              </>
            )}
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
                        {event.date ? new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'No date set'}
                        {event.location && ` • ${event.location}`}
                      </p>
                    </div>
                    <Badge variant={status === 'active' ? 'gold' : status === 'completed' ? 'success' : 'secondary'} size="sm">
                      {status}
                    </Badge>
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
                    border: `1px solid ${task.enabled ? colors.border.primary : 'rgba(100,100,100,0.15)'}`,
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
                      <p style={{ fontWeight: typography.fontWeight.medium, fontSize: typography.fontSize.base }}>
                        {task.label}
                      </p>
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
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
