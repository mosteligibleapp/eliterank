import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy, Users, ChevronUp, ChevronDown, Check, X,
  AlertTriangle, Award, Crown, Loader, RefreshCw
} from 'lucide-react';
import { Button, Badge } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { formatNumber } from '../../../utils/formatters';

/**
 * AdvancementManager - Manages round transitions and contestant advancement
 * Used by hosts/superadmins to determine who advances after a voting round ends
 */
export default function AdvancementManager({ competition, onSave }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contestants, setContestants] = useState([]);
  const [votingRounds, setVotingRounds] = useState([]);
  const [selectedRound, setSelectedRound] = useState(null);
  const [advancingIds, setAdvancingIds] = useState(new Set());
  const [tieBreakers, setTieBreakers] = useState({});

  // Fetch data on mount
  useEffect(() => {
    if (competition?.id) {
      fetchData();
    }
  }, [competition?.id]);

  const fetchData = async () => {
    if (!supabase || !competition?.id) return;

    setLoading(true);
    try {
      const [contestantsResult, roundsResult] = await Promise.all([
        supabase
          .from('contestants')
          .select('*')
          .eq('competition_id', competition.id)
          .order('votes', { ascending: false }),
        supabase
          .from('voting_rounds')
          .select('*')
          .eq('competition_id', competition.id)
          .order('round_order'),
      ]);

      if (contestantsResult.error) throw contestantsResult.error;
      if (roundsResult.error) throw roundsResult.error;

      setContestants(contestantsResult.data || []);
      setVotingRounds(roundsResult.data || []);

      // Auto-select the most recent ended round that hasn't been processed
      const now = new Date();
      const endedRounds = (roundsResult.data || []).filter(r => {
        if (!r.end_date) return false;
        return new Date(r.end_date) < now;
      });

      if (endedRounds.length > 0) {
        const lastEndedRound = endedRounds[endedRounds.length - 1];
        setSelectedRound(lastEndedRound);

        // Pre-select contestants who should advance based on vote counts
        if (lastEndedRound.contestants_advance) {
          const activeContestants = (contestantsResult.data || [])
            .filter(c => c.advancement_status === 'active' || !c.advancement_status);
          const topN = activeContestants
            .slice(0, lastEndedRound.contestants_advance)
            .map(c => c.id);
          setAdvancingIds(new Set(topN));
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load advancement data');
    } finally {
      setLoading(false);
    }
  };

  // Get active contestants (not yet eliminated)
  const activeContestants = useMemo(() => {
    return contestants.filter(c =>
      c.advancement_status === 'active' ||
      c.advancement_status === 'advancing' ||
      !c.advancement_status
    );
  }, [contestants]);

  // Find ties at the cutoff line
  const ties = useMemo(() => {
    if (!selectedRound?.contestants_advance || activeContestants.length === 0) {
      return [];
    }

    const cutoffIndex = selectedRound.contestants_advance - 1;
    if (cutoffIndex >= activeContestants.length) return [];

    const cutoffVotes = activeContestants[cutoffIndex]?.votes || 0;

    // Find all contestants with the same vote count as the cutoff
    const tiedContestants = activeContestants.filter((c, idx) => {
      // Include if they're at the boundary (just above or at cutoff)
      return c.votes === cutoffVotes && idx >= cutoffIndex - 1;
    });

    return tiedContestants.length > 1 ? tiedContestants : [];
  }, [activeContestants, selectedRound]);

  // Toggle contestant advancement
  const toggleAdvancing = (contestantId) => {
    setAdvancingIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contestantId)) {
        newSet.delete(contestantId);
      } else {
        newSet.add(contestantId);
      }
      return newSet;
    });
  };

  // Auto-select top N
  const autoSelectTopN = () => {
    if (!selectedRound?.contestants_advance) return;
    const topN = activeContestants
      .slice(0, selectedRound.contestants_advance)
      .map(c => c.id);
    setAdvancingIds(new Set(topN));
  };

  // Process advancement
  const processAdvancement = async () => {
    if (!selectedRound) {
      toast.error('Please select a round first');
      return;
    }

    if (ties.length > 0) {
      // Check if all ties are resolved
      const tieIds = new Set(ties.map(t => t.id));
      const advancingTies = [...advancingIds].filter(id => tieIds.has(id));
      const expectedAdvancing = selectedRound.contestants_advance;

      if (advancingIds.size !== expectedAdvancing) {
        const proceed = window.confirm(
          `You've selected ${advancingIds.size} contestants to advance, but the round is set for ${expectedAdvancing}. Continue anyway?`
        );
        if (!proceed) return;
      }
    }

    setSaving(true);
    try {
      // Update advancing contestants
      const advancingUpdates = activeContestants
        .filter(c => advancingIds.has(c.id))
        .map(c => ({
          id: c.id,
          advancement_status: 'advancing',
          current_round: (c.current_round || 1) + 1,
        }));

      // Update eliminated contestants
      const eliminatedUpdates = activeContestants
        .filter(c => !advancingIds.has(c.id))
        .map(c => ({
          id: c.id,
          advancement_status: 'eliminated',
          eliminated_in_round: selectedRound.round_order,
        }));

      // Batch update
      for (const update of [...advancingUpdates, ...eliminatedUpdates]) {
        const { error } = await supabase
          .from('contestants')
          .update({
            advancement_status: update.advancement_status,
            current_round: update.current_round,
            eliminated_in_round: update.eliminated_in_round,
          })
          .eq('id', update.id);

        if (error) throw error;
      }

      // Record the advancement in round_advancements table
      const advancementRecords = activeContestants.map((c, idx) => ({
        competition_id: competition.id,
        voting_round_id: selectedRound.id,
        contestant_id: c.id,
        advanced: advancingIds.has(c.id),
        final_vote_count: c.votes || 0,
        final_rank: idx + 1,
        decided_at: new Date().toISOString(),
      }));

      const { error: recordError } = await supabase
        .from('round_advancements')
        .insert(advancementRecords);

      if (recordError) {
        console.warn('Could not save advancement records:', recordError);
      }

      toast.success(`Round ${selectedRound.round_order} advancement processed!`);
      if (onSave) onSave();
      await fetchData();
    } catch (err) {
      console.error('Error processing advancement:', err);
      toast.error('Failed to process advancement');
    } finally {
      setSaving(false);
    }
  };

  // Styles
  const sectionStyle = {
    background: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: spacing.xxxl }}>
        <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: colors.gold.primary }} />
        <p style={{ marginTop: spacing.md, color: colors.text.secondary }}>Loading advancement data...</p>
      </div>
    );
  }

  if (votingRounds.length === 0) {
    return (
      <div style={sectionStyle}>
        <div style={{ textAlign: 'center', padding: spacing.xxl }}>
          <Trophy size={48} style={{ color: colors.text.muted, marginBottom: spacing.lg }} />
          <h3 style={{ marginBottom: spacing.md }}>No Voting Rounds Configured</h3>
          <p style={{ color: colors.text.secondary }}>
            Configure voting rounds in the Timeline Settings to use the advancement manager.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Round Selector */}
      <div style={sectionStyle}>
        <h4 style={{ fontSize: typography.fontSize.md, marginBottom: spacing.md, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <Trophy size={18} />
          Select Round to Process
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
          {votingRounds.map((round) => {
            const isEnded = round.end_date && new Date(round.end_date) < new Date();
            const isSelected = selectedRound?.id === round.id;

            return (
              <button
                key={round.id}
                onClick={() => setSelectedRound(round)}
                style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  background: isSelected ? 'rgba(212,175,55,0.2)' : 'transparent',
                  border: `1px solid ${isSelected ? colors.gold.primary : colors.border.light}`,
                  borderRadius: borderRadius.md,
                  color: isSelected ? colors.gold.primary : colors.text.secondary,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: spacing.xs,
                }}
              >
                <span style={{ fontWeight: typography.fontWeight.medium }}>
                  {round.title || `Round ${round.round_order}`}
                </span>
                <span style={{ fontSize: typography.fontSize.xs }}>
                  {isEnded ? 'Ended' : 'Active/Upcoming'}
                  {round.contestants_advance && ` • Top ${round.contestants_advance} advance`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ties Warning */}
      {selectedRound && ties.length > 0 && (
        <div style={{
          background: 'rgba(251,191,36,0.1)',
          border: '1px solid rgba(251,191,36,0.3)',
          borderRadius: borderRadius.lg,
          padding: spacing.md,
          marginBottom: spacing.lg,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
        }}>
          <AlertTriangle size={24} style={{ color: '#fbbf24', flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: typography.fontWeight.medium, color: '#fbbf24' }}>
              Tie Detected at Position {selectedRound.contestants_advance}
            </p>
            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
              {ties.length} contestants have {ties[0]?.votes} votes. You must manually decide who advances.
            </p>
          </div>
        </div>
      )}

      {/* Contestants List */}
      {selectedRound && (
        <div style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
            <h4 style={{ fontSize: typography.fontSize.md, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <Users size={18} />
              Contestants ({activeContestants.length})
            </h4>
            <div style={{ display: 'flex', gap: spacing.sm }}>
              <Button variant="secondary" size="sm" icon={RefreshCw} onClick={autoSelectTopN}>
                Auto-Select Top {selectedRound.contestants_advance || 'N'}
              </Button>
            </div>
          </div>

          <div style={{ fontSize: typography.fontSize.sm, color: colors.text.muted, marginBottom: spacing.md }}>
            Advancing: {advancingIds.size} / {selectedRound.contestants_advance || '∞'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            {activeContestants.map((contestant, index) => {
              const isAdvancing = advancingIds.has(contestant.id);
              const isTied = ties.some(t => t.id === contestant.id);
              const isCutoffLine = selectedRound.contestants_advance &&
                index === selectedRound.contestants_advance - 1;

              return (
                <React.Fragment key={contestant.id}>
                  {isCutoffLine && index > 0 && (
                    <div style={{
                      borderTop: '2px dashed rgba(212,175,55,0.5)',
                      margin: `${spacing.sm} 0`,
                      position: 'relative',
                    }}>
                      <span style={{
                        position: 'absolute',
                        top: '-10px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: colors.background.secondary,
                        padding: `0 ${spacing.sm}`,
                        color: colors.gold.primary,
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.medium,
                      }}>
                        CUTOFF LINE
                      </span>
                    </div>
                  )}
                  <div
                    onClick={() => toggleAdvancing(contestant.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.md,
                      padding: spacing.md,
                      background: isAdvancing
                        ? 'rgba(34,197,94,0.1)'
                        : isTied
                          ? 'rgba(251,191,36,0.1)'
                          : colors.background.card,
                      border: `1px solid ${
                        isAdvancing
                          ? 'rgba(34,197,94,0.3)'
                          : isTied
                            ? 'rgba(251,191,36,0.3)'
                            : colors.border.light
                      }`,
                      borderRadius: borderRadius.md,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {/* Rank */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: borderRadius.md,
                      background: index < 3
                        ? index === 0
                          ? 'linear-gradient(135deg, #d4af37, #f4d03f)'
                          : index === 1
                            ? 'linear-gradient(135deg, #c0c0c0, #e8e8e8)'
                            : 'linear-gradient(135deg, #cd7f32, #daa06d)'
                        : 'rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: typography.fontWeight.bold,
                      color: index < 3 ? '#0a0a0f' : colors.text.primary,
                      flexShrink: 0,
                    }}>
                      {index + 1}
                    </div>

                    {/* Avatar */}
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: borderRadius.md,
                      background: colors.background.secondary,
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}>
                      {contestant.avatar_url ? (
                        <img src={contestant.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Crown size={20} style={{ color: colors.text.muted }} />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: typography.fontWeight.medium }}>
                        {contestant.name}
                      </p>
                      <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                        {formatNumber(contestant.votes || 0)} votes
                      </p>
                    </div>

                    {/* Tie indicator */}
                    {isTied && (
                      <Badge variant="warning" size="sm">TIE</Badge>
                    )}

                    {/* Selection indicator */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: borderRadius.md,
                      background: isAdvancing ? '#22c55e' : 'rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {isAdvancing ? (
                        <Check size={18} style={{ color: '#fff' }} />
                      ) : (
                        <X size={18} style={{ color: colors.text.muted }} />
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Process Button */}
      {selectedRound && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing.md }}>
          <Button
            variant="secondary"
            onClick={fetchData}
            disabled={saving}
          >
            Reset
          </Button>
          <Button
            onClick={processAdvancement}
            disabled={saving || advancingIds.size === 0}
            icon={Trophy}
          >
            {saving ? 'Processing...' : `Advance ${advancingIds.size} Contestants`}
          </Button>
        </div>
      )}
    </div>
  );
}
