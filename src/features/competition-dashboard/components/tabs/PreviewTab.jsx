import React, { useMemo, useState } from 'react';
import { Eye, ExternalLink, ChevronDown, ChevronUp, User } from 'lucide-react';
import { Panel, Button, Badge } from '../../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../../styles/theme';
import { computeCompetitionPhase } from '../../../../utils/competitionPhase';

/**
 * Pairs a preview card's phase (the query param value) with a label the host
 * expects to see. The underlying preview URL scheme is
 *   /{orgSlug}/id/{competitionId}?preview={phase}
 * which the PublicCompetitionContext turns into a synthetic phase object.
 */
const PREVIEW_PHASES = [
  {
    key: 'nominations',
    label: 'Nominations',
    description: 'What voters see while nominations are open — they can submit nominees.',
    matchesPhase: (current) => current === 'nominations' || current === 'nomination',
  },
  {
    key: 'between-rounds',
    label: 'Pre-voting (Between Rounds)',
    description: 'Interim state — nominations have closed and voting hasn\u2019t opened yet.',
    matchesPhase: (current) => current === 'between-rounds' || current === 'between',
  },
  {
    key: 'voting',
    label: 'Voting',
    description: 'Active voting — voters see the leaderboard and can cast votes.',
    matchesPhase: (current) =>
      current === 'voting' || current === 'round1' || current === 'round2' || current === 'finals',
  },
  {
    key: 'results',
    label: 'Winners / Results',
    description: 'Post-competition — winners are announced.',
    matchesPhase: (current) => current === 'completed' || current === 'results',
  },
];

export default function PreviewTab({ competition, contestants = [] }) {
  const [expanded, setExpanded] = useState({});

  const orgSlug = competition?.organization?.slug || 'most-eligible';
  const competitionId = competition?.id;

  const currentPhaseKey = useMemo(() => {
    if (!competition) return null;
    return computeCompetitionPhase(competition);
  }, [competition]);

  const buildPreviewUrl = (phaseKey) =>
    competitionId
      ? `/${orgSlug}/id/${competitionId}?preview=${phaseKey}`
      : null;

  const toggleExpanded = (key) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const openInNewTab = (url) => {
    if (!url) return;
    window.open(url, '_blank');
  };

  const sampleContestant = useMemo(() => {
    return contestants.find((c) => c.userId) || null;
  }, [contestants]);
  const contestantProfileUrl = sampleContestant
    ? `/profile/${sampleContestant.userId}`
    : null;

  if (!competitionId) {
    return (
      <div style={{ padding: spacing.xl, color: colors.text.secondary }}>
        Loading competition&hellip;
      </div>
    );
  }

  return (
    <div style={{ padding: spacing.lg, display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
      {/* Current phase banner */}
      <div style={{
        padding: spacing.lg,
        background: 'rgba(212,175,55,0.08)',
        border: '1px solid rgba(212,175,55,0.2)',
        borderRadius: borderRadius.lg,
        display: 'flex',
        alignItems: 'center',
        gap: spacing.md,
      }}>
        <Eye size={20} style={{ color: colors.gold.primary, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: typography.fontSize.xs,
            color: colors.text.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '2px',
          }}>
            Current Phase
          </p>
          <p style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
          }}>
            {formatPhaseLabel(currentPhaseKey)}
          </p>
          <p style={{
            fontSize: typography.fontSize.xs,
            color: colors.text.secondary,
            marginTop: '2px',
          }}>
            Status: <span style={{ color: colors.gold.primary }}>{competition?.status || 'draft'}</span>
          </p>
        </div>
      </div>

      {/* Phase previews */}
      <Panel title="Phase Previews" icon={Eye}>
        <div style={{ padding: spacing.lg, display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
            See what voters see during each phase of the competition. Click Show to preview inline, or Open for full size in a new tab.
          </p>

          {PREVIEW_PHASES.map((p) => {
            const url = buildPreviewUrl(p.key);
            const isCurrent = p.matchesPhase(currentPhaseKey);
            const isExpanded = !!expanded[p.key];

            return (
              <div
                key={p.key}
                style={{
                  border: `1px solid ${isCurrent ? 'rgba(212,175,55,0.3)' : colors.border.primary}`,
                  borderRadius: borderRadius.lg,
                  background: isCurrent ? 'rgba(212,175,55,0.04)' : colors.background.secondary,
                  overflow: 'hidden',
                }}
              >
                <div style={{
                  padding: spacing.md,
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  flexWrap: 'wrap',
                }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: '2px' }}>
                      <p style={{
                        fontWeight: typography.fontWeight.semibold,
                        fontSize: typography.fontSize.base,
                        color: colors.text.primary,
                      }}>
                        {p.label}
                      </p>
                      {isCurrent && (
                        <Badge variant="gold" size="sm">Current</Badge>
                      )}
                    </div>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                      {p.description}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: spacing.xs, flexShrink: 0 }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={isExpanded ? ChevronUp : ChevronDown}
                      onClick={() => toggleExpanded(p.key)}
                    >
                      {isExpanded ? 'Hide' : 'Show'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={ExternalLink}
                      onClick={() => openInNewTab(url)}
                    >
                      Open
                    </Button>
                  </div>
                </div>

                {isExpanded && url && (
                  <div style={{
                    borderTop: `1px solid ${colors.border.secondary}`,
                    background: '#000',
                    height: '600px',
                  }}>
                    <iframe
                      src={url}
                      title={`${p.label} preview`}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        display: 'block',
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Contestant profile preview */}
      <Panel title="Contestant Profile" icon={User}>
        <div style={{ padding: spacing.lg, display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          {sampleContestant ? (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
                flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <p style={{
                    fontWeight: typography.fontWeight.semibold,
                    fontSize: typography.fontSize.base,
                    color: colors.text.primary,
                    marginBottom: '2px',
                  }}>
                    Preview: {sampleContestant.name}
                  </p>
                  <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                    What voters see when they click a contestant. Using the first contestant as a sample.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: spacing.xs, flexShrink: 0 }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={expanded.profile ? ChevronUp : ChevronDown}
                    onClick={() => toggleExpanded('profile')}
                  >
                    {expanded.profile ? 'Hide' : 'Show'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={ExternalLink}
                    onClick={() => openInNewTab(contestantProfileUrl)}
                  >
                    Open
                  </Button>
                </div>
              </div>

              {expanded.profile && contestantProfileUrl && (
                <div style={{
                  background: '#000',
                  height: '600px',
                  borderRadius: borderRadius.lg,
                  border: `1px solid ${colors.border.secondary}`,
                  overflow: 'hidden',
                }}>
                  <iframe
                    src={contestantProfileUrl}
                    title="Contestant profile preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      display: 'block',
                    }}
                  />
                </div>
              )}
            </>
          ) : (
            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>
              No contestants yet. Approve a nominee first, then come back to see how their profile looks to voters.
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}

function formatPhaseLabel(phase) {
  if (!phase) return 'Unknown';
  const map = {
    draft: 'Draft',
    publish: 'Published — Coming Soon',
    'coming-soon': 'Coming Soon',
    live: 'Live',
    nomination: 'Nominations Open',
    nominations: 'Nominations Open',
    voting: 'Voting Open',
    round1: 'Round 1 Voting',
    round2: 'Round 2 Voting',
    finals: 'Finals',
    judging: 'Judging',
    between: 'Between Rounds',
    'between-rounds': 'Between Rounds',
    completed: 'Completed',
    results: 'Results',
    archive: 'Archived',
  };
  return map[phase] || phase;
}
