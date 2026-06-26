import React from 'react';
import { Video, Clock, RefreshCw, Trash2, Plus } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';

/**
 * IntroVideoManager — manage an already-earned intro video from the bonus-votes
 * section. Once the intro-video bonus task is approved it leaves the checklist
 * (completed tasks are filtered out), so this card is the home for changing or
 * removing the video afterward.
 *
 * State is derived from the bonus task itself (from get_bonus_vote_status):
 *  - submission_status === 'approved' + proof_url  → video is live → Replace / Remove
 *  - submission_status === 'pending'               → awaiting host review
 *  - neither (removed earlier, votes kept)         → Add a new one
 *
 * Only rendered when the task is `completed` (i.e. the contestant earned the
 * votes at least once). Replace/Remove keep the earned votes.
 */
export default function IntroVideoManager({ task, busy, onReplace, onRemove, onAdd }) {
  if (!task) return null;

  const pending = task.submission_status === 'pending';
  const hasVideo = task.submission_status === 'approved' && !!task.proof_url;

  const buttonBase = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.xs} ${spacing.md}`,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    cursor: busy ? 'not-allowed' : 'pointer',
    opacity: busy ? 0.6 : 1,
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: spacing.md,
      padding: `${spacing.md} ${spacing.lg}`,
      borderRadius: borderRadius.lg,
      background: 'rgba(34, 197, 94, 0.06)',
      border: '1px solid rgba(34, 197, 94, 0.18)',
      marginTop: spacing.sm,
      flexWrap: 'wrap',
    }}>
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: borderRadius.md,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(34, 197, 94, 0.12)',
        flexShrink: 0,
      }}>
        <Video size={18} style={{ color: colors.status.success }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: typography.fontSize.base,
          fontWeight: typography.fontWeight.medium,
          color: colors.text.primary,
        }}>
          Intro video
        </p>
        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: '2px' }}>
          {pending
            ? 'Pending host review'
            : hasVideo
              ? 'Visible on your profile'
              : 'Add a new intro video to show on your profile'}
        </p>
      </div>

      {pending ? (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          fontSize: typography.fontSize.xs, color: colors.gold.primary,
        }}>
          <Clock size={14} /> Pending review
        </span>
      ) : hasVideo ? (
        <div style={{ display: 'flex', gap: spacing.xs, flexShrink: 0 }}>
          <button
            type="button"
            onClick={onReplace}
            disabled={busy}
            style={{
              ...buttonBase,
              background: 'transparent',
              border: `1px solid ${colors.gold.primary}`,
              color: colors.gold.primary,
            }}
          >
            <RefreshCw size={13} /> Replace
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            style={{
              ...buttonBase,
              background: 'transparent',
              border: '1px solid rgba(239,68,68,0.4)',
              color: '#ef4444',
            }}
          >
            <Trash2 size={13} /> Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          disabled={busy}
          style={{
            ...buttonBase,
            background: 'transparent',
            border: `1px solid ${colors.gold.primary}`,
            color: colors.gold.primary,
            flexShrink: 0,
          }}
        >
          <Plus size={13} /> Add video
        </button>
      )}
    </div>
  );
}
