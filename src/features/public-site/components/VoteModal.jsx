import React, { useState, useEffect } from 'react';
import { DollarSign, Sparkles, LogIn, Check, Clock, Loader } from 'lucide-react';
import { Modal, Button, Avatar } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { formatNumber, formatCurrency } from '../../../utils/formatters';
import { VOTE_PRESETS } from '../../../constants';
import { hasUsedFreeVoteToday, submitFreeVote, getTodaysVote, getTimeUntilReset } from '../../../lib/votes';
import { useToast } from '../../../contexts/ToastContext';

export default function VoteModal({
  isOpen,
  onClose,
  contestant,
  voteCount,
  onVoteCountChange,
  forceDoubleVoteDay,
  isAuthenticated = false,
  onLogin,
  competitionId,
  user,
  onVoteSuccess,
}) {
  const userId = user?.id;
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [freeVoteUsed, setFreeVoteUsed] = useState(false);
  const [votedContestantId, setVotedContestantId] = useState(null);
  const [checkingVoteStatus, setCheckingVoteStatus] = useState(true);

  // Check if user has already used their free vote today
  useEffect(() => {
    const checkVoteStatus = async () => {
      if (!isOpen || !userId || !competitionId) {
        setCheckingVoteStatus(false);
        return;
      }

      setCheckingVoteStatus(true);
      try {
        const [hasVoted, votedFor] = await Promise.all([
          hasUsedFreeVoteToday(userId, competitionId),
          getTodaysVote(userId, competitionId),
        ]);
        setFreeVoteUsed(hasVoted);
        setVotedContestantId(votedFor);
      } catch (err) {
        console.error('Error checking vote status:', err);
      }
      setCheckingVoteStatus(false);
    };

    checkVoteStatus();
  }, [isOpen, userId, competitionId]);

  // Handle free vote submission
  const handleFreeVote = async () => {
    if (!contestant || !userId || !competitionId || freeVoteUsed || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitFreeVote({
        userId,
        voterEmail: user?.email,
        competitionId,
        contestantId: contestant.id,
        isDoubleVoteDay: forceDoubleVoteDay,
      });

      if (result.success) {
        const voteText = result.votesAdded > 1 ? `${result.votesAdded} votes` : '1 vote';
        showToast(`Vote submitted! You gave ${contestant.name} ${voteText}`, 'success');
        setFreeVoteUsed(true);
        setVotedContestantId(contestant.id);
        onVoteSuccess?.();
        onClose();
      } else {
        showToast(result.error || 'Failed to submit vote', 'error');
      }
    } catch (err) {
      console.error('Error submitting vote:', err);
      showToast('An unexpected error occurred', 'error');
    }

    setIsSubmitting(false);
  };

  if (!contestant) return null;

  // If not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Sign In Required" maxWidth="400px">
        <div style={{ textAlign: 'center', padding: spacing.xl }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))',
              borderRadius: borderRadius.full,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              marginBottom: spacing.xl,
            }}
          >
            <LogIn size={36} style={{ color: colors.gold.primary }} />
          </div>

          <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.md }}>
            Sign In to Vote
          </h3>

          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.md, marginBottom: spacing.xxl, lineHeight: 1.6 }}>
            Create an account or sign in to vote for <span style={{ color: colors.gold.primary, fontWeight: typography.fontWeight.semibold }}>{contestant.name}</span> and support your favorite contestant!
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <Button fullWidth size="lg" onClick={onLogin}>
              <LogIn size={18} />
              Sign In to Vote
            </Button>
            <Button variant="secondary" fullWidth size="md" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  const effectiveVotes = forceDoubleVoteDay ? voteCount * 2 : voteCount;
  const freeVoteValue = forceDoubleVoteDay ? 2 : 1;
  const alreadyVotedForThis = votedContestantId === contestant.id;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cast Your Vote" maxWidth="450px">
      {/* Double Vote Day Banner */}
      {forceDoubleVoteDay && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(251,191,36,0.1))',
            border: `2px solid rgba(212,175,55,0.4)`,
            borderRadius: borderRadius.lg,
            padding: `${spacing.md} ${spacing.lg}`,
            marginBottom: spacing.xl,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.md,
          }}
        >
          <Sparkles size={20} style={{ color: colors.gold.primary }} />
          <div>
            <p style={{ color: colors.gold.primary, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.md }}>
              DOUBLE VOTE DAY!
            </p>
            <p style={{ color: colors.text.light, fontSize: typography.fontSize.sm }}>All votes count 2x today</p>
          </div>
        </div>
      )}

      {/* Already voted banner */}
      {freeVoteUsed && alreadyVotedForThis && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
            border: `1px solid rgba(34,197,94,0.3)`,
            borderRadius: borderRadius.lg,
            padding: `${spacing.md} ${spacing.lg}`,
            marginBottom: spacing.xl,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          <Check size={20} style={{ color: colors.status.success }} />
          <div>
            <p style={{ color: colors.status.success, fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm }}>
              You voted for {contestant.name} today!
            </p>
          </div>
        </div>
      )}

      {/* Contestant Preview */}
      <div style={{ textAlign: 'center', marginBottom: spacing.xxl }}>
        <Avatar name={contestant.name} src={contestant.avatarUrl || contestant.avatar_url} size={100} style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.xs }}>
          {contestant.name}
        </h3>
        <p style={{ color: colors.text.secondary }}>{contestant.occupation}</p>
        <p style={{ color: colors.gold.primary, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginTop: spacing.sm }}>
          {formatNumber(contestant.votes || 0)} votes
        </p>
      </div>

      {/* Free Vote Section */}
      <div style={{ marginBottom: spacing.xl }}>
        <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.base, marginBottom: spacing.md, textAlign: 'center' }}>
          {freeVoteUsed ? (
            <>
              <Clock size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: spacing.xs }} />
              Free vote resets in {getTimeUntilReset()}
            </>
          ) : (
            <>
              Use your <span style={{ color: colors.status.success, fontWeight: typography.fontWeight.semibold }}>free daily vote</span>
              {forceDoubleVoteDay && <span style={{ color: colors.status.success }}> (counts as {freeVoteValue}!)</span>}
            </>
          )}
        </p>

        <Button
          variant="approve"
          fullWidth
          size="xl"
          onClick={handleFreeVote}
          disabled={freeVoteUsed || isSubmitting || checkingVoteStatus}
          style={{
            background: freeVoteUsed
              ? 'rgba(255,255,255,0.05)'
              : 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.1))',
            borderColor: freeVoteUsed ? 'rgba(255,255,255,0.1)' : 'rgba(34,197,94,0.4)',
            color: freeVoteUsed ? colors.text.muted : colors.status.success,
            cursor: freeVoteUsed ? 'not-allowed' : 'pointer',
          }}
        >
          {checkingVoteStatus ? (
            <>
              <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
              Checking...
            </>
          ) : isSubmitting ? (
            <>
              <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
              Submitting...
            </>
          ) : freeVoteUsed ? (
            <>
              <Check size={18} />
              Free Vote Used Today
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Use Free Daily Vote (+{freeVoteValue})
            </>
          )}
        </Button>
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
        <span style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>or purchase additional votes</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
      </div>

      {/* Vote Count Selector */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: borderRadius.xl, padding: spacing.xl, marginBottom: spacing.xl, opacity: 0.5 }}>
        <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.md, marginBottom: spacing.md, textAlign: 'center' }}>
          Select vote amount
        </p>
        <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'center', flexWrap: 'wrap', marginBottom: spacing.md }}>
          {VOTE_PRESETS.map((num) => (
            <button
              key={num}
              onClick={() => onVoteCountChange(num)}
              disabled
              style={{
                padding: `${spacing.md} ${spacing.lg}`,
                borderRadius: borderRadius.md,
                border: 'none',
                background: voteCount === num ? colors.gold.primary : 'rgba(255,255,255,0.05)',
                color: voteCount === num ? '#0a0a0f' : colors.text.secondary,
                fontWeight: typography.fontWeight.semibold,
                fontSize: typography.fontSize.lg,
                cursor: 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              {num}
            </button>
          ))}
        </div>

        {/* Total Display */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: `${spacing.md} ${spacing.lg}`,
            background: forceDoubleVoteDay ? 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(34,197,94,0.1))' : 'rgba(212,175,55,0.15)',
            borderRadius: borderRadius.lg,
            marginTop: spacing.lg,
            border: `1px solid ${forceDoubleVoteDay ? 'rgba(34,197,94,0.3)' : 'rgba(212,175,55,0.2)'}`,
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <span style={{ color: colors.text.light, fontSize: typography.fontSize.md }}>Total</span>
            {forceDoubleVoteDay && (
              <p style={{ color: colors.status.success, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold }}>
                2x BONUS ACTIVE
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: typography.fontSize.xxxl, fontWeight: typography.fontWeight.bold, color: colors.gold.primary }}>
              {formatCurrency(voteCount)}
            </span>
            {forceDoubleVoteDay && (
              <p style={{ color: colors.status.success, fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold }}>
                = {formatNumber(effectiveVotes)} votes
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Purchase Button - Coming Soon */}
      <Button
        fullWidth
        size="xl"
        icon={DollarSign}
        disabled
        style={{
          opacity: 0.5,
          cursor: 'not-allowed',
          background: 'rgba(212,175,55,0.1)',
          borderColor: 'rgba(212,175,55,0.2)',
        }}
      >
        Purchase Votes - Coming Soon
      </Button>

      {/* Spin animation style */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Modal>
  );
}
