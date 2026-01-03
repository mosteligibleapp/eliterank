import React, { useState, useEffect } from 'react';
import {
  Calendar, Vote, Plus, Trash2, AlertTriangle, Save, Loader,
  Clock, Activity, Trophy, Archive, FileEdit, Users, ToggleLeft, ToggleRight
} from 'lucide-react';
import { Button, Badge } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import {
  COMPETITION_STATUS,
  STATUS_CONFIG,
  DEFAULT_VOTING_ROUND,
  DEFAULT_NOMINATION_PERIOD,
} from '../../../types/competition';
import {
  computeCompetitionPhase,
  TIMELINE_PHASES,
  getPhaseDisplayConfig,
} from '../../../utils/competitionPhase';
import { parseTypedDate, formatDateForDisplay } from '../../../utils/dateUtils';

/**
 * TimelineSettings - Manages competition timeline with flexible naming
 * Supports multiple nomination periods, voting rounds, and customizable finale
 */
export default function TimelineSettings({ competition, onSave }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Status state
  const [status, setStatus] = useState(competition?.status || COMPETITION_STATUS.DRAFT);

  // Nomination periods (multiple, with custom titles)
  const [nominationPeriods, setNominationPeriods] = useState([]);
  const [nominationDisplayValues, setNominationDisplayValues] = useState([]);

  // Voting rounds state
  const [votingRounds, setVotingRounds] = useState([]);
  const [roundDisplayValues, setRoundDisplayValues] = useState([]);

  // Finale settings
  const [finaleTitle, setFinaleTitle] = useState('Finals');
  const [finaleDate, setFinaleDate] = useState('');
  const [finaleDateDisplay, setFinaleDateDisplay] = useState('');

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
      const [settingsResult, nominationsResult, roundsResult] = await Promise.all([
        supabase
          .from('competition_settings')
          .select('*')
          .eq('competition_id', competition.id)
          .maybeSingle(),
        supabase
          .from('nomination_periods')
          .select('*')
          .eq('competition_id', competition.id)
          .order('period_order'),
        supabase
          .from('voting_rounds')
          .select('*')
          .eq('competition_id', competition.id)
          .order('round_order'),
      ]);

      if (settingsResult.error && settingsResult.error.code !== 'PGRST116') {
        throw settingsResult.error;
      }

      // Handle nomination periods - check if table exists
      let nominations = [];
      if (!nominationsResult.error) {
        nominations = nominationsResult.data || [];
      } else if (nominationsResult.error.code !== '42P01') {
        // Only throw if it's not a "table doesn't exist" error
        console.warn('nomination_periods table may not exist yet:', nominationsResult.error);
      }

      // If no nomination periods but we have legacy settings, create one
      if (nominations.length === 0 && settingsResult.data) {
        if (settingsResult.data.nomination_start || settingsResult.data.nomination_end) {
          nominations = [{
            id: 'legacy',
            title: 'Nominations',
            period_order: 1,
            start_date: settingsResult.data.nomination_start,
            end_date: settingsResult.data.nomination_end,
            max_submissions: null,
          }];
        }
      }

      setNominationPeriods(nominations);
      setNominationDisplayValues(nominations.map(n => ({
        start_date: formatDateForDisplay(n.start_date),
        end_date: formatDateForDisplay(n.end_date),
      })));

      if (roundsResult.error && roundsResult.error.code !== 'PGRST116') {
        throw roundsResult.error;
      }

      const rounds = roundsResult.data || [];
      setVotingRounds(rounds);
      setRoundDisplayValues(rounds.map(r => ({
        start_date: formatDateForDisplay(r.start_date),
        end_date: formatDateForDisplay(r.end_date),
      })));

      // Finale settings
      if (settingsResult.data) {
        setFinaleTitle(settingsResult.data.finale_title || 'Finals');
        setFinaleDate(settingsResult.data.finale_date || '');
        setFinaleDateDisplay(formatDateForDisplay(settingsResult.data.finale_date));
      }

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
    nomination_periods: nominationPeriods,
    voting_rounds: votingRounds,
    settings: { finale_date: finaleDate, finale_title: finaleTitle },
  });
  const phaseConfig = getPhaseDisplayConfig(computedPhase);

  // Validate dates
  const validateDates = () => {
    const validationErrors = [];

    // Check for parse errors
    const hasParseErrors = Object.values(parseErrors).some(Boolean);
    if (hasParseErrors) {
      validationErrors.push('Please fix invalid date formats before saving');
    }

    // Require at least one end date to go live (option C from discussion)
    if (status === COMPETITION_STATUS.LIVE) {
      const hasNominationEnd = nominationPeriods.some(p => p.end_date);
      const hasVotingEnd = votingRounds.some(r => r.end_date);
      const hasFinale = finaleDate;

      if (!hasNominationEnd && !hasVotingEnd && !hasFinale) {
        validationErrors.push('At least one end date is required to go Live');
      }
    }

    // Validate nomination periods
    nominationPeriods.forEach((period, index) => {
      const start = period.start_date ? new Date(period.start_date) : null;
      const end = period.end_date ? new Date(period.end_date) : null;

      if (start && end && end <= start) {
        validationErrors.push(`${period.title || `Period ${index + 1}`}: End date must be after start date`);
      }
    });

    // Validate voting rounds
    let prevEnd = nominationPeriods.length > 0
      ? nominationPeriods[nominationPeriods.length - 1]?.end_date
      : null;

    votingRounds.forEach((round, index) => {
      const roundStart = round.start_date ? new Date(round.start_date) : null;
      const roundEnd = round.end_date ? new Date(round.end_date) : null;

      if (roundStart && roundEnd && roundEnd <= roundStart) {
        validationErrors.push(`${round.title || `Round ${index + 1}`}: End date must be after start date`);
      }

      if (prevEnd && roundStart && roundStart < new Date(prevEnd)) {
        validationErrors.push(`${round.title || `Round ${index + 1}`}: Starts before previous period ends`);
      }

      prevEnd = round.end_date;
    });

    // Validate finale
    const finale = finaleDate ? new Date(finaleDate) : null;
    if (finale && prevEnd && finale < new Date(prevEnd)) {
      validationErrors.push(`${finaleTitle} must be after the last voting round ends`);
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  // Save settings
  const handleSave = async () => {
    if (!validateDates()) {
      toast.error('Please fix the validation errors before saving');
      return;
    }

    setSaving(true);
    try {
      // Update competition status
      const { error: compError } = await supabase
        .from('competitions')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', competition.id);

      if (compError) throw compError;

      // Update or insert settings (for finale)
      const { error: settingsError } = await supabase
        .from('competition_settings')
        .upsert({
          competition_id: competition.id,
          finale_title: finaleTitle,
          finale_date: finaleDate || null,
          // Keep legacy fields for backwards compatibility
          nomination_start: nominationPeriods[0]?.start_date || null,
          nomination_end: nominationPeriods[nominationPeriods.length - 1]?.end_date || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'competition_id' });

      if (settingsError) throw settingsError;

      // Save nomination periods
      try {
        await supabase
          .from('nomination_periods')
          .delete()
          .eq('competition_id', competition.id);

        if (nominationPeriods.length > 0) {
          const periodsToInsert = nominationPeriods.map((period, index) => ({
            competition_id: competition.id,
            title: period.title || 'Nominations',
            period_order: index + 1,
            start_date: period.start_date || null,
            end_date: period.end_date || null,
            max_submissions: period.max_submissions || null,
          }));

          const { error: periodsError } = await supabase
            .from('nomination_periods')
            .insert(periodsToInsert);

          if (periodsError) throw periodsError;
        }
      } catch (nomErr) {
        // Table might not exist yet - that's OK
        console.warn('Could not save nomination_periods (table may not exist):', nomErr);
      }

      // Save voting rounds
      await supabase
        .from('voting_rounds')
        .delete()
        .eq('competition_id', competition.id);

      if (votingRounds.length > 0) {
        const roundsToInsert = votingRounds.map((round, index) => ({
          competition_id: competition.id,
          title: round.title || `Round ${index + 1}`,
          round_order: index + 1,
          start_date: round.start_date || null,
          end_date: round.end_date || null,
          contestants_advance: round.contestants_advance || null,
          votes_accumulate: round.votes_accumulate || false,
        }));

        const { error: roundsError } = await supabase
          .from('voting_rounds')
          .insert(roundsToInsert);

        if (roundsError) throw roundsError;
      }

      toast.success('Timeline settings saved');
      if (onSave) onSave();
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // NOMINATION PERIOD MANAGEMENT
  // ============================================================================

  const addNominationPeriod = () => {
    setNominationPeriods(prev => [
      ...prev,
      {
        ...DEFAULT_NOMINATION_PERIOD,
        title: prev.length === 0 ? 'Nominations' : `Period ${prev.length + 1}`,
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

  // ============================================================================
  // VOTING ROUND MANAGEMENT
  // ============================================================================

  const addVotingRound = () => {
    setVotingRounds(prev => [
      ...prev,
      {
        ...DEFAULT_VOTING_ROUND,
        title: `Round ${prev.length + 1}`,
        round_order: prev.length + 1,
      }
    ]);
    setRoundDisplayValues(prev => [...prev, { start_date: '', end_date: '' }]);
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

  // ============================================================================
  // FINALE DATE HANDLING
  // ============================================================================

  const handleFinaleDateBlur = (displayValue) => {
    if (!displayValue.trim()) {
      setFinaleDate('');
      setParseErrors(prev => ({ ...prev, finale: false }));
      return;
    }

    const parsed = parseTypedDate(displayValue);
    if (parsed) {
      setFinaleDate(parsed);
      setFinaleDateDisplay(formatDateForDisplay(parsed));
      setParseErrors(prev => ({ ...prev, finale: false }));
    } else {
      setParseErrors(prev => ({ ...prev, finale: true }));
    }
  };

  // ============================================================================
  // STYLES
  // ============================================================================

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

  const toggleStyle = (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: `${spacing.sm} ${spacing.md}`,
    background: active ? 'rgba(212,175,55,0.15)' : 'transparent',
    border: `1px solid ${active ? colors.gold.primary : colors.border.light}`,
    borderRadius: borderRadius.md,
    color: active ? colors.gold.primary : colors.text.secondary,
    cursor: 'pointer',
    fontSize: typography.fontSize.sm,
  });

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: spacing.xxxl }}>
        <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: colors.gold.primary }} />
        <p style={{ marginTop: spacing.md, color: colors.text.secondary }}>Loading timeline settings...</p>
      </div>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

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

      {/* Phase Indicator */}
      <div style={sectionStyle}>
        <h4 style={{ fontSize: typography.fontSize.md, marginBottom: spacing.md, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <Activity size={18} />
          Current Phase
        </h4>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.lg,
          background: colors.background.card,
          borderRadius: borderRadius.lg,
          border: `1px solid ${colors.border.light}`,
        }}>
          <Badge variant={phaseConfig.variant} size="lg">
            {phaseConfig.label}
          </Badge>
          <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
            {status === COMPETITION_STATUS.LIVE
              ? 'Phase is computed from timeline dates'
              : 'Set status to "Live" to enable timeline-based phases'}
          </span>
        </div>
      </div>

      {/* Status Section */}
      <div style={sectionStyle}>
        <h4 style={{ fontSize: typography.fontSize.md, marginBottom: spacing.md, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <Vote size={18} />
          Competition Status
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setStatus(key)}
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                background: status === key ? config.bg : 'transparent',
                border: `1px solid ${status === key ? config.color : colors.border.light}`,
                borderRadius: borderRadius.md,
                color: status === key ? config.color : colors.text.muted,
                fontSize: typography.fontSize.sm,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: spacing.xs,
                minWidth: '120px',
              }}
            >
              <span style={{ fontWeight: typography.fontWeight.medium }}>{config.label}</span>
              <span style={{ fontSize: typography.fontSize.xs, opacity: 0.7 }}>{config.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Nomination/Application Periods */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
          <h4 style={{ fontSize: typography.fontSize.md, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <Users size={18} />
            Prospecting Periods
          </h4>
          <Button variant="secondary" size="sm" icon={Plus} onClick={addNominationPeriod}>
            Add Period
          </Button>
        </div>
        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.md }}>
          Define when contestants can apply. Call it "Nominations", "Applications", "Submissions", or anything you want.
        </p>

        {nominationPeriods.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: spacing.xl,
            background: colors.background.card,
            borderRadius: borderRadius.lg,
            color: colors.text.secondary,
          }}>
            <Users size={32} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
            <p>No prospecting periods configured</p>
            <p style={{ fontSize: typography.fontSize.sm }}>Add a period to define when contestants can apply</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            {nominationPeriods.map((period, index) => (
              <div
                key={index}
                style={{
                  background: colors.background.card,
                  borderRadius: borderRadius.md,
                  padding: spacing.md,
                  border: `1px solid ${colors.border.light}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                  <input
                    type="text"
                    value={period.title}
                    onChange={(e) => updateNominationPeriod(index, 'title', e.target.value)}
                    placeholder="Nominations"
                    style={{
                      ...inputStyle,
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      fontWeight: typography.fontWeight.medium,
                      maxWidth: '250px',
                    }}
                  />
                  <button
                    onClick={() => removeNominationPeriod(index)}
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: spacing.sm }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: typography.fontSize.xs }}>Start</label>
                    <input
                      type="text"
                      placeholder="Jan 1, 2025 12:00 AM"
                      value={nominationDisplayValues[index]?.start_date || ''}
                      onChange={(e) => updateNominationDisplayValue(index, 'start_date', e.target.value)}
                      onBlur={(e) => handleNominationDateBlur(index, 'start_date', e.target.value)}
                      style={{
                        ...inputStyle,
                        fontSize: typography.fontSize.sm,
                        padding: spacing.sm,
                        borderColor: parseErrors[`nom_${index}_start_date`] ? '#ef4444' : colors.border.light,
                      }}
                    />
                    {parseErrors[`nom_${index}_start_date`] && (
                      <p style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px' }}>Invalid date</p>
                    )}
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: typography.fontSize.xs }}>End</label>
                    <input
                      type="text"
                      placeholder="Jan 31, 2025 11:59 PM"
                      value={nominationDisplayValues[index]?.end_date || ''}
                      onChange={(e) => updateNominationDisplayValue(index, 'end_date', e.target.value)}
                      onBlur={(e) => handleNominationDateBlur(index, 'end_date', e.target.value)}
                      style={{
                        ...inputStyle,
                        fontSize: typography.fontSize.sm,
                        padding: spacing.sm,
                        borderColor: parseErrors[`nom_${index}_end_date`] ? '#ef4444' : colors.border.light,
                      }}
                    />
                    {parseErrors[`nom_${index}_end_date`] && (
                      <p style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px' }}>Invalid date</p>
                    )}
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: typography.fontSize.xs }}>Max (optional)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="∞"
                      value={period.max_submissions || ''}
                      onChange={(e) => updateNominationPeriod(index, 'max_submissions', e.target.value ? parseInt(e.target.value) : null)}
                      style={{ ...inputStyle, fontSize: typography.fontSize.sm, padding: spacing.sm }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Voting / Judging Rounds */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
          <h4 style={{ fontSize: typography.fontSize.md, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <Vote size={18} />
            Voting & Judging Periods
          </h4>
          <Button variant="secondary" size="sm" icon={Plus} onClick={addVotingRound}>
            Add Round
          </Button>
        </div>
        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.md }}>
          Configure voting rounds. Name them "Round 1", "Entry Round", "Semi-Finals", etc.
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
            <p>No voting/judging periods configured</p>
            <p style={{ fontSize: typography.fontSize.sm }}>Add a round to define the voting schedule</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            {votingRounds.map((round, index) => (
              <div
                key={index}
                style={{
                  background: colors.background.card,
                  borderRadius: borderRadius.md,
                  padding: spacing.md,
                  border: `1px solid ${colors.border.light}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
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
                      maxWidth: '250px',
                    }}
                  />
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: spacing.sm, marginBottom: spacing.md }}>
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
                        fontSize: typography.fontSize.sm,
                        padding: spacing.sm,
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
                        fontSize: typography.fontSize.sm,
                        padding: spacing.sm,
                        borderColor: parseErrors[`round_${index}_end_date`] ? '#ef4444' : colors.border.light,
                      }}
                    />
                    {parseErrors[`round_${index}_end_date`] && (
                      <p style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px' }}>Invalid date</p>
                    )}
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: typography.fontSize.xs }}>Advance</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="All"
                      value={round.contestants_advance || ''}
                      onChange={(e) => updateVotingRound(index, 'contestants_advance', e.target.value ? parseInt(e.target.value) : null)}
                      style={{ ...inputStyle, fontSize: typography.fontSize.sm, padding: spacing.sm }}
                    />
                  </div>
                </div>

                {/* Vote Accumulation Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                  <button
                    onClick={() => updateVotingRound(index, 'votes_accumulate', !round.votes_accumulate)}
                    style={toggleStyle(round.votes_accumulate)}
                  >
                    {round.votes_accumulate ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    {round.votes_accumulate ? 'Votes Accumulate' : 'Votes Reset'}
                  </button>
                  <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                    {round.votes_accumulate
                      ? 'Votes from previous round carry over'
                      : 'Votes reset to 0 at start of round'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Finale / End Date */}
      <div style={sectionStyle}>
        <h4 style={{ fontSize: typography.fontSize.md, marginBottom: spacing.md, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <Trophy size={18} />
          Competition End
        </h4>
        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.md }}>
          Call it "Finals", "Grand Finale", "Voting Closes", "Winners Announced", or anything else.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: spacing.md, alignItems: 'flex-start' }}>
          <div>
            <label style={labelStyle}>Title</label>
            <input
              type="text"
              placeholder="Finals"
              value={finaleTitle}
              onChange={(e) => setFinaleTitle(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Date & Time</label>
            <input
              type="text"
              placeholder="Mar 15, 2025 7:00 PM"
              value={finaleDateDisplay}
              onChange={(e) => setFinaleDateDisplay(e.target.value)}
              onBlur={(e) => handleFinaleDateBlur(e.target.value)}
              style={{
                ...inputStyle,
                maxWidth: '300px',
                borderColor: parseErrors.finale ? '#ef4444' : colors.border.light,
              }}
            />
            {parseErrors.finale && (
              <p style={{ fontSize: typography.fontSize.xs, color: '#ef4444', marginTop: spacing.xs }}>
                Invalid date format
              </p>
            )}
            <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
              Competition will transition to completed after this date
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: spacing.xl }}>
        <Button icon={Save} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Timeline Settings'}
        </Button>
      </div>
    </div>
  );
}
