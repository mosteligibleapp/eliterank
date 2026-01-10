import React, { useState, useEffect } from 'react';
import { Users, Hash, TrendingUp, Award, Scale } from 'lucide-react';
import { Button, Badge, Avatar, Panel } from '../../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../../styles/theme';
import { supabase } from '../../../../lib/supabase';

export default function AdvancementTab({ competitionId, contestants }) {
  const [activeRound, setActiveRound] = useState(null);
  const [votingRounds, setVotingRounds] = useState([]);
  const [advanceCount, setAdvanceCount] = useState(10);

  // Fetch voting rounds
  useEffect(() => {
    const fetchRounds = async () => {
      if (!supabase || !competitionId) return;
      const { data: rounds } = await supabase
        .from('voting_rounds')
        .select('*')
        .eq('competition_id', competitionId)
        .order('round_order');
      if (rounds && rounds.length > 0) {
        setVotingRounds(rounds);
        const now = new Date();
        const active = rounds.find(r => {
          const start = r.start_date ? new Date(r.start_date) : null;
          const end = r.end_date ? new Date(r.end_date) : null;
          return start && end && start <= now && now <= end;
        }) || rounds[rounds.length - 1];
        setActiveRound(active);
        setAdvanceCount(active?.contestants_advance || 10);
      }
    };
    fetchRounds();
  }, [competitionId]);

  // Sort contestants by votes
  const sortedContestants = [...contestants].sort((a, b) => (b.votes || 0) - (a.votes || 0));

  // Detect ties at the advancement cutoff
  const detectTies = () => {
    if (sortedContestants.length <= advanceCount) return [];
    const cutoffVotes = sortedContestants[advanceCount - 1]?.votes || 0;
    const tied = sortedContestants.filter((c, idx) => {
      return c.votes === cutoffVotes && (idx >= advanceCount - 1);
    });
    return tied.length > 1 ? tied : [];
  };

  const ties = detectTies();

  return (
    <div>
      {/* Tie Alert */}
      {ties.length > 0 && (
        <div style={{
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: borderRadius.xl,
          padding: spacing.lg,
          marginBottom: spacing.xl,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
        }}>
          <Scale size={24} style={{ color: '#f59e0b' }} />
          <div>
            <p style={{ fontWeight: typography.fontWeight.semibold, color: '#f59e0b' }}>
              Tie Detected at Position {advanceCount}
            </p>
            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
              {ties.length} contestants are tied with {ties[0]?.votes} votes.
            </p>
          </div>
        </div>
      )}

      {/* Voting Round Selector */}
      {votingRounds.length > 0 && (
        <div style={{
          background: colors.background.card,
          border: `1px solid ${colors.border.light}`,
          borderRadius: borderRadius.xl,
          padding: spacing.lg,
          marginBottom: spacing.xl,
        }}>
          <h4 style={{ fontSize: typography.fontSize.md, marginBottom: spacing.md, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <Hash size={18} />
            Voting Round
          </h4>
          <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
            {votingRounds.map((round) => (
              <button
                key={round.id}
                onClick={() => {
                  setActiveRound(round);
                  setAdvanceCount(round.contestants_advance || 10);
                }}
                style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  background: activeRound?.id === round.id ? 'rgba(212,175,55,0.2)' : 'transparent',
                  border: `1px solid ${activeRound?.id === round.id ? colors.gold.primary : colors.border.light}`,
                  borderRadius: borderRadius.md,
                  color: activeRound?.id === round.id ? colors.gold.primary : colors.text.secondary,
                  cursor: 'pointer',
                  fontSize: typography.fontSize.sm,
                }}
              >
                {round.title}
                <span style={{ marginLeft: spacing.sm, opacity: 0.7 }}>
                  (Top {round.contestants_advance} advance)
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contestants Leaderboard */}
      <Panel title="Contestant Rankings" icon={TrendingUp}>
        <div style={{ padding: spacing.lg }}>
          {sortedContestants.length === 0 ? (
            <div style={{ textAlign: 'center', padding: spacing.xxl, color: colors.text.secondary }}>
              <Users size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
              <p>No contestants yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              {sortedContestants.map((contestant, index) => {
                const isInAdvanceZone = index < advanceCount;
                const isTied = ties.some(t => t.id === contestant.id);

                return (
                  <div
                    key={contestant.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.lg,
                      padding: spacing.lg,
                      background: isTied
                        ? 'rgba(245,158,11,0.1)'
                        : isInAdvanceZone
                          ? 'rgba(34,197,94,0.05)'
                          : colors.background.secondary,
                      border: `1px solid ${isTied ? 'rgba(245,158,11,0.3)' : isInAdvanceZone ? 'rgba(34,197,94,0.2)' : colors.border.light}`,
                      borderRadius: borderRadius.lg,
                    }}
                  >
                    {/* Rank */}
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: borderRadius.full,
                      background: index < 3 ? 'linear-gradient(135deg, #d4af37, #f4d03f)' : colors.background.card,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: typography.fontWeight.bold,
                      color: index < 3 ? '#0a0a0f' : colors.text.primary,
                    }}>
                      {index + 1}
                    </div>

                    {/* Avatar & Name */}
                    <Avatar name={contestant.name} size={48} avatarUrl={contestant.avatarUrl} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                        <p style={{ fontWeight: typography.fontWeight.medium }}>{contestant.name}</p>
                        {isInAdvanceZone && !isTied && (
                          <Badge variant="success" size="sm">Advancing</Badge>
                        )}
                        {isTied && (
                          <Badge variant="warning" size="sm">Tied</Badge>
                        )}
                      </div>
                      <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                        {contestant.instagram && `@${contestant.instagram.replace('@', '')}`}
                      </p>
                    </div>

                    {/* Current Votes */}
                    <div style={{ textAlign: 'center', minWidth: 80 }}>
                      <p style={{
                        fontSize: typography.fontSize.xl,
                        fontWeight: typography.fontWeight.bold,
                        color: colors.gold.primary,
                      }}>
                        {contestant.votes || 0}
                      </p>
                      <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>votes</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
