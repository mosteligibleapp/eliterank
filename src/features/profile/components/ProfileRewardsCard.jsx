import { useState, useEffect, useCallback } from 'react';
import { Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { supabase } from '../../../lib/supabase';
import ClaimRewardModal from '../../../components/modals/ClaimRewardModal';

/**
 * ProfileRewardsCard - Gift box icon that opens rewards.
 * Shows a pending badge count. Clicking opens claim modal (if pending) or /rewards page.
 * Only renders when the user has rewards.
 */
export default function ProfileRewardsCard({ userId }) {
  const navigate = useNavigate();
  const [rewards, setRewards] = useState({ pending: [], active: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [claimModal, setClaimModal] = useState({ isOpen: false, assignment: null });

  const fetchRewards = useCallback(async () => {
    if (!userId || !supabase) {
      setLoading(false);
      return;
    }

    try {
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

      const rewardSelect = 'id, status, discount_code, tracking_link, reward:rewards(id, name, image_url, brand_name, cash_value, is_affiliate, terms, commission_rate, requires_promotion, description)';
      const queries = [];
      if (contestantIds.length > 0) {
        queries.push(
          supabase.from('reward_assignments').select(rewardSelect).in('contestant_id', contestantIds)
        );
      }
      if (nomineeIds.length > 0) {
        queries.push(
          supabase.from('reward_assignments').select(rewardSelect).in('nominee_id', nomineeIds)
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

  if (loading || rewards.total === 0) return null;

  const hasPending = rewards.pending.length > 0;

  const handleClick = () => {
    if (hasPending) {
      // Open claim modal for the first pending reward
      setClaimModal({ isOpen: true, assignment: rewards.pending[0] });
    } else {
      navigate('/rewards');
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        title={hasPending ? `${rewards.pending.length} reward${rewards.pending.length > 1 ? 's' : ''} to claim` : 'View rewards'}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '56px',
          height: '56px',
          background: hasPending ? 'rgba(234,179,8,0.12)' : 'rgba(212,175,55,0.08)',
          border: `1px solid ${hasPending ? 'rgba(234,179,8,0.3)' : 'rgba(212,175,55,0.15)'}`,
          borderRadius: borderRadius.xl,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginBottom: spacing.md,
        }}
      >
        <Gift size={24} style={{ color: colors.gold.primary }} />
        {hasPending && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            minWidth: '20px',
            height: '20px',
            background: '#eab308',
            color: '#000',
            fontSize: '11px',
            fontWeight: typography.fontWeight.bold,
            borderRadius: borderRadius.pill,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 5px',
          }}>
            {rewards.pending.length}
          </span>
        )}
      </button>

      <ClaimRewardModal
        isOpen={claimModal.isOpen}
        onClose={() => setClaimModal({ isOpen: false, assignment: null })}
        assignment={claimModal.assignment}
        userId={userId}
        onClaimed={fetchRewards}
      />
    </>
  );
}
