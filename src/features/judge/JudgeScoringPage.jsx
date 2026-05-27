import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, AlertTriangle, Lock, Save, Send, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Avatar, Button, PageHeader, Panel } from '../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';

/**
 * JudgeScoringPage — entered via /judge/:competitionId/round/:roundId
 *
 * Layout (per contestant card):
 *   ┌────────────────────────────────────────┐
 *   │ [avatar]  Name                  Total  │
 *   │           Stage Presence:  [1..10]     │
 *   │           Overall Impression: [1..10]  │
 *   │           …                            │
 *   └────────────────────────────────────────┘
 *
 * Scores autosave on change (best-effort). The "Submit Final" button stamps
 * `submitted_at` on every row for this round, which locks them via RLS.
 */

const styles = {
  page: { minHeight: '100vh', background: colors.background.primary, color: colors.text.primary, paddingBottom: spacing.xxl * 2 },
  container: { maxWidth: 880, margin: '0 auto', padding: spacing.xl },
  topBar: {
    background: colors.background.secondary,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  contestantCard: {
    background: colors.background.secondary,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  contestantHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottom: `1px solid ${colors.border.secondary}`,
  },
  criterionRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    gap: spacing.md,
    alignItems: 'center',
    padding: `${spacing.sm} 0`,
  },
  scoreButtons: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  scoreBtn: (selected, locked) => ({
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    border: `1px solid ${selected ? colors.gold.primary : colors.border.primary}`,
    background: selected ? colors.gold.primary : 'transparent',
    color: selected ? '#0a0a0c' : colors.text.secondary,
    fontWeight: selected ? typography.fontWeight.bold : typography.fontWeight.medium,
    fontSize: typography.fontSize.sm,
    cursor: locked ? 'not-allowed' : 'pointer',
    opacity: locked ? 0.5 : 1,
    transition: 'all 0.12s',
  }),
  totalBadge: {
    padding: `${spacing.xs} ${spacing.md}`,
    background: 'rgba(212,175,55,0.12)',
    color: colors.gold.primary,
    borderRadius: borderRadius.md,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.sm,
    minWidth: 56,
    textAlign: 'center',
  },
  banner: (variant) => ({
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    background: variant === 'error'
      ? 'rgba(239,68,68,0.1)'
      : variant === 'success'
      ? 'rgba(34,197,94,0.1)'
      : 'rgba(245,158,11,0.1)',
    border: `1px solid ${
      variant === 'error' ? colors.status.error
      : variant === 'success' ? colors.status.success
      : colors.status.warning
    }`,
    color: variant === 'error' ? colors.status.error
      : variant === 'success' ? colors.status.success
      : colors.status.warning,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.lg,
  }),
  stickyBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    background: 'rgba(10,10,12,0.95)',
    borderTop: `1px solid ${colors.border.primary}`,
    backdropFilter: 'blur(8px)',
    zIndex: 50,
  },
};

export default function JudgeScoringPage() {
  const { competitionId, roundId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);

  const [judge, setJudge] = useState(null);
  const [round, setRound] = useState(null);
  const [competition, setCompetition] = useState(null);
  const [contestants, setContestants] = useState([]);
  const [criteria, setCriteria] = useState([]);
  // scores keyed by `${contestantId}:${criterionId}` → { id, score, submittedAt }
  const [scores, setScores] = useState({});
  const [savingKeys, setSavingKeys] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Load everything we need for the scoring screen
  useEffect(() => {
    if (!user?.id || !competitionId || !roundId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const [judgeRes, roundRes, compRes, contestantsRes, criteriaRes] = await Promise.all([
          supabase.from('judges')
            .select('id, name, user_id, hidden')
            .eq('competition_id', competitionId)
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase.from('voting_rounds')
            .select('id, title, round_order, round_type, start_date, end_date, judge_weight, contestants_advance, competition_id')
            .eq('id', roundId)
            .maybeSingle(),
          supabase.from('competitions')
            .select('id, name, season, city:cities(name)')
            .eq('id', competitionId)
            .maybeSingle(),
          supabase.from('contestants')
            .select('id, name, avatar_url, status, eliminated_in_round, user_id')
            .eq('competition_id', competitionId)
            .order('name'),
          supabase.from('judging_criteria')
            .select('id, label, description, weight, sort_order')
            .eq('competition_id', competitionId)
            .order('sort_order'),
        ]);

        if (cancelled) return;
        if (!judgeRes.data) {
          setErrorMsg("You don't have a judging assignment for this competition.");
          setLoading(false);
          return;
        }
        if (!roundRes.data || roundRes.data.competition_id !== competitionId) {
          setErrorMsg('Round not found.');
          setLoading(false);
          return;
        }
        if ((roundRes.data.judge_weight || 0) === 0) {
          setErrorMsg('This round is not a judging round.');
          setLoading(false);
          return;
        }

        setJudge(judgeRes.data);
        setRound(roundRes.data);
        setCompetition(compRes.data);
        // Active contestants only — eliminated ones aren't being judged this round
        const activeContestants = (contestantsRes.data || []).filter((c) => {
          if (c.status === 'eliminated' && c.eliminated_in_round && c.eliminated_in_round < (roundRes.data.round_order || 0)) {
            return false;
          }
          return true;
        });
        setContestants(activeContestants);
        setCriteria(criteriaRes.data || []);

        if (judgeRes.data.hidden) {
          setScores({});
        } else {
          const { data: scoreRows } = await supabase
            .from('judge_scores')
            .select('id, contestant_id, criterion_id, score, submitted_at')
            .eq('judge_id', judgeRes.data.id)
            .eq('voting_round_id', roundId);
          const map = {};
          (scoreRows || []).forEach((s) => {
            map[`${s.contestant_id}:${s.criterion_id}`] = {
              id: s.id,
              score: s.score,
              submittedAt: s.submitted_at,
            };
          });
          setScores(map);
        }
      } catch (e) {
        console.error('Failed to load scoring page:', e);
        if (!cancelled) setErrorMsg(e.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, competitionId, roundId]);

  const previewMode = judge?.hidden === true;

  const isLocked = useMemo(() => {
    if (previewMode) return false;
    const vals = Object.values(scores);
    return vals.length > 0 && vals.every(v => v.submittedAt);
  }, [scores, previewMode]);

  // Per-contestant judge total (weighted sum of criterion scores)
  const totalsByContestant = useMemo(() => {
    const totals = {};
    for (const c of contestants) {
      let sum = 0;
      let answered = 0;
      for (const cr of criteria) {
        const entry = scores[`${c.id}:${cr.id}`];
        if (entry?.score != null) {
          sum += entry.score * (cr.weight || 1);
          answered += 1;
        }
      }
      totals[c.id] = { sum, answered };
    }
    return totals;
  }, [contestants, criteria, scores]);

  const filledCount = useMemo(() => Object.values(scores).filter(s => s.score != null).length, [scores]);
  const totalCells = contestants.length * criteria.length;

  const saveScore = useCallback(async (contestantId, criterionId, score) => {
    if (!judge || isLocked) return;
    const key = `${contestantId}:${criterionId}`;
    const existing = scores[key];

    if (previewMode) {
      setScores(prev => ({ ...prev, [key]: { ...(existing || {}), score } }));
      return;
    }

    setSavingKeys(prev => new Set(prev).add(key));
    // Optimistic update
    setScores(prev => ({ ...prev, [key]: { ...(existing || {}), score } }));

    try {
      if (existing?.id) {
        const { error } = await supabase
          .from('judge_scores')
          .update({ score, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('judge_scores')
          .insert({
            competition_id: competitionId,
            voting_round_id: roundId,
            judge_id: judge.id,
            contestant_id: contestantId,
            criterion_id: criterionId,
            score,
          })
          .select('id')
          .single();
        if (error) throw error;
        setScores(prev => ({ ...prev, [key]: { id: data.id, score, submittedAt: null } }));
      }
    } catch (e) {
      console.error('Failed to save score:', e);
      setErrorMsg('Could not save score. Check your connection and try again.');
      // Roll back optimistic
      setScores(prev => {
        const next = { ...prev };
        if (existing) next[key] = existing; else delete next[key];
        return next;
      });
    } finally {
      setSavingKeys(prev => { const n = new Set(prev); n.delete(key); return n; });
    }
  }, [judge, scores, isLocked, competitionId, roundId, previewMode]);

  const handleSubmitFinal = async () => {
    if (!judge || isLocked) return;
    if (totalCells === 0 || filledCount < totalCells) return;
    if (previewMode) {
      setStatusMsg('Preview mode — scores were not saved.');
      setTimeout(() => navigate('/judge'), 1500);
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('judge_scores')
        .update({ submitted_at: now })
        .eq('judge_id', judge.id)
        .eq('voting_round_id', roundId);
      if (error) throw error;
      setScores(prev => {
        const next = {};
        Object.entries(prev).forEach(([k, v]) => { next[k] = { ...v, submittedAt: now }; });
        return next;
      });
      setStatusMsg('Scores submitted. Thank you!');
      setTimeout(() => navigate('/judge'), 1200);
    } catch (e) {
      console.error('Failed to submit scores:', e);
      setErrorMsg(e.message || 'Could not submit scores.');
    } finally {
      setSubmitting(false);
    }
  };

  const cityName = competition?.city?.name || '';
  const competitionLabel = competition?.name || (cityName ? `Most Eligible ${cityName} ${competition?.season || ''}`.trim() : 'Judging');

  if (loading) {
    return (
      <div style={styles.page}>
        <PageHeader title="Loading…" onBack={() => navigate('/judge')} />
        <div style={styles.container}>
          <p style={{ color: colors.text.secondary }}>Loading round…</p>
        </div>
      </div>
    );
  }

  if (errorMsg && !judge) {
    return (
      <div style={styles.page}>
        <PageHeader title="Scoring" onBack={() => navigate('/judge')} />
        <div style={styles.container}>
          <div style={styles.banner('error')}>
            <AlertTriangle size={18} /> {errorMsg}
          </div>
          <Button onClick={() => navigate('/judge')} variant="secondary">Back to dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <PageHeader title={round?.title || 'Judging Round'} subtitle={competitionLabel} onBack={() => navigate('/judge')} />
      <div style={styles.container}>
        {previewMode && (
          <div style={styles.banner('warning')}>
            <AlertTriangle size={18} /> Preview mode — your scores will not be saved. This view is only visible to hidden judges.
          </div>
        )}
        {isLocked && (
          <div style={styles.banner('success')}>
            <CheckCircle size={18} /> Your scores are submitted and locked.
          </div>
        )}
        {!isLocked && criteria.length === 0 && (
          <div style={styles.banner('warning')}>
            <AlertTriangle size={18} /> The host hasn&rsquo;t added judging criteria yet. Ask them to add some before you start scoring.
          </div>
        )}
        {errorMsg && judge && (
          <div style={styles.banner('error')}>
            <AlertTriangle size={18} /> {errorMsg}
          </div>
        )}
        {statusMsg && (
          <div style={styles.banner('success')}>
            <CheckCircle size={18} /> {statusMsg}
          </div>
        )}

        <div style={styles.topBar}>
          <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
            Score each contestant 1–10 on every criterion. Scores autosave.
            {round?.judge_weight < 100 && (
              <>
                {' '}Judges count for <strong style={{ color: colors.text.primary }}>{round.judge_weight}%</strong> of advancement this round
                {round?.contestants_advance > 0 && <> · top <strong style={{ color: colors.text.primary }}>{round.contestants_advance}</strong> advance</>}
                .
              </>
            )}
            {round?.judge_weight === 100 && (
              <>
                {' '}Judges decide who advances this round
                {round?.contestants_advance > 0 && <> · top <strong style={{ color: colors.text.primary }}>{round.contestants_advance}</strong> advance</>}
                .
              </>
            )}
          </p>
          <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
            Progress: {filledCount} / {totalCells} cells filled · {contestants.length} contestants · {criteria.length} criteria
          </p>
        </div>

        {contestants.length === 0 ? (
          <Panel title="No contestants">
            <div style={{ padding: spacing.xl, color: colors.text.secondary, textAlign: 'center' }}>
              No active contestants for this round.
            </div>
          </Panel>
        ) : (
          contestants.map((c) => {
            const t = totalsByContestant[c.id] || { sum: 0, answered: 0 };
            return (
              <div key={c.id} style={styles.contestantCard}>
                <div style={styles.contestantHeader}>
                  <Avatar name={c.name} size={48} src={c.avatar_url} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {c.user_id ? (
                      <a
                        href={`/profile/${c.user_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: spacing.xs,
                          color: colors.text.primary,
                          fontWeight: typography.fontWeight.semibold,
                          fontSize: typography.fontSize.md,
                          textDecoration: 'none',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = colors.gold.primary; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = colors.text.primary; }}
                      >
                        {c.name}
                        <ExternalLink size={12} style={{ opacity: 0.6 }} />
                      </a>
                    ) : (
                      <p style={{ fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.md, margin: 0 }}>{c.name}</p>
                    )}
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: 2 }}>
                      {t.answered} / {criteria.length} criteria scored
                    </p>
                  </div>
                  <div style={styles.totalBadge}>
                    {t.sum > 0 ? t.sum.toFixed(t.sum % 1 === 0 ? 0 : 1) : '—'}
                  </div>
                </div>

                {criteria.length === 0 ? (
                  <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
                    Waiting for the host to add criteria.
                  </p>
                ) : (
                  criteria.map((cr) => {
                    const key = `${c.id}:${cr.id}`;
                    const entry = scores[key];
                    const value = entry?.score;
                    const saving = savingKeys.has(key);
                    return (
                      <div key={cr.id} style={styles.criterionRow}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{
                            fontSize: typography.fontSize.sm,
                            fontWeight: typography.fontWeight.medium,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {cr.label}
                            {cr.weight && cr.weight !== 1 && (
                              <span style={{ color: colors.text.muted, fontWeight: typography.fontWeight.regular, marginLeft: spacing.xs }}>
                                ×{cr.weight}
                              </span>
                            )}
                            {saving && (
                              <span style={{ color: colors.text.muted, fontWeight: typography.fontWeight.regular, marginLeft: spacing.sm, fontSize: typography.fontSize.xs }}>
                                saving…
                              </span>
                            )}
                          </p>
                          {cr.description && (
                            <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: 2 }}>
                              {cr.description}
                            </p>
                          )}
                        </div>
                        <div style={styles.scoreButtons}>
                          {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                            <button
                              key={n}
                              type="button"
                              disabled={isLocked}
                              onClick={() => saveScore(c.id, cr.id, n)}
                              style={styles.scoreBtn(value === n, isLocked)}
                              aria-label={`Score ${n} for ${cr.label}`}
                            >
                              {n}
                            </button>
                          ))}
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

      {/* Sticky submit bar */}
      {!isLocked && criteria.length > 0 && contestants.length > 0 && (
        <div style={styles.stickyBar}>
          <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, margin: 0 }}>
              <Save size={14} style={{ verticalAlign: 'text-bottom', marginRight: spacing.xs }} />
              Autosaved as you score
            </p>
            <Button
              icon={Send}
              onClick={handleSubmitFinal}
              disabled={submitting || totalCells === 0 || filledCount < totalCells}
              title={
                totalCells === 0
                  ? 'No criteria to score yet.'
                  : filledCount < totalCells
                  ? `Score every contestant on every criterion before submitting (${totalCells - filledCount} remaining).`
                  : undefined
              }
            >
              {submitting
                ? 'Submitting…'
                : filledCount < totalCells
                ? `Submit Final Scores (${totalCells - filledCount} left)`
                : 'Submit Final Scores'}
            </Button>
          </div>
        </div>
      )}
      {isLocked && (
        <div style={styles.stickyBar}>
          <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', alignItems: 'center', gap: spacing.sm, color: colors.status.success }}>
            <Lock size={16} /> Scores submitted and locked.
          </div>
        </div>
      )}
    </div>
  );
}
