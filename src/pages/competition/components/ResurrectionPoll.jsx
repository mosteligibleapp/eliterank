import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Crown, Check, AlertCircle } from 'lucide-react';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { useAuthContextSafe } from '../../../contexts/AuthContext';
import { useResurrectionPoll } from '../../../hooks/useResurrectionPoll';
import { Avatar } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';

const CLOSED_BANNER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const styles = {
  card: {
    background: colors.background.card,
    border: '1px solid rgba(212,175,55,0.3)',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    background: 'rgba(212,175,55,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 1.5,
    marginBottom: spacing.lg,
  },
  candidateList: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  candidateRow: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    background: colors.background.secondary,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  shareBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    background: 'rgba(212,175,55,0.1)',
    pointerEvents: 'none',
  },
  candidateInfo: { flex: 1, minWidth: 0, position: 'relative' },
  candidateName: {
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  candidateMeta: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  voteTally: {
    position: 'relative',
    textAlign: 'right',
    minWidth: 56,
  },
  voteCount: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.gold.primary,
    lineHeight: 1.1,
  },
  voteLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  voteButton: {
    position: 'relative',
    padding: `${spacing.sm} ${spacing.md}`,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    border: 'none',
    whiteSpace: 'nowrap',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginTop: spacing.md,
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: borderRadius.md,
    color: colors.status.error,
    fontSize: typography.fontSize.sm,
  },
  footNote: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    marginTop: spacing.md,
    textAlign: 'center',
  },
};

/**
 * Public "resurrection by the public" poll. Renders inside a live competition
 * when an admin has opened a resurrection vote: eliminated top-25 contestants
 * compete to be voted back in. Renders nothing when there is no poll, so it is
 * safe to drop into any phase view.
 */
export function ResurrectionPoll() {
  const { competition } = usePublicCompetition();
  const { user } = useAuthContextSafe();
  const navigate = useNavigate();

  const { poll, candidates, myVoteContestantId, loading, castVote } =
    useResurrectionPoll(competition?.id);

  const [submitting, setSubmitting] = useState(null);
  const [error, setError] = useState(null);

  const totalVotes = poll?.total_votes || 0;

  const winner = useMemo(() => {
    if (!poll?.winner_contestant_id) return null;
    return candidates.find((c) => c.contestant_id === poll.winner_contestant_id) || null;
  }, [poll, candidates]);

  if (loading || !poll) return null;

  // ---- Closed poll: show the outcome for a week, then quietly retire it ----
  if (poll.status === 'closed') {
    const closedAt = poll.closed_at ? new Date(poll.closed_at).getTime() : 0;
    if (!closedAt || Date.now() - closedAt > CLOSED_BANNER_WINDOW_MS) return null;

    return (
      <section className="phase-section">
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.iconBadge}>
              <Crown size={22} style={{ color: colors.gold.primary }} />
            </div>
            <div style={styles.title}>Resurrection Result</div>
          </div>
          {winner ? (
            <p style={{ ...styles.subtitle, marginBottom: 0 }}>
              <strong style={{ color: colors.text.primary }}>{winner.name}</strong> won
              the public resurrection vote and is back in the competition.
            </p>
          ) : (
            <p style={{ ...styles.subtitle, marginBottom: 0 }}>
              The resurrection vote closed with no votes cast — no contestant returned.
            </p>
          )}
        </div>
      </section>
    );
  }

  // ---- Open poll: public voting ----
  const handleVote = async (contestantId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setError(null);
    setSubmitting(contestantId);
    const result = await castVote(contestantId);
    setSubmitting(null);
    if (!result.success) {
      setError(result.error || 'Could not record your vote. Please try again.');
    }
  };

  const hasVoted = Boolean(myVoteContestantId);

  return (
    <section className="phase-section">
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.iconBadge}>
            <Sparkles size={22} style={{ color: colors.gold.primary }} />
          </div>
          <div style={styles.title}>{poll.title || 'Resurrection Vote'}</div>
        </div>
        <p style={styles.subtitle}>
          These eliminated contestants finished in the top 25 before they were knocked
          out. The public decides who fights their way back in — vote for the one you
          want to see return.
        </p>

        <div style={styles.candidateList}>
          {candidates.map((c) => {
            const votes = c.votes || 0;
            const share = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
            const isMyPick = myVoteContestantId === c.contestant_id;
            const isSubmitting = submitting === c.contestant_id;

            return (
              <div
                key={c.contestant_id}
                style={{
                  ...styles.candidateRow,
                  ...(isMyPick
                    ? {
                        borderColor: 'rgba(212,175,55,0.5)',
                        background: 'rgba(212,175,55,0.06)',
                      }
                    : null),
                }}
              >
                <div style={{ ...styles.shareBar, width: `${share}%` }} />
                <Avatar name={c.name} size={44} src={c.avatar_url} />
                <div style={styles.candidateInfo}>
                  <div style={styles.candidateName}>{c.name}</div>
                  <div style={styles.candidateMeta}>
                    {c.eliminated_in_round
                      ? `Eliminated Round ${c.eliminated_in_round}`
                      : 'Eliminated'}
                    {c.eliminated_at_rank ? ` · was #${c.eliminated_at_rank}` : ''}
                  </div>
                </div>

                <div style={styles.voteTally}>
                  <div style={styles.voteCount}>{votes.toLocaleString()}</div>
                  <div style={styles.voteLabel}>{votes === 1 ? 'vote' : 'votes'}</div>
                </div>

                {isMyPick ? (
                  <span
                    style={{
                      ...styles.voteButton,
                      background: 'rgba(212,175,55,0.15)',
                      color: colors.gold.primary,
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.xs,
                    }}
                  >
                    <Check size={14} /> Your pick
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleVote(c.contestant_id)}
                    disabled={hasVoted || isSubmitting}
                    style={{
                      ...styles.voteButton,
                      background:
                        hasVoted || isSubmitting
                          ? colors.interactive.disabled
                          : colors.gold.primary,
                      color:
                        hasVoted || isSubmitting
                          ? colors.text.muted
                          : colors.text.inverse,
                      cursor: hasVoted || isSubmitting ? 'default' : 'pointer',
                    }}
                  >
                    {isSubmitting ? 'Voting…' : !user ? 'Sign in to vote' : 'Vote'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <p style={styles.footNote}>
          {hasVoted
            ? 'Thanks for voting — the winner returns to the competition when the poll closes.'
            : `${totalVotes.toLocaleString()} ${
                totalVotes === 1 ? 'vote' : 'votes'
              } cast · one vote per person`}
        </p>
      </div>
    </section>
  );
}

export default ResurrectionPoll;
