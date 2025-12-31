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
 * TimelineSettings - Manages competition status, timeline dates, and voting rounds
 * Used by both Host and SuperAdmin dashboards
 */
export default function TimelineSettings({ competition, onSave }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    nomination_start: '',
    nomination_end: '',
    finale_date: '',
  });

  // Voting rounds state
  const [votingRounds, setVotingRounds] = useState([]);

  // Status state
  const [status, setStatus] = useState(competition?.status || COMPETITION_STATUS.DRAFT);

  // Validation errors
  const [errors, setErrors] = useState([]);

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
      }

      setVotingRounds(roundsResult.data || []);
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
      toast.error('Failed to save settings');
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
  };

  const removeVotingRound = (index) => {
    setVotingRounds(prev => prev.filter((_, i) => i !== index));
  };

  const updateVotingRound = (index, field, value) => {
    setVotingRounds(prev =>
      prev.map((round, i) =>
        i === index ? { ...round, [field]: value } : round
      )
    );
  };

  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().slice(0, 16);
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
          <div>
            <label style={labelStyle}>Start Date</label>
            <input
              type="datetime-local"
              value={formatDateForInput(settings.nomination_start)}
              onChange={(e) => setSettings(prev => ({ ...prev, nomination_start: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>End Date</label>
            <input
              type="datetime-local"
              value={formatDateForInput(settings.nomination_end)}
              onChange={(e) => setSettings(prev => ({ ...prev, nomination_end: e.target.value }))}
              style={inputStyle}
            />
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: spacing.sm }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: typography.fontSize.xs }}>Start</label>
                    <input
                      type="datetime-local"
                      value={formatDateForInput(round.start_date)}
                      onChange={(e) => updateVotingRound(index, 'start_date', e.target.value)}
                      style={{ ...inputStyle, fontSize: typography.fontSize.sm, padding: spacing.sm }}
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: typography.fontSize.xs }}>End</label>
                    <input
                      type="datetime-local"
                      value={formatDateForInput(round.end_date)}
                      onChange={(e) => updateVotingRound(index, 'end_date', e.target.value)}
                      style={{ ...inputStyle, fontSize: typography.fontSize.sm, padding: spacing.sm }}
                    />
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
            type="datetime-local"
            value={formatDateForInput(settings.finale_date)}
            onChange={(e) => setSettings(prev => ({ ...prev, finale_date: e.target.value }))}
            style={{ ...inputStyle, maxWidth: '300px' }}
          />
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
