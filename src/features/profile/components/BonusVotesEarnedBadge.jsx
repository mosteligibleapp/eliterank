import { useState, useEffect } from 'react';
import { Trophy, Star } from 'lucide-react';
import { Panel } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { useResponsive } from '../../../hooks/useResponsive';
import { getAllBonusVotesEarnedStatus } from '../../../lib/bonusVotes';

/**
 * BonusVotesEarnedBadge - Displays a trophy badge on the profile when
 * the user has earned all bonus votes. Visible to both the user and the public.
 */
export default function BonusVotesEarnedBadge({ userId }) {
  const { isMobile } = useResponsive();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    getAllBonusVotesEarnedStatus(userId)
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading || !status?.allEarned) return null;

  return (
    <Panel style={{ marginBottom: isMobile ? spacing.md : spacing.xl, overflow: 'hidden' }}>
      <div style={{
        borderTop: '2px solid rgba(34, 197, 94, 0.6)',
      }}>
        <div style={{
          padding: isMobile ? spacing.lg : spacing.xxl,
          background: 'rgba(34, 197, 94, 0.04)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
          }}>
            {/* Trophy icon */}
            <div style={{
              width: isMobile ? '44px' : '52px',
              height: isMobile ? '44px' : '52px',
              borderRadius: borderRadius.xl,
              background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.08))',
              border: '1px solid rgba(34,197,94,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Trophy size={isMobile ? 22 : 26} style={{ color: '#22c55e' }} />
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
              }}>
                <h3 style={{
                  fontSize: isMobile ? typography.fontSize.md : typography.fontSize.lg,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                }}>
                  All Bonus Votes Earned
                </h3>
                <Star size={isMobile ? 14 : 16} style={{ color: colors.gold.primary, fill: colors.gold.primary }} />
              </div>
              <p style={{
                fontSize: isMobile ? typography.fontSize.xs : typography.fontSize.sm,
                color: colors.text.secondary,
                marginTop: '2px',
              }}>
                {status.totalEarned} bonus votes earned
              </p>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
