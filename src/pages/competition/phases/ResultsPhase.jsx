import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Trophy, Users } from 'lucide-react';
import { WinnersPodium } from '../components/WinnersPodium';
import { PrizePool } from '../components/PrizePool';
import { AboutSection } from '../components/AboutSection';
import { HostSection } from '../components/HostSection';
import { CompetitionHeader } from '../components/CompetitionHeader';
import { formatNumber } from '../../../utils/formatters';
import { supabase } from '../../../lib/supabase';

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

  // Check if there's an active/upcoming competition for the same org
  const [currentComp, setCurrentComp] = useState(null);
  const orgId = competition?.organization_id;
  const compId = competition?.id;
  const cityId = competition?.city_id;
  const categoryId = competition?.category_id;

  useEffect(() => {
    if (!orgId || !supabase) return;

    let cancelled = false;

    let query = supabase
      .from('competitions')
      .select('id, name, slug, status, organization_id')
      .eq('organization_id', orgId)
      .neq('id', compId)
      .in('status', ['live', 'publish'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (cityId) query = query.eq('city_id', cityId);
    if (categoryId) query = query.eq('category_id', categoryId);

    query.then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        console.error('Error fetching next competition:', error);
        return;
      }
      if (data?.[0]) setCurrentComp(data[0]);
    });

    return () => { cancelled = true; };
  }, [orgId, compId, cityId, categoryId]);

  // Get org slug for navigation
  const orgSlug = organization?.slug;

  const handleNavigateToCurrentComp = () => {
    if (currentComp && orgSlug) {
      navigate(`/${orgSlug}/${currentComp.slug}`);
    }
  };

  return (
    <div className="phase-view phase-results">
      {/* Competition Header - Consistent across all phases */}
      <CompetitionHeader
        badge="Competition Complete"
        badgeIcon={Trophy}
        badgeVariant="complete"
      />

      {/* Winners Podium */}
      <section className="phase-section">
        <WinnersPodium />
      </section>

      {/* Final Stats - only for non-legacy competitions */}
      {!isLegacy && (
        <section className="phase-stats results-stats">
          <div className="stat-card stat-card-highlight">
            <div className="stat-icon-wrap">
              <Trophy size={20} className="stat-icon" />
            </div>
            <span className="stat-value">{prizePool?.formatted?.totalPrizePool}</span>
            <span className="stat-label">Total Awarded</span>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap">
              <Users size={20} className="stat-icon" />
            </div>
            <span className="stat-value">{formatNumber(leaderboardStats?.totalContestants)}</span>
            <span className="stat-label">Contestants</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{formatNumber(leaderboardStats?.totalVotes)}</span>
            <span className="stat-label">Total Votes</span>
          </div>
        </section>
      )}

      {/* Prize Pool Breakdown - only for non-legacy */}
      {!isLegacy && (
        <section className="phase-section">
          <PrizePool showLiveBadge={false} />
        </section>
      )}

      {/* Next Season CTA - only show if there's an active competition */}
      {currentComp && (
        <section className="phase-cta-next-season">
          <div className="next-season-card">
            <h3>Think You Can Win?</h3>
            <p>{currentComp.name} nominations are open now!</p>
            <button className="btn btn-primary" onClick={handleNavigateToCurrentComp}>
              Enter Now
            </button>
          </div>
        </section>
      )}

      <hr className="phase-divider" />

      {/* About */}
      <section className="phase-section">
        <AboutSection />
      </section>

      <hr className="phase-divider" />

      {/* Host & Sponsors */}
      <section className="phase-section">
        <HostSection />
      </section>
    </div>
  );
}

export default ResultsPhase;
