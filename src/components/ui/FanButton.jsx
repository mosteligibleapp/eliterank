import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useSupabaseAuth } from '../../hooks';
import { useToast } from '../../contexts/ToastContext';
import { getCompetitionUrl, getCompetitionUrlById } from '../../utils/slugs';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';

/**
 * Look up contestant + competition details and fire the fan confirmation
 * email. Kept at module scope so it can be triggered as fire-and-forget
 * without tying into the component render cycle.
 */
async function sendFanConfirmationEmail({ email, contestantId, fanId }) {
  if (!supabase || !email || !contestantId || !fanId) return;

  const { data: contestant } = await supabase
    .from('contestants')
    .select('name, user_id, competition:competitions(name, slug, organization:organizations(slug))')
    .eq('id', contestantId)
    .maybeSingle();

  if (!contestant) return;

  const orgSlug = contestant.competition?.organization?.slug || 'most-eligible';
  const competitionSlug = contestant.competition?.slug;
  const competitionUrl = competitionSlug
    ? `${window.location.origin}${getCompetitionUrl(orgSlug, competitionSlug)}`
    : contestant.competition?.id
      ? `${window.location.origin}${getCompetitionUrlById(orgSlug, contestant.competition.id)}`
      : undefined;
  const profileUrl = contestant.user_id
    ? `${window.location.origin}/profile/${contestant.user_id}`
    : undefined;

  await supabase.functions.invoke('send-onesignal-email', {
    body: {
      type: 'fan_confirmation',
      to_email: email,
      contestant_name: contestant.name,
      competition_name: contestant.competition?.name,
      competition_url: competitionUrl,
      profile_url: profileUrl,
      fan_id: fanId,
    },
  });
}

/**
 * FanButton — "Become a Fan" toggle for contestant profiles.
 * Shows fan count and lets authenticated users fan/unfan.
 *
 * Becoming a fan subscribes the user to a weekly competition update email
 * (the digest itself ships in a follow-up; for now we confirm the sub with
 * a one-time email).
 *
 * @param {string} contestantId - The contestant to fan
 * @param {function} onLoginRequired - Called when unauthenticated user clicks
 */
export default function FanButton({ contestantId, onLoginRequired }) {
  const { user } = useSupabaseAuth();
  const toast = useToast();
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
        const { data: inserted } = await supabase
          .from('contestant_fans')
          .insert({ contestant_id: contestantId, user_id: user.id })
          .select('id')
          .single();
        setIsFan(true);
        setFanCount(prev => prev + 1);

        toast.success(
          "You're a fan! We'll email you weekly competition updates for this contestant.",
          5000,
        );

        // Fire-and-forget: send a confirmation email letting the fan know
        // they'll receive weekly competition updates. Non-blocking — if the
        // email fails, the fan relationship is still recorded.
        if (user.email && inserted?.id) {
          sendFanConfirmationEmail({
            email: user.email,
            contestantId,
            fanId: inserted.id,
          }).catch(err => console.warn('Fan confirmation email failed:', err));
        }
      }
    } catch (err) {
      console.error('Fan toggle failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email, contestantId, isFan, loading, onLoginRequired, toast]);

  const tooltip = isFan
    ? "You'll receive weekly competition updates for this contestant"
    : 'Become a fan to get weekly competition updates for this contestant';

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      title={tooltip}
      aria-label={tooltip}
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
