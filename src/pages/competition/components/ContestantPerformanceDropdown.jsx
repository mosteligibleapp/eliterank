import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { TrendingUp, Trophy, Heart, Award } from 'lucide-react';
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  transitions,
} from '../../../styles/theme';

/**
 * ContestantPerformanceDropdown
 *
 * Floating nav button + dropdown shown on competition pages when the
 * current authenticated user has a contestant entry in this competition.
 * Surfaces three stats:
 *   - Total votes (lifetime, never reset between rounds)
 *   - Votes this round (in-round display total)
 *   - Current rank
 */
function ContestantPerformanceDropdown({
  contestant,
  roundLabel,
  size = 40,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = useCallback(() => setIsOpen((p) => !p), []);

  const stats = useMemo(() => {
    const lifetime = Number(contestant?.lifetime_votes ?? 0);
    const round = Number(contestant?.votes ?? 0);
    const rank = contestant?.rank ?? contestant?.displayRank ?? null;
    return { lifetime, round, rank };
  }, [contestant]);

  if (!contestant) return null;

  return (
    <div ref={containerRef} style={styles.container}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label="My performance"
        aria-expanded={isOpen}
        aria-haspopup="true"
        style={{
          ...styles.button,
          width: `${size}px`,
          height: `${size}px`,
          background: isOpen
            ? colors.gold.muted
            : 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))',
          borderColor: colors.gold.primary,
        }}
      >
        <TrendingUp
          size={size * 0.45}
          color={colors.gold.primary}
          strokeWidth={2.25}
        />
      </button>

      <div
        style={{
          ...styles.dropdown,
          top: `${size + 8}px`,
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? 'visible' : 'hidden',
          transform: isOpen ? 'translateY(0)' : 'translateY(-8px)',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        role="menu"
      >
        <div style={styles.header}>
          <div style={styles.headerLabel}>My Performance</div>
          {contestant.name && (
            <div style={styles.headerName}>{contestant.name}</div>
          )}
        </div>

        <div style={styles.statList}>
          <StatRow
            icon={<Heart size={16} color={colors.gold.primary} />}
            label="Total votes"
            sublabel="Throughout the competition"
            value={stats.lifetime.toLocaleString()}
          />
          <StatRow
            icon={<Award size={16} color={colors.gold.primary} />}
            label="Votes this round"
            sublabel={roundLabel || 'Current round'}
            value={stats.round.toLocaleString()}
          />
          <StatRow
            icon={<Trophy size={16} color={colors.gold.primary} />}
            label="Current rank"
            sublabel={
              stats.rank
                ? `Position out of ranked contestants`
                : 'Awaiting ranking'
            }
            value={stats.rank ? `#${stats.rank}` : '—'}
            isLast
          />
        </div>
      </div>
    </div>
  );
}

function StatRow({ icon, label, sublabel, value, isLast }) {
  return (
    <div
      style={{
        ...styles.statRow,
        borderBottom: isLast ? 'none' : `1px solid ${colors.border.secondary}`,
      }}
    >
      <div style={styles.statIcon}>{icon}</div>
      <div style={styles.statText}>
        <div style={styles.statLabel}>{label}</div>
        <div style={styles.statSublabel}>{sublabel}</div>
      </div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
    zIndex: 100,
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    border: `2px solid ${colors.gold.primary}`,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
    padding: 0,
  },
  dropdown: {
    position: 'absolute',
    right: 0,
    width: '280px',
    maxWidth: 'calc(100vw - 32px)',
    background: colors.background.card,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.lg,
    overflow: 'hidden',
    transition: `opacity ${transitions.fast}, transform ${transitions.fast}, visibility ${transitions.fast}`,
  },
  header: {
    padding: `${spacing.md} ${spacing.lg}`,
    borderBottom: `1px solid ${colors.border.primary}`,
    background: 'linear-gradient(135deg, rgba(212,175,55,0.08), transparent)',
  },
  headerLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gold.primary,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
    marginBottom: spacing.xs,
  },
  headerName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  statList: {
    padding: spacing.xs,
  },
  statRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    padding: `${spacing.md} ${spacing.md}`,
  },
  statIcon: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    background: colors.gold.muted,
    flexShrink: 0,
  },
  statText: {
    flex: 1,
    minWidth: 0,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    lineHeight: typography.lineHeight.tight,
  },
  statSublabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.gold.primary,
    fontVariantNumeric: 'tabular-nums',
    flexShrink: 0,
  },
};

export default memo(ContestantPerformanceDropdown);
