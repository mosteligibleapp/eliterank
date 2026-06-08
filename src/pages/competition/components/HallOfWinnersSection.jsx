import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import useAppSettings from '../../../hooks/useAppSettings';
import { supabase } from '../../../lib/supabase';
import { transformSupabaseImage } from '../../../lib/storageImage';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { useResponsive } from '../../../hooks/useResponsive';

/**
 * Hall of Winners section for competition pages
 * Shows the explore page Hall of Winners on selected competition pages
 * Only displays during Coming Soon and Nominations phases
 */
export function HallOfWinnersSection() {
  const { competition } = usePublicCompetition();
  const { data: hallOfWinners, loading } = useAppSettings('hall_of_winners');
  const { isMobile } = useResponsive();
  const [instagramMap, setInstagramMap] = useState({});

  const shouldDisplay = hallOfWinners?.displayOnCompetitions?.includes(competition?.id);
  const winners = hallOfWinners?.winners || [];

  // Fetch instagram handles for winners from their profiles
  useEffect(() => {
    if (!winners.length) return;
    const profileIds = winners.slice(0, 5).map(w => w.profileId).filter(Boolean);
    if (!profileIds.length) return;

    supabase
      .from('profiles')
      .select('id, instagram')
      .in('id', profileIds)
      .then(({ data }) => {
        if (data) {
          const map = {};
          data.forEach(p => { if (p.instagram) map[p.id] = p.instagram; });
          setInstagramMap(map);
        }
      });
  }, [winners]);

  if (loading || !hallOfWinners || !shouldDisplay || !winners.length) {
    return null;
  }

  const { year } = hallOfWinners;
  const city = competition?.city;
  const subtitle = [city, year].filter(Boolean).join(' • ');

  const getInstagramUrl = (winner) => {
    const handle = instagramMap[winner.profileId];
    if (!handle) return null;
    const clean = handle.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '');
    return `https://instagram.com/${clean}`;
  };

  return (
    <section style={styles.section}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>Most Eligible Bachelorettes</h3>
        {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
      </div>

      {/* Winners Grid - portrait photo cards */}
      <div style={styles.grid}>
        {winners.slice(0, 5).map((winner, index) => {
          const igUrl = getInstagramUrl(winner);
          const Wrapper = igUrl ? 'a' : 'div';
          const wrapperProps = igUrl
            ? { href: igUrl, target: '_blank', rel: 'noopener noreferrer' }
            : {};

          return (
            <Wrapper
              key={winner.id}
              {...wrapperProps}
              style={{
                ...styles.card,
                width: isMobile ? 'calc(33.33% - 8px)' : 'calc(20% - 10px)',
                cursor: igUrl ? 'pointer' : 'default',
              }}
              onMouseEnter={igUrl ? (e) => {
                e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.55)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              } : undefined}
              onMouseLeave={igUrl ? (e) => {
                e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.25)';
                e.currentTarget.style.transform = 'translateY(0)';
              } : undefined}
            >
              {/* Photo fills the card */}
              {winner.imageUrl ? (
                <img
                  src={transformSupabaseImage(winner.imageUrl, { width: 400, height: 533 })}
                  alt={winner.name}
                  style={styles.photo}
                />
              ) : (
                <div style={styles.photoPlaceholder}>
                  <User size={32} style={{ color: colors.text.muted }} />
                </div>
              )}

              {/* Rank badge */}
              <div style={styles.rankBadge}>
                <span style={styles.rankNumber}>{index + 1}</span>
              </div>

              {/* Name on a gradient background for legibility */}
              <div style={styles.nameOverlay}>
                <p style={styles.name}>{winner.name}</p>
              </div>
            </Wrapper>
          );
        })}
      </div>
    </section>
  );
}

const styles = {
  section: {
    maxWidth: '760px',
    margin: '0 auto',
    marginTop: spacing.xxxl,
    marginBottom: spacing.xxxl,
    padding: spacing.lg,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    margin: 0,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gold.primary,
    margin: 0,
    textAlign: 'center',
    letterSpacing: '0.04em',
  },
  grid: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  card: {
    aspectRatio: '3 / 4',
    display: 'block',
    position: 'relative',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    background: colors.background.elevated,
    border: '1px solid rgba(212, 175, 55, 0.25)',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'border-color 0.2s ease, transform 0.2s ease',
  },
  photo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    width: '24px',
    height: '24px',
    borderRadius: borderRadius.full,
    background: 'rgba(0, 0, 0, 0.65)',
    border: `1px solid ${colors.gold.primary}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.gold.primary,
    lineHeight: 1,
  },
  nameOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: `${spacing.lg} ${spacing.xs} ${spacing.sm}`,
    background: 'linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.5) 55%, rgba(0, 0, 0, 0) 100%)',
    textAlign: 'center',
  },
  name: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    margin: 0,
    lineHeight: 1.2,
  },
};

export default HallOfWinnersSection;
