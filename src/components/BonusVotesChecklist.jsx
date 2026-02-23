import React, { memo, useMemo } from 'react';
import {
  Gift, CheckCircle, Circle, Camera,
  Share2, User, BookOpen, Link as LinkIcon, Trophy,
} from 'lucide-react';
import { colors, spacing, borderRadius, typography, gradients, transitions } from '../styles/theme';
import { Badge } from './ui';

// Map task_key to icon
const TASK_ICONS = {
  complete_profile: User,
  add_photo: Camera,
  add_social: LinkIcon,
  view_how_to_win: BookOpen,
  share_profile: Share2,
};

/**
 * Progress bar for bonus votes
 */
const ProgressBar = memo(function ProgressBar({ progress, earned, total }) {
  return (
    <div style={{ marginBottom: spacing.lg }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
      }}>
        <span style={{
          fontSize: typography.fontSize.sm,
          color: colors.text.secondary,
        }}>
          {earned} / {total} bonus votes earned
        </span>
        <span style={{
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.semibold,
          color: progress === 100 ? colors.status.success : colors.gold.primary,
        }}>
          {Math.round(progress)}%
        </span>
      </div>
      <div style={{
        height: '8px',
        borderRadius: borderRadius.pill,
        background: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          borderRadius: borderRadius.pill,
          background: progress === 100
            ? gradients.success
            : gradients.gold,
          transition: `width 500ms ${transitions.ease}`,
        }} />
      </div>
    </div>
  );
});

/**
 * Single task row
 */
const TaskRow = memo(function TaskRow({ task, onAction, isAwarding }) {
  const Icon = TASK_ICONS[task.task_key] || Gift;
  const isCompleted = task.completed;
  const isCurrentlyAwarding = isAwarding === task.task_key;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: spacing.md,
      padding: `${spacing.md} ${spacing.lg}`,
      borderRadius: borderRadius.lg,
      background: isCompleted
        ? 'rgba(34, 197, 94, 0.08)'
        : 'rgba(255, 255, 255, 0.03)',
      border: `1px solid ${isCompleted ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.06)'}`,
      opacity: isCurrentlyAwarding ? 0.7 : 1,
      transition: transitions.all,
      cursor: !isCompleted && onAction ? 'pointer' : 'default',
    }}
      onClick={() => {
        if (!isCompleted && onAction) {
          onAction(task.task_key);
        }
      }}
    >
      {/* Status icon */}
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: borderRadius.md,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isCompleted
          ? 'rgba(34, 197, 94, 0.15)'
          : 'rgba(212, 175, 55, 0.1)',
        flexShrink: 0,
      }}>
        <Icon size={18} style={{
          color: isCompleted ? colors.status.success : colors.gold.primary,
        }} />
      </div>

      {/* Task info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
        }}>
          <span style={{
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.medium,
            color: isCompleted ? colors.text.secondary : colors.text.primary,
            textDecoration: isCompleted ? 'line-through' : 'none',
          }}>
            {task.label}
          </span>
        </div>
        {task.description && (
          <p style={{
            fontSize: typography.fontSize.xs,
            color: colors.text.muted,
            marginTop: '2px',
          }}>
            {task.description}
          </p>
        )}
      </div>

      {/* Votes badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.xs,
        flexShrink: 0,
      }}>
        {isCompleted ? (
          <CheckCircle size={20} style={{ color: colors.status.success }} />
        ) : (
          <Badge
            variant="gold"
            size="sm"
            style={{
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.semibold,
            }}
          >
            +{task.votes_awarded}
          </Badge>
        )}
      </div>
    </div>
  );
});

/**
 * BonusVotesChecklist - Shows bonus vote tasks and completion status
 *
 * Used in:
 * 1. Contestant's own view (public competition page)
 * 2. Competition dashboard (admin view)
 */
function BonusVotesChecklist({
  tasks = [],
  loading = false,
  awarding = null,
  completedCount = 0,
  totalCount = 0,
  totalBonusVotesEarned = 0,
  totalBonusVotesAvailable = 0,
  progress = 0,
  allCompleted = false,
  onTaskAction,
  compact = false,
  showHeader = true,
}) {
  if (loading) {
    return (
      <div style={{
        background: colors.background.card,
        border: `1px solid ${colors.border.primary}`,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          color: colors.text.secondary,
        }}>
          <Gift size={20} style={{ opacity: 0.5 }} />
          <span>Loading bonus tasks...</span>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div style={{
      background: colors.background.card,
      border: `1px solid ${allCompleted ? 'rgba(34, 197, 94, 0.3)' : 'rgba(212, 175, 55, 0.2)'}`,
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
    }}>
      {/* Header */}
      {showHeader && (
        <div style={{
          padding: `${spacing.lg} ${spacing.xl}`,
          borderBottom: `1px solid ${colors.border.secondary}`,
          background: allCompleted
            ? 'rgba(34, 197, 94, 0.05)'
            : 'rgba(212, 175, 55, 0.03)',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.md,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
            }}>
              {allCompleted ? (
                <Trophy size={20} style={{ color: colors.status.success }} />
              ) : (
                <Gift size={20} style={{ color: colors.gold.primary }} />
              )}
              <h3 style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.primary,
              }}>
                {allCompleted ? 'All Bonus Votes Earned!' : 'Earn Bonus Votes'}
              </h3>
            </div>
            <Badge
              variant={allCompleted ? 'success' : 'gold'}
              size="sm"
            >
              {completedCount}/{totalCount}
            </Badge>
          </div>

          <ProgressBar
            progress={progress}
            earned={totalBonusVotesEarned}
            total={totalBonusVotesAvailable}
          />

          {!allCompleted && (
            <p style={{
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
            }}>
              Complete tasks below to earn free bonus votes for your campaign.
            </p>
          )}
        </div>
      )}

      {/* Tasks list */}
      <div style={{
        padding: compact ? spacing.md : spacing.lg,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.sm,
      }}>
        {tasks.map((task) => (
          <TaskRow
            key={task.id || task.task_key}
            task={task}
            onAction={onTaskAction}
            isAwarding={awarding}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(BonusVotesChecklist);
