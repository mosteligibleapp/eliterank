import { useState, useEffect, useCallback } from 'react';
import { Mail } from 'lucide-react';
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
 *
 * Clicking "Become a Fan" opens an opt-in confirmation modal that discloses
 * the weekly email subscription. The DB insert + email only happens after
 * the user confirms. Unfanning is a single click (they already opted in).
 *
 * @param {string} contestantId - The contestant to fan
 * @param {string} [contestantName] - Optional name for the opt-in copy
 * @param {function} onLoginRequired - Called when unauthenticated user clicks
 */
export default function FanButton({ contestantId, contestantName, onLoginRequired }) {
  const { user } = useSupabaseAuth();
  const toast = useToast();
  const [isFan, setIsFan] = useState(false);
  const [fanCount, setFanCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const displayName = contestantName?.trim() || 'this contestant';

  // Fetch fan status and count
  useEffect(() => {
    if (!contestantId || !supabase) return;

    const fetchFanData = async () => {
      const { count } = await supabase
        .from('contestant_fans')
        .select('*', { count: 'exact', head: true })
        .eq('contestant_id', contestantId);

      setFanCount(count || 0);

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

  const handleClick = useCallback(() => {
    if (!user?.id) {
      onLoginRequired?.();
      return;
    }
    if (loading || !supabase) return;

    if (isFan) {
      // Already opted in — one-click unfan
      unfan();
    } else {
      // Not a fan yet — open opt-in dialog
      setShowConfirm(true);
    }
  }, [user?.id, isFan, loading, onLoginRequired]);

  const unfan = useCallback(async () => {
    setLoading(true);
    try {
      await supabase
        .from('contestant_fans')
        .delete()
        .eq('contestant_id', contestantId)
        .eq('user_id', user.id);
      setIsFan(false);
      setFanCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Fan toggle failed:', err);
    } finally {
      setLoading(false);
    }
  }, [contestantId, user?.id]);

  const confirmBecomeFan = useCallback(async () => {
    if (!user?.id || loading) return;

    setLoading(true);
    try {
      const { data: inserted } = await supabase
        .from('contestant_fans')
        .insert({ contestant_id: contestantId, user_id: user.id })
        .select('id')
        .single();
      setIsFan(true);
      setFanCount(prev => prev + 1);
      setShowConfirm(false);

      toast.success(
        `You're a fan of ${displayName}! Check your inbox for a confirmation.`,
        5000,
      );

      if (user.email && inserted?.id) {
        sendFanConfirmationEmail({
          email: user.email,
          contestantId,
          fanId: inserted.id,
        }).catch(err => console.warn('Fan confirmation email failed:', err));
      }
    } catch (err) {
      console.error('Fan opt-in failed:', err);
      toast.error('Could not save your fan status. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email, contestantId, loading, toast, displayName]);

  const tooltip = isFan
    ? "You'll receive weekly competition updates for this contestant"
    : 'Become a fan to get weekly competition updates for this contestant';

  return (
    <>
      <button
        onClick={handleClick}
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

      {showConfirm && (
        <FanOptInDialog
          contestantName={displayName}
          loading={loading}
          onCancel={() => setShowConfirm(false)}
          onConfirm={confirmBecomeFan}
        />
      )}
    </>
  );
}

/**
 * Opt-in confirmation dialog. Discloses the weekly email subscription before
 * the fan relationship and email are created.
 */
function FanOptInDialog({ contestantName, loading, onCancel, onConfirm }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: spacing.xl,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: colors.background.primary,
          borderRadius: borderRadius.xl,
          border: `1px solid ${colors.border.gold || 'rgba(212,175,55,0.3)'}`,
          maxWidth: '440px',
          width: '100%',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: spacing.xl }}>
          <div style={{
            width: '44px',
            height: '44px',
            background: 'rgba(212,175,55,0.15)',
            borderRadius: borderRadius.lg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.md,
          }}>
            <Mail size={20} style={{ color: colors.gold.primary }} />
          </div>

          <h2 style={{
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            margin: 0,
            marginBottom: spacing.sm,
          }}>
            Become a Fan of {contestantName}?
          </h2>

          <p style={{
            color: colors.text.secondary,
            fontSize: typography.fontSize.md,
            lineHeight: 1.6,
            margin: 0,
            marginBottom: spacing.xl,
          }}>
            You'll receive a <strong style={{ color: colors.text.primary }}>weekly email</strong> with competition performance updates — round standings, milestones, and when it's time to vote again. You can unsubscribe any time with one tap from the email.
          </p>

          <div style={{ display: 'flex', gap: spacing.md }}>
            <button
              onClick={onCancel}
              disabled={loading}
              style={{
                flex: 1,
                padding: `${spacing.sm} ${spacing.md}`,
                background: 'transparent',
                border: `1px solid ${colors.border.primary || 'rgba(255,255,255,0.1)'}`,
                borderRadius: borderRadius.lg,
                color: colors.text.secondary,
                fontSize: typography.fontSize.md,
                fontWeight: typography.fontWeight.semibold,
                cursor: loading ? 'wait' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              style={{
                flex: 1,
                padding: `${spacing.sm} ${spacing.md}`,
                background: 'linear-gradient(135deg, #d4af37, #f4d03f)',
                border: 'none',
                borderRadius: borderRadius.lg,
                color: '#000',
                fontSize: typography.fontSize.md,
                fontWeight: typography.fontWeight.bold,
                cursor: loading ? 'wait' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Confirming…' : 'Become a Fan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
