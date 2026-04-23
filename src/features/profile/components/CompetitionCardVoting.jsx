import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Loader, Check, Mail, TrendingUp, ArrowRight } from 'lucide-react';
import { colors, spacing, borderRadius, typography, gradients } from '../../../styles/theme';
import { useSupabaseAuth, useLeaderboard } from '../../../hooks';
import { useToast } from '../../../contexts/ToastContext';
import {
  hasUsedFreeVoteToday,
  submitFreeVote,
  submitAnonymousVote,
  createVotePaymentIntent,
  becomeFanAnonymous,
} from '../../../lib/votes';
import { calculateVotePrice } from '../../../types/competition';
import { getStripe, isStripeConfigured } from '../../../lib/stripe';
import VoteModal from '../../public-site/components/VoteModal';

const VOTE_PRESETS = [25, 100, 250];
const DEFAULT_PRESET = 100;

// Show cents when a bundled total is fractional ($9.90) but keep round
// totals tidy ($10).
const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const formatPrice = (amount) => priceFormatter.format(amount);

// Match the rest of the money on the card: "$21" for round, "$21.25" otherwise.
const totalFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * CompetitionCardVoting
 *
 * Inline voting panel rendered on a contestant's public profile. Paid
 * purchase is the primary CTA (three large tile presets + custom amount
 * + rank projection). Free daily vote is demoted to a small link at the
 * bottom.
 *
 * - Logged-in free vote: single click, uses submitFreeVote directly.
 * - Logged-out free vote: click expands an inline email+name form,
 *   routed through /api/cast-anonymous-vote (bot + rate-limit protected).
 * - Any paid vote CTA opens the existing VoteModal preloaded with the
 *   selected vote count, which handles Stripe checkout.
 * - In preview mode (host previewing voting phase), mutations are
 *   short-circuited with a "no vote was cast" toast.
 */
export default function CompetitionCardVoting({
  contestant,
  competition,
  currentRound,
  isPreview = false,
  // Optional — when the parent card already pulls the leaderboard for its
  // stats row, it can pass the same snapshot in so we don't double-fetch.
  leaderboard: leaderboardProp,
}) {
  const { user } = useSupabaseAuth();
  const toast = useToast();
  const competitionId = competition?.id;
  const contestantId = contestant?.id;
  const contestantName = contestant?.name || 'this contestant';
  const firstName = contestantName.split(' ')[0];
  const pricePerVote = Number(competition?.price_per_vote) || 1;
  const useBundler = !!competition?.use_price_bundler;

  const [selectedCount, setSelectedCount] = useState(DEFAULT_PRESET);
  const [busy, setBusy] = useState(false);
  const [castSuccess, setCastSuccess] = useState(false);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [showFreeForm, setShowFreeForm] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  // Pre-created PaymentIntent kicked off in the Send click handler so the
  // edge-function round-trip runs in parallel with the modal mounting.
  const [preloadedCheckout, setPreloadedCheckout] = useState({
    clientSecret: null,
    paymentIntentId: null,
    voteCount: null,
  });
  const checkoutRequestRef = useRef(0);

  // Logged-out form state
  const [email, setEmail] = useState('');
  const [firstFormName, setFirstFormName] = useState('');
  const [lastFormName, setLastFormName] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [error, setError] = useState('');
  const mountedAtRef = useRef(Date.now());

  // Anonymous fan flow — post-vote opt-in
  const [visitorId, setVisitorId] = useState(null);
  const [fanStatus, setFanStatus] = useState('idle'); // 'idle' | 'loading' | 'done'

  // Pull the current leaderboard snapshot so we can project what rank this
  // contestant would sit at after the purchase lands. If the parent passed
  // one in (parent card's stats row uses the same data), skip the fetch.
  // realtime:false — the projection is advisory, doesn't need live updates.
  const internalLeaderboard = useLeaderboard(
    leaderboardProp ? null : competitionId,
    { realtime: false },
  );
  const leaderboard = leaderboardProp || internalLeaderboard.contestants;

  useEffect(() => {
    if (!user?.id || !competitionId) return;
    let cancelled = false;
    hasUsedFreeVoteToday(user.id, competitionId).then((used) => {
      if (!cancelled) setAlreadyVoted(!!used);
    });
    return () => { cancelled = true; };
  }, [user?.id, competitionId]);

  // Warm Stripe.js in the background so the checkout modal feels instant
  // when the user hits Send. loadStripe is singletoned — repeat calls are
  // cheap and don't trigger another network request.
  useEffect(() => {
    if (isStripeConfigured()) {
      getStripe();
    }
  }, []);

  const roundForModal = useMemo(() => {
    if (!currentRound) return null;
    return { ...currentRound, isActive: true };
  }, [currentRound]);

  const stopPropagation = (e) => { e.stopPropagation(); };

  // Current + projected rank for the "Moves X up N spots" preview.
  const rankProjection = useMemo(() => {
    const addedVotes = Number(selectedCount) || 0;
    if (!leaderboard?.length || !contestantId || addedVotes < 1) return null;

    // Current rank: sort by votes desc, find this contestant's slot.
    const byVotes = [...leaderboard].sort(
      (a, b) => (b.votes || 0) - (a.votes || 0)
    );
    const currentIndex = byVotes.findIndex((c) => c.id === contestantId);
    if (currentIndex === -1) return null;

    // Projected rank: same sort, but with addedVotes applied to this
    // contestant only.
    const projected = leaderboard.map((c) =>
      c.id === contestantId
        ? { ...c, votes: (c.votes || 0) + addedVotes }
        : c
    );
    const sorted = projected.sort((a, b) => (b.votes || 0) - (a.votes || 0));
    const projectedIndex = sorted.findIndex((c) => c.id === contestantId);

    return {
      current: currentIndex + 1,
      projected: projectedIndex + 1,
      delta: currentIndex - projectedIndex,
    };
  }, [leaderboard, contestantId, selectedCount]);

  const handleTileClick = (count) => (e) => {
    e.stopPropagation();
    setSelectedCount(count);
  };

  const openBuyVotes = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (isPreview) {
      toast?.info?.('Preview mode — no payment was initiated.');
      return;
    }
    const voteCount = Number(selectedCount);
    if (!voteCount || voteCount < 1) return;

    // Open the modal immediately (user sees progress instantly) and fire
    // the PaymentIntent creation in parallel. When it resolves we push
    // clientSecret into the modal via a prop, skipping the modal's own
    // round-trip.
    const requestId = ++checkoutRequestRef.current;
    setPreloadedCheckout({ clientSecret: null, paymentIntentId: null, voteCount });
    setShowVoteModal(true);

    const result = await createVotePaymentIntent({
      competitionId,
      contestantId,
      voteCount,
      voterEmail: user?.email,
    });

    // If the modal was closed (or another Send was clicked) while this
    // request was in flight, abandon the result.
    if (requestId !== checkoutRequestRef.current) return;

    if (result.success && result.clientSecret) {
      setPreloadedCheckout({
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId,
        voteCount,
      });
    } else {
      setShowVoteModal(false);
      setPreloadedCheckout({ clientSecret: null, paymentIntentId: null, voteCount: null });
      toast?.error?.(result.error || 'Could not start checkout.');
    }
  };

  const handleVoteModalClose = () => {
    checkoutRequestRef.current += 1;
    setPreloadedCheckout({ clientSecret: null, paymentIntentId: null, voteCount: null });
    setShowVoteModal(false);
  };

  const handleFreeClick = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (user?.id) {
      handleAuthenticatedVote();
    } else {
      setShowFreeForm((prev) => !prev);
    }
  };

  const handleAuthenticatedVote = async () => {
    if (busy || alreadyVoted || !contestantId || !competitionId) return;

    if (isPreview) {
      setCastSuccess(true);
      setAlreadyVoted(true);
      toast?.info?.('Preview mode — no vote was cast.');
      return;
    }

    setBusy(true);
    setError('');
    const result = await submitFreeVote({
      userId: user.id,
      voterEmail: user.email,
      competitionId,
      contestantId,
    });
    setBusy(false);

    if (result?.success) {
      setCastSuccess(true);
      setAlreadyVoted(true);
      toast?.success?.(`Vote cast for ${contestantName}!`);
    } else {
      setError(result?.error || 'Could not cast your vote.');
    }
  };

  const handleAnonymousVote = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (busy || !contestantId || !competitionId) return;

    if (isPreview) {
      setCastSuccess(true);
      toast?.info?.('Preview mode — no vote was cast.');
      return;
    }

    setBusy(true);
    setError('');
    const result = await submitAnonymousVote({
      email,
      firstName: firstFormName,
      lastName: lastFormName,
      competitionId,
      contestantId,
      mountedAt: mountedAtRef.current,
      company,
    });
    setBusy(false);

    if (result?.success) {
      setCastSuccess(true);
      setVisitorId(result.visitorId || null);
      toast?.success?.(`Vote cast for ${contestantName}!`);
    } else {
      setError(result?.error || 'Could not cast your vote.');
    }
  };

  const handleBecomeFan = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!visitorId || !contestantId || fanStatus === 'loading') return;

    setFanStatus('loading');
    const result = await becomeFanAnonymous({ visitorId, contestantId });

    if (result?.success) {
      setFanStatus('done');
      toast?.success?.(`You're now a fan of ${firstName}! We'll send weekly updates.`);
    } else {
      setFanStatus('idle');
      toast?.error?.(result?.error || 'Could not become a fan.');
    }
  };

  const total = calculateVotePrice(selectedCount || 0, useBundler, pricePerVote);
  const canSend = Number(selectedCount) >= 1 && !busy;

  return (
    <>
      <div
        onClick={stopPropagation}
        style={{
          marginTop: spacing.sm,
          padding: spacing.md,
          background: 'rgba(212,175,55,0.04)',
          border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: borderRadius.lg,
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.md,
        }}
      >
        <h4 style={{
          margin: 0,
          fontSize: typography.fontSize.base,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.primary,
          letterSpacing: typography.letterSpacing.tight,
        }}>
          {isPreview
            ? 'Preview — voting will be live here'
            : `Send votes to ${firstName}`}
        </h4>

        {castSuccess && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.sm,
            padding: spacing.sm,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              color: colors.status.success,
              fontSize: typography.fontSize.sm,
            }}>
              <Check size={16} />
              <span>
                Vote cast! {user?.id && 'Come back tomorrow for another free vote.'}
              </span>
            </div>

            {/* Anonymous voter: prompt to become a fan */}
            {!user?.id && visitorId && fanStatus !== 'done' && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: spacing.xs,
                padding: spacing.sm,
                background: 'rgba(212,175,55,0.08)',
                borderRadius: borderRadius.md,
                marginTop: spacing.xs,
              }}>
                <p style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                  margin: 0,
                }}>
                  Follow {firstName}'s journey?
                </p>
                <button
                  onClick={handleBecomeFan}
                  disabled={fanStatus === 'loading'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: spacing.xs,
                    padding: `${spacing.xs} ${spacing.md}`,
                    background: fanStatus === 'loading' ? 'rgba(212,175,55,0.3)' : gradients.gold,
                    border: 'none',
                    borderRadius: borderRadius.md,
                    color: '#0a0a0c',
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.semibold,
                    cursor: fanStatus === 'loading' ? 'not-allowed' : 'pointer',
                  }}
                >
                  {fanStatus === 'loading' ? (
                    <>
                      <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Heart size={14} />
                      Become a Fan
                    </>
                  )}
                </button>
                <p style={{
                  fontSize: typography.fontSize.xs,
                  color: colors.text.muted,
                  margin: 0,
                }}>
                  Get weekly updates on their progress
                </p>
              </div>
            )}

            {/* Fan confirmation */}
            {fanStatus === 'done' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                padding: spacing.sm,
                background: 'rgba(34,197,94,0.1)',
                borderRadius: borderRadius.md,
                color: colors.status.success,
                fontSize: typography.fontSize.sm,
              }}>
                <Heart size={14} fill={colors.status.success} />
                <span>You're a fan! We'll send weekly updates.</span>
              </div>
            )}
          </div>
        )}

        {/* Paid vote UI — always visible so voters can still buy votes
            after using their free daily vote. */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.sm,
        }}>
          {VOTE_PRESETS.map((count) => (
            <PresetTile
              key={count}
              count={count}
              pricePerVote={pricePerVote}
              useBundler={useBundler}
              active={Number(selectedCount) === count}
              onClick={handleTileClick(count)}
            />
          ))}
        </div>

        {/* Custom amount */}
        <div style={{
          padding: `${spacing.sm} ${spacing.md}`,
          background: 'rgba(0,0,0,0.25)',
          border: `1px solid ${colors.border.primary}`,
          borderRadius: borderRadius.md,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
        }}>
          <span style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.muted,
            whiteSpace: 'nowrap',
          }}>
            Or enter custom amount
          </span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max="1000"
            value={selectedCount}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                setSelectedCount('');
                return;
              }
              const n = Math.max(1, Math.min(1000, parseInt(raw, 10) || 0));
              setSelectedCount(n);
            }}
            onBlur={(e) => {
              if (!e.target.value || Number(e.target.value) < 1) {
                setSelectedCount(DEFAULT_PRESET);
              }
            }}
            style={{
              flex: 1,
              minWidth: 0,
              padding: `${spacing.xs} 0`,
              background: 'transparent',
              border: 'none',
              color: colors.text.primary,
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.semibold,
              textAlign: 'right',
              outline: 'none',
            }}
          />
          <span style={{
            fontSize: typography.fontSize.xs,
            color: colors.text.muted,
          }}>
            votes
          </span>
        </div>

        {/* Rank projection */}
        {rankProjection && rankProjection.delta > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${spacing.sm} ${spacing.md}`,
            background: 'rgba(212,175,55,0.05)',
            border: `1px solid rgba(212,175,55,0.2)`,
            borderRadius: borderRadius.md,
            fontSize: typography.fontSize.sm,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, color: colors.text.secondary }}>
              <TrendingUp size={14} style={{ color: colors.gold.primary }} />
              <span>
                Moves {firstName}{' '}
                <strong style={{ color: colors.text.primary }}>
                  up {rankProjection.delta} {rankProjection.delta === 1 ? 'spot' : 'spots'}
                </strong>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, color: colors.text.muted }}>
              <span>#{rankProjection.current}</span>
              <ArrowRight size={12} />
              <strong style={{ color: colors.gold.primary }}>#{rankProjection.projected}</strong>
            </div>
          </div>
        )}

        {/* Primary CTA */}
        <button
          type="button"
          onClick={openBuyVotes}
          disabled={!canSend}
          style={{
            padding: `${spacing.md} ${spacing.md}`,
            background: canSend ? gradients.gold : 'rgba(212,175,55,0.2)',
            color: '#0a0a0f',
            border: 'none',
            borderRadius: borderRadius.md,
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.bold,
            cursor: canSend ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            opacity: canSend ? 1 : 0.6,
          }}
        >
          Send {selectedCount || 0} {Number(selectedCount) === 1 ? 'vote' : 'votes'} — {formatPrice(total)}
        </button>

        {/* Free-vote path — hide once the free vote has been successfully
            cast so the success banner above is the only confirmation. */}
        {!castSuccess && (
          <>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              color: colors.text.muted,
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.semibold,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              <div style={{ flex: 1, height: '1px', background: colors.border.primary }} />
              <span>or</span>
              <div style={{ flex: 1, height: '1px', background: colors.border.primary }} />
            </div>

            <FreeVoteButton
              user={user}
              alreadyVoted={alreadyVoted}
              busy={busy}
              showFreeForm={showFreeForm}
              onClick={handleFreeClick}
            />

            {!user?.id && showFreeForm && (
              <AnonForm
                email={email}
                setEmail={setEmail}
                firstName={firstFormName}
                setFirstName={setFirstFormName}
                lastName={lastFormName}
                setLastName={setLastFormName}
                company={company}
                setCompany={setCompany}
                busy={busy}
                onSubmit={handleAnonymousVote}
              />
            )}
          </>
        )}

        {error && (
          <p style={{
            fontSize: typography.fontSize.xs,
            color: colors.status.error,
          }}>
            {error}
          </p>
        )}
      </div>

      {roundForModal && (
        <VoteModal
          isOpen={showVoteModal}
          onClose={handleVoteModalClose}
          contestant={{
            id: contestantId,
            name: contestant?.name,
            avatar_url: contestant?.avatarUrl || contestant?.avatar_url,
            votes: contestant?.votes,
          }}
          competitionId={competitionId}
          user={user}
          isAuthenticated={!!user?.id}
          onVoteSuccess={() => {
            handleVoteModalClose();
            toast?.success?.('Votes purchased!');
          }}
          currentRound={roundForModal}
          initialVoteCount={Number(selectedCount) || 1}
          autoCheckout
          votePrice={competition?.price_per_vote}
          useBundler={competition?.use_price_bundler}
          externalCheckout
          preloadedClientSecret={preloadedCheckout.clientSecret}
          preloadedPaymentIntentId={preloadedCheckout.paymentIntentId}
        />
      )}
    </>
  );
}

function PresetTile({ count, pricePerVote, useBundler, active, onClick }) {
  const total = calculateVotePrice(count, useBundler, pricePerVote);
  const save = Math.max(0, count * pricePerVote - total);
  // Only surface the savings when the delta is meaningful — hides the
  // noisy "save $4" on the 25-vote tile and keeps attention on the big
  // discounts (100 votes = save $30, 250 votes = save $125).
  const showSave = save >= 10;

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={onClick}
        style={{
          width: '100%',
          padding: spacing.md,
          background: active ? 'rgba(212,175,55,0.12)' : 'rgba(0,0,0,0.25)',
          border: `1px solid ${active ? colors.gold.primary : colors.border.primary}`,
          borderRadius: borderRadius.md,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing.xs }}>
          <span style={{
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            lineHeight: 1,
          }}>
            {count}
          </span>
          <span style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.muted,
          }}>
            votes
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <span style={{
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.bold,
            color: active ? colors.gold.primary : colors.text.primary,
            lineHeight: 1,
          }}>
            {totalFormatter.format(total)}
          </span>
          {showSave && (
            <span style={{
              fontSize: typography.fontSize.xs,
              color: colors.status.success,
              fontWeight: typography.fontWeight.semibold,
            }}>
              save {totalFormatter.format(save)}
            </span>
          )}
        </div>
      </button>
    </div>
  );
}

function FreeVoteButton({ user, alreadyVoted, busy, showFreeForm, onClick }) {
  const used = user?.id && alreadyVoted;

  const content = (() => {
    if (busy) return <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />;
    if (used) return (<><Check size={14} /> Free daily vote used</>);
    return (<><Check size={14} /> Use your 1 free daily vote</>);
  })();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || used}
      aria-expanded={showFreeForm}
      style={{
        width: '100%',
        padding: `${spacing.sm} ${spacing.md}`,
        background: 'transparent',
        border: `1px solid ${used ? colors.border.primary : 'rgba(212,175,55,0.35)'}`,
        borderRadius: borderRadius.md,
        color: used ? colors.text.muted : colors.gold.primary,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        cursor: busy || used ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
      }}
    >
      {content}
    </button>
  );
}

function AnonForm({
  email, setEmail,
  firstName, setFirstName,
  lastName, setLastName,
  company, setCompany,
  busy,
  onSubmit,
}) {
  const inputStyle = {
    flex: 1,
    minWidth: 0,
    padding: `${spacing.xs} ${spacing.sm}`,
    background: 'rgba(0,0,0,0.35)',
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.sm,
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
  };

  const canSubmit =
    !busy &&
    email.trim().length > 3 &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0;

  return (
    <form
      onSubmit={onSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}
    >
      {/* Honeypot */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', opacity: 0 }}
        aria-hidden="true"
      />

      <div style={{ display: 'flex', gap: spacing.xs }}>
        <input
          type="text"
          placeholder="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          maxLength={60}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Last name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
          maxLength={60}
          style={inputStyle}
        />
      </div>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Mail size={14} style={{
          position: 'absolute',
          left: spacing.sm,
          color: colors.text.muted,
          pointerEvents: 'none',
        }} />
        <input
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={254}
          style={{ ...inputStyle, paddingLeft: '30px' }}
        />
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        style={{
          padding: `${spacing.sm} ${spacing.md}`,
          background: canSubmit ? gradients.gold : 'rgba(255,255,255,0.05)',
          color: canSubmit ? '#0a0a0f' : colors.text.muted,
          border: 'none',
          borderRadius: borderRadius.md,
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.semibold,
          cursor: canSubmit ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xs,
        }}
      >
        {busy ? (
          <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <>
            <Heart size={14} /> Submit free vote
          </>
        )}
      </button>

      <p style={{
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        lineHeight: 1.4,
      }}>
        We&rsquo;ll email you a link to log in later so you can see your vote history.
      </p>
    </form>
  );
}
