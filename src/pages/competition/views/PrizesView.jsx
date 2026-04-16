import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { PrizePool } from '../components/PrizePool';
import { CrownIcon } from '../../../components/ui/icons';
import { Gift, Trophy, Package } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';

const styles = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: `${spacing.xl} ${spacing.lg}`,
  },
  prizePoolWrap: {
    marginBottom: spacing.xxxl,
  },
  sectionHeader: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.lg,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: spacing.xl,
  },
  gridMobile: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: spacing.md,
  },
  sectionSpacing: {
    marginBottom: spacing.xxxl,
  },
  emptyState: {
    textAlign: 'center',
    padding: spacing.xxxl,
    background: colors.background.card,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.xxl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.md,
  },
  emptyDescription: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.lg,
    maxWidth: '500px',
    margin: '0 auto',
  },
};

/**
 * Prizes page — public view of competition prizes.
 * Mirrors the "Competition Prizes" section from the contestant rewards page.
 */
export function PrizesView() {
  const { prizes, prizePool } = usePublicCompetition();

  const hasPrizes = prizes && prizes.length > 0;

  // Split prizes by type (same logic as internal RewardsPage)
  const winnerPrizes = hasPrizes
    ? prizes.filter(p => (p.prize_type || 'winner') === 'winner')
    : [];
  const contestantRewards = hasPrizes
    ? prizes.filter(p => p.prize_type === 'contestant')
    : [];

  // Detect mobile via window width (matches useResponsive pattern)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div style={styles.container}>
      {/* Prize Pool */}
      {prizePool && (
        <div style={styles.prizePoolWrap}>
          <PrizePool />
        </div>
      )}

      {/* Contestant Rewards */}
      {contestantRewards.length > 0 && (
        <div style={styles.sectionSpacing}>
          <h3 style={styles.sectionHeader}>
            <Gift size={18} style={{ color: colors.gold.primary }} />
            Contestant Rewards
          </h3>
          <div style={isMobile ? styles.gridMobile : styles.grid}>
            {contestantRewards.map(prize => (
              <PrizeCard key={prize.id} prize={prize} isMobile={isMobile} />
            ))}
          </div>
        </div>
      )}

      {/* Winner's Prize Package */}
      {winnerPrizes.length > 0 && (
        <div style={styles.sectionSpacing}>
          <h3 style={styles.sectionHeader}>
            <CrownIcon size={20} color={colors.gold.primary} />
            Winner&apos;s Prize Package
          </h3>
          <div style={isMobile ? styles.gridMobile : styles.grid}>
            {winnerPrizes.map(prize => (
              <PrizeCard key={prize.id} prize={prize} isMobile={isMobile} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasPrizes && (
        <div style={styles.emptyState}>
          <Trophy size={64} style={{ color: colors.text.muted, marginBottom: spacing.xl }} />
          <h2 style={styles.emptyTitle}>Prizes Coming Soon</h2>
          <p style={styles.emptyDescription}>
            Competition prizes will be announced here. Check back soon!
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * PrizeCard — displays a single competition prize.
 * Matches the CompetitionPrizeCard from RewardsPage.
 */
function PrizeCard({ prize, isMobile }) {
  const Wrapper = prize.external_url ? 'a' : 'div';
  const wrapperProps = prize.external_url
    ? { href: prize.external_url, target: '_blank', rel: 'noopener noreferrer', style: { textDecoration: 'none', color: 'inherit' } }
    : {};

  return (
    <Wrapper {...wrapperProps}>
      <div
        style={{
          display: 'block',
          overflow: 'hidden',
          minWidth: 0,
          transition: 'transform 0.2s ease',
          cursor: prize.external_url ? 'pointer' : 'default',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {/* Cover Image */}
        <div style={{
          width: '100%',
          aspectRatio: '3 / 2',
          borderRadius: isMobile ? borderRadius.lg : borderRadius.xl,
          overflow: 'hidden',
          position: 'relative',
          background: prize.image_url
            ? `url(${prize.image_url}) center/cover no-repeat`
            : `linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.05) 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {!prize.image_url && (
            <Trophy size={isMobile ? 32 : 56} style={{ color: 'rgba(212,175,55,0.35)' }} />
          )}

          {/* Bottom gradient fade */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '50%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
            pointerEvents: 'none',
          }} />

          {/* Sponsor badge - bottom left */}
          {prize.sponsor_name && (
            <div style={{
              position: 'absolute',
              bottom: isMobile ? spacing.sm : spacing.md,
              left: isMobile ? spacing.sm : spacing.md,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(8px)',
              borderRadius: '20px',
              padding: isMobile ? `2px ${spacing.sm}` : `4px ${spacing.md}`,
              fontSize: isMobile ? '10px' : typography.fontSize.xs,
              color: colors.gold.primary,
              fontWeight: typography.fontWeight.medium,
              letterSpacing: '0.3px',
              maxWidth: isMobile ? '80%' : 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {prize.sponsor_name}
            </div>
          )}

          {/* Value badge - bottom right */}
          {prize.value && (
            <div style={{
              position: 'absolute',
              bottom: isMobile ? spacing.sm : spacing.md,
              right: isMobile ? spacing.sm : spacing.md,
              background: 'rgba(34, 197, 94, 0.9)',
              backdropFilter: 'blur(8px)',
              borderRadius: '20px',
              padding: isMobile ? `2px ${spacing.sm}` : `4px ${spacing.md}`,
              fontSize: isMobile ? '10px' : typography.fontSize.xs,
              fontWeight: typography.fontWeight.bold,
              color: '#fff',
            }}>
              ${Number(prize.value).toLocaleString()}
            </div>
          )}
        </div>

        {/* Card Info */}
        <div style={{ padding: `${isMobile ? spacing.sm : spacing.md} 2px 0` }}>
          <h3 style={{
            fontSize: isMobile ? typography.fontSize.sm : typography.fontSize.md,
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            marginBottom: '2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {prize.title}
          </h3>

          {prize.description && !isMobile && (
            <p style={{
              fontSize: typography.fontSize.sm,
              color: colors.text.tertiary,
              marginBottom: spacing.xs,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.4,
            }}>
              {prize.description}
            </p>
          )}
        </div>
      </div>
    </Wrapper>
  );
}

export default PrizesView;
