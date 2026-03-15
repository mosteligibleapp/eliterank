import { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { Panel } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { useResponsive } from '../../../hooks/useResponsive';
import { getUpcomingDatesForUser } from '../../../lib/upcoming-dates';

const TYPE_COLORS = {
  voting_round: colors.gold.primary,
  judging_round: colors.accent.purple,
  nomination_period: colors.status.success,
  event: colors.status.info,
  finals: colors.accent.pink,
};

const TYPE_LABELS = {
  voting_round: 'Voting',
  judging_round: 'Judging',
  nomination_period: 'Nominations',
  event: 'Event',
  finals: 'Finals',
};

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateRange(startStr, endStr) {
  if (!endStr) return formatDate(startStr);
  const start = new Date(startStr);
  const end = new Date(endStr);
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()}–${end.getDate()}`;
  }
  return `${formatDate(startStr)} – ${formatDate(endStr)}`;
}

function getRelativeLabel(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = date - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Now';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `in ${diffDays}d`;
  if (diffDays <= 30) {
    const weeks = Math.floor(diffDays / 7);
    return `in ${weeks}w`;
  }
  return `in ${diffDays}d`;
}

function getRelativeColor(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = date - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) return colors.status.warning;
  if (diffDays <= 3) return colors.gold.primary;
  return colors.text.secondary;
}

const MAX_VISIBLE = 5;

export default function ProfileUpcomingDates({ userId, userEmail }) {
  const { isMobile } = useResponsive();
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchDates = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const result = await getUpcomingDatesForUser(userId, userEmail);
      setDates(result);
    } catch (err) {
      console.error('Error fetching upcoming dates:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, userEmail]);

  useEffect(() => {
    fetchDates();
  }, [fetchDates]);

  if (loading || dates.length === 0) return null;

  const visibleDates = expanded ? dates : dates.slice(0, MAX_VISIBLE);
  const hasMore = dates.length > MAX_VISIBLE;
  const multipleCompetitions = new Set(dates.map(d => d.competitionId)).size > 1;

  return (
    <Panel style={{ marginBottom: isMobile ? spacing.md : spacing.xl, overflow: 'hidden' }}>
      <div style={{ borderTop: `2px solid ${colors.gold.primary}` }}>
        <div style={{ padding: isMobile ? spacing.lg : spacing.xxl }}>
          {/* Title */}
          <h3 style={{
            fontSize: isMobile ? typography.fontSize.lg : typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
            marginBottom: spacing.lg,
          }}>
            <Calendar size={isMobile ? 18 : 20} style={{ color: colors.gold.primary }} />
            Upcoming Dates
          </h3>

          {/* Date list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
            {visibleDates.map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: `${spacing.sm} ${spacing.md}`,
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: borderRadius.lg,
                }}
              >
                {/* Type dot */}
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: TYPE_COLORS[item.type] || colors.text.muted,
                  flexShrink: 0,
                }} />

                {/* Date + label */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: isMobile ? typography.fontSize.sm : typography.fontSize.md,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.text.primary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.label}
                  </p>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    fontSize: isMobile ? '10px' : typography.fontSize.xs,
                    color: colors.text.secondary,
                    marginTop: '2px',
                  }}>
                    <span>{formatDateRange(item.date, item.endDate)}</span>
                    {multipleCompetitions && item.competitionName && (
                      <>
                        <span style={{ color: colors.text.muted }}>·</span>
                        <span style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {item.competitionName}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Relative time badge */}
                <span style={{
                  fontSize: isMobile ? '10px' : typography.fontSize.xs,
                  fontWeight: typography.fontWeight.semibold,
                  color: getRelativeColor(item.date),
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}>
                  {getRelativeLabel(item.date)}
                </span>
              </div>
            ))}
          </div>

          {/* Expand/collapse */}
          {hasMore && (
            <button
              onClick={() => setExpanded(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xs,
                width: '100%',
                marginTop: spacing.md,
                padding: isMobile ? spacing.sm : spacing.md,
                background: 'rgba(212,175,55,0.08)',
                border: `1px solid rgba(212,175,55,0.15)`,
                borderRadius: borderRadius.lg,
                color: colors.gold.primary,
                fontSize: isMobile ? typography.fontSize.sm : typography.fontSize.md,
                fontWeight: typography.fontWeight.medium,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {expanded ? 'Show less' : `Show all ${dates.length} dates`}
              {expanded
                ? <ChevronUp size={isMobile ? 14 : 16} />
                : <ChevronDown size={isMobile ? 14 : 16} />
              }
            </button>
          )}
        </div>
      </div>
    </Panel>
  );
}
