import { useState } from 'react';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { ArrowRight, Users, Clock, X } from 'lucide-react';
import { PrizePool } from '../components/PrizePool';
import { WhoCompetes } from '../components/WhoCompetes';
import { AboutSection } from '../components/AboutSection';
import { HostSection } from '../components/HostSection';
import { Timeline } from '../components/Timeline';
import { RulesAccordion } from '../components/RulesAccordion';
import { CountdownDisplay } from '../components/CountdownDisplay';
import { CompetitionHeader } from '../components/CompetitionHeader';
import { formatNumber } from '../../../utils/formatters';
import NominationForm from '../../../features/public-site/components/NominationForm';

/**
 * Nominations phase view
 * Shows while nominations are open
 */
export function NominationsPhase() {
  const { competition, prizePool, contestants, refetch } = usePublicCompetition();
  const [showNominationModal, setShowNominationModal] = useState(false);
  const [nominateOther, setNominateOther] = useState(false);

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

  // Nomination count (contestants in nomination status)
  const nominationCount = contestants?.length || 0;

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

      {/* Main CTA */}
      <section className="phase-cta-main">
        <span className="cta-label">Think you qualify?</span>
        <button
          className="btn btn-primary btn-large"
          onClick={() => handleOpenNomination(false)}
        >
          Start Your Nomination
          <ArrowRight size={18} />
        </button>
        <span className="cta-alt">
          or <button
            className="link-button"
            onClick={() => handleOpenNomination(true)}
          >
            nominate someone you know
          </button>
        </span>
      </section>

      {/* Stats Row */}
      <section className="phase-stats">
        <div className="stat-card">
          <Users size={20} className="stat-icon" />
          <span className="stat-value">{formatNumber(nominationCount)}</span>
          <span className="stat-label">Nominations</span>
        </div>
        <div className="stat-card stat-card-highlight">
          <span className="stat-value">{prizePool?.formatted?.totalPrizePool}</span>
          <span className="stat-label">Prize Pool</span>
        </div>
        <div className="stat-card stat-card-urgent">
          <Clock size={20} className="stat-icon" />
          <CountdownDisplay label="" />
          <span className="stat-label">Closes In</span>
        </div>
      </section>

      {/* Prize Breakdown */}
      <section className="phase-section">
        <PrizePool />
      </section>

      {/* About Links */}
      <section className="phase-section">
        <AboutSection />
      </section>

      <hr className="phase-divider" />

      {/* Host & Sponsors */}
      <section className="phase-section">
        <HostSection />
      </section>

      <hr className="phase-divider" />

      {/* Timeline & Rules */}
      <section className="phase-grid phase-grid-2">
        <Timeline />
        <RulesAccordion />
      </section>

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
