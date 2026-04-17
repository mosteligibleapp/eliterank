import { useState, useEffect, useCallback } from 'react';
import { Heart, Bell, BellOff } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { useResponsive } from '../../../hooks/useResponsive';

/**
 * ProfileFanOf — list of contestants the given user is a fan of.
 *
 * Renders one row per fan relationship with the contestant's avatar,
 * name, and competition. When canMute is true, each row also shows a
 * bell toggle that flips contestant_fans.email_weekly_updates for that
 * row. RLS enforces that only the owner can update.
 *
 * @param {string} userId - The user whose "Fan of" list to display
 * @param {boolean} [canMute=false] - Show the mute bell (own profile only)
 * @param {boolean} [showEmpty=false] - Render empty state instead of null
 *   when there are no rows. Use on own profile so the scroll target
 *   always exists.
 */
export default function ProfileFanOf({ userId, canMute = false, showEmpty = false }) {
  const { isMobile } = useResponsive();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !supabase) {
      setLoading(false);
      return;
    }

    const fetchFanOf = async () => {
      const { data, error } = await supabase
        .from('contestant_fans')
        .select('id, created_at, email_weekly_updates, contestant:contestants(id, name, avatar_url, user_id, competition:competitions(name))')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Drop any orphan rows where the contestant was deleted.
        setRows(data.filter((r) => r.contestant));
      }
      setLoading(false);
    };

    fetchFanOf();
  }, [userId]);

  const toggleMute = useCallback(async (rowId, nextValue, contestantName) => {
    const { error } = await supabase
      .from('contestant_fans')
      .update({ email_weekly_updates: nextValue })
      .eq('id', rowId);

    if (error) {
      toast.error('Could not update preference. Please try again.');
      return;
    }

    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, email_weekly_updates: nextValue } : r))
    );
    toast.success(
      nextValue
        ? `You'll get weekly updates for ${contestantName} again.`
        : `Muted weekly updates for ${contestantName}. You're still a fan.`,
      4000,
    );
  }, [toast]);

  if (loading) return null;
  if (rows.length === 0 && !showEmpty) return null;

  return (
    <div style={{ padding: `0 ${isMobile ? spacing.lg : spacing.xxl}` }}>
      <div style={dividerStyle} />
      <div style={{ padding: `${spacing.lg} 0` }}>
        <h3 style={{
          fontSize: typography.fontSize.md,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.primary,
          marginBottom: spacing.md,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
        }}>
          <Heart size={16} style={{ color: colors.gold.primary }} />
          Fan of ({rows.length})
        </h3>

        {rows.length === 0 ? (
          <p style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.tertiary,
            margin: 0,
          }}>
            You're not a fan of anyone yet. Support contestants and they'll appear here.
          </p>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.sm,
          }}>
            {rows.map((row) => {
              const c = row.contestant;
              const initials = (c.name?.[0] || '?').toUpperCase();
              const profileHref = c.user_id ? `/profile/${c.user_id}` : null;
              const muted = !row.email_weekly_updates;

              return (
                <div
                  key={row.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: `${spacing.sm} ${spacing.md}`,
                    background: colors.background.card,
                    border: `1px solid ${colors.border.secondary}`,
                    borderRadius: borderRadius.lg,
                  }}
                >
                  <a
                    href={profileHref || undefined}
                    onClick={(e) => { if (!profileHref) e.preventDefault(); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.md,
                      flex: 1,
                      minWidth: 0,
                      textDecoration: 'none',
                      color: 'inherit',
                      cursor: profileHref ? 'pointer' : 'default',
                    }}
                  >
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: borderRadius.full,
                      background: c.avatar_url
                        ? `url(${c.avatar_url}) center/cover`
                        : 'rgba(212,175,55,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.gold.primary,
                      flexShrink: 0,
                    }}>
                      {!c.avatar_url && initials}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium,
                        color: colors.text.primary,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        margin: 0,
                      }}>
                        {c.name}
                      </p>
                      {c.competition?.name && (
                        <p style={{
                          fontSize: typography.fontSize.xs,
                          color: colors.text.muted,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          margin: 0,
                        }}>
                          {c.competition.name}
                        </p>
                      )}
                    </div>
                  </a>

                  {canMute && (
                    <button
                      onClick={() => toggleMute(row.id, muted, c.name)}
                      title={muted ? 'Resume weekly updates' : 'Mute weekly updates'}
                      aria-label={muted ? 'Resume weekly updates' : 'Mute weekly updates'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        borderRadius: borderRadius.full,
                        background: muted
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(212,175,55,0.15)',
                        border: `1px solid ${muted ? 'rgba(255,255,255,0.1)' : 'rgba(212,175,55,0.3)'}`,
                        color: muted ? colors.text.muted : colors.gold.primary,
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {muted ? <BellOff size={14} /> : <Bell size={14} />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const dividerStyle = {
  borderTop: `1px solid ${colors.border.secondary}`,
};
