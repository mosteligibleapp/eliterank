import React, { useState, useEffect } from 'react';
import {
  Calendar, Vote, Plus, Trash2, AlertTriangle, Save,
  Clock, Activity, Trophy, Archive, FileEdit, Lock, Info
} from 'lucide-react';
import { Button, Badge } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { useResponsive } from '../../../hooks/useResponsive';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import {
  COMPETITION_STATUS,
  STATUS_CONFIG,
  DEFAULT_VOTING_ROUND,
  DEFAULT_NOMINATION_PERIOD,
  ROUND_TYPE_CONFIG,
} from '../../../types/competition';
import {
  computeCompetitionPhase,
  TIMELINE_PHASES,
  getPhaseDisplayConfig,
} from '../../../utils/competitionPhase';
import {
  getStatusChangeRestriction,
  getNextAutoTransition,
} from '../../../utils/competitionStatusEngine';
import { SkeletonPulse, SkeletonText } from '../../../components/common/Skeleton';

/**
 * Parse a typed date string into an ISO date string
 * Supports formats like:
 * - "Jan 15, 2025 6:00 PM"
 * - "1/15/2025 6pm"
 * - "2025-01-15 18:00"
 * - "January 15 2025 6:00pm"
 */
function parseTypedDate(input) {
  if (!input || !input.trim()) return null;

  const str = input.trim();

  // Try direct ISO parse first
  let date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }

  // Normalize common patterns
  let normalized = str
    .replace(/\s+/g, ' ')
    .replace(/,/g, '')
    .toLowerCase();

  // Month name mappings
  const months = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
  };

  // Pattern: "Jan 15 2025 6:00 PM" or "January 15 2025 6pm"
  const monthNamePattern = /^(\w+)\s+(\d{1,2})\s+(\d{4})\s*(.*)$/;
  let match = normalized.match(monthNamePattern);
  if (match) {
    const monthStr = match[1];
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    const timeStr = match[4];
    const month = months[monthStr];

    if (month !== undefined && day >= 1 && day <= 31) {
      const { hours, minutes } = parseTime(timeStr);
      date = new Date(year, month, day, hours, minutes);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }

  // Pattern: "1/15/2025 6:00 PM" or "01/15/2025 6pm"
  const slashPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(.*)$/;
  match = normalized.match(slashPattern);
  if (match) {
    const month = parseInt(match[1], 10) - 1;
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    const timeStr = match[4];

    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const { hours, minutes } = parseTime(timeStr);
      date = new Date(year, month, day, hours, minutes);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }

  // Pattern: "2025-01-15 6:00 PM"
  const dashPattern = /^(\d{4})-(\d{1,2})-(\d{1,2})\s*(.*)$/;
  match = normalized.match(dashPattern);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const timeStr = match[4];

    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const { hours, minutes } = parseTime(timeStr);
      date = new Date(year, month, day, hours, minutes);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }

  return null;
}

/**
 * Parse time string like "6pm", "6:00 PM", "18:00"
 */
function parseTime(timeStr) {
  if (!timeStr || !timeStr.trim()) {
    return { hours: 0, minutes: 0 };
  }

  const str = timeStr.trim().toLowerCase();

  // Check for AM/PM
  const isPM = str.includes('pm');
  const isAM = str.includes('am');
  const cleanTime = str.replace(/[ap]m/g, '').trim();

  // Parse hours:minutes or just hours
  const timeParts = cleanTime.split(':');
  let hours = parseInt(timeParts[0], 10) || 0;
  const minutes = parseInt(timeParts[1], 10) || 0;

  // Convert to 24-hour format
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return { hours, minutes };
}

/**
 * Format an ISO date for display
 */
function formatDateForDisplay(isoDate) {
  if (!isoDate) return '';

  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  const minuteStr = minutes.toString().padStart(2, '0');

  return `${month} ${day}, ${year} ${hours}:${minuteStr} ${ampm}`;
}

/**
 * reconcileOrderedRows
 *
 * UPSERTs an ordered child collection (nomination_periods / voting_rounds)
 * against the desired in-memory state — preserving row identity (and every
 * FK referencing it) instead of the historical delete-and-reinsert pattern
 * which wiped judge_scores, finalization snapshots, and vote-reset state.
 *
 * Algorithm (single-table):
 *   1. Read the current ids in the DB for this competition.
 *   2. DELETE any DB row whose id is no longer in `desired`.
 *   3. Move every surviving row to a negative temporary order (frees up
 *      the unique (competition_id, orderField) namespace so we can rewrite
 *      orders without colliding).
 *   4. For each row in `desired`:
 *        - If it has an id that still exists, UPDATE in place with the new
 *          payload + final orderField = index + 1.
 *        - Otherwise INSERT a new row with competition_id + orderField.
 */
async function reconcileOrderedRows({
  table,
  competitionId,
  desired,
  orderField,
  buildPayload,
}) {
  const { data: existing, error: fetchError } = await supabase
    .from(table)
    .select('id')
    .eq('competition_id', competitionId);
  if (fetchError) throw fetchError;

  const existingIds = new Set((existing || []).map(r => r.id));
  const desiredIds = new Set((desired || []).filter(r => r.id).map(r => r.id));

  // 1) Delete rows the host removed.
  const toDelete = [...existingIds].filter(id => !desiredIds.has(id));
  if (toDelete.length > 0) {
    const { error: delError } = await supabase
      .from(table)
      .delete()
      .in('id', toDelete);
    if (delError) throw delError;
  }

  // 2) Park survivors in negative order space to avoid unique-constraint
  //    collisions when shuffling.
  const survivors = (desired || []).filter(r => r.id && existingIds.has(r.id));
  for (let i = 0; i < survivors.length; i++) {
    const { error } = await supabase
      .from(table)
      .update({ [orderField]: -(i + 1) })
      .eq('id', survivors[i].id);
    if (error) throw error;
  }

  // 3) Update existing rows in place, insert new ones, with final ordering.
  for (let i = 0; i < (desired || []).length; i++) {
    const row = desired[i];
    const payload = { ...buildPayload(row, i), [orderField]: i + 1 };
    if (row.id && existingIds.has(row.id)) {
      const { error } = await supabase
        .from(table)
        .update(payload)
        .eq('id', row.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from(table)
        .insert({ ...payload, competition_id: competitionId });
      if (error) throw error;
    }
  }
}

/**
 * TimelineSettings - Manages competition status, timeline dates, and voting rounds
 * Used by both Host and SuperAdmin dashboards
 *
 * @param {object} competition - Competition object
 * @param {function} onSave - Callback when save completes
 * @param {boolean} isSuperAdmin - Whether the user is a super admin (shows status controls)
 */
export default function TimelineSettings({ competition, onSave, isSuperAdmin = false }) {
  const toast = useToast();
  const { isMobile } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings state (stores ISO strings for DB)
  const [settings, setSettings] = useState({
    finals_date: '',
  });

  // Display values (what user sees/types)
  const [displayValues, setDisplayValues] = useState({
    finals_date: '',
  });

  // Nomination periods state (replaces single nomination_start/nomination_end)
  const [nominationPeriods, setNominationPeriods] = useState([]);
  const [nominationDisplayValues, setNominationDisplayValues] = useState([]);

  // Voting/Judging rounds state
  const [votingRounds, setVotingRounds] = useState([]);
  const [roundDisplayValues, setRoundDisplayValues] = useState([]);

  // Status state
  const [status, setStatus] = useState(competition?.status || COMPETITION_STATUS.DRAFT);

  // A finished competition's timeline is historical: editing periods/rounds can
  // re-trigger finalization + vote resets on already-closed rounds. Lock it for
  // hosts once the competition is completed or archived. Super admins keep edit
  // access (they own the status controls and can reopen if a fix is needed).
  const isFinished =
    status === COMPETITION_STATUS.COMPLETED || status === COMPETITION_STATUS.ARCHIVE;
  const isLocked = isFinished && !isSuperAdmin;

  // Validation errors
  const [errors, setErrors] = useState([]);

  // Parse error indicators
  const [parseErrors, setParseErrors] = useState({});

  // Fetch settings on mount
  useEffect(() => {
    if (competition?.id) {
      fetchSettings();
    }
  }, [competition?.id]);

  const fetchSettings = async () => {
    if (!supabase || !competition?.id) return;

    setLoading(true);
    try {
      const [compResult, roundsResult, periodsResult] = await Promise.all([
        // finals_date is now on the competitions table directly
        supabase
          .from('competitions')
          .select('finals_date')
          .eq('id', competition.id)
          .single(),
        supabase
          .from('voting_rounds')
          .select('*')
          .eq('competition_id', competition.id)
          .order('round_order'),
        supabase
          .from('nomination_periods')
          .select('*')
          .eq('competition_id', competition.id)
          .order('period_order'),
      ]);

      if (compResult.error && compResult.error.code !== 'PGRST116') {
        throw compResult.error;
      }

      if (roundsResult.error) throw roundsResult.error;
      if (periodsResult.error) throw periodsResult.error;

      if (compResult.data) {
        setSettings({
          finals_date: compResult.data.finals_date || '',
        });
        setDisplayValues({
          finals_date: formatDateForDisplay(compResult.data.finals_date),
        });
      }

      // Load nomination periods
      const periods = periodsResult.data || [];
      setNominationPeriods(periods);
      setNominationDisplayValues(periods.map(p => ({
        start_date: formatDateForDisplay(p.start_date),
        end_date: formatDateForDisplay(p.end_date),
      })));

      // Load voting/judging rounds
      const rounds = roundsResult.data || [];
      setVotingRounds(rounds);
      setRoundDisplayValues(rounds.map(r => ({
        start_date: formatDateForDisplay(r.start_date),
        end_date: formatDateForDisplay(r.end_date),
      })));
      setStatus(competition.status);
    } catch (err) {
      console.error('Error fetching settings:', err);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  // Compute current phase for display
  const computedPhase = computeCompetitionPhase({
    ...competition,
    status,
    settings,
    voting_rounds: votingRounds,
    nomination_periods: nominationPeriods,
  });
  const phaseConfig = getPhaseDisplayConfig(computedPhase);

  // Judges only matter when winners are decided by judges (or a hybrid). For
  // pure public-vote competitions we hide the judging controls entirely.
  const usesJudges = ['judges', 'hybrid'].includes(competition?.selectionCriteria);

  // Recommended first-voting start = 5 days after nominations close (owned by
  // the Nomination Form section). Used to auto-fill the first voting round.
  const nominationCloseIso = competition?.nominationEnd || competition?.nomination_end || null;
  const recommendedVotingStartIso = nominationCloseIso
    ? new Date(new Date(nominationCloseIso).getTime() + 5 * 86400000).toISOString()
    : null;

  // Validate dates
  const validateDates = () => {
    const validationErrors = [];

    // Check for parse errors
    const hasParseErrors = Object.values(parseErrors).some(Boolean);
    if (hasParseErrors) {
      validationErrors.push('Please fix invalid date formats before saving');
    }

    const finale = settings.finals_date ? new Date(settings.finals_date) : null;

    // Validate nomination periods
    let lastNomEnd = null;
    nominationPeriods.forEach((period, index) => {
      const periodStart = period.start_date ? new Date(period.start_date) : null;
      const periodEnd = period.end_date ? new Date(period.end_date) : null;

      if (periodStart && periodEnd && periodEnd <= periodStart) {
        validationErrors.push(`Prospecting Period ${index + 1}: End date must be after start date`);
      }

      if (lastNomEnd && periodStart && periodStart < lastNomEnd) {
        validationErrors.push(`Prospecting Period ${index + 1}: Starts before previous period ends`);
      }

      if (periodEnd) lastNomEnd = periodEnd;
    });

    // Validate voting/judging rounds
    let prevRoundEnd = lastNomEnd;
    votingRounds.forEach((round, index) => {
      const roundStart = round.start_date ? new Date(round.start_date) : null;
      const roundEnd = round.end_date ? new Date(round.end_date) : null;
      const roundType = round.round_type === 'judging' ? 'Judging' : 'Voting';

      if (roundStart && roundEnd && roundEnd <= roundStart) {
        validationErrors.push(`${roundType} Round ${index + 1}: End date must be after start date`);
      }

      // Only warn if strictly before (allow overlap for flexibility)
      if (prevRoundEnd && roundStart && roundStart < prevRoundEnd) {
        // This is now just a warning, not an error - allow overlapping rounds
      }

      prevRoundEnd = roundEnd;
    });

    if (finale && prevRoundEnd && finale < prevRoundEnd) {
      validationErrors.push('Finale date must be after the last round ends');
    }

    // Voting minimums (only enforced once the host has started adding voting
    // rounds): at least 3 rounds and at least 30 days of voting total.
    const votingTypeRounds = votingRounds.filter((r) => r.round_type === 'voting');
    if (votingTypeRounds.length > 0) {
      if (votingTypeRounds.length < 3) {
        validationErrors.push('Voting needs at least 3 rounds.');
      }
      const starts = votingTypeRounds.map((r) => r.start_date && new Date(r.start_date)).filter(Boolean);
      const ends = votingTypeRounds.map((r) => r.end_date && new Date(r.end_date)).filter(Boolean);
      if (starts.length && ends.length) {
        const firstStart = Math.min(...starts.map((d) => d.getTime()));
        const lastEnd = Math.max(...ends.map((d) => d.getTime()));
        const days = (lastEnd - firstStart) / 86400000;
        if (days < 30) {
          validationErrors.push('Voting must run at least 30 days total (first round start to last round end).');
        }
      }
    }

    if (status === COMPETITION_STATUS.LIVE) {
      if (nominationPeriods.length === 0) {
        validationErrors.push('At least one prospecting period is required for Live status');
      } else {
        const firstPeriod = nominationPeriods[0];
        if (!firstPeriod.start_date || !firstPeriod.end_date) {
          validationErrors.push('First prospecting period must have start and end dates for Live status');
        }
      }
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  // Save settings
  const handleSave = async () => {
    if (isLocked) {
      toast.error('This competition has ended — its timeline is locked.');
      return;
    }
    if (!validateDates()) {
      toast.error('Please fix the validation errors before saving');
      return;
    }

    setSaving(true);
    try {
      // Nomination open/close dates are owned by the Nomination Form section,
      // not here — this section only manages voting/judging rounds, the finale
      // and status. (See NominationFormEditor for the nomination window.)
      const { error: compError } = await supabase
        .from('competitions')
        .update({
          status,
          finals_date: settings.finals_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', competition.id);

      if (compError) throw compError;

      // ────────────────────────────────────────────────────────────────────
      // Reconcile nomination_periods and voting_rounds in place.
      //
      // The previous implementation deleted every row and re-inserted with
      // fresh UUIDs. That destroyed FK references — judge_scores
      // (ON DELETE CASCADE on voting_round_id), votes_at_round_start
      // snapshots keyed by round id, and finalized_at / finalized_snapshot.
      // Re-inserted rounds had finalized_at = NULL, so ensure_round_state()
      // re-ran finalization on already-past rounds, which could re-trigger
      // vote resets — that's the bug that zeroed votes prematurely.
      //
      // The fix: UPDATE rows that have an id (preserves identity + scores +
      // finalization), INSERT only truly new rows, DELETE only rows the host
      // removed. Two-phase round_order update sidesteps the
      // UNIQUE (competition_id, round_order) constraint when rows are
      // reordered.
      // ────────────────────────────────────────────────────────────────────

      await reconcileOrderedRows({
        table: 'voting_rounds',
        competitionId: competition.id,
        desired: votingRounds,
        orderField: 'round_order',
        buildPayload: (round, index) => ({
          title: round.title || `Round ${index + 1}`,
          round_type: round.round_type || 'voting',
          start_date: round.start_date || null,
          end_date: round.end_date || null,
          contestants_advance: round.contestants_advance || 10,
          tier_label: round.tier_label?.trim() || null,
          votes_reset_at_start: !!round.votes_reset_at_start,
        }),
      });

      toast.success('Timeline settings saved');
      if (onSave) onSave();
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error(`Failed to save settings: ${err.message || err.code || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  // Nomination period management
  const addNominationPeriod = () => {
    setNominationPeriods(prev => [
      ...prev,
      {
        ...DEFAULT_NOMINATION_PERIOD,
        title: prev.length === 0 ? 'Open Nominations' : `Period ${prev.length + 1}`,
        period_order: prev.length + 1,
      }
    ]);
    setNominationDisplayValues(prev => [...prev, { start_date: '', end_date: '' }]);
  };

  const removeNominationPeriod = (index) => {
    setNominationPeriods(prev => prev.filter((_, i) => i !== index));
    setNominationDisplayValues(prev => prev.filter((_, i) => i !== index));
  };

  const updateNominationPeriod = (index, field, value) => {
    setNominationPeriods(prev =>
      prev.map((period, i) =>
        i === index ? { ...period, [field]: value } : period
      )
    );
  };

  const updateNominationDisplayValue = (index, field, value) => {
    setNominationDisplayValues(prev =>
      prev.map((disp, i) =>
        i === index ? { ...disp, [field]: value } : disp
      )
    );
  };

  // Handle nomination period date blur
  const handleNominationDateBlur = (index, field, displayValue) => {
    const errorKey = `nom_${index}_${field}`;
    if (!displayValue.trim()) {
      updateNominationPeriod(index, field, '');
      setParseErrors(prev => ({ ...prev, [errorKey]: false }));
      return;
    }

    const parsed = parseTypedDate(displayValue);
    if (parsed) {
      updateNominationPeriod(index, field, parsed);
      updateNominationDisplayValue(index, field, formatDateForDisplay(parsed));
      setParseErrors(prev => ({ ...prev, [errorKey]: false }));
    } else {
      setParseErrors(prev => ({ ...prev, [errorKey]: true }));
    }
  };

  // Voting/Judging round management
  const addVotingRound = (roundType = 'voting') => {
    const typeLabel = roundType === 'judging' ? 'Judging' : 'Voting';
    // Auto-fill the first voting round's start from the nomination close date
    // (5 days after) so the host doesn't have to compute it.
    const isFirstVoting = roundType === 'voting' && votingRounds.filter(r => r.round_type === 'voting').length === 0;
    const autoStartIso = isFirstVoting && recommendedVotingStartIso ? recommendedVotingStartIso : '';
    setVotingRounds(prev => [
      ...prev,
      {
        ...DEFAULT_VOTING_ROUND,
        title: `${typeLabel} Round ${prev.filter(r => r.round_type === roundType).length + 1}`,
        round_order: prev.length + 1,
        round_type: roundType,
        start_date: autoStartIso || DEFAULT_VOTING_ROUND.start_date || '',
      }
    ]);
    setRoundDisplayValues(prev => [...prev, { start_date: autoStartIso ? formatDateForDisplay(autoStartIso) : '', end_date: '' }]);
  };

  const removeVotingRound = (index) => {
    setVotingRounds(prev => prev.filter((_, i) => i !== index));
    setRoundDisplayValues(prev => prev.filter((_, i) => i !== index));
  };

  const updateVotingRound = (index, field, value) => {
    setVotingRounds(prev =>
      prev.map((round, i) =>
        i === index ? { ...round, [field]: value } : round
      )
    );
  };

  const updateRoundDisplayValue = (index, field, value) => {
    setRoundDisplayValues(prev =>
      prev.map((disp, i) =>
        i === index ? { ...disp, [field]: value } : disp
      )
    );
  };

  // Handle date input blur - parse and validate
  const handleDateBlur = (field, displayValue) => {
    if (!displayValue.trim()) {
      setSettings(prev => ({ ...prev, [field]: '' }));
      setParseErrors(prev => ({ ...prev, [field]: false }));
      return;
    }

    const parsed = parseTypedDate(displayValue);
    if (parsed) {
      setSettings(prev => ({ ...prev, [field]: parsed }));
      setDisplayValues(prev => ({ ...prev, [field]: formatDateForDisplay(parsed) }));
      setParseErrors(prev => ({ ...prev, [field]: false }));
    } else {
      setParseErrors(prev => ({ ...prev, [field]: true }));
    }
  };

  // Handle voting round date blur
  const handleRoundDateBlur = (index, field, displayValue) => {
    const errorKey = `round_${index}_${field}`;
    if (!displayValue.trim()) {
      updateVotingRound(index, field, '');
      setParseErrors(prev => ({ ...prev, [errorKey]: false }));
      return;
    }

    const parsed = parseTypedDate(displayValue);
    if (parsed) {
      updateVotingRound(index, field, parsed);
      updateRoundDisplayValue(index, field, formatDateForDisplay(parsed));
      setParseErrors(prev => ({ ...prev, [errorKey]: false }));
    } else {
      setParseErrors(prev => ({ ...prev, [errorKey]: true }));
    }
  };

  // Styles
  const sectionStyle = {
    background: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  };

  const labelStyle = {
    display: 'block',
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  };

  const inputStyle = {
    width: '100%',
    padding: spacing.md,
    background: colors.background.card,
    border: `1px solid ${colors.border.light}`,
    borderRadius: borderRadius.md,
    color: '#fff',
    fontSize: typography.fontSize.md,
    outline: 'none',
  };

  // Compact, read-only schedule shown to hosts once the timeline is locked,
  // instead of the full editor with its empty-state cards and disabled inputs.
  const renderLockedSchedule = () => {
    const finalsDisplay = displayValues.finals_date;
    const fmtRange = (start, end) =>
      !start && !end ? 'Dates not set' : `${start || '—'} → ${end || '—'}`;

    const groupLabel = (Icon, text) => (
      <div style={{
        display: 'flex', alignItems: 'center', gap: spacing.sm,
        color: colors.text.secondary, fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium, marginBottom: spacing.sm,
      }}>
        <Icon size={14} /> {text}
      </div>
    );
    const rowStyle = {
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      gap: spacing.md, padding: `${spacing.sm} 0`,
      borderBottom: `1px solid ${colors.border.lighter}`,
    };
    const muted = (t) => (
      <p style={{ margin: 0, color: colors.text.muted, fontSize: typography.fontSize.sm }}>{t}</p>
    );
    const dateText = { color: colors.text.secondary, fontSize: typography.fontSize.xs, whiteSpace: 'nowrap' };

    return (
      <div style={sectionStyle}>
        <h4 style={{ fontSize: typography.fontSize.md, marginBottom: spacing.lg, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <Calendar size={18} /> Schedule
        </h4>

        <div style={{ marginBottom: spacing.lg }}>
          {groupLabel(Vote, 'Voting & Judging Rounds')}
          {votingRounds.length > 0
            ? votingRounds.map((r, i) => {
              const cfg = ROUND_TYPE_CONFIG[r.round_type] || ROUND_TYPE_CONFIG.voting;
              return (
                <div key={i} style={rowStyle}>
                  <span style={{ color: colors.text.primary, fontSize: typography.fontSize.sm }}>
                    {r.title || `Round ${i + 1}`}
                    <span style={{ color: cfg.color, fontSize: typography.fontSize.xs, marginLeft: spacing.sm }}>{cfg.label}</span>
                  </span>
                  <span style={dateText}>{fmtRange(roundDisplayValues[i]?.start_date, roundDisplayValues[i]?.end_date)}</span>
                </div>
              );
            })
            : muted('No rounds')}
        </div>

        <div>
          {groupLabel(Trophy, 'Finals')}
          {finalsDisplay
            ? <p style={{ margin: 0, color: colors.text.primary, fontSize: typography.fontSize.sm }}>{finalsDisplay}</p>
            : muted('Not set')}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: spacing.lg }}>
        <SkeletonPulse height="20px" width="200px" style={{ marginBottom: spacing.lg }} />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.lg, alignItems: 'center' }}>
            <SkeletonPulse width="140px" height="16px" />
            <SkeletonPulse height="40px" style={{ flex: 1 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Validation Errors */}
      {errors.length > 0 && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: borderRadius.lg,
          padding: spacing.md,
          marginBottom: spacing.lg,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
            <AlertTriangle size={16} style={{ color: '#ef4444' }} />
            <span style={{ color: '#ef4444', fontWeight: typography.fontWeight.medium }}>Validation Errors</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: spacing.lg }}>
            {errors.map((error, i) => (
              <li key={i} style={{ color: '#ef4444', fontSize: typography.fontSize.sm }}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Current Phase + Competition Status removed — phase/status are driven by
          the launch lifecycle (submit → approve → publish), not edited here. */}

      {isLocked ? (
        <>
          {/* Locked: a finished competition's schedule is read-only. Show a
              compact summary instead of the full editor. */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: spacing.sm,
            padding: spacing.md,
            marginBottom: spacing.lg,
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: borderRadius.lg,
          }}>
            <Lock size={16} style={{ color: 'rgb(59, 130, 246)', marginTop: '2px', flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: typography.fontSize.sm, color: 'rgb(59, 130, 246)', fontWeight: typography.fontWeight.medium }}>
                Timeline locked
              </p>
              <p style={{ margin: `${spacing.xs} 0 0`, fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                This competition has {status === COMPETITION_STATUS.ARCHIVE ? 'been archived' : 'ended'}. Its
                schedule is preserved as a record and can no longer be edited.
              </p>
            </div>
          </div>
          {renderLockedSchedule()}
        </>
      ) : (
        <>
      {/* Nomination open/close dates moved to the Nomination Form section. */}

      {/* Voting & Judging Rounds */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
          <h4 style={{ fontSize: typography.fontSize.md, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <Vote size={18} />
            Voting Rounds
          </h4>
          <Button variant="secondary" size="sm" icon={Plus} onClick={() => addVotingRound('voting')}>
            Add Voting
          </Button>
        </div>
        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.sm }}>
          {usesJudges
            ? 'These are the public-vote rounds. Judging (criteria, weight and dates) is set in the Judging section.'
            : 'This competition is vote-based only. To add judges, change “How they win” in your competition details before submitting.'}
        </p>
        <p style={{ fontSize: typography.fontSize.xs, color: colors.gold.primary, marginBottom: spacing.md }}>
          Voting should run at least <strong>30 days</strong> across at least <strong>3 rounds</strong>. We recommend voting opens 5 days after nominations close
          {recommendedVotingStartIso ? <> — about <strong>{formatDateForDisplay(recommendedVotingStartIso)}</strong>. The first round’s start is filled in for you.</> : '. Set your nomination close date first and we’ll suggest the start.'}
        </p>

        {votingRounds.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: spacing.xl,
            background: colors.background.card,
            borderRadius: borderRadius.lg,
            color: colors.text.secondary,
          }}>
            <Vote size={32} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
            <p>No rounds configured</p>
            <p style={{ fontSize: typography.fontSize.sm }}>Add voting or judging rounds to define the schedule</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            {votingRounds.map((round, index) => {
              const roundConfig = ROUND_TYPE_CONFIG[round.round_type] || ROUND_TYPE_CONFIG.voting;
              return (
              <div
                key={index}
                style={{
                  background: colors.background.card,
                  borderRadius: borderRadius.md,
                  padding: spacing.md,
                  border: `1px solid ${roundConfig.color}33`,
                  borderLeft: `3px solid ${roundConfig.color}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                    <input
                      type="text"
                      value={round.title}
                      onChange={(e) => updateVotingRound(index, 'title', e.target.value)}
                      placeholder={`Round ${index + 1}`}
                      style={{
                        ...inputStyle,
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        fontWeight: typography.fontWeight.medium,
                        maxWidth: '200px',
                      }}
                    />
                  </div>
                  <button
                    onClick={() => removeVotingRound(index)}
                    style={{
                      background: 'rgba(239,68,68,0.1)',
                      border: 'none',
                      borderRadius: borderRadius.sm,
                      padding: spacing.xs,
                      cursor: 'pointer',
                      color: '#ef4444',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 120px',
                  gap: spacing.sm,
                }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: typography.fontSize.xs }}>Start</label>
                    <input
                      type="text"
                      placeholder="Feb 1, 2025 12:00 AM"
                      value={roundDisplayValues[index]?.start_date || ''}
                      onChange={(e) => updateRoundDisplayValue(index, 'start_date', e.target.value)}
                      onBlur={(e) => handleRoundDateBlur(index, 'start_date', e.target.value)}
                      style={{
                        ...inputStyle,
                        fontSize: '16px', // Prevents iOS zoom
                        padding: spacing.md,
                        minHeight: '44px',
                        borderColor: parseErrors[`round_${index}_start_date`] ? '#ef4444' : colors.border.light,
                      }}
                    />
                    {parseErrors[`round_${index}_start_date`] && (
                      <p style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px' }}>Invalid date</p>
                    )}
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: typography.fontSize.xs }}>End</label>
                    <input
                      type="text"
                      placeholder="Feb 14, 2025 11:59 PM"
                      value={roundDisplayValues[index]?.end_date || ''}
                      onChange={(e) => updateRoundDisplayValue(index, 'end_date', e.target.value)}
                      onBlur={(e) => handleRoundDateBlur(index, 'end_date', e.target.value)}
                      style={{
                        ...inputStyle,
                        fontSize: '16px', // Prevents iOS zoom
                        padding: spacing.md,
                        minHeight: '44px',
                        borderColor: parseErrors[`round_${index}_end_date`] ? '#ef4444' : colors.border.light,
                      }}
                    />
                    {parseErrors[`round_${index}_end_date`] && (
                      <p style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px' }}>Invalid date</p>
                    )}
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: typography.fontSize.xs }}>Top # Advance</label>
                    <input
                      type="number"
                      min="1"
                      value={round.contestants_advance}
                      onChange={(e) => updateVotingRound(index, 'contestants_advance', parseInt(e.target.value) || 1)}
                      style={{
                        ...inputStyle,
                        fontSize: '16px',
                        padding: spacing.md,
                        minHeight: '44px',
                      }}
                    />
                    <p style={{ fontSize: '10px', color: colors.text.muted, marginTop: '2px' }}>
                      Top {round.contestants_advance} move to next round
                    </p>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: spacing.sm,
                  marginTop: spacing.sm,
                }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: typography.fontSize.xs }}>
                      Tier label
                    </label>
                    <input
                      type="text"
                      placeholder="Top 50, Quarterfinals, Finale…"
                      value={round.tier_label || ''}
                      onChange={(e) => updateVotingRound(index, 'tier_label', e.target.value)}
                      style={{
                        ...inputStyle,
                        fontSize: '16px',
                        padding: spacing.md,
                        minHeight: '44px',
                      }}
                    />
                    <p style={{ fontSize: '10px', color: colors.text.muted, marginTop: '2px' }}>
                      Public headline shown during this round. Falls back to the round title.
                    </p>
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: typography.fontSize.xs }}>
                      Vote behavior
                    </label>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.sm,
                      minHeight: '44px',
                      padding: spacing.md,
                      background: colors.background.secondary,
                      border: `1px solid ${colors.border.light}`,
                      borderRadius: borderRadius.sm,
                      cursor: 'pointer',
                    }}>
                      <input
                        type="checkbox"
                        checked={!!round.votes_reset_at_start}
                        onChange={(e) => updateVotingRound(index, 'votes_reset_at_start', e.target.checked)}
                      />
                      <span style={{ fontSize: typography.fontSize.sm, color: colors.text.primary }}>
                        Reset votes at start of this round
                      </span>
                    </label>
                    <p style={{ fontSize: '10px', color: colors.text.muted, marginTop: '2px' }}>
                      Off (default) = cumulative across rounds. On = surviving contestants restart at zero.
                    </p>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Finals Date */}
      <div style={sectionStyle}>
        <h4 style={{ fontSize: typography.fontSize.md, marginBottom: spacing.md, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <Trophy size={18} />
          Finals Date
        </h4>
        <div>
          <input
            type="text"
            placeholder="Mar 15, 2025 7:00 PM"
            value={displayValues.finals_date}
            onChange={(e) => setDisplayValues(prev => ({ ...prev, finals_date: e.target.value }))}
            onBlur={(e) => handleDateBlur('finals_date', e.target.value)}
            style={{
              ...inputStyle,
              maxWidth: '300px',
              borderColor: parseErrors.finals_date ? '#ef4444' : colors.border.light,
            }}
          />
          {parseErrors.finals_date && (
            <p style={{ fontSize: typography.fontSize.xs, color: '#ef4444', marginTop: spacing.xs }}>
              Invalid date format
            </p>
          )}
          <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
            The official close/finale date — the competition flips to Completed after it passes.
            Winners are decided when your last round ends, so set this after the final round.
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: spacing.xl }}>
        <Button icon={Save} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Timeline Settings'}
        </Button>
      </div>
        </>
      )}
    </div>
  );
}
