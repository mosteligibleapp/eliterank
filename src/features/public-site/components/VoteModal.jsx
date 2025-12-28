import React from 'react';
import { DollarSign, Sparkles, LogIn } from 'lucide-react';
import { Modal, Button, Avatar } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { formatNumber, formatCurrency } from '../../../utils/formatters';
import { VOTE_PRESETS } from '../../../constants';

export default function VoteModal({
  isOpen,
  onClose,
  contestant,
  voteCount,
  onVoteCountChange,
  forceDoubleVoteDay,
  isAuthenticated = false,
  onLogin,
}) {
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

      {/* Contestant Preview */}
      <div style={{ textAlign: 'center', marginBottom: spacing.xxl }}>
        <Avatar name={contestant.name} size={100} style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.xs }}>
          {contestant.name}
        </h3>
        <p style={{ color: colors.text.secondary }}>{contestant.occupation}</p>
      </div>

      {/* Vote Count Selector */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: borderRadius.xl, padding: spacing.xl, marginBottom: spacing.xl }}>
        <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.md, marginBottom: spacing.md, textAlign: 'center' }}>
          Select vote amount
        </p>
        <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'center', flexWrap: 'wrap', marginBottom: spacing.md }}>
          {VOTE_PRESETS.map((num) => (
            <button
              key={num}
              onClick={() => onVoteCountChange(num)}
              style={{
                padding: `${spacing.md} ${spacing.lg}`,
                borderRadius: borderRadius.md,
                border: 'none',
                background: voteCount === num ? colors.gold.primary : 'rgba(255,255,255,0.05)',
                color: voteCount === num ? '#0a0a0f' : colors.text.secondary,
                fontWeight: typography.fontWeight.semibold,
                fontSize: typography.fontSize.lg,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {num}
            </button>
          ))}
        </div>

        {/* Custom Amount */}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>or enter custom amount</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: '140px' }}>
            <input
              type="number"
              min="1"
              value={voteCount}
              onChange={(e) => onVoteCountChange(Math.max(1, parseInt(e.target.value) || 1))}
              style={{
                width: '100%',
                padding: `${spacing.md} ${spacing.lg}`,
                paddingLeft: '36px',
                borderRadius: borderRadius.md,
                border: `2px solid ${colors.border.gold}`,
                background: 'rgba(212,175,55,0.1)',
                color: colors.gold.primary,
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.bold,
                textAlign: 'center',
                outline: 'none',
              }}
            />
            <span
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: colors.gold.primary,
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
              }}
            >
              #
            </span>
          </div>
          <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.md }}>votes</span>
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

      {/* Free Vote Option */}
      <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.base, marginBottom: spacing.xl, textAlign: 'center' }}>
        Or use your <span style={{ color: colors.status.success }}>1 free daily vote</span>
        {forceDoubleVoteDay && <span style={{ color: colors.status.success }}> (counts as 2!)</span>}
      </p>

      {/* Vote Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        <Button fullWidth size="xl" icon={DollarSign}>
          Purchase {formatNumber(effectiveVotes)} Vote{effectiveVotes !== 1 ? 's' : ''} - {formatCurrency(voteCount)}
        </Button>
        <Button
          variant="approve"
          fullWidth
          size="lg"
          style={{
            background: 'rgba(34,197,94,0.15)',
            borderColor: 'rgba(34,197,94,0.3)',
            color: colors.status.success,
          }}
        >
          Use Free Daily Vote
        </Button>
      </div>
    </Modal>
  );
}
