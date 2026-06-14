import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Rocket,
  Activity,
  CheckCircle2,
  CircleDashed,
  Circle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { useResponsive } from '../../../hooks/useResponsive';
import {
  resolveLaunchChecklist,
  computeChecklistProgress,
  STEP_STATUS,
} from '../launchChecklist';

// Visual treatment per step status. Green checkmarks read as a success state
// (allowed by the brand rules); gold stays the accent for active CTAs.
const STATUS_VISUALS = {
  [STEP_STATUS.COMPLETE]: { icon: CheckCircle2, color: colors.status.success, label: 'Done' },
  [STEP_STATUS.PARTIAL]: { icon: CircleDashed, color: colors.status.warning, label: 'In progress' },
  [STEP_STATUS.INCOMPLETE]: { icon: Circle, color: colors.text.muted, label: 'To do' },
};

/**
 * LaunchChecklist — guided, template-driven launch flow for the host dashboard.
 *
 * Renders the steps for getting a competition live as a checklist with live
 * completion badges and a progress bar. Each step's CTA deep-links to the exact
 * tab/section (or the host's profile) that completes it.
 */
export default function LaunchChecklist({
  competition,
  host,
  nominees,
  contestants,
  judges,
  judgingCriteria,
  prizes,
  events,
  sponsors,
  doubleDays,
  bonusTasks,
  onNavigateToTab,
}) {
  const { isMobile } = useResponsive();
  const navigate = useNavigate();

  const checklist = useMemo(
    () => resolveLaunchChecklist(competition),
    [competition]
  );

  const ctx = useMemo(
    () => ({
      competition, host, nominees, contestants, judges,
      judgingCriteria, prizes, events, sponsors, doubleDays, bonusTasks,
    }),
    [competition, host, nominees, contestants, judges, judgingCriteria, prizes, events, sponsors, doubleDays, bonusTasks]
  );

  // Launch (setup) progress. Once every required launch step is done, the card
  // flips into "run" mode and shows the run steps (operating a live
  // competition — e.g. reviewing nominees) instead of the setup steps.
  const launch = useMemo(() => computeChecklistProgress(checklist, ctx), [checklist, ctx]);
  const isRunning = launch.allRequiredComplete;
  const run = useMemo(
    () => computeChecklistProgress({ steps: checklist.runSteps || [] }, ctx),
    [checklist.runSteps, ctx]
  );

  const active = isRunning ? run : launch;
  const { steps, completedCount, totalCount, allRequiredComplete } = active;

  // Collapse memory per competition — once a host has launched they can tuck it
  // away, but it stays available.
  const storageKey = competition?.id ? `launchChecklist:collapsed:${competition.id}` : null;
  const [collapsed, setCollapsed] = useState(() => {
    if (!storageKey) return false;
    try {
      return window.localStorage.getItem(storageKey) === '1';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (storageKey) {
        try {
          window.localStorage.setItem(storageKey, next ? '1' : '0');
        } catch {
          /* ignore storage failures */
        }
      }
      return next;
    });
  };

  const handleStepCta = (step) => {
    const target = step.target;
    if (!target) return;
    if (target.type === 'profile') {
      // Send the host to their own editable profile in edit mode — not the
      // read-only public view at /profile/:id, which can't be edited.
      navigate('/profile?edit=true');
      return;
    }
    if (target.type === 'tab') {
      onNavigateToTab?.(target.tab, target.section);
    }
  };

  // Progress reflects every step shown (optional included) so the counter and
  // bar match the numbered list.
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Header swaps between the launch (setup) and run (operate) framings.
  const HeaderIcon = isRunning ? Activity : Rocket;
  const headerTitle = isRunning ? (checklist.runTitle || 'Run your competition') : checklist.title;
  const headerSubtitle = isRunning
    ? (allRequiredComplete && completedCount === totalCount
        ? "You're all caught up — nothing needs your attention."
        : `${completedCount} of ${totalCount} done`)
    : `${completedCount} of ${totalCount} steps complete`;

  return (
    <div style={{
      background: colors.background.card,
      border: `1px solid ${isRunning ? colors.border.gold : colors.border.light}`,
      borderRadius: borderRadius.xxl,
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
    }}>
      {/* Header */}
      <div
        onClick={toggleCollapsed}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          padding: isMobile ? spacing.md : spacing.xl,
          cursor: 'pointer',
          borderBottom: collapsed ? 'none' : `1px solid ${colors.border.lighter}`,
        }}
      >
        <div style={{
          width: 40,
          height: 40,
          borderRadius: borderRadius.lg,
          background: 'rgba(212,175,55,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <HeaderIcon size={22} style={{ color: colors.gold.primary }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
          }}>
            {headerTitle}
          </p>
          <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
            {headerSubtitle}
          </p>
        </div>

        {/* Compact progress ring substitute: percent pill */}
        {!collapsed && (
          <span style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            color: allRequiredComplete ? colors.status.success : colors.gold.primary,
            flexShrink: 0,
          }}>
            {pct}%
          </span>
        )}
        {collapsed
          ? <ChevronDown size={20} style={{ color: colors.text.secondary, flexShrink: 0 }} />
          : <ChevronUp size={20} style={{ color: colors.text.secondary, flexShrink: 0 }} />}
      </div>

      {!collapsed && (
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {/* Progress bar */}
          <div style={{
            height: 6,
            borderRadius: borderRadius.pill,
            background: colors.background.secondary,
            overflow: 'hidden',
            marginBottom: spacing.lg,
          }}>
            <div style={{
              width: `${pct}%`,
              height: '100%',
              borderRadius: borderRadius.pill,
              background: allRequiredComplete
                ? colors.status.success
                : 'linear-gradient(90deg, #d4af37, #f4d03f)',
              transition: 'width 0.4s ease',
            }} />
          </div>

          {/* Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            {steps.map((step, index) => {
              const visual = STATUS_VISUALS[step.status] || STATUS_VISUALS[STEP_STATUS.INCOMPLETE];
              const StatusIcon = visual.icon;
              const StepIcon = step.icon;
              const isComplete = step.status === STEP_STATUS.COMPLETE;
              const isManaged = !!step.managedBy;
              const hasCta = !!step.target && !isManaged;

              return (
                <div
                  key={step.id}
                  style={{
                    display: 'flex',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    gap: spacing.md,
                    padding: spacing.md,
                    background: colors.background.secondary,
                    borderRadius: borderRadius.lg,
                    border: `1px solid ${colors.border.lighter}`,
                    opacity: isComplete ? 0.78 : 1,
                  }}
                >
                  {/* Status indicator */}
                  <StatusIcon size={22} style={{ color: visual.color, flexShrink: 0, marginTop: isMobile ? 2 : 0 }} />

                  {/* Step number + icon + text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.bold,
                        color: colors.text.muted,
                      }}>
                        {index + 1}
                      </span>
                      {StepIcon && (
                        <StepIcon size={14} style={{ color: colors.text.secondary, flexShrink: 0 }} />
                      )}
                      <span style={{
                        fontWeight: typography.fontWeight.medium,
                        color: colors.text.primary,
                        textDecoration: isComplete ? 'none' : 'none',
                      }}>
                        {step.title}
                      </span>
                      {step.optional && (
                        <span style={{
                          fontSize: '10px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          color: colors.text.muted,
                          border: `1px solid ${colors.border.light}`,
                          borderRadius: borderRadius.sm,
                          padding: `1px ${spacing.xs}`,
                        }}>
                          Optional
                        </span>
                      )}
                      {isManaged && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          fontSize: '10px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          color: colors.text.muted,
                        }}>
                          <Lock size={10} /> {step.managedBy}
                        </span>
                      )}
                    </div>
                    <p style={{
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                      marginTop: 2,
                    }}>
                      {step.detail || step.description}
                    </p>
                  </div>

                  {/* CTA */}
                  {hasCta && (
                    <button
                      onClick={() => handleStepCta(step)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: spacing.xs,
                        padding: `${spacing.xs} ${spacing.md}`,
                        background: isComplete ? 'transparent' : 'rgba(212,175,55,0.12)',
                        border: `1px solid ${isComplete ? colors.border.light : colors.gold.primary}`,
                        borderRadius: borderRadius.md,
                        color: isComplete ? colors.text.secondary : colors.gold.primary,
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        alignSelf: isMobile ? 'flex-start' : 'center',
                      }}
                    >
                      {isComplete ? 'Edit' : (step.ctaLabel || 'Open')}
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
