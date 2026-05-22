import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Crown, RefreshCw, Loader, AlertCircle, Check } from 'lucide-react';
import { Button, Avatar, Badge } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import {
  getResurrectionPoll,
  openResurrectionPoll,
  closeResurrectionPoll,
} from '../../../lib/resurrection';

/**
 * Host/admin control panel for "resurrection by the public".
 *
 * Lets the admin open a resurrection vote (eligible = eliminated contestants
 * who were top 25 when their round was finalized), watch the public tally,
 * and close the poll to return the winning contestant to the competition.
 */
export default function ResurrectionManager({ competition, onUpdate }) {
  const competitionId = competition?.id;

  const [loading, setLoading] = useState(true);
  const [poll, setPoll] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!competitionId) {
      setLoading(false);
      return;
    }
    const result = await getResurrectionPoll(competitionId);
    setPoll(result.poll);
    setCandidates(result.candidates || []);
    setLoading(false);
  }, [competitionId]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const handleOpen = async () => {
    setError(null);
    setBusy(true);
    const result = await openResurrectionPoll(competitionId);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not open the resurrection poll.');
      return;
    }
    await refresh();
  };

  const handleClose = async () => {
    if (!poll?.id) return;
    if (
      !window.confirm(
        'Close this resurrection vote? The contestant with the most votes will be returned to the competition. This cannot be undone.'
      )
    ) {
      return;
    }
    setError(null);
    setBusy(true);
    const result = await closeResurrectionPoll(poll.id);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not close the resurrection poll.');
      return;
    }
    await refresh();
    onUpdate?.();
  };

  const winner =
    poll?.winner_contestant_id &&
    candidates.find((c) => c.contestant_id === poll.winner_contestant_id);

  const cardStyle = {
    background: colors.background.card,
    border: '1px solid rgba(212,175,55,0.3)',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
  };

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          marginBottom: spacing.lg,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: borderRadius.lg,
              background: 'rgba(212,175,55,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={24} style={{ color: colors.gold.primary }} />
          </div>
          <div>
            <h3
              style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
              }}
            >
              Resurrection Vote
            </h3>
            <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
              Let the public vote an eliminated top-25 contestant back in
            </p>
          </div>
        </div>
        {poll?.status === 'open' && (
          <Badge variant="success" size="sm">
            Live
          </Badge>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            padding: spacing.md,
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: borderRadius.md,
            marginBottom: spacing.lg,
            color: colors.status.error,
            fontSize: typography.fontSize.sm,
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}

      {loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            color: colors.text.muted,
            fontSize: typography.fontSize.sm,
            padding: spacing.lg,
          }}
        >
          <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
          Loading…
        </div>
      ) : poll?.status === 'open' ? (
        <OpenPollView
          poll={poll}
          candidates={candidates}
          busy={busy}
          onRefresh={refresh}
          onClose={handleClose}
        />
      ) : (
        <IdleView poll={poll} winner={winner} busy={busy} onOpen={handleOpen} />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function IdleView({ poll, winner, busy, onOpen }) {
  return (
    <div>
      {poll?.status === 'closed' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
            padding: spacing.md,
            background: 'rgba(212,175,55,0.06)',
            border: '1px solid rgba(212,175,55,0.2)',
            borderRadius: borderRadius.lg,
            marginBottom: spacing.lg,
          }}
        >
          <Crown size={20} style={{ color: colors.gold.primary, flexShrink: 0 }} />
          <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
            {winner ? (
              <>
                Last vote:{' '}
                <strong style={{ color: colors.text.primary }}>{winner.name}</strong> was
                resurrected back into the competition.
              </>
            ) : (
              'The last resurrection vote closed with no votes — no contestant returned.'
            )}
          </p>
        </div>
      )}

      <p
        style={{
          fontSize: typography.fontSize.sm,
          color: colors.text.secondary,
          lineHeight: 1.6,
          marginBottom: spacing.lg,
        }}
      >
        Opening a resurrection vote puts every eliminated contestant who finished in the
        top 25 of their round onto a public ballot. When you close the vote, the
        contestant with the most public votes returns to the competition with a clean
        vote count.
      </p>

      <Button icon={Sparkles} onClick={onOpen} disabled={busy}>
        {busy ? 'Opening…' : 'Open Resurrection Vote'}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function OpenPollView({ poll, candidates, busy, onRefresh, onClose }) {
  const totalVotes = poll?.total_votes || 0;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.md,
        }}
      >
        <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
          {totalVotes.toLocaleString()} {totalVotes === 1 ? 'vote' : 'votes'} cast across{' '}
          {candidates.length} {candidates.length === 1 ? 'candidate' : 'candidates'}
        </p>
        <Button size="sm" variant="secondary" icon={RefreshCw} onClick={onRefresh}>
          Refresh
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
        {candidates.map((c, index) => {
          const votes = c.votes || 0;
          const share = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isLeader = index === 0 && votes > 0;
          return (
            <div
              key={c.contestant_id}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
                padding: spacing.md,
                background: colors.background.secondary,
                border: `1px solid ${
                  isLeader ? 'rgba(212,175,55,0.4)' : colors.border.primary
                }`,
                borderRadius: borderRadius.lg,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${share}%`,
                  background: 'rgba(212,175,55,0.1)',
                  pointerEvents: 'none',
                }}
              />
              <Avatar name={c.name} size={40} src={c.avatar_url} />
              <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                <p
                  style={{
                    fontWeight: typography.fontWeight.medium,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c.name}
                </p>
                <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                  {c.eliminated_in_round
                    ? `Eliminated Round ${c.eliminated_in_round}`
                    : 'Eliminated'}
                  {c.eliminated_at_rank ? ` · was #${c.eliminated_at_rank}` : ''}
                </p>
              </div>
              {isLeader && (
                <Badge variant="gold" size="sm" style={{ position: 'relative' }}>
                  Leading
                </Badge>
              )}
              <div style={{ position: 'relative', textAlign: 'right', minWidth: 52 }}>
                <p
                  style={{
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.gold.primary,
                    lineHeight: 1.1,
                  }}
                >
                  {votes.toLocaleString()}
                </p>
                <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                  {share}%
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: spacing.lg }}>
        <Button icon={Check} onClick={onClose} disabled={busy}>
          {busy ? 'Closing…' : 'Close Vote & Resurrect Winner'}
        </Button>
      </div>
    </div>
  );
}
