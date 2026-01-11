import React, { useState, useEffect } from 'react';
import { DollarSign, Sparkles, LogIn, Check, Clock, Loader, Share2, Twitter, Facebook, Link2, CheckCircle, CreditCard, X } from 'lucide-react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Modal, Button, Avatar } from '../../../components/ui';
import { colors, spacing, borderRadius, typography, gradients, shadows } from '../../../styles/theme';
import { formatNumber, formatCurrency } from '../../../utils/formatters';
import { VOTE_PRESETS } from '../../../constants';
import { hasUsedFreeVoteToday, submitFreeVote, getTodaysVote, getTimeUntilReset, createVotePaymentIntent, recordPaidVote } from '../../../lib/votes';
import { useToast } from '../../../contexts/ToastContext';
import { getStripe, isStripeConfigured } from '../../../lib/stripe';

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

  // Payment states
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [selectedVoteCount, setSelectedVoteCount] = useState(10);

  const stripeConfigured = isStripeConfigured();

  // Reset states when modal opens/closes or contestant changes
  useEffect(() => {
    if (!isOpen) {
      setShowSuccess(false);
      setLinkCopied(false);
      setShowPaymentForm(false);
      setClientSecret(null);
      setPaymentIntentId(null);
      setSelectedVoteCount(10);
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

  // Handle initiating purchase
  const handleInitiatePurchase = async () => {
    if (!contestant || !competitionId || !selectedVoteCount || isCreatingPayment) {
      return;
    }

    if (!hasActiveRound) {
      toast.error('Voting is not currently active');
      return;
    }

    if (!stripeConfigured) {
      toast.error('Payment system is not configured');
      return;
    }

    setIsCreatingPayment(true);

    try {
      const result = await createVotePaymentIntent({
        competitionId,
        contestantId: contestant.id,
        voteCount: selectedVoteCount,
        voterEmail: user?.email,
      });

      if (result.success && result.clientSecret) {
        setClientSecret(result.clientSecret);
        setPaymentIntentId(result.paymentIntentId);
        setShowPaymentForm(true);
      } else {
        toast.error(result.error || 'Failed to create payment');
      }
    } catch (err) {
      console.error('Error initiating purchase:', err);
      toast.error('An unexpected error occurred');
    }

    setIsCreatingPayment(false);
  };

  // Handle successful payment
  const handlePaymentSuccess = async () => {
    // Record the vote (webhook will also record it, but this gives immediate feedback)
    await recordPaidVote({
      paymentIntentId,
      competitionId,
      contestantId: contestant.id,
      voteCount: selectedVoteCount,
      amountPaid: selectedVoteCount, // $1 per vote
      voterEmail: user?.email,
    });

    setVotesAdded(selectedVoteCount);
    setShowPaymentForm(false);
    setShowSuccess(true);
    onVoteSuccess?.();
  };

  // Handle back from payment form
  const handleBackFromPayment = () => {
    setShowPaymentForm(false);
    setClientSecret(null);
    setPaymentIntentId(null);
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

  // Payment form screen - Compact for mobile
  if (showPaymentForm && clientSecret) {
    const stripePromise = getStripe();

    return (
      <Modal isOpen={isOpen} onClose={handleBackFromPayment} title="" maxWidth="360px" centered hideCloseButton>
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
          {/* Sticky header with avatar, info, total, and X close button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              padding: `${spacing.sm} ${spacing.md}`,
              background: colors.background.card,
              borderBottom: `1px solid ${colors.border.light}`,
              position: 'sticky',
              top: 0,
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: borderRadius.full,
                overflow: 'hidden',
                flexShrink: 0,
                border: `2px solid ${colors.gold.primary}`,
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
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.bold,
                    color: '#0a0a0f',
                  }}
                >
                  {contestant.name?.charAt(0)}
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, margin: 0 }}>
                {selectedVoteCount} Votes for {contestant.name?.split(' ')[0]}
              </p>
            </div>
            <div
              style={{
                background: 'rgba(212,175,55,0.15)',
                borderRadius: borderRadius.md,
                padding: `2px ${spacing.sm}`,
                border: `1px solid rgba(212,175,55,0.25)`,
              }}
            >
              <span style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold, color: colors.gold.primary }}>
                {formatCurrency(selectedVoteCount)}
              </span>
            </div>
            {/* X close button */}
            <button
              onClick={handleBackFromPayment}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: borderRadius.full,
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                marginLeft: spacing.xs,
                flexShrink: 0,
              }}
            >
              <X size={16} style={{ color: colors.text.secondary }} />
            </button>
          </div>

          {/* Scrollable Stripe Elements container */}
          <div style={{ flex: 1, overflowY: 'auto', padding: spacing.md }}>
            {stripePromise && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'night',
                    variables: {
                      colorPrimary: '#d4af37',
                      colorBackground: '#18181b',
                      colorText: '#ffffff',
                      colorDanger: '#ef4444',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      borderRadius: '8px',
                      spacingUnit: '3px',
                    },
                  },
                }}
              >
                <PaymentCheckoutForm
                  onSuccess={handlePaymentSuccess}
                  onCancel={handleBackFromPayment}
                  amount={selectedVoteCount}
                  contestantName={contestant.name}
                />
              </Elements>
            )}
          </div>
        </div>
      </Modal>
    );
  }

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

  const effectiveVotes = forceDoubleVoteDay ? voteCount * 2 : voteCount;
  const freeVoteValue = forceDoubleVoteDay ? 2 : 1;
  const alreadyVotedForThis = votedContestantId === contestant.id;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cast Your Vote" maxWidth="360px" centered>
      {/* Double Vote Day Banner - Compact */}
      {forceDoubleVoteDay && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(251,191,36,0.1))',
            border: `1px solid rgba(212,175,55,0.4)`,
            borderRadius: borderRadius.md,
            padding: `${spacing.sm} ${spacing.md}`,
            marginBottom: spacing.md,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
          }}
        >
          <Sparkles size={16} style={{ color: colors.gold.primary, flexShrink: 0 }} />
          <div>
            <p style={{ color: colors.gold.primary, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.sm }}>
              DOUBLE VOTE DAY - All votes count 2x!
            </p>
          </div>
        </div>
      )}

      {/* Already voted banner - only show for authenticated users */}
      {isAuthenticated && freeVoteUsed && alreadyVotedForThis && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
            border: `1px solid rgba(34,197,94,0.3)`,
            borderRadius: borderRadius.md,
            padding: `${spacing.sm} ${spacing.md}`,
            marginBottom: spacing.md,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <Check size={16} style={{ color: colors.status.success, flexShrink: 0 }} />
          <p style={{ color: colors.status.success, fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.xs }}>
            You voted for {contestant.name} today!
          </p>
        </div>
      )}

      {/* Contestant Preview - Compact */}
      <div style={{ textAlign: 'center', marginBottom: spacing.lg }}>
        <Avatar name={contestant.name} src={contestant.avatarUrl || contestant.avatar_url} size={64} style={{ margin: '0 auto 8px' }} />
        <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginBottom: '2px' }}>
          {contestant.name}
        </h3>
        <p style={{ color: colors.gold.primary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>
          {formatNumber(contestant.votes || 0)} votes
        </p>
      </div>

      {/* Free Vote Section - Compact */}
      <div style={{ marginBottom: spacing.md }}>
        {!isAuthenticated ? (
          <>
            <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.xs, marginBottom: spacing.sm, textAlign: 'center' }}>
              Sign in for a <span style={{ color: colors.status.success, fontWeight: typography.fontWeight.semibold }}>free daily vote</span>
              {forceDoubleVoteDay && <span style={{ color: colors.status.success }}> (2x!)</span>}
            </p>
            <Button
              variant="approve"
              fullWidth
              size="lg"
              onClick={onLogin}
              style={{
                background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.1))',
                borderColor: 'rgba(34,197,94,0.4)',
                color: colors.status.success,
                padding: `${spacing.sm} ${spacing.md}`,
              }}
            >
              <LogIn size={16} />
              Sign In for Free Vote
            </Button>
          </>
        ) : (
          <>
            <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.xs, marginBottom: spacing.sm, textAlign: 'center' }}>
              {!hasActiveRound ? (
                <>
                  <Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  Voting is not currently active
                </>
              ) : freeVoteUsed ? (
                <>
                  <Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  Free vote resets in {getTimeUntilReset()}
                </>
              ) : (
                <>
                  Use your <span style={{ color: colors.status.success, fontWeight: typography.fontWeight.semibold }}>free daily vote</span>
                  {forceDoubleVoteDay && <span style={{ color: colors.status.success }}> (2x!)</span>}
                </>
              )}
            </p>

            <Button
              variant="approve"
              fullWidth
              size="lg"
              onClick={handleFreeVote}
              disabled={!hasActiveRound || freeVoteUsed || isSubmitting || checkingVoteStatus}
              style={{
                background: (!hasActiveRound || freeVoteUsed)
                  ? 'rgba(255,255,255,0.05)'
                  : 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.1))',
                borderColor: (!hasActiveRound || freeVoteUsed) ? 'rgba(255,255,255,0.1)' : 'rgba(34,197,94,0.4)',
                color: (!hasActiveRound || freeVoteUsed) ? colors.text.muted : colors.status.success,
                cursor: (!hasActiveRound || freeVoteUsed) ? 'not-allowed' : 'pointer',
                padding: `${spacing.sm} ${spacing.md}`,
              }}
            >
              {checkingVoteStatus ? (
                <>
                  <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Checking...
                </>
              ) : !hasActiveRound ? (
                <>
                  <Clock size={16} />
                  Voting Not Active
                </>
              ) : isSubmitting ? (
                <>
                  <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Submitting...
                </>
              ) : freeVoteUsed ? (
                <>
                  <Check size={16} />
                  Free Vote Used Today
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Use Free Daily Vote (+{freeVoteValue})
                </>
              )}
            </Button>
          </>
        )}
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
        <span style={{ color: colors.text.muted, fontSize: typography.fontSize.xs }}>or buy votes</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
      </div>

      {/* Vote Count Selector - Compact */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md }}>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: spacing.sm }}>
          {VOTE_PRESETS.map((num) => (
            <button
              key={num}
              onClick={() => setSelectedVoteCount(num)}
              disabled={!stripeConfigured || !hasActiveRound}
              style={{
                padding: '8px 12px',
                borderRadius: borderRadius.md,
                border: 'none',
                background: selectedVoteCount === num ? colors.gold.primary : 'rgba(255,255,255,0.05)',
                color: selectedVoteCount === num ? '#0a0a0f' : colors.text.secondary,
                fontWeight: typography.fontWeight.semibold,
                fontSize: typography.fontSize.base,
                cursor: (!stripeConfigured || !hasActiveRound) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: (!stripeConfigured || !hasActiveRound) ? 0.5 : 1,
                minWidth: '44px',
              }}
            >
              {num}
            </button>
          ))}
        </div>

        {/* Total Display - Compact */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: `${spacing.sm} ${spacing.md}`,
            background: forceDoubleVoteDay ? 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(34,197,94,0.1))' : 'rgba(212,175,55,0.15)',
            borderRadius: borderRadius.md,
            border: `1px solid ${forceDoubleVoteDay ? 'rgba(34,197,94,0.3)' : 'rgba(212,175,55,0.2)'}`,
          }}
        >
          <span style={{ color: colors.text.light, fontSize: typography.fontSize.sm }}>
            Total{forceDoubleVoteDay && <span style={{ color: colors.status.success, marginLeft: '4px' }}>(2x)</span>}
          </span>
          <span style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.gold.primary }}>
            {formatCurrency(selectedVoteCount)}
            {forceDoubleVoteDay && (
              <span style={{ color: colors.status.success, fontSize: typography.fontSize.xs, marginLeft: '4px' }}>
                = {formatNumber(selectedVoteCount * 2)}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Purchase Button - Compact */}
      <Button
        fullWidth
        size="lg"
        icon={isCreatingPayment ? Loader : CreditCard}
        onClick={handleInitiatePurchase}
        disabled={!stripeConfigured || !hasActiveRound || isCreatingPayment}
        style={{
          background: (!stripeConfigured || !hasActiveRound) ? 'rgba(212,175,55,0.1)' : gradients.gold,
          borderColor: 'rgba(212,175,55,0.3)',
          color: (!stripeConfigured || !hasActiveRound) ? colors.text.muted : '#0a0a0f',
          cursor: (!stripeConfigured || !hasActiveRound) ? 'not-allowed' : 'pointer',
          opacity: (!stripeConfigured || !hasActiveRound) ? 0.5 : 1,
          padding: `${spacing.sm} ${spacing.md}`,
        }}
      >
        {isCreatingPayment ? (
          <>
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
            Processing...
          </>
        ) : !stripeConfigured ? (
          'Payment Not Configured'
        ) : !hasActiveRound ? (
          'Voting Not Active'
        ) : (
          `Buy ${selectedVoteCount} Votes - ${formatCurrency(selectedVoteCount)}`
        )}
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

/**
 * Payment checkout form using Stripe Elements
 */
function PaymentCheckoutForm({ onSuccess, onCancel, amount, contestantName }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href, // Fallback, but we handle redirect: 'if_required'
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess();
      } else if (paymentIntent && paymentIntent.status === 'processing') {
        // Payment is processing, show appropriate message
        setErrorMessage('Payment is processing. Please wait...');
      } else {
        setErrorMessage('Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setErrorMessage('An unexpected error occurred.');
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />

      {errorMessage && (
        <div
          style={{
            marginTop: spacing.md,
            padding: spacing.md,
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: borderRadius.md,
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            fontSize: typography.fontSize.sm,
          }}
        >
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        style={{
          width: '100%',
          marginTop: spacing.md,
          padding: spacing.sm,
          background: isProcessing ? 'rgba(212,175,55,0.5)' : gradients.gold,
          border: 'none',
          borderRadius: borderRadius.md,
          color: '#0a0a0f',
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.semibold,
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xs,
        }}
      >
        {isProcessing ? (
          <>
            <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
            Processing...
          </>
        ) : (
          <>
            <CreditCard size={16} />
            Pay {formatCurrency(amount)}
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onCancel}
        disabled={isProcessing}
        style={{
          width: '100%',
          marginTop: spacing.sm,
          padding: spacing.sm,
          background: 'transparent',
          border: `1px solid ${colors.border.light}`,
          borderRadius: borderRadius.md,
          color: colors.text.secondary,
          fontSize: typography.fontSize.sm,
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          opacity: isProcessing ? 0.5 : 1,
        }}
      >
        Cancel
      </button>

      <p
        style={{
          marginTop: spacing.sm,
          textAlign: 'center',
          fontSize: '10px',
          color: colors.text.muted,
        }}
      >
        Secure payment by Stripe
      </p>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </form>
  );
}
