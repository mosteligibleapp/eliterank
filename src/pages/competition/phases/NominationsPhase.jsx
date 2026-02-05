import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Users, Clock, X } from 'lucide-react';
import { Rewards } from '../components/Rewards';
import { WhoCompetes } from '../components/WhoCompetes';
import { HallOfWinnersSection } from '../components/HallOfWinnersSection';
import { HostSection } from '../components/HostSection';
import { Timeline } from '../components/Timeline';
import { RulesAccordion } from '../components/RulesAccordion';
import { UpcomingEventCard } from '../components/UpcomingEventCard';
import { CountdownDisplay } from '../components/CountdownDisplay';
import { CompetitionHeader } from '../components/CompetitionHeader';
import { CompetitionFooter } from '../components/CompetitionFooter';
import NominationForm from '../../../features/public-site/components/NominationForm';

/**
 * Nominations phase view
 * Shows while nominations are open
 *
 * URL Parameters:
 * - ?apply=self  - Auto-opens nomination modal with "Myself" selected
 * - ?apply=other - Auto-opens nomination modal with "Someone Else" selected
 * - ?apply=true  - Auto-opens nomination modal (shows selection screen)
 */
export function NominationsPhase() {
  const { competition, refetch } = usePublicCompetition();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showNominationModal, setShowNominationModal] = useState(false);
  const [nominateOther, setNominateOther] = useState(false);

  // Check for ?apply param to auto-open nomination modal
  useEffect(() => {
    const applyParam = searchParams.get('apply');
    if (applyParam) {
      setShowNominationModal(true);
      // Clear the param from URL to prevent re-opening on refresh
      searchParams.delete('apply');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Lock body scroll when modal is open to prevent background scrolling
  useEffect(() => {
    if (showNominationModal) {
      // Save current scroll position and lock body
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        // Restore scroll position when modal closes
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [showNominationModal]);

  const handleOpenNomination = (forOther = false) => {
    setNominateOther(forOther);
    setShowNominationModal(true);
  };

  const handleCloseNomination = () => {
    setShowNominationModal(false);
    setNominateOther(false);
  };

  const handleNominationSubmit = () => {
    setShowNominationModal(false);
    setNominateOther(false);
    // Refresh data to show updated nomination count
    refetch?.();
  };

  return (
    <div className="phase-view phase-nominations">
      {/* Competition Header - Consistent across all phases */}
      <CompetitionHeader
        badge="Nominations Open"
        badgeVariant="active"
      />

      {/* Who Competes */}
      <section className="phase-section">
        <WhoCompetes />
      </section>

      {/* Main CTA Card */}
      <section className="nomination-cta-card">
        <h3 className="nomination-cta-title">Are You An Elite?</h3>
        <p className="nomination-cta-subtitle">
          Apply now or nominate someone who deserves the spotlight.
        </p>
        <div className="nomination-cta-buttons">
          <button
            className="btn btn-primary btn-large"
            onClick={() => handleOpenNomination(false)}
          >
            Apply Now
          </button>
          <button
            className="btn btn-outline btn-large"
            onClick={() => handleOpenNomination(true)}
          >
            Nominate Someone
          </button>
        </div>
      </section>

      {/* Hall of Winners - Past Elites */}
      <section className="phase-section">
        <HallOfWinnersSection />
      </section>

      {/* Stats Row */}
      <section className="phase-stats">
        <div className="stat-card stat-card-urgent">
          <Clock size={20} className="stat-icon" />
          <CountdownDisplay label="" />
          <span className="stat-label">Nominations Close</span>
        </div>
        <div className="stat-card stat-card-highlight">
          <span className="stat-value">5</span>
          <span className="stat-label">Winners</span>
          <span className="stat-sublabel">Season 2026</span>
        </div>
        <div className="stat-card">
          <Users size={20} className="stat-icon" />
          <span className="stat-value">200+</span>
          <span className="stat-label">Nominations</span>
        </div>
      </section>

      {/* Rewards */}
      <section className="phase-section">
        <Rewards />
      </section>

      <hr className="phase-divider" />

      {/* Host & Sponsors */}
      <section className="phase-section">
        <HostSection />
      </section>

      <hr className="phase-divider" />

      {/* Timeline & Events/Rules */}
      <section className="phase-grid phase-grid-2">
        <Timeline />
        <div className="sidebar-stack">
          <UpcomingEventCard />
          <RulesAccordion />
        </div>
      </section>

      {/* Footer */}
      <CompetitionFooter />

      {/* Nomination Modal */}
      {showNominationModal && (
        <div className="modal-overlay" onClick={handleCloseNomination}>
          <div
            className="modal-container modal-nomination"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={handleCloseNomination}>
              <X size={18} />
            </button>
            <NominationForm
              city={competition?.city}
              competitionId={competition?.id}
              onSubmit={handleNominationSubmit}
              onClose={handleCloseNomination}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default NominationsPhase;
