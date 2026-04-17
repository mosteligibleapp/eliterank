import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { useResponsive } from '../../../hooks/useResponsive';

/**
 * ProfileFans — shows a contestant's fans with avatars and names.
 *
 * @param {string} contestantId - The contestant's ID to fetch fans for
 * @param {boolean} [showEmpty=false] - When true, renders an empty state
 *   instead of hiding the section when there are no fans. Use on the
 *   contestant's own profile so the fans-list target always exists.
 */
export default function ProfileFans({ contestantId, showEmpty = false }) {
  const { isMobile } = useResponsive();
  const [fans, setFans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contestantId || !supabase) {
      setLoading(false);
      return;
    }

    const fetchFans = async () => {
      const { data, error } = await supabase
        .from('contestant_fans')
        .select('user_id, created_at, profile:profiles!contestant_fans_user_id_fkey(first_name, last_name, avatar_url, city)')
        .eq('contestant_id', contestantId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setFans(data);
      }
      setLoading(false);
    };

    fetchFans();
  }, [contestantId]);

  if (loading) return null;
  if (fans.length === 0 && !showEmpty) return null;

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
          <Users size={16} style={{ color: colors.gold.primary }} />
          Your Fans ({fans.length})
        </h3>

        {fans.length === 0 ? (
          <p style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.tertiary,
            margin: 0,
          }}>
            No fans yet. Your fans will appear here once people start supporting you.
          </p>
        ) : (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: spacing.md,
        }}>
          {fans.map((fan) => {
            const profile = fan.profile;
            const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Anonymous';
            const initials = (profile?.first_name?.[0] || '?').toUpperCase();

            return (
              <div
                key={fan.user_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: `${spacing.sm} ${spacing.md}`,
                  background: colors.background.card,
                  border: `1px solid ${colors.border.secondary}`,
                  borderRadius: borderRadius.lg,
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: borderRadius.full,
                  background: profile?.avatar_url
                    ? `url(${profile.avatar_url}) center/cover`
                    : 'rgba(212,175,55,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.gold.primary,
                  flexShrink: 0,
                }}>
                  {!profile?.avatar_url && initials}
                </div>

                {/* Name + city */}
                <div style={{ minWidth: 0 }}>
                  <p style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.text.primary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {name}
                  </p>
                  {profile?.city && (
                    <p style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.text.muted,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {profile.city}
                    </p>
                  )}
                </div>
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
