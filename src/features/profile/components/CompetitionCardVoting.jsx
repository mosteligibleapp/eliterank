import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Loader, Check, Plus, Mail } from 'lucide-react';
import { colors, spacing, borderRadius, typography, gradients } from '../../../styles/theme';
import { useSupabaseAuth } from '../../../hooks';
import { useToast } from '../../../contexts/ToastContext';
import {
  hasUsedFreeVoteToday,
  submitFreeVote,
  submitAnonymousVote,
} from '../../../lib/votes';
import VoteModal from '../../public-site/components/VoteModal';

/**
 * CompetitionCardVoting
 *
 * Inline voting panel rendered inside the contestant's CompetitionCard on
 * their public profile page during an active voting round. Supports:
 *   - Logged-in voters: one-tap free daily vote
 *   - Logged-out voters: email + first/last name form, casts a free vote
 *     through /api/cast-anonymous-vote (bot + rate-limit protected)
 *   - Both: "Buy more votes" button that opens the existing VoteModal
 */
export default function CompetitionCardVoting({
  contestant,
  competition,
  currentRound,
}) {
  const { user } = useSupabaseAuth();
  const toast = useToast();
  const competitionId = competition?.id;
  const contestantId = contestant?.id;

  const [busy, setBusy] = useState(false);
  const [castSuccess, setCastSuccess] = useState(false);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);

  // Logged-out form state
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [error, setError] = useState('');
  const mountedAtRef = useRef(Date.now());

  // Track whether an authenticated voter already used their free vote today.
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
    return {
      ...currentRound,
      isActive: true,
    };
  }, [currentRound]);

  const handleAuthenticatedVote = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (busy || alreadyVoted || !contestantId || !competitionId) return;

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
      toast?.success?.(`Vote cast! Check your email for a link to log in.`);
    } else {
      setError(result?.error || 'Could not cast your vote.');
    }
  };

  const openBuyVotes = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setShowVoteModal(true);
  };

  const stopPropagation = (e) => {
    // The card is wrapped in an <a> — any interactive children need to not
    // bubble click events up, otherwise the voter gets navigated to the
    // competition page mid-form.
    e.stopPropagation();
  };

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
          Voting is live
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
            <span>Vote cast! {user?.id ? 'Come back tomorrow for another free vote.' : 'Check your email for a magic-link to log in.'}</span>
          </div>
        ) : user?.id ? (
          <AuthedCta
            busy={busy}
            alreadyVoted={alreadyVoted}
            onVote={handleAuthenticatedVote}
            onBuy={openBuyVotes}
          />
        ) : (
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
            onVote={handleAnonymousVote}
            onBuy={openBuyVotes}
          />
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

      {/* Paid votes flow — reuse the existing modal. The modal handles its
          own login prompt for logged-out voters who click Buy. */}
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
        />
      )}
    </>
  );
}

function AuthedCta({ busy, alreadyVoted, onVote, onBuy }) {
  return (
    <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={onVote}
        disabled={busy || alreadyVoted}
        style={{
          flex: 1,
          minWidth: '140px',
          padding: `${spacing.sm} ${spacing.md}`,
          background: alreadyVoted ? 'rgba(255,255,255,0.05)' : gradients.gold,
          color: alreadyVoted ? colors.text.muted : '#0a0a0f',
          border: 'none',
          borderRadius: borderRadius.md,
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.semibold,
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
            <Check size={14} /> Voted today
          </>
        ) : (
          <>
            <Heart size={14} /> Cast free vote
          </>
        )}
      </button>
      <button
        type="button"
        onClick={onBuy}
        disabled={busy}
        style={{
          padding: `${spacing.sm} ${spacing.md}`,
          background: 'rgba(255,255,255,0.04)',
          color: colors.text.primary,
          border: `1px solid ${colors.border.primary}`,
          borderRadius: borderRadius.md,
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.medium,
          cursor: busy ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: spacing.xs,
        }}
      >
        <Plus size={14} /> Buy votes
      </button>
    </div>
  );
}

function AnonForm({
  email, setEmail,
  firstName, setFirstName,
  lastName, setLastName,
  company, setCompany,
  busy,
  onVote,
  onBuy,
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
      onSubmit={onVote}
      style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}
    >
      {/* Honeypot — hidden from sighted users, bots fill it */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          opacity: 0,
        }}
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

      <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            flex: 1,
            minWidth: '140px',
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
              <Heart size={14} /> Cast free vote
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onBuy}
          disabled={busy}
          style={{
            padding: `${spacing.sm} ${spacing.md}`,
            background: 'rgba(255,255,255,0.04)',
            color: colors.text.primary,
            border: `1px solid ${colors.border.primary}`,
            borderRadius: borderRadius.md,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            cursor: busy ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: spacing.xs,
          }}
        >
          <Plus size={14} /> Buy votes
        </button>
      </div>

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
