import React, { useState, useEffect } from 'react';
import {
  Calendar, Vote, Plus, Trash2, AlertTriangle, Save, Loader,
  Clock, Activity, Trophy, Archive, FileEdit
} from 'lucide-react';
import { Button, Badge } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import {
  COMPETITION_STATUS,
  STATUS_CONFIG,
  DEFAULT_VOTING_ROUND,
} from '../../../types/competition';
import {
  computeCompetitionPhase,
  TIMELINE_PHASES,
  getPhaseDisplayConfig,
} from '../../../utils/competitionPhase';

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
 * TimelineSettings - Manages competition status, timeline dates, and voting rounds
 * Used by both Host and SuperAdmin dashboards
 */
export default function TimelineSettings({ competition, onSave }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings state (stores ISO strings for DB)
  const [settings, setSettings] = useState({
    nomination_start: '',
    nomination_end: '',
    finale_date: '',
  });

  // Display values (what user sees/types)
  const [displayValues, setDisplayValues] = useState({
    nomination_start: '',
    nomination_end: '',
    finale_date: '',
  });

  // Voting rounds state
  const [votingRounds, setVotingRounds] = useState([]);

  // Voting round display values
  const [roundDisplayValues, setRoundDisplayValues] = useState([]);

  // Status state
  const [status, setStatus] = useState(competition?.status || COMPETITION_STATUS.DRAFT);

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
      const [settingsResult, roundsResult] = await Promise.all([
        supabase
          .from('competition_settings')
          .select('*')
          .eq('competition_id', competition.id)
          .single(),
        supabase
          .from('voting_rounds')
          .select('*')
          .eq('competition_id', competition.id)
          .order('round_order'),
      ]);

      if (settingsResult.error && settingsResult.error.code !== 'PGRST116') {
        throw settingsResult.error;
      }

      if (roundsResult.error) throw roundsResult.error;

      if (settingsResult.data) {
        setSettings({
          nomination_start: settingsResult.data.nomination_start || '',
          nomination_end: settingsResult.data.nomination_end || '',
          finale_date: settingsResult.data.finale_date || '',
        });
        setDisplayValues({
          nomination_start: formatDateForDisplay(settingsResult.data.nomination_start),
          nomination_end: formatDateForDisplay(settingsResult.data.nomination_end),
          finale_date: formatDateForDisplay(settingsResult.data.finale_date),
        });
      }

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

    const nomStart = settings.nomination_start ? new Date(settings.nomination_start) : null;
    const nomEnd = settings.nomination_end ? new Date(settings.nomination_end) : null;
    const finale = settings.finale_date ? new Date(settings.finale_date) : null;

    if (nomStart && nomEnd && nomEnd <= nomStart) {
      validationErrors.push('Nomination end must be after nomination start');
    }

    let prevRoundEnd = nomEnd;
    votingRounds.forEach((round, index) => {
      const roundStart = round.start_date ? new Date(round.start_date) : null;
      const roundEnd = round.end_date ? new Date(round.end_date) : null;

      if (roundStart && roundEnd && roundEnd <= roundStart) {
        validationErrors.push(`Round ${index + 1}: End date must be after start date`);
      }

      if (prevRoundEnd && roundStart && roundStart < prevRoundEnd) {
        validationErrors.push(`Round ${index + 1}: Starts before previous round ends`);
      }

      prevRoundEnd = roundEnd;
    });

    if (finale && prevRoundEnd && finale < prevRoundEnd) {
      validationErrors.push('Finale date must be after the last voting round ends');
    }

    if (status === COMPETITION_STATUS.LIVE) {
      if (!settings.nomination_start || !settings.nomination_end) {
        validationErrors.push('Nomination dates are required for Live status');
      }
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

      // Update or insert settings
      const { error: settingsError } = await supabase
        .from('competition_settings')
        .upsert({
          competition_id: competition.id,
          nomination_start: settings.nomination_start || null,
          nomination_end: settings.nomination_end || null,
          finale_date: settings.finale_date || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'competition_id' });

      if (settingsError) throw settingsError;

      // Delete existing voting rounds and re-insert
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
          contestants_advance: round.contestants_advance || 10,
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
      toast.error(`Failed to save settings: ${err.message || err.code || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  // Voting round management
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: spacing.xxxl }}>
        <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: colors.gold.primary }} />
        <p style={{ marginTop: spacing.md, color: colors.text.secondary }}>Loading timeline settings...</p>
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

      {/* Nomination Dates */}
      <div style={sectionStyle}>
        <h4 style={{ fontSize: typography.fontSize.md, marginBottom: spacing.md, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <Calendar size={18} />
          Nomination Period
        </h4>
        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.md }}>
          Enter dates like: Jan 15, 2025 6:00 PM or 1/15/2025 6pm
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
          <div>
            <label style={labelStyle}>Start Date</label>
            <input
              type="text"
              placeholder="Jan 15, 2025 6:00 PM"
              value={displayValues.nomination_start}
              onChange={(e) => setDisplayValues(prev => ({ ...prev, nomination_start: e.target.value }))}
              onBlur={(e) => handleDateBlur('nomination_start', e.target.value)}
              style={{
                ...inputStyle,
                borderColor: parseErrors.nomination_start ? '#ef4444' : colors.border.light,
              }}
            />
            {parseErrors.nomination_start && (
              <p style={{ fontSize: typography.fontSize.xs, color: '#ef4444', marginTop: spacing.xs }}>
                Invalid date format
              </p>
            )}
          </div>
          <div>
            <label style={labelStyle}>End Date</label>
            <input
              type="text"
              placeholder="Jan 31, 2025 11:59 PM"
              value={displayValues.nomination_end}
              onChange={(e) => setDisplayValues(prev => ({ ...prev, nomination_end: e.target.value }))}
              onBlur={(e) => handleDateBlur('nomination_end', e.target.value)}
              style={{
                ...inputStyle,
                borderColor: parseErrors.nomination_end ? '#ef4444' : colors.border.light,
              }}
            />
            {parseErrors.nomination_end && (
              <p style={{ fontSize: typography.fontSize.xs, color: '#ef4444', marginTop: spacing.xs }}>
                Invalid date format
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Voting Rounds */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
          <h4 style={{ fontSize: typography.fontSize.md, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <Vote size={18} />
            Voting Rounds
          </h4>
          <Button variant="secondary" size="sm" icon={Plus} onClick={addVotingRound}>
            Add Round
          </Button>
        </div>

        {votingRounds.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: spacing.xl,
            background: colors.background.card,
            borderRadius: borderRadius.lg,
            color: colors.text.secondary,
          }}>
            <Vote size={32} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
            <p>No voting rounds configured</p>
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
                      maxWidth: '200px',
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: spacing.sm }}>
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
                      value={round.contestants_advance}
                      onChange={(e) => updateVotingRound(index, 'contestants_advance', parseInt(e.target.value) || 1)}
                      style={{ ...inputStyle, fontSize: typography.fontSize.sm, padding: spacing.sm }}
                    />
                  </div>
                </div>
              </div>
            ))}
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
            value={displayValues.finale_date}
            onChange={(e) => setDisplayValues(prev => ({ ...prev, finale_date: e.target.value }))}
            onBlur={(e) => handleDateBlur('finale_date', e.target.value)}
            style={{
              ...inputStyle,
              maxWidth: '300px',
              borderColor: parseErrors.finale_date ? '#ef4444' : colors.border.light,
            }}
          />
          {parseErrors.finale_date && (
            <p style={{ fontSize: typography.fontSize.xs, color: '#ef4444', marginTop: spacing.xs }}>
              Invalid date format
            </p>
          )}
          <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
            Competition will transition to completed after this date
          </p>
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
