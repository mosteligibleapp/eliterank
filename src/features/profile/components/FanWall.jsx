import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, EyeOff, Eye, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useSupabaseAuth } from '../../../hooks';
import { useToast } from '../../../contexts/ToastContext';
import { useIsPreview } from '../../../contexts/PublicCompetitionContext';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';

const MAX_LENGTH = 280;

/** Compact "x ago" formatter — no dependency on a date library. */
function timeAgo(iso) {
  if (!iso) return '';
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * FanWall — a "Fan Wall" section where fans leave public comments ("cheers")
 * on a contestant's profile.
 *
 * - Only fans (people who tapped "Become a Fan") can post.
 * - Comments are public the moment they're posted.
 * - The profile owner can hide/unhide or delete any comment; an author can
 *   delete their own. Visibility is enforced by RLS (migration 079) — this UI
 *   just surfaces the controls.
 *
 * @param {string} contestantId   - contestants.id the wall belongs to
 * @param {string} [contestantName]
 * @param {boolean} isOwner        - viewer owns this contestant profile
 * @param {(returnTo: string) => void} [onLoginRequired]
 */
export default function FanWall({ contestantId, contestantName, isOwner = false, onLoginRequired }) {
  const { user } = useSupabaseAuth();
  const toast = useToast();
  const isPreview = useIsPreview();

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFan, setIsFan] = useState(false);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  // Cache profile lookups (comments.user_id -> profile) since user_id points at
  // auth.users, not profiles, so PostgREST can't embed them via an FK hint.
  const profileCache = useRef(new Map());

  const firstName = contestantName?.trim()?.split(' ')[0] || 'this contestant';

  const hydrate = useCallback(async (rows) => {
    const missing = [...new Set(rows.map((r) => r.user_id))].filter(
      (id) => !profileCache.current.has(id),
    );
    if (missing.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', missing);
      (profiles || []).forEach((p) => profileCache.current.set(p.id, p));
    }
    return rows.map((r) => ({ ...r, profile: profileCache.current.get(r.user_id) || null }));
  }, []);

  // Initial load: comments + the viewer's fan status.
  useEffect(() => {
    if (!contestantId || !supabase) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data: rows } = await supabase
        .from('contestant_comments')
        .select('id, user_id, body, hidden, created_at')
        .eq('contestant_id', contestantId)
        .order('created_at', { ascending: false });

      const hydrated = await hydrate(rows || []);
      if (cancelled) return;
      setComments(hydrated);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [contestantId, hydrate]);

  useEffect(() => {
    if (!contestantId || !supabase || !user?.id) {
      setIsFan(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('contestant_fans')
        .select('id')
        .eq('contestant_id', contestantId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelled) setIsFan(!!data);
    })();
    return () => { cancelled = true; };
  }, [contestantId, user?.id]);

  // Realtime: keep the wall live as cheers arrive / are moderated.
  useEffect(() => {
    if (!contestantId || !supabase) return;
    const channel = supabase
      .channel(`fan-wall-${contestantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contestant_comments', filter: `contestant_id=eq.${contestantId}` },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const [row] = await hydrate([payload.new]);
            setComments((prev) => (prev.some((c) => c.id === row.id) ? prev : [row, ...prev]));
          } else if (payload.eventType === 'UPDATE') {
            setComments((prev) => prev.map((c) => (c.id === payload.new.id ? { ...c, ...payload.new } : c)));
          } else if (payload.eventType === 'DELETE') {
            setComments((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [contestantId, hydrate]);

  const handlePost = useCallback(async () => {
    const text = body.trim();
    if (!text || posting) return;
    if (isPreview) {
      toast.info?.('Preview mode — no changes saved.');
      setBody('');
      return;
    }
    setPosting(true);
    try {
      const { data: inserted, error } = await supabase
        .from('contestant_comments')
        .insert({ contestant_id: contestantId, user_id: user.id, body: text })
        .select('id, user_id, body, hidden, created_at')
        .single();
      if (error) throw error;
      const [row] = await hydrate([inserted]);
      setComments((prev) => (prev.some((c) => c.id === row.id) ? prev : [row, ...prev]));
      setBody('');
    } catch (err) {
      console.error('Fan comment post failed:', err);
      toast.error('Could not post your comment. Please try again.');
    } finally {
      setPosting(false);
    }
  }, [body, posting, isPreview, contestantId, user?.id, hydrate, toast]);

  const toggleHidden = useCallback(async (comment) => {
    setBusyId(comment.id);
    try {
      await supabase
        .from('contestant_comments')
        .update({ hidden: !comment.hidden })
        .eq('id', comment.id);
      setComments((prev) => prev.map((c) => (c.id === comment.id ? { ...c, hidden: !comment.hidden } : c)));
    } catch (err) {
      console.error('Hide toggle failed:', err);
      toast.error('Could not update that comment.');
    } finally {
      setBusyId(null);
    }
  }, [toast]);

  const removeComment = useCallback(async (comment) => {
    setBusyId(comment.id);
    try {
      await supabase.from('contestant_comments').delete().eq('id', comment.id);
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
    } catch (err) {
      console.error('Delete comment failed:', err);
      toast.error('Could not remove that comment.');
    } finally {
      setBusyId(null);
    }
  }, [toast]);

  const goToLogin = useCallback(() => {
    const returnTo = window.location.pathname + window.location.search + window.location.hash;
    if (onLoginRequired) onLoginRequired(returnTo);
    else window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
  }, [onLoginRequired]);

  const visibleCount = comments.filter((c) => !c.hidden).length;

  const renderComposer = () => {
    if (isOwner) return null;
    if (!user?.id) {
      return (
        <div style={styles.prompt}>
          <span style={styles.promptText}>Log in and become a fan to leave a comment for {firstName}.</span>
          <button style={styles.promptBtn} onClick={goToLogin}>Log in</button>
        </div>
      );
    }
    if (!isFan) {
      return (
        <div style={styles.prompt}>
          <span style={styles.promptText}>Become a fan of {firstName} (button above) to leave a comment.</span>
        </div>
      );
    }
    const remaining = MAX_LENGTH - body.length;
    return (
      <div style={styles.composer}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, MAX_LENGTH))}
          placeholder={`Leave some love for ${firstName}…`}
          rows={2}
          style={styles.textarea}
        />
        <div style={styles.composerFooter}>
          <span style={{ ...styles.counter, color: remaining < 20 ? colors.gold.primary : colors.text.muted }}>
            {remaining}
          </span>
          <button
            onClick={handlePost}
            disabled={posting || !body.trim()}
            style={{
              ...styles.postBtn,
              opacity: posting || !body.trim() ? 0.5 : 1,
              cursor: posting || !body.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {posting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div id="fan-wall" style={styles.section}>
      <h3 style={styles.heading}>
        <MessageCircle size={20} style={{ color: colors.gold.primary }} />
        Fan Wall
        {visibleCount > 0 && <span style={styles.count}>{visibleCount.toLocaleString()}</span>}
      </h3>

      {renderComposer()}

      <div style={styles.list}>
        {loading ? (
          <p style={styles.muted}>Loading…</p>
        ) : comments.length === 0 ? (
          <p style={styles.muted}>
            {isOwner
              ? 'No comments yet — your fans can leave you messages here.'
              : `No comments yet. Be the first to cheer on ${firstName}!`}
          </p>
        ) : (
          comments.map((comment) => {
            const p = comment.profile;
            const name = [p?.first_name, p?.last_name].filter(Boolean).join(' ') || 'Anonymous';
            const initials = (p?.first_name?.[0] || '?').toUpperCase();
            const canDelete = isOwner || comment.user_id === user?.id;
            const busy = busyId === comment.id;
            return (
              <div key={comment.id} style={{ ...styles.row, opacity: comment.hidden ? 0.5 : 1 }}>
                <div
                  style={{
                    ...styles.avatar,
                    background: p?.avatar_url ? `url(${p.avatar_url}) center/cover` : 'rgba(212,175,55,0.15)',
                  }}
                >
                  {!p?.avatar_url && initials}
                </div>
                <div style={styles.textCol}>
                  <div style={styles.metaRow}>
                    <span style={styles.name}>{name}</span>
                    <span style={styles.time}>{timeAgo(comment.created_at)}</span>
                    {comment.hidden && <span style={styles.hiddenBadge}>Hidden</span>}
                  </div>
                  <p style={styles.body}>{comment.body}</p>
                </div>
                {(isOwner || canDelete) && (
                  <div style={styles.actions}>
                    {isOwner && (
                      <button
                        onClick={() => toggleHidden(comment)}
                        disabled={busy}
                        title={comment.hidden ? 'Unhide' : 'Hide from profile'}
                        aria-label={comment.hidden ? 'Unhide comment' : 'Hide comment'}
                        style={styles.iconBtn}
                      >
                        {comment.hidden ? <Eye size={15} /> : <EyeOff size={15} />}
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => removeComment(comment)}
                        disabled={busy}
                        title="Delete"
                        aria-label="Delete comment"
                        style={styles.iconBtn}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const styles = {
  section: {
    padding: spacing.xl,
  },
  heading: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    margin: 0,
    marginBottom: spacing.lg,
  },
  count: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gold.primary,
    background: 'rgba(212,175,55,0.15)',
    border: '1px solid rgba(212,175,55,0.3)',
    borderRadius: borderRadius.pill,
    padding: `2px ${spacing.sm}`,
  },
  composer: {
    background: colors.background.secondary,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  textarea: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    resize: 'vertical',
    color: colors.text.primary,
    fontSize: typography.fontSize.md,
    fontFamily: 'inherit',
    lineHeight: 1.5,
  },
  composerFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  counter: {
    fontSize: typography.fontSize.xs,
  },
  postBtn: {
    padding: `${spacing.xs} ${spacing.lg}`,
    background: 'linear-gradient(135deg, #d4af37, #f4d03f)',
    border: 'none',
    borderRadius: borderRadius.pill,
    color: '#000',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    transition: 'all 0.2s ease',
  },
  prompt: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
    background: colors.background.secondary,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.lg,
    padding: `${spacing.md} ${spacing.lg}`,
    marginBottom: spacing.lg,
  },
  promptText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    flex: 1,
    minWidth: '180px',
  },
  promptBtn: {
    padding: `${spacing.xs} ${spacing.lg}`,
    background: 'rgba(212,175,55,0.15)',
    border: '1px solid rgba(212,175,55,0.3)',
    borderRadius: borderRadius.pill,
    color: colors.gold.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
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
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  time: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  hiddenBadge: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    border: `1px solid ${colors.border.secondary}`,
    borderRadius: borderRadius.sm,
    padding: `0 ${spacing.xs}`,
  },
  body: {
    margin: `2px 0 0`,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 1.5,
    wordBreak: 'break-word',
  },
  actions: {
    display: 'flex',
    gap: spacing.xs,
    flexShrink: 0,
  },
  iconBtn: {
    background: 'transparent',
    border: 'none',
    color: colors.text.tertiary,
    cursor: 'pointer',
    padding: spacing.xs,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  muted: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    margin: 0,
  },
};
