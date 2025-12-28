import React from 'react';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';

// Competition phases in order
const PHASES = ['setup', 'nomination', 'voting', 'judging', 'completed'];

// Human-readable phase names
const PHASE_LABELS = {
  setup: 'Setup',
  assigned: 'Host Assigned',
  nomination: 'Nomination Phase',
  voting: 'Voting Phase',
  judging: 'Judging Phase',
  completed: 'Completed',
  upcoming: 'Upcoming',
};

export default function CurrentPhaseCard({ competition }) {
  const currentStatus = competition?.status || 'setup';
  const currentPhaseIndex = PHASES.indexOf(currentStatus);
  const totalPhases = PHASES.length;
  const completedCount = currentPhaseIndex >= 0 ? currentPhaseIndex : 0;
  const progress = totalPhases > 0 ? (completedCount / (totalPhases - 1)) * 100 : 0;

  const isActive = ['nomination', 'voting', 'judging'].includes(currentStatus);
  const isCompleted = currentStatus === 'completed';

  const cardStyle = {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
    border: `1px solid ${colors.border.gold}`,
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.base, marginBottom: spacing.sm }}>
            Current Phase
          </p>
          <p style={{ fontSize: typography.fontSize.xxxl, fontWeight: typography.fontWeight.semibold, color: colors.gold.primary }}>
            {PHASE_LABELS[currentStatus] || 'No Active Phase'}
          </p>
        </div>
        {isActive && (
          <div
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              background: 'rgba(34,197,94,0.15)',
              borderRadius: borderRadius.xxl,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: borderRadius.full,
                background: colors.status.success,
                animation: 'pulse 2s infinite',
              }}
            />
            <span style={{ color: colors.status.success, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>
              LIVE
            </span>
          </div>
        )}
        {isCompleted && (
          <div
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              background: 'rgba(139,92,246,0.15)',
              borderRadius: borderRadius.xxl,
            }}
          >
            <span style={{ color: '#a78bfa', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>
              ENDED
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div style={{ marginTop: spacing.xl }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
            Competition Progress
          </span>
          <span style={{ color: colors.gold.primary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>
            {completedCount}/{totalPhases - 1} phases
          </span>
        </div>
        <div
          style={{
            height: '8px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: borderRadius.xs,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #d4af37, #f4d03f)',
              borderRadius: borderRadius.xs,
            }}
          />
        </div>
      </div>
    </div>
  );
}
