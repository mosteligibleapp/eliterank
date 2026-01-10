import React, { useState, useEffect } from 'react';
import { DollarSign, Sparkles, LogIn, Check, Clock, Loader, Share2, Twitter, Facebook, Link2, CheckCircle } from 'lucide-react';
import { Modal, Button, Avatar } from '../../../components/ui';
import { colors, spacing, borderRadius, typography, gradients, shadows } from '../../../styles/theme';
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
  currentRound,
}) {
  const userId = user?.id;
  const toast = useToast();
  const hasActiveRound = currentRound?.isActive;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [freeVoteUsed, setFreeVoteUsed] = useState(false);
  const [votedContestantId, setVotedContestantId] = useState(null);
  const [checkingVoteStatus, setCheckingVoteStatus] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [votesAdded, setVotesAdded] = useState(1);
  const [linkCopied, setLinkCopied] = useState(false);

  // Reset success state when modal opens/closes or contestant changes
  useEffect(() => {
    if (!isOpen) {
      setShowSuccess(false);
      setLinkCopied(false);
    }
  }, [isOpen]);

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

    // Block voting if no active round
    if (!hasActiveRound) {
      toast.error('Voting is not currently active. Please wait for the next voting round.');
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
        setVotesAdded(result.votesAdded || 1);
        setFreeVoteUsed(true);
        setVotedContestantId(contestant.id);
        setShowSuccess(true);
        onVoteSuccess?.();
      } else {
        toast.error(result.error || 'Failed to submit vote');
      }
    } catch (err) {
      console.error('Error submitting vote:', err);
      toast.error('An unexpected error occurred');
    }

    setIsSubmitting(false);
  };

  if (!contestant) return null;

  // Generate share URL for the contestant
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/competition/${competitionId}?contestant=${contestant.id}` : '';
  const shareText = `I just voted for ${contestant.name} in Most Eligible! Help them win by voting too! 🏆`;

  // Share handlers
  const handleShareTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const handleShareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Native share (shows OS share sheet on mobile - Instagram, TikTok, Snapchat, etc.)
  const canNativeShare = typeof navigator !== 'undefined' && navigator.share;
  const handleNativeShare = async () => {
    if (!canNativeShare) return;
    try {
      await navigator.share({
        title: `Vote for ${contestant.name}`,
        text: shareText,
        url: shareUrl,
      });
    } catch (err) {
      // User cancelled or share failed - that's okay
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
      }
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    onClose();
  };

  // Success confirmation screen
  if (showSuccess) {
    return (
      <Modal isOpen={isOpen} onClose={handleCloseSuccess} title="" maxWidth="380px" centered>
        <div style={{ textAlign: 'center', padding: `${spacing.xl} ${spacing.lg} ${spacing.xxl}` }}>
          {/* Contestant image with success badge */}
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: spacing.lg }}>
            <div
              style={{
                width: '90px',
                height: '90px',
                borderRadius: borderRadius.full,
                overflow: 'hidden',
                border: `3px solid ${colors.gold.primary}`,
                boxShadow: shadows.gold,
              }}
            >
              {contestant.avatar_url || contestant.avatarUrl ? (
                <img
                  src={contestant.avatar_url || contestant.avatarUrl}
                  alt={contestant.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: gradients.gold,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: typography.fontSize.xxxl,
                    fontWeight: typography.fontWeight.bold,
                    color: '#0a0a0f',
                  }}
                >
                  {contestant.name?.charAt(0)}
                </div>
              )}
            </div>
            {/* Success checkmark badge */}
            <div
              style={{
                position: 'absolute',
                bottom: '-4px',
                right: '-4px',
                width: '32px',
                height: '32px',
                borderRadius: borderRadius.full,
                background: colors.status.success,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `3px solid ${colors.background.card}`,
              }}
            >
              <Check size={18} style={{ color: 'white' }} />
            </div>
          </div>

          {/* Success message */}
          <h2
            style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
              marginBottom: spacing.xs,
            }}
          >
            Vote Submitted!
          </h2>
          <p style={{ fontSize: typography.fontSize.md, color: colors.text.secondary, marginBottom: spacing.xl }}>
            You gave <span style={{ color: colors.gold.primary, fontWeight: typography.fontWeight.semibold }}>{contestant.name}</span> {votesAdded} {votesAdded > 1 ? 'votes' : 'vote'}
          </p>

          {/* Share prompt */}
          <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted, marginBottom: spacing.md }}>
            Share to help them win
          </p>

          {/* Share buttons row */}
          <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'center', marginBottom: spacing.xl }}>
            {canNativeShare && (
              <button
                onClick={handleNativeShare}
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: borderRadius.full,
                  background: 'linear-gradient(135deg, #E1306C, #F77737)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Share2 size={22} style={{ color: 'white' }} />
              </button>
            )}
            <button
              onClick={handleShareTwitter}
              style={{
                width: '52px',
                height: '52px',
                borderRadius: borderRadius.full,
                background: '#1DA1F2',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Twitter size={22} style={{ color: 'white' }} />
            </button>
            <button
              onClick={handleShareFacebook}
              style={{
                width: '52px',
                height: '52px',
                borderRadius: borderRadius.full,
                background: '#4267B2',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Facebook size={22} style={{ color: 'white' }} />
            </button>
            <button
              onClick={handleCopyLink}
              style={{
                width: '52px',
                height: '52px',
                borderRadius: borderRadius.full,
                background: linkCopied ? colors.status.success : 'rgba(255,255,255,0.1)',
                border: `1px solid ${linkCopied ? colors.status.success : colors.border.light}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {linkCopied ? <Check size={22} style={{ color: 'white' }} /> : <Link2 size={22} style={{ color: colors.text.secondary }} />}
            </button>
          </div>

          {linkCopied && (
            <p style={{ color: colors.status.success, fontSize: typography.fontSize.sm, marginBottom: spacing.md }}>
              Link copied!
            </p>
          )}

          {/* Done button */}
          <button
            onClick={handleCloseSuccess}
            style={{
              width: '100%',
              padding: spacing.md,
              background: 'transparent',
              border: `1px solid ${colors.border.light}`,
              borderRadius: borderRadius.lg,
              color: colors.text.secondary,
              fontSize: typography.fontSize.md,
              fontWeight: typography.fontWeight.medium,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </Modal>
    );
  }

  // If not authenticated, show login prompt (styled to match LoginPage)
  if (!isAuthenticated) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="420px" centered>
        <div style={{ textAlign: 'center', padding: `${spacing.lg} ${spacing.xl} ${spacing.xxl}` }}>
          {/* Contestant Profile Image */}
          <div
            style={{
              width: '100px',
              height: '100px',
              borderRadius: borderRadius.full,
              overflow: 'hidden',
              margin: '0 auto',
              marginBottom: spacing.lg,
              border: `3px solid ${colors.gold.primary}`,
              boxShadow: shadows.goldLarge,
            }}
          >
            {contestant.avatar_url || contestant.avatarUrl ? (
              <img
                src={contestant.avatar_url || contestant.avatarUrl}
                alt={contestant.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: gradients.gold,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: typography.fontSize.hero,
                  fontWeight: typography.fontWeight.bold,
                  color: '#0a0a0f',
                }}
              >
                {contestant.name?.charAt(0)}
              </div>
            )}
          </div>

          {/* Title */}
          <h2
            style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              marginBottom: spacing.sm,
            }}
          >
            Vote for {contestant.name?.split(' ')[0]}
          </h2>

          <p style={{ fontSize: typography.fontSize.md, color: colors.text.secondary, marginBottom: spacing.xl }}>
            Sign in to cast your vote
          </p>

          <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm, marginBottom: spacing.xxl, lineHeight: 1.6 }}>
            Create an account or sign in to vote for{' '}
            <span style={{ color: colors.gold.primary, fontWeight: typography.fontWeight.semibold }}>
              {contestant.name}
            </span>{' '}
            and support your favorite contestant!
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            {/* Primary Button - matches LoginPage gold gradient */}
            <button
              onClick={onLogin}
              style={{
                width: '100%',
                padding: spacing.lg,
                background: gradients.gold,
                border: 'none',
                borderRadius: borderRadius.lg,
                color: '#0a0a0f',
                fontSize: typography.fontSize.md,
                fontWeight: typography.fontWeight.semibold,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.sm,
                boxShadow: shadows.gold,
                transition: 'all 0.2s ease',
              }}
            >
              <LogIn size={18} />
              Sign In to Vote
            </button>

            {/* Cancel Button */}
            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: spacing.md,
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.lg,
                color: colors.text.secondary,
                fontSize: typography.fontSize.md,
                fontWeight: typography.fontWeight.medium,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  const effectiveVotes = forceDoubleVoteDay ? voteCount * 2 : voteCount;
  const freeVoteValue = forceDoubleVoteDay ? 2 : 1;
  const alreadyVotedForThis = votedContestantId === contestant.id;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cast Your Vote" maxWidth="450px" centered>
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
          {!hasActiveRound ? (
            <>
              <Clock size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: spacing.xs }} />
              Voting is not currently active
            </>
          ) : freeVoteUsed ? (
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
          disabled={!hasActiveRound || freeVoteUsed || isSubmitting || checkingVoteStatus}
          style={{
            background: (!hasActiveRound || freeVoteUsed)
              ? 'rgba(255,255,255,0.05)'
              : 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.1))',
            borderColor: (!hasActiveRound || freeVoteUsed) ? 'rgba(255,255,255,0.1)' : 'rgba(34,197,94,0.4)',
            color: (!hasActiveRound || freeVoteUsed) ? colors.text.muted : colors.status.success,
            cursor: (!hasActiveRound || freeVoteUsed) ? 'not-allowed' : 'pointer',
          }}
        >
          {checkingVoteStatus ? (
            <>
              <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
              Checking...
            </>
          ) : !hasActiveRound ? (
            <>
              <Clock size={18} />
              Voting Not Active
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
