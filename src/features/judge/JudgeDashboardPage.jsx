import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, ChevronRight, Calendar, Lock, CheckCircle, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { PageHeader } from '../../components/ui';

/**
 * JudgeDashboardPage — entered via /judge
 *
 * Lists every competition the logged-in user is a judge for, and inside each
 * competition lists the upcoming and active judging rounds (`judge_weight > 0`).
 * Past rounds where the judge already submitted are surfaced as read-only.
 */

const styles = {
  page: { minHeight: '100vh', background: colors.background.primary, color: colors.text.primary, paddingBottom: spacing.xxl },
  container: { maxWidth: 800, margin: '0 auto', padding: spacing.xl },
  empty: {
    padding: spacing.xxl,
    textAlign: 'center',
    color: colors.text.secondary,
    background: colors.background.secondary,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.xl,
  },
  competition: {
    background: colors.background.secondary,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  competitionHeader: {
    padding: spacing.lg,
    borderBottom: `1px solid ${colors.border.primary}`,
  },
  roundRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderTop: `1px solid ${colors.border.secondary}`,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  meta: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    marginTop: spacing.xs,
    display: 'flex',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  pill: (color) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: borderRadius.full,
    fontSize: typography.fontSize.xs,
    background: `${color}1f`,
    color,
    fontWeight: typography.fontWeight.medium,
  }),
};

function formatDateRange(start, end) {
  const fmt = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `Starts ${fmt(start)}`;
  if (end) return `Ends ${fmt(end)}`;
  return 'TBD';
}

function roundPhaseOf(round) {
  const now = Date.now();
  const start = round.start_date ? new Date(round.start_date).getTime() : null;
  const end = round.end_date ? new Date(round.end_date).getTime() : null;
  if (start && now < start) return 'upcoming';
  if (end && now > end) return 'closed';
  return 'active';
}

export default function JudgeDashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);

  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [submittedRoundIds, setSubmittedRoundIds] = useState(new Set());

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // 1. Find judge rows for this user
        const { data: judgeRows, error: judgeErr } = await supabase
          .from('judges')
          .select(`
            id,
            competition:competitions(
              id, name, season, status,
              city:cities(name),
              voting_rounds(id, title, round_type, round_order, start_date, end_date, judge_weight, contestants_advance)
            )
          `)
          .eq('user_id', user.id);

        if (judgeErr) throw judgeErr;
        if (cancelled) return;

        const judgeIds = (judgeRows || []).map(j => j.id);

        // 2. Find which (round × judge) pairs have submitted scores
        if (judgeIds.length) {
          const { data: scoreRows } = await supabase
            .from('judge_scores')
            .select('voting_round_id, submitted_at')
            .in('judge_id', judgeIds)
            .not('submitted_at', 'is', null);
          const submitted = new Set((scoreRows || []).map(s => s.voting_round_id));
          if (!cancelled) setSubmittedRoundIds(submitted);
        }

        if (!cancelled) setAssignments(judgeRows || []);
      } catch (e) {
        console.error('Failed to load judge assignments:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleBack = () => navigate('/');

  return (
    <div style={styles.page}>
      <PageHeader title="Judge Dashboard" subtitle="Score contestants for the rounds you're judging" onBack={handleBack} />
      <div style={styles.container}>
        {loading ? (
          <div style={styles.empty}>Loading your assignments…</div>
        ) : assignments.length === 0 ? (
          <div style={styles.empty}>
            <Award size={40} style={{ color: colors.gold.primary, opacity: 0.5, marginBottom: spacing.md }} />
            <h2 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing.sm }}>No judging assignments yet</h2>
            <p style={{ fontSize: typography.fontSize.sm }}>
              You&rsquo;ll see competitions here once a host invites you to judge.
            </p>
          </div>
        ) : (
          assignments.map((row) => {
            const comp = row.competition;
            if (!comp) return null;
            const cityName = comp.city?.name || '';
            const compLabel = comp.name || `Most Eligible ${cityName} ${comp.season || ''}`.trim();

            const judgingRounds = (comp.voting_rounds || [])
              .filter(r => (r.judge_weight || 0) > 0)
              .sort((a, b) => (a.round_order || 0) - (b.round_order || 0));

            return (
              <div key={row.id} style={styles.competition}>
                <div style={styles.competitionHeader}>
                  <h2 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, margin: 0 }}>
                    {compLabel}
                  </h2>
                  <div style={styles.meta}>
                    {cityName && <span><Users size={12} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />{cityName}</span>}
                    <span>{judgingRounds.length} judging round{judgingRounds.length === 1 ? '' : 's'}</span>
                  </div>
                </div>

                {judgingRounds.length === 0 ? (
                  <div style={{ padding: spacing.lg, color: colors.text.muted, fontSize: typography.fontSize.sm }}>
                    The host hasn&rsquo;t set up any judging rounds yet.
                  </div>
                ) : (
                  judgingRounds.map((r) => {
                    const phase = roundPhaseOf(r);
                    const submitted = submittedRoundIds.has(r.id);
                    const blocked = phase === 'upcoming';
                    const canScore = phase !== 'upcoming' && !submitted;

                    return (
                      <div
                        key={r.id}
                        style={{ ...styles.roundRow, opacity: blocked ? 0.55 : 1, cursor: blocked ? 'not-allowed' : 'pointer' }}
                        onClick={() => { if (!blocked) navigate(`/judge/${comp.id}/round/${r.id}`); }}
                        onMouseEnter={(e) => { if (!blocked) e.currentTarget.style.background = colors.background.cardHover; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div>
                          <p style={{ fontWeight: typography.fontWeight.semibold, marginBottom: 2 }}>
                            {r.title || `Round ${r.round_order || ''}`}
                          </p>
                          <div style={styles.meta}>
                            <span><Calendar size={12} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
                              {formatDateRange(r.start_date, r.end_date)}
                            </span>
                            <span>{r.judge_weight}% judges{r.judge_weight < 100 ? ` · ${100 - r.judge_weight}% votes` : ''}</span>
                            {r.contestants_advance > 0 && <span>Top {r.contestants_advance} advance</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                          {submitted ? (
                            <span style={styles.pill(colors.status.success)}><CheckCircle size={12} /> Submitted</span>
                          ) : phase === 'upcoming' ? (
                            <span style={styles.pill(colors.text.muted)}><Lock size={12} /> Upcoming</span>
                          ) : phase === 'closed' ? (
                            <span style={styles.pill(colors.status.warning)}>Closed</span>
                          ) : (
                            <span style={styles.pill(colors.gold.primary)}>Open</span>
                          )}
                          {canScore && <ChevronRight size={16} color={colors.text.muted} />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
