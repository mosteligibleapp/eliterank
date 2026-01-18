import React from 'react';
import { Clock, AlertTriangle, Calendar } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { useResponsive } from '../../../hooks/useResponsive';
import { computeCompetitionPhase, COMPETITION_STATUSES } from '../../../utils/competitionPhase';
import { daysUntil } from '../../../utils/formatters';

// Timeline phases in order
const TIMELINE_PHASES = [
  { id: 'nomination', label: 'Nomination', dateField: 'nominationEnd' },
  { id: 'voting', label: 'Voting', dateField: 'votingEnd' },
  { id: 'judging', label: 'Finals', dateField: 'finalsDate' },
];

const PHASE_LABELS = {
  draft: 'Draft',
  publish: 'Coming Soon',
  nomination: 'Nominations',
  voting: 'Voting',
  judging: 'Judging',
  completed: 'Completed',
  archive: 'Archived',
};

/**
 * TimelineCard - Shows competition timeline with progress, days remaining, and event warnings
 */
export default function TimelineCard({ competition, events = [] }) {
  const { isMobile } = useResponsive();
  const computedPhase = computeCompetitionPhase(competition);
  const status = competition?.status || 'draft';
  const isLive = status === COMPETITION_STATUSES.LIVE;

  // Calculate days remaining in current phase
  let daysLeft = null;
  let currentPhaseEndDate = null;

  if (isLive && computedPhase === 'nomination' && competition?.nominationEnd) {
    currentPhaseEndDate = new Date(competition.nominationEnd);
    daysLeft = daysUntil(competition.nominationEnd);
  } else if (isLive && computedPhase === 'voting' && competition?.votingEnd) {
    currentPhaseEndDate = new Date(competition.votingEnd);
    daysLeft = daysUntil(competition.votingEnd);
  } else if (isLive && computedPhase === 'judging' && competition?.finalsDate) {
    currentPhaseEndDate = new Date(competition.finalsDate);
    daysLeft = daysUntil(competition.finalsDate);
  }

  // Check if there's an event scheduled during current phase
  const hasEventInCurrentPhase = events.some(event => {
    if (!event.date || !currentPhaseEndDate) return false;
    const eventDate = new Date(event.date);
    const now = new Date();
    return eventDate >= now && eventDate <= currentPhaseEndDate;
  });

  // Determine which phases are completed
  const getPhaseStatus = (phaseId) => {
    if (computedPhase === 'completed') return 'completed';
    const phaseIndex = TIMELINE_PHASES.findIndex(p => p.id === phaseId);
    const currentIndex = TIMELINE_PHASES.findIndex(p => p.id === computedPhase);
    if (phaseIndex < currentIndex) return 'completed';
    if (phaseIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div style={{
      padding: isMobile ? spacing.md : spacing.xl,
      borderRadius: borderRadius.xl,
      background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
      border: `1px solid ${colors.border.gold}`,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.lg,
      }}>
        <div>
          <p style={{
            color: colors.text.secondary,
            fontSize: typography.fontSize.sm,
            marginBottom: spacing.xs,
          }}>
            Current Phase
          </p>
          <p style={{
            fontSize: isMobile ? typography.fontSize.xl : typography.fontSize.xxl,
            fontWeight: typography.fontWeight.bold,
            color: colors.gold.primary,
          }}>
            {PHASE_LABELS[computedPhase] || 'Not Started'}
          </p>
        </div>
        {isLive && (
          <div style={{
            padding: `${spacing.xs} ${spacing.sm}`,
            background: 'rgba(34,197,94,0.15)',
            borderRadius: borderRadius.pill,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.xs,
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: colors.status.success,
              animation: 'pulse 2s infinite',
            }} />
            <span style={{
              color: colors.status.success,
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.semibold,
            }}>
              LIVE
            </span>
          </div>
        )}
      </div>

      {/* Timeline Progress */}
      {isLive && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          marginBottom: spacing.lg,
        }}>
          {TIMELINE_PHASES.map((phase, index) => {
            const phaseStatus = getPhaseStatus(phase.id);
            return (
              <React.Fragment key={phase.id}>
                {/* Phase Dot */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: spacing.xs,
                }}>
                  <div style={{
                    width: isMobile ? '24px' : '28px',
                    height: isMobile ? '24px' : '28px',
                    borderRadius: '50%',
                    background: phaseStatus === 'completed'
                      ? colors.gold.primary
                      : phaseStatus === 'current'
                        ? 'rgba(212,175,55,0.3)'
                        : 'rgba(255,255,255,0.1)',
                    border: phaseStatus === 'current' ? `2px solid ${colors.gold.primary}` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {phaseStatus === 'completed' && (
                      <span style={{ color: '#000', fontSize: '12px' }}>✓</span>
                    )}
                  </div>
                  <span style={{
                    fontSize: typography.fontSize.xs,
                    color: phaseStatus === 'current' ? colors.gold.primary : colors.text.muted,
                    fontWeight: phaseStatus === 'current' ? typography.fontWeight.semibold : 'normal',
                  }}>
                    {phase.label}
                  </span>
                </div>
                {/* Connector Line */}
                {index < TIMELINE_PHASES.length - 1 && (
                  <div style={{
                    flex: 1,
                    height: '2px',
                    background: getPhaseStatus(TIMELINE_PHASES[index + 1].id) === 'completed' ||
                               getPhaseStatus(phase.id) === 'completed'
                      ? colors.gold.primary
                      : 'rgba(255,255,255,0.1)',
                    marginBottom: spacing.lg,
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Days Remaining */}
      {daysLeft !== null && daysLeft >= 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          padding: spacing.md,
          background: 'rgba(255,255,255,0.05)',
          borderRadius: borderRadius.lg,
          marginBottom: spacing.md,
        }}>
          <Clock size={16} style={{ color: colors.text.secondary }} />
          <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
            <strong style={{ color: '#fff' }}>{daysLeft}</strong> {daysLeft === 1 ? 'day' : 'days'} left in {PHASE_LABELS[computedPhase]}
          </span>
        </div>
      )}

      {/* Event Warning */}
      {isLive && !hasEventInCurrentPhase && daysLeft !== null && daysLeft <= 14 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          padding: spacing.md,
          background: 'rgba(251,191,36,0.1)',
          borderRadius: borderRadius.lg,
          border: '1px solid rgba(251,191,36,0.2)',
        }}>
          <AlertTriangle size={16} style={{ color: '#fbbf24' }} />
          <span style={{ color: '#fbbf24', fontSize: typography.fontSize.sm }}>
            No event scheduled before {PHASE_LABELS[computedPhase]} ends
          </span>
        </div>
      )}

      {/* Not Live States */}
      {!isLive && status === 'draft' && (
        <div style={{
          padding: spacing.md,
          background: 'rgba(255,255,255,0.05)',
          borderRadius: borderRadius.lg,
          textAlign: 'center',
        }}>
          <Calendar size={20} style={{ color: colors.text.muted, marginBottom: spacing.xs }} />
          <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
            Set timeline dates to launch
          </p>
        </div>
      )}
    </div>
  );
}
