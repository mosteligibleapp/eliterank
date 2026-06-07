import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Trophy, Users } from 'lucide-react';
import { WinnersPodium } from '../components/WinnersPodium';
import { PrizePool } from '../components/PrizePool';
import { PrizeShowcase } from '../components/PrizeShowcase';
import { PhotoGallery } from '../components/PhotoGallery';
import { CompetitionEvents } from '../components/CompetitionEvents';
import { HostSection } from '../components/HostSection';
import { JudgesSection } from '../components/JudgesSection';
import { CompetitionHeader } from '../components/CompetitionHeader';
import { InterestModal } from '../components/InterestModal';
import { formatNumber } from '../../../utils/formatters';
import { INTEREST_TYPE } from '../../../types/competition';
import { supabase } from '../../../lib/supabase';

/**
 * Pick the org's "next up" competition for the results-page CTA.
 *
 * Ranks by timeline rather than creation date so we feature the one a fan can
 * actually enter next:
 *   1. nominations open right now        → "nominations are open now!"
 *   2. nominations opening in the future  → soonest start wins ("opens <date>")
 *   3. announced but no dates yet (publish, no nomination_start) → last resort
 * Competitions whose nomination window has already closed (e.g. a live comp now
 * in voting) are skipped — you can't enter them.
 *
 * Returns the chosen competition annotated with `nominationsOpenNow`, or null.
 */
function pickNextCompetition(candidates, now = new Date()) {
  const ranked = candidates
    .map((c) => {
      const start = c.nomination_start ? new Date(c.nomination_start) : null;
      const end = c.nomination_end ? new Date(c.nomination_end) : null;
      const openNow = Boolean(start && start <= now && (!end || end >= now));
      const upcoming = Boolean(start && start > now);
      const datelessPublish = !start && c.status === 'publish';

      let tier;
      if (openNow) tier = 0;
      else if (upcoming) tier = 1;
      else if (datelessPublish) tier = 2;
      else tier = 3; // window already closed / not enterable — drop it

      return { comp: c, tier, openNow, start };
    })
    .filter((r) => r.tier < 3)
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      // Tier 1: soonest upcoming nomination start first.
      if (a.tier === 1) return a.start - b.start;
      // Tier 2: most recently announced first.
      return new Date(b.comp.created_at) - new Date(a.comp.created_at);
    });

  if (!ranked.length) return null;
  const { comp, openNow } = ranked[0];
  return { ...comp, nominationsOpenNow: openNow };
}

/** Friendly month/day (with year if it's not the current year). */
function formatNominationDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const opts = { month: 'long', day: 'numeric' };
  if (date.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return date.toLocaleDateString('en-US', opts);
}

/**
 * Results phase view
 * Shows after competition is complete
 * Supports both regular and legacy (externally-hosted) competitions
 */
export function ResultsPhase() {
  const {
    competition,
    organization,
    prizePool,
    leaderboardStats,
  } = usePublicCompetition();
  const navigate = useNavigate();

  const isLegacy = competition?.is_legacy;

  // The org's "next up" competition — the one a fan could enter next.
  // `null` means none is enterable, so we fall back to interest capture below.
  const [nextComp, setNextComp] = useState(null);
  // Fallback when no upcoming competition exists: collect interest so we can
  // notify them when the next round of nominations opens.
  const [showInterest, setShowInterest] = useState(false);
  const orgId = competition?.organization_id;
  const compId = competition?.id;
  const cityId = competition?.city_id;

  useEffect(() => {
    if (!orgId || !supabase) return;

    let cancelled = false;

    // Look across the whole org (in this city) — not just the same category —
    // so e.g. a finished Bachelorettes points to an upcoming Bachelors.
    let query = supabase
      .from('competitions')
      .select('id, name, slug, status, nomination_start, nomination_end, created_at')
      .eq('organization_id', orgId)
      .neq('id', compId)
      .in('status', ['live', 'publish']);

    if (cityId) query = query.eq('city_id', cityId);

    query.then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        console.error('Error fetching next competition:', error);
        return;
      }
      setNextComp(pickNextCompetition(data || []));
    });

    return () => { cancelled = true; };
  }, [orgId, compId, cityId]);

  // Get org slug for navigation
  const orgSlug = organization?.slug;

  const handleNavigateToNextComp = () => {
    if (nextComp && orgSlug) {
      navigate(`/${orgSlug}/${nextComp.slug}`);
    }
  };

  // Final stats — shown for every completed competition (legacy included).
  // Only cards backed by real data render, and the grid centers itself when
  // fewer than three are present so a single stat doesn't sit off to one side.
  const totalContestants = leaderboardStats?.totalContestants || 0;
  const totalVotes = leaderboardStats?.totalVotes || 0;
  const statCards = [];
  if (prizePool) {
    statCards.push({
      key: 'awarded',
      icon: Trophy,
      highlight: true,
      value: prizePool.formatted.totalPrizePool,
      label: 'Total Awarded',
    });
  }
  if (totalContestants > 0) {
    statCards.push({
      key: 'contestants',
      icon: Users,
      value: formatNumber(totalContestants),
      label: 'Contestants',
    });
  }
  if (totalVotes > 0) {
    statCards.push({
      key: 'votes',
      value: formatNumber(totalVotes),
      label: 'Total Votes',
    });
  }
  const statsGridClass =
    statCards.length === 1
      ? 'phase-stats phase-stats-solo results-stats'
      : statCards.length === 2
      ? 'phase-stats phase-stats-centered results-stats'
      : 'phase-stats results-stats';

  return (
    <div className="phase-view phase-results">
      {/* Competition Header - Consistent across all phases */}
      <CompetitionHeader
        badge="Competition Complete"
        badgeIcon={Trophy}
        badgeVariant="complete"
        iconOnly
      />

      {/* Winners Podium */}
      <section className="phase-section">
        <WinnersPodium />
      </section>

      {/* Final Stats - shown for all completed competitions */}
      {statCards.length > 0 && (
        <section className={statsGridClass}>
          {statCards.map((stat) => (
            <div
              key={stat.key}
              className={`stat-card${stat.highlight ? ' stat-card-highlight' : ''}`}
            >
              {stat.icon && (
                <div className="stat-icon-wrap">
                  <stat.icon size={20} className="stat-icon" />
                </div>
              )}
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          ))}
        </section>
      )}

      {/* Prize Pool Breakdown - only for non-legacy with a configured cash pool */}
      {!isLegacy && prizePool && (
        <section className="phase-section">
          <PrizePool showLiveBadge={false} />
        </section>
      )}

      {/* Itemized prizes / rewards awarded in the competition */}
      <section className="phase-section">
        <PrizeShowcase />
      </section>

      {/* Photo gallery from the competition */}
      <section className="phase-section">
        <PhotoGallery />
      </section>

      {/* Events from the competition */}
      <section className="phase-section">
        <CompetitionEvents />
      </section>

      {/* Next Season CTA
          - If a sibling competition is already live/coming up, point to it.
          - Otherwise collect interest so they're notified when the next
            round of nominations opens. */}
      <section className="phase-cta-next-season">
        <div className="next-season-card">
          <h3>Think You Can Win?</h3>
          {nextComp ? (
            <>
              {nextComp.nominationsOpenNow ? (
                <p>{nextComp.name} nominations are open now!</p>
              ) : (
                <p>
                  Up next: {nextComp.name}
                  {nextComp.nomination_start
                    ? ` — nominations open ${formatNominationDate(nextComp.nomination_start)}.`
                    : ' — coming soon.'}
                </p>
              )}
              <button className="btn btn-primary" onClick={handleNavigateToNextComp}>
                {nextComp.nominationsOpenNow ? 'Enter Now' : 'View Competition'}
              </button>
            </>
          ) : (
            <>
              <p>
                {organization?.name
                  ? `Be the first to know when ${organization.name} opens nominations again.`
                  : 'Be the first to know when nominations open again.'}
              </p>
              <button className="btn btn-primary" onClick={() => setShowInterest(true)}>
                Notify Me
              </button>
            </>
          )}
        </div>
      </section>

      {/* Judges */}
      <section className="phase-section">
        <JudgesSection />
      </section>

      <hr className="phase-divider" />

      {/* Host & Sponsors */}
      <section className="phase-section">
        <HostSection />
      </section>

      {/* Notify-me interest capture (shown only when no upcoming competition) */}
      {showInterest && (
        <InterestModal
          type={INTEREST_TYPE.COMPETING}
          competition={competition}
          onClose={() => setShowInterest(false)}
        />
      )}
    </div>
  );
}

export default ResultsPhase;
