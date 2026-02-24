import { useState, useEffect, useCallback } from 'react';
import { Gift, Package, ChevronRight, AlertCircle, Loader } from 'lucide-react';
import { Panel } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { useResponsive } from '../../../hooks/useResponsive';
import { supabase } from '../../../lib/supabase';

/**
 * ProfileRewardsCard - Compact rewards summary for the profile sidebar.
 * Shows pending/active reward counts with a link to the full rewards page.
 * Only renders when the user has rewards to show.
 */
export default function ProfileRewardsCard({ userId }) {
  const { isMobile } = useResponsive();
  const [rewards, setRewards] = useState({ pending: [], active: [], total: 0 });
  const [loading, setLoading] = useState(true);

  const fetchRewards = useCallback(async () => {
    if (!userId || !supabase) {
      setLoading(false);
      return;
    }

    try {
      // Get contestant and nominee IDs for this user
      const [contestantsRes, nomineesRes] = await Promise.all([
        supabase.from('contestants').select('id').eq('user_id', userId),
        supabase.from('nominees').select('id').eq('user_id', userId),
      ]);

      const contestantIds = (contestantsRes.data || []).map(c => c.id);
      const nomineeIds = (nomineesRes.data || []).map(n => n.id);

      if (contestantIds.length === 0 && nomineeIds.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch reward assignments
      const queries = [];
      if (contestantIds.length > 0) {
        queries.push(
          supabase
            .from('reward_assignments')
            .select('id, status, reward:rewards(name, image_url, brand_name, cash_value)')
            .in('contestant_id', contestantIds)
        );
      }
      if (nomineeIds.length > 0) {
        queries.push(
          supabase
            .from('reward_assignments')
            .select('id, status, reward:rewards(name, image_url, brand_name, cash_value)')
            .in('nominee_id', nomineeIds)
        );
      }

      const results = await Promise.all(queries);
      const allAssignments = [];
      const seenIds = new Set();
      for (const res of results) {
        if (res.error) continue;
        for (const a of (res.data || [])) {
          if (!seenIds.has(a.id)) {
            seenIds.add(a.id);
            allAssignments.push(a);
          }
        }
      }

      setRewards({
        pending: allAssignments.filter(a => a.status === 'pending'),
        active: allAssignments.filter(a => ['claimed', 'shipped', 'active'].includes(a.status)),
        total: allAssignments.length,
      });
    } catch (err) {
      console.error('Error fetching profile rewards:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  // Don't render anything while loading or if no rewards
  if (loading || rewards.total === 0) return null;

  const hasPending = rewards.pending.length > 0;
  const hasActive = rewards.active.length > 0;

  // Show the first reward's image as a preview
  const previewReward = (rewards.pending[0] || rewards.active[0])?.reward;

  return (
    <Panel style={{ marginBottom: isMobile ? spacing.md : spacing.xl, overflow: 'hidden' }}>
      {/* Header with gold accent border */}
      <div style={{
        borderTop: hasPending ? '2px solid #eab308' : `2px solid ${colors.gold.primary}`,
      }}>
        <div style={{ padding: isMobile ? spacing.lg : spacing.xxl }}>
          {/* Title row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.lg,
          }}>
            <h3 style={{
              fontSize: isMobile ? typography.fontSize.lg : typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.md,
            }}>
              <Gift size={isMobile ? 18 : 20} style={{ color: colors.gold.primary }} />
              Rewards
            </h3>
            {hasPending && (
              <span style={{
                background: '#eab308',
                color: '#000',
                fontSize: isMobile ? '10px' : typography.fontSize.xs,
                fontWeight: typography.fontWeight.bold,
                padding: `2px ${spacing.sm}`,
                borderRadius: borderRadius.pill,
              }}>
                {rewards.pending.length} pending
              </span>
            )}
          </div>

          {/* Reward preview cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            {/* Pending rewards */}
            {hasPending && rewards.pending.slice(0, 2).map((assignment) => (
              <div
                key={assignment.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: isMobile ? spacing.sm : spacing.md,
                  background: 'rgba(234,179,8,0.08)',
                  border: '1px solid rgba(234,179,8,0.15)',
                  borderRadius: borderRadius.lg,
                }}
              >
                <div style={{
                  width: isMobile ? '36px' : '44px',
                  height: isMobile ? '36px' : '44px',
                  borderRadius: borderRadius.md,
                  background: assignment.reward?.image_url
                    ? `url(${assignment.reward.image_url}) center/cover no-repeat`
                    : 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(139,92,246,0.1))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {!assignment.reward?.image_url && (
                    <Package size={isMobile ? 16 : 20} style={{ color: 'rgba(212,175,55,0.5)' }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: isMobile ? typography.fontSize.sm : typography.fontSize.md,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.text.primary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {assignment.reward?.name || 'Reward'}
                  </p>
                  <p style={{
                    fontSize: isMobile ? '10px' : typography.fontSize.xs,
                    color: '#eab308',
                    fontWeight: typography.fontWeight.medium,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <AlertCircle size={isMobile ? 10 : 12} /> Claim now
                  </p>
                </div>
                {assignment.reward?.cash_value && (
                  <span style={{
                    fontSize: isMobile ? '10px' : typography.fontSize.xs,
                    fontWeight: typography.fontWeight.bold,
                    color: '#22c55e',
                    flexShrink: 0,
                  }}>
                    ${assignment.reward.cash_value}
                  </span>
                )}
              </div>
            ))}

            {/* Active rewards */}
            {hasActive && rewards.active.slice(0, hasPending ? 1 : 2).map((assignment) => (
              <div
                key={assignment.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: isMobile ? spacing.sm : spacing.md,
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: borderRadius.lg,
                }}
              >
                <div style={{
                  width: isMobile ? '36px' : '44px',
                  height: isMobile ? '36px' : '44px',
                  borderRadius: borderRadius.md,
                  background: assignment.reward?.image_url
                    ? `url(${assignment.reward.image_url}) center/cover no-repeat`
                    : 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(139,92,246,0.1))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {!assignment.reward?.image_url && (
                    <Package size={isMobile ? 16 : 20} style={{ color: 'rgba(212,175,55,0.5)' }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: isMobile ? typography.fontSize.sm : typography.fontSize.md,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.text.primary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {assignment.reward?.name || 'Reward'}
                  </p>
                  {assignment.reward?.brand_name && (
                    <p style={{
                      fontSize: isMobile ? '10px' : typography.fontSize.xs,
                      color: colors.text.secondary,
                    }}>
                      {assignment.reward.brand_name}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* View all link */}
          <a
            href="/rewards"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.xs,
              marginTop: spacing.lg,
              padding: isMobile ? spacing.sm : spacing.md,
              background: 'rgba(212,175,55,0.08)',
              border: `1px solid rgba(212,175,55,0.15)`,
              borderRadius: borderRadius.lg,
              color: colors.gold.primary,
              fontSize: isMobile ? typography.fontSize.sm : typography.fontSize.md,
              fontWeight: typography.fontWeight.medium,
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            View all rewards
            <ChevronRight size={isMobile ? 14 : 16} />
          </a>
        </div>
      </div>
    </Panel>
  );
}
