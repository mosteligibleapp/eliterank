import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Users } from 'lucide-react';
import { Rewards } from '../components/Rewards';
import { WhoCompetes } from '../components/WhoCompetes';
import { HallOfWinnersSection } from '../components/HallOfWinnersSection';
import { Timeline } from '../components/Timeline';
import { RulesAccordion } from '../components/RulesAccordion';
import { HostCard } from '../components/HostCard';
import { CountdownDisplay } from '../components/CountdownDisplay';
import { CompetitionHeader } from '../components/CompetitionHeader';
import { CompetitionFooter } from '../components/CompetitionFooter';

/**
 * Nominations phase view
 * Shows while nominations are open
 * CTA buttons navigate to /:orgSlug/:slug/enter (gamified entry flow)
 *
 * URL Parameters:
 * - ?apply=self  - Auto-redirects to entry flow
 * - ?apply=other - Auto-redirects to entry flow
 * - ?apply=true  - Auto-redirects to entry flow
 */
export function NominationsPhase() {
  const { competition, orgSlug, competitionSlug } = usePublicCompetition();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const entryPath = `/${orgSlug}/${competitionSlug}/enter`;

  // Auto-redirect if ?apply param is present
  useEffect(() => {
    const applyParam = searchParams.get('apply');
    if (applyParam) {
      searchParams.delete('apply');
      setSearchParams(searchParams, { replace: true });
      navigate(entryPath);
    }
  }, [searchParams, setSearchParams, navigate, entryPath]);

  const handleEnter = () => {
    navigate(entryPath);
  };

  return (
    <div className="phase-view phase-nominations">
      {/* Competition Header - Consistent across all phases */}
      <CompetitionHeader
        badge="Nominations Open"
        badgeVariant="active"
      />

      {/* Main CTA Card */}
      <section className="nomination-cta-card">
        <h3 className="nomination-cta-title">Are You An Elite?</h3>
        <p className="nomination-cta-subtitle">
          Apply now or nominate someone who deserves the spotlight.
        </p>
        <div className="nomination-cta-buttons">
          <button
            className="btn btn-primary btn-large"
            onClick={handleEnter}
          >
            Enter Competition
          </button>
          <button
            className="btn btn-outline btn-large"
            onClick={handleEnter}
          >
            Nominate Someone
          </button>
        </div>
      </section>

      {/* Stats Row - Centered below CTA */}
      <section className="phase-stats phase-stats-centered">
        <div className="stat-card stat-card-urgent">
          <CountdownDisplay label="" />
          <span className="stat-label">Nominations Close</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap">
            <Users size={20} className="stat-icon" />
          </div>
          <span className="stat-value">200+</span>
          <span className="stat-label">Entries</span>
        </div>
      </section>

      {/* Who Competes */}
      <section className="phase-section">
        <WhoCompetes />
      </section>

      {/* Hall of Winners - Past Elites */}
      <section className="phase-section">
        <HallOfWinnersSection />
      </section>

      {/* Rewards */}
      <section className="phase-section">
        <Rewards />
      </section>

      <hr className="phase-divider" />

      {/* Timeline & Host/Rules */}
      <section className="phase-grid phase-grid-2">
        <Timeline />
        <div className="sidebar-stack">
          <HostCard />
          <RulesAccordion />
        </div>
      </section>

      {/* Footer */}
      <CompetitionFooter />
    </div>
  );
}

export default NominationsPhase;
