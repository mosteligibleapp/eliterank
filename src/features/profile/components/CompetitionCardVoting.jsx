import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Loader, Check, CreditCard, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { colors, spacing, borderRadius, typography, gradients } from '../../../styles/theme';
import { useSupabaseAuth } from '../../../hooks';
import { useToast } from '../../../contexts/ToastContext';
import {
  hasUsedFreeVoteToday,
  submitFreeVote,
  submitAnonymousVote,
} from '../../../lib/votes';
import { calculateVotePrice } from '../../../types/competition';
import VoteModal from '../../public-site/components/VoteModal';

const VOTE_PRESETS = [1, 10, 25, 50, 100];

// Show cents when a bundled total is fractional ($9.90) but keep round
// totals tidy ($10).
const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const formatPrice = (amount) => priceFormatter.format(amount);

/**
 * CompetitionCardVoting
 *
 * Inline voting panel rendered on the contestant's public profile card
 * during an active voting round. Paid votes are the primary CTA (preset
 * chips + "Purchase X Votes"), free daily vote sits below as a secondary
 * action.
 *
 * - Logged-in free vote: one-tap, uses submitFreeVote directly.
 * - Logged-out free vote: expands an inline email + first/last form,
 *   routed through /api/cast-anonymous-vote (bot + rate-limit protected).
 * - Any paid vote click opens the existing VoteModal preloaded with the
 *   selected preset count.
 * - In preview mode (host previewing voting phase), mutations are
 *   short-circuited with a "no vote was cast" toast.
 */
export default function CompetitionCardVoting({
  contestant,
  competition,
  currentRound,
  isPreview = false,
}) {
  const { user } = useSupabaseAuth();
  const toast = useToast();
  const competitionId = competition?.id;
  const contestantId = contestant?.id;
  const pricePerVote = Number(competition?.price_per_vote) || 1;
  const useBundler = !!competition?.use_price_bundler;

  const [selectedCount, setSelectedCount] = useState(10);
  const [busy, setBusy] = useState(false);
  const [castSuccess, setCastSuccess] = useState(false);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [showFreeForm, setShowFreeForm] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);

  // Logged-out form state
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [error, setError] = useState('');
  const mountedAtRef = useRef(Date.now());

  useEffect(() => {
    if (!user?.id || !competitionId) return;
    let cancelled = false;
    hasUsedFreeVoteToday(user.id, competitionId).then((used) => {
      if (!cancelled) setAlreadyVoted(!!used);
    });
    return () => { cancelled = true; };
  }, [user?.id, competitionId]);

  const roundForModal = useMemo(() => {
    if (!currentRound) return null;
    return { ...currentRound, isActive: true };
  }, [currentRound]);

  const stopPropagation = (e) => { e.stopPropagation(); };

  const openBuyVotes = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (isPreview) {
      toast?.info?.('Preview mode — no payment was initiated.');
      return;
    }
    setShowVoteModal(true);
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
      toast?.success?.(`Vote cast for ${contestant?.name || 'this contestant'}!`);
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
      firstName,
      lastName,
      competitionId,
      contestantId,
      mountedAt: mountedAtRef.current,
      company,
    });
    setBusy(false);

    if (result?.success) {
      setCastSuccess(true);
      toast?.success?.('Vote cast! Check your email for a link to log in.');
    } else {
      setError(result?.error || 'Could not cast your vote.');
    }
  };

  const total = calculateVotePrice(selectedCount, useBundler, pricePerVote);

  return (
    <>
      <div
        onClick={stopPropagation}
        style={{
          marginTop: spacing.sm,
          padding: spacing.md,
          background: 'rgba(212,175,55,0.06)',
          border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: borderRadius.md,
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.sm,
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.xs,
          color: colors.gold.primary,
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.semibold,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          <Heart size={12} fill={colors.gold.primary} />
          {isPreview ? 'Preview — voting will be live here' : 'Voting is live'}
        </div>

        {castSuccess ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            color: colors.status.success,
            fontSize: typography.fontSize.sm,
          }}>
            <Check size={16} />
            <span>
              Vote cast! {user?.id
                ? 'Come back tomorrow for another free vote.'
                : 'Check your email for a magic-link to log in.'}
            </span>
          </div>
        ) : (
          <>
            {/* Primary: paid votes — preset chips + custom input + purchase CTA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              <div style={{
                display: 'flex',
                gap: spacing.xs,
                flexWrap: 'wrap',
              }}>
                {VOTE_PRESETS.map((count) => {
                  const active = selectedCount === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCount(count);
                      }}
                      style={{
                        flex: 1,
                        minWidth: '52px',
                        padding: `${spacing.sm} 0`,
                        background: active ? colors.gold.primary : 'rgba(255,255,255,0.04)',
                        color: active ? '#0a0a0f' : colors.text.secondary,
                        border: `1px solid ${active ? colors.gold.primary : colors.border.primary}`,
                        borderRadius: borderRadius.md,
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.semibold,
                        cursor: 'pointer',
                      }}
                    >
                      {count}
                    </button>
                  );
                })}
              </div>

              {/* Custom amount — bulk buyers can type any number. Presets
                  above just prefill this same field. */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                padding: `${spacing.xs} ${spacing.sm}`,
                background: 'rgba(0,0,0,0.25)',
                border: `1px solid ${colors.border.primary}`,
                borderRadius: borderRadius.md,
              }}>
                <span style={{
                  fontSize: typography.fontSize.xs,
                  color: colors.text.muted,
                  whiteSpace: 'nowrap',
                }}>
                  or enter amount
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="100000"
                  value={selectedCount}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setSelectedCount('');
                      return;
                    }
                    const n = Math.max(1, Math.min(100000, parseInt(raw, 10) || 0));
                    setSelectedCount(n);
                  }}
                  onBlur={(e) => {
                    // Snap empty / invalid back to 1 so the CTA stays valid.
                    if (!e.target.value || Number(e.target.value) < 1) {
                      setSelectedCount(1);
                    }
                  }}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: `${spacing.xs} 0`,
                    background: 'transparent',
                    border: 'none',
                    color: colors.text.primary,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.semibold,
                    textAlign: 'right',
                    outline: 'none',
                    MozAppearance: 'textfield',
                  }}
                />
                <span style={{
                  fontSize: typography.fontSize.xs,
                  color: colors.text.muted,
                }}>
                  votes
                </span>
              </div>

              <button
                type="button"
                onClick={openBuyVotes}
                disabled={busy || !selectedCount || selectedCount < 1}
                style={{
                  padding: `${spacing.md} ${spacing.md}`,
                  background: gradients.gold,
                  color: '#0a0a0f',
                  border: 'none',
                  borderRadius: borderRadius.md,
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.semibold,
                  cursor: busy || !selectedCount ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.xs,
                }}
              >
                <CreditCard size={16} />
                Purchase {selectedCount || 0} {selectedCount === 1 ? 'Vote' : 'Votes'} — {formatPrice(total)}
              </button>
            </div>

            {/* Divider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              color: colors.text.muted,
              fontSize: typography.fontSize.xs,
            }}>
              <div style={{ flex: 1, height: '1px', background: colors.border.secondary }} />
              <span>or cast your free daily vote</span>
              <div style={{ flex: 1, height: '1px', background: colors.border.secondary }} />
            </div>

            {/* Secondary: free vote */}
            {user?.id ? (
              <button
                type="button"
                onClick={handleFreeClick}
                disabled={busy || alreadyVoted}
                style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  background: 'transparent',
                  color: alreadyVoted ? colors.text.muted : colors.gold.primary,
                  border: `1px solid ${alreadyVoted ? colors.border.primary : 'rgba(212,175,55,0.4)'}`,
                  borderRadius: borderRadius.md,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  cursor: busy || alreadyVoted ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.xs,
                }}
              >
                {busy ? (
                  <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : alreadyVoted ? (
                  <>
                    <Check size={14} /> Free vote used today
                  </>
                ) : (
                  <>
                    <Heart size={14} /> Cast free vote
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleFreeClick}
                  style={{
                    padding: `${spacing.sm} ${spacing.md}`,
                    background: 'transparent',
                    color: colors.gold.primary,
                    border: `1px solid rgba(212,175,55,0.4)`,
                    borderRadius: borderRadius.md,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: spacing.xs,
                  }}
                >
                  <Heart size={14} /> Cast free vote
                  {showFreeForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showFreeForm && (
                  <AnonForm
                    email={email}
                    setEmail={setEmail}
                    firstName={firstName}
                    setFirstName={setFirstName}
                    lastName={lastName}
                    setLastName={setLastName}
                    company={company}
                    setCompany={setCompany}
                    busy={busy}
                    onSubmit={handleAnonymousVote}
                  />
                )}
              </>
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
          onClose={() => setShowVoteModal(false)}
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
            setShowVoteModal(false);
            toast?.success?.('Votes purchased!');
          }}
          currentRound={roundForModal}
          initialVoteCount={Number(selectedCount) || 1}
          autoCheckout
          votePrice={competition?.price_per_vote}
          useBundler={competition?.use_price_bundler}
        />
      )}
    </>
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
