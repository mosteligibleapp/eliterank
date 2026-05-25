import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, ChevronRight, Calendar, Lock, CheckCircle, Users, Sliders, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { PageHeader, Avatar, OrganizationLogo } from '../../components/ui';
import { useResponsive } from '../../hooks/useResponsive';
import { generateCompetitionSlug, getCompetitionUrl, slugify } from '../../utils/slugs';

function getCompetitionLink(competition) {
  const orgSlug = competition?.organization?.slug || 'most-eligible';
  if (competition?.slug) return getCompetitionUrl(orgSlug, competition.slug);
  if (competition?.id) return `/${orgSlug}/id/${competition.id}`;
  const cityName = competition?.city?.name || competition?.city || '';
  const generatedSlug = generateCompetitionSlug({
    name: competition?.name,
    citySlug: slugify(cityName),
    season: competition?.season || '',
  });
  return getCompetitionUrl(orgSlug, generatedSlug);
}

/**
 * JudgeDashboardPage — entered via /judge
 *
 * Lists every competition the logged-in user is a judge for. For each
 * judging round we show the criteria the judge will score on, the
 * contestants they'll be judging, and a short "how it works" preview so
 * upcoming rounds aren't a black box.
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
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderBottom: `1px solid ${colors.border.primary}`,
    background: 'rgba(255,255,255,0.03)',
    color: 'inherit',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
  competitionHeaderHover: {
    background: 'rgba(255,255,255,0.06)',
  },
  competitionHeaderContent: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  },
  competitionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    lineHeight: 1.3,
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    letterSpacing: typography.letterSpacing?.tight,
  },
  competitionMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    whiteSpace: 'nowrap',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
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
    alignItems: 'center',
  },
  metaItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
  pill: (color) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.xs,
    background: `${color}1f`,
    color,
    fontWeight: typography.fontWeight.medium,
  }),
  previewBlock: {
    padding: `${spacing.md} ${spacing.lg} ${spacing.lg}`,
    borderTop: `1px solid ${colors.border.secondary}`,
    background: 'rgba(0,0,0,0.15)',
  },
  sectionLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: colors.text.muted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  criterionRow: {
    padding: spacing.sm,
    border: `1px solid ${colors.border.secondary}`,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  contestantsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: spacing.sm,
  },
  contestantItem: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  contestantName: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  howItWorksList: {
    margin: 0,
    paddingLeft: spacing.lg,
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    lineHeight: 1.6,
  },
  emptyHint: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
};

function formatDateRange(start, end) {
  const fmt = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `Starts ${fmt(start)}`;
  if (end) return `Ends ${fmt(end)}`;
  return 'TBD';
}

function formatLongDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
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
  const { isMobile } = useResponsive();
  const [hoveredCompId, setHoveredCompId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [submittedRoundIds, setSubmittedRoundIds] = useState(new Set());
  // Keyed by competition_id
  const [criteriaByComp, setCriteriaByComp] = useState({});
  const [contestantsByComp, setContestantsByComp] = useState({});

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: judgeRows, error: judgeErr } = await supabase
          .from('judges')
          .select(`
            id,
            competition:competitions(
              id, name, season, status, slug,
              city:cities(name),
              organization:organizations(id, name, slug, logo_url),
              voting_rounds(id, title, round_type, round_order, start_date, end_date, judge_weight, contestants_advance)
            )
          `)
          .eq('user_id', user.id);

        if (judgeErr) throw judgeErr;
        if (cancelled) return;

        const judgeIds = (judgeRows || []).map(j => j.id);
        const competitionIds = Array.from(new Set((judgeRows || [])
          .map(j => j.competition?.id)
          .filter(Boolean)));

        const [scoresRes, criteriaRes, contestantsRes] = await Promise.all([
          judgeIds.length
            ? supabase
                .from('judge_scores')
                .select('voting_round_id, submitted_at')
                .in('judge_id', judgeIds)
                .not('submitted_at', 'is', null)
            : Promise.resolve({ data: [] }),
          competitionIds.length
            ? supabase
                .from('judging_criteria')
                .select('id, competition_id, label, description, weight, sort_order')
                .in('competition_id', competitionIds)
                .order('sort_order')
            : Promise.resolve({ data: [] }),
          competitionIds.length
            ? supabase
                .from('contestants')
                .select('id, competition_id, name, avatar_url, status')
                .in('competition_id', competitionIds)
                .eq('status', 'active')
                .order('name')
            : Promise.resolve({ data: [] }),
        ]);

        if (cancelled) return;

        const submitted = new Set((scoresRes.data || []).map(s => s.voting_round_id));
        setSubmittedRoundIds(submitted);

        const cmap = {};
        for (const c of criteriaRes.data || []) {
          (cmap[c.competition_id] ||= []).push(c);
        }
        setCriteriaByComp(cmap);

        const tmap = {};
        for (const ct of contestantsRes.data || []) {
          (tmap[ct.competition_id] ||= []).push(ct);
        }
        setContestantsByComp(tmap);

        setAssignments(judgeRows || []);
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

            const criteria = criteriaByComp[comp.id] || [];
            const contestants = contestantsByComp[comp.id] || [];

            const compUrl = getCompetitionLink(comp);
            const isHovered = hoveredCompId === comp.id;
            const org = comp.organization;

            return (
              <div key={row.id} style={styles.competition}>
                <a
                  href={compUrl}
                  style={{
                    ...styles.competitionHeader,
                    ...(isHovered ? styles.competitionHeaderHover : null),
                  }}
                  onMouseEnter={() => setHoveredCompId(comp.id)}
                  onMouseLeave={() => setHoveredCompId(null)}
                >
                  {org?.logo_url && (
                    <OrganizationLogo
                      logo={org.logo_url}
                      size={isMobile ? 56 : 72}
                      alt={org?.name || 'Organization'}
                    />
                  )}
                  <div style={styles.competitionHeaderContent}>
                    <h2 style={styles.competitionTitle}>{compLabel}</h2>
                    <div style={styles.competitionMeta}>
                      {cityName && <span style={{ flexShrink: 0 }}>{cityName}</span>}
                      {cityName && comp.season && (
                        <span style={{ color: colors.text.muted, flexShrink: 0 }}>·</span>
                      )}
                      {comp.season && <span style={{ flexShrink: 0 }}>{comp.season}</span>}
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    style={{
                      flexShrink: 0,
                      color: isHovered ? colors.gold.primary : colors.text.tertiary,
                      transition: 'color 0.2s ease',
                    }}
                  />
                </a>

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

                    // The round whose advancement feeds THIS round (e.g. Top 15 → Top 10)
                    const prevRound = (comp.voting_rounds || []).find(
                      vr => vr.round_order === (r.round_order || 0) - 1
                    );
                    const incomingTitle =
                      r.title ||
                      (prevRound?.contestants_advance > 0
                        ? `Top ${prevRound.contestants_advance}`
                        : `${contestants.length} contestants`);
                    const prevTitle = prevRound?.title || (prevRound ? `Round ${prevRound.round_order}` : null);

                    return (
                      <div key={r.id}>
                        <div
                          style={{ ...styles.roundRow, opacity: blocked ? 0.7 : 1, cursor: blocked ? 'not-allowed' : 'pointer' }}
                          onClick={() => { if (!blocked) navigate(`/judge/${comp.id}/round/${r.id}`); }}
                          onMouseEnter={(e) => { if (!blocked) e.currentTarget.style.background = colors.background.cardHover; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div>
                            <p style={{ fontWeight: typography.fontWeight.semibold, marginBottom: 2 }}>
                              Judging Round: {r.title || `Round ${r.round_order || ''}`}
                            </p>
                            <div style={styles.meta}>
                              <span style={styles.metaItem}>
                                <Calendar size={12} />
                                {formatDateRange(r.start_date, r.end_date)}
                              </span>
                              <span style={styles.metaItem}>
                                {r.judge_weight}% judges{r.judge_weight < 100 ? ` · ${100 - r.judge_weight}% votes` : ''}
                              </span>
                              {r.contestants_advance > 0 && (
                                <span style={styles.metaItem}>Top {r.contestants_advance} advance</span>
                              )}
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

                        {/* Preview block — always shown so the judge knows what's coming */}
                        <div style={styles.previewBlock}>
                          <div style={styles.sectionLabel}>
                            <Info size={12} /> How it works
                          </div>
                          <ol style={styles.howItWorksList}>
                            <li>
                              {phase === 'upcoming'
                                ? `Scoring opens ${formatLongDate(r.start_date)}. `
                                : phase === 'active'
                                ? `Scoring is open — closes ${formatLongDate(r.end_date)}. `
                                : 'Scoring window has closed. '}
                              You&rsquo;ll see every contestant on one page.
                            </li>
                            <li>Score each contestant 1–10 on every criterion. Your scores autosave as you click.</li>
                            <li>Click <strong>Submit Final</strong> when you&rsquo;re done — that locks your scores for the round.</li>
                            <li>
                              Final ranking blends judges and votes:{' '}
                              <strong style={{ color: colors.text.primary }}>{r.judge_weight}% judges</strong>
                              {r.judge_weight < 100 && (
                                <> + <strong style={{ color: colors.text.primary }}>{100 - r.judge_weight}% votes</strong></>
                              )}
                              . Top {r.contestants_advance} advance.
                            </li>
                          </ol>

                          <div style={styles.sectionLabel}>
                            <Sliders size={12} /> Criteria you&rsquo;ll score ({criteria.length})
                          </div>
                          {criteria.length === 0 ? (
                            <p style={styles.emptyHint}>
                              The host hasn&rsquo;t added criteria yet. They&rsquo;ll appear here once added.
                            </p>
                          ) : (
                            criteria.map((c) => (
                              <div key={c.id} style={styles.criterionRow}>
                                <div style={{
                                  fontSize: typography.fontSize.sm,
                                  fontWeight: typography.fontWeight.medium,
                                  color: colors.text.primary,
                                }}>
                                  {c.label}
                                  {c.weight && c.weight !== 1 && (
                                    <span style={{
                                      marginLeft: spacing.xs,
                                      color: colors.gold.primary,
                                      fontWeight: typography.fontWeight.regular,
                                      fontSize: typography.fontSize.xs,
                                    }}>
                                      ×{c.weight}
                                    </span>
                                  )}
                                </div>
                                {c.description && (
                                  <p style={{
                                    margin: `${spacing.xs} 0 0`,
                                    fontSize: typography.fontSize.xs,
                                    color: colors.text.muted,
                                    lineHeight: 1.5,
                                  }}>
                                    {c.description}
                                  </p>
                                )}
                              </div>
                            ))
                          )}

                          <div style={styles.sectionLabel}>
                            <Users size={12} />
                            {phase === 'upcoming' && prevTitle
                              ? ` Who you'll judge (${incomingTitle} contestants — ${prevTitle} are currently active)`
                              : phase === 'upcoming'
                              ? ` Who you'll judge (currently ${contestants.length} active)`
                              : ` Who you're judging (${incomingTitle})`}
                          </div>
                          {contestants.length === 0 ? (
                            <p style={styles.emptyHint}>No active contestants yet.</p>
                          ) : (
                            <div style={styles.contestantsGrid}>
                              {contestants.map((ct) => (
                                <div key={ct.id} style={styles.contestantItem}>
                                  <Avatar name={ct.name} size={28} src={ct.avatar_url} />
                                  <span style={styles.contestantName}>{ct.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
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
