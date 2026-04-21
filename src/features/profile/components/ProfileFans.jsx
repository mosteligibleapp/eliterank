import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';

/**
 * ProfileFans — Instagram-style modal listing a contestant's fans.
 *
 * @param {string} contestantId - The contestant's ID to fetch fans for
 * @param {boolean} isOpen - Controls visibility
 * @param {() => void} onClose - Fires when the overlay or X is clicked
 */
export default function ProfileFans({ contestantId, isOpen, onClose }) {
  const [fans, setFans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !contestantId || !supabase) return;

    let cancelled = false;
    setLoading(true);

    const fetchFans = async () => {
      // contestant_fans.user_id references auth.users (not profiles), so
      // PostgREST can't embed profiles via the FK hint. Fetch fan rows and
      // profile details in two steps.
      const { data: fanRows, error: fansErr } = await supabase
        .from('contestant_fans')
        .select('user_id, created_at')
        .eq('contestant_id', contestantId)
        .order('created_at', { ascending: false });

      if (cancelled) return;
      if (fansErr || !fanRows || fanRows.length === 0) {
        setFans([]);
        setLoading(false);
        return;
      }

      const userIds = fanRows.map((f) => f.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, city')
        .in('id', userIds);

      if (cancelled) return;
      const profileById = new Map((profiles || []).map((p) => [p.id, p]));
      setFans(
        fanRows.map((f) => ({
          user_id: f.user_id,
          created_at: f.created_at,
          profile: profileById.get(f.user_id) || null,
        })),
      );
      setLoading(false);
    };

    fetchFans();
    return () => { cancelled = true; };
  }, [isOpen, contestantId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.card} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Fans {fans.length > 0 && `(${fans.length})`}</h3>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div style={styles.list}>
          {loading ? (
            <p style={styles.muted}>Loading…</p>
          ) : fans.length === 0 ? (
            <p style={styles.muted}>
              No fans yet. Your fans will appear here once people start supporting you.
            </p>
          ) : (
            fans.map((fan) => {
              const profile = fan.profile;
              const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Anonymous';
              const initials = (profile?.first_name?.[0] || '?').toUpperCase();
              return (
                <div key={fan.user_id} style={styles.row}>
                  <div
                    style={{
                      ...styles.avatar,
                      background: profile?.avatar_url
                        ? `url(${profile.avatar_url}) center/cover`
                        : 'rgba(212,175,55,0.15)',
                    }}
                  >
                    {!profile?.avatar_url && initials}
                  </div>
                  <div style={styles.textCol}>
                    <p style={styles.name}>{name}</p>
                    {profile?.city && <p style={styles.city}>{profile.city}</p>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(8px)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    background: colors.background.primary,
    border: `1px solid ${colors.border.light}`,
    borderRadius: borderRadius.xxl,
    width: '100%',
    maxWidth: '460px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${spacing.lg} ${spacing.xl}`,
    borderBottom: `1px solid ${colors.border.secondary}`,
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: colors.text.tertiary,
    cursor: 'pointer',
    padding: spacing.xs,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    overflowY: 'auto',
    padding: `${spacing.sm} 0`,
    flex: 1,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    padding: `${spacing.sm} ${spacing.xl}`,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gold.primary,
    flexShrink: 0,
  },
  textCol: {
    minWidth: 0,
    flex: 1,
  },
  name: {
    margin: 0,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  city: {
    margin: 0,
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  muted: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    margin: 0,
    padding: `${spacing.lg} ${spacing.xl}`,
  },
};
