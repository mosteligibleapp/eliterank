import { useState, useEffect, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSupabaseAuth } from '../../hooks';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';

/**
 * FanButton — "Become a Fan" toggle for contestant profiles.
 * Shows fan count and lets authenticated users fan/unfan.
 *
 * @param {string} contestantId - The contestant to fan
 * @param {function} onLoginRequired - Called when unauthenticated user clicks
 */
export default function FanButton({ contestantId, onLoginRequired }) {
  const { user } = useSupabaseAuth();
  const [isFan, setIsFan] = useState(false);
  const [fanCount, setFanCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch fan status and count
  useEffect(() => {
    if (!contestantId || !supabase) return;

    const fetchFanData = async () => {
      // Get count
      const { count } = await supabase
        .from('contestant_fans')
        .select('*', { count: 'exact', head: true })
        .eq('contestant_id', contestantId);

      setFanCount(count || 0);

      // Check if current user is a fan
      if (user?.id) {
        const { data } = await supabase
          .from('contestant_fans')
          .select('id')
          .eq('contestant_id', contestantId)
          .eq('user_id', user.id)
          .maybeSingle();

        setIsFan(!!data);
      }
    };

    fetchFanData();
  }, [contestantId, user?.id]);

  const handleToggle = useCallback(async () => {
    if (!user?.id) {
      onLoginRequired?.();
      return;
    }
    if (loading || !supabase) return;

    setLoading(true);
    try {
      if (isFan) {
        await supabase
          .from('contestant_fans')
          .delete()
          .eq('contestant_id', contestantId)
          .eq('user_id', user.id);
        setIsFan(false);
        setFanCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase
          .from('contestant_fans')
          .insert({ contestant_id: contestantId, user_id: user.id });
        setIsFan(true);
        setFanCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('Fan toggle failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, contestantId, isFan, loading, onLoginRequired]);

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        padding: `${spacing.xs} ${spacing.md}`,
        background: isFan
          ? 'rgba(212,175,55,0.15)'
          : 'rgba(255,255,255,0.06)',
        border: `1px solid ${isFan ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: borderRadius.pill,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        color: isFan ? colors.gold.primary : colors.text.secondary,
        cursor: loading ? 'wait' : 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      <Heart
        size={14}
        style={{
          fill: isFan ? colors.gold.primary : 'none',
          transition: 'fill 0.2s ease',
        }}
      />
      {isFan ? 'Fan' : 'Become a Fan'}
      {fanCount > 0 && (
        <span style={{
          marginLeft: '2px',
          fontSize: typography.fontSize.xs,
          opacity: 0.7,
        }}>
          {fanCount.toLocaleString()}
        </span>
      )}
    </button>
  );
}
