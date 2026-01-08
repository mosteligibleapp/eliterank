import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { ArrowRight, Users, Clock } from 'lucide-react';
import { PrizePool } from '../components/PrizePool';
import { WhoCompetes } from '../components/WhoCompetes';
import { AboutSection } from '../components/AboutSection';
import { HostSection } from '../components/HostSection';
import { Timeline } from '../components/Timeline';
import { RulesAccordion } from '../components/RulesAccordion';
import { CountdownDisplay } from '../components/CountdownDisplay';
import { formatNumber } from '../../../utils/formatters';

/**
 * Nominations phase view
 * Shows while nominations are open
 */
export function NominationsPhase() {
  const { competition, about, prizePool, contestants } = usePublicCompetition();

  // Nomination count (contestants in nomination status)
  const nominationCount = contestants?.length || 0;

  return (
    <div className="phase-view phase-nominations">
      {/* Hero */}
      <section className="phase-hero">
        <span className="phase-badge phase-badge-active">
          <span className="badge-dot" />
          Nominations Open
        </span>
        <h1 className="phase-title">Are You {competition?.city}'s</h1>
        <h2 className="phase-subtitle phase-subtitle-highlight">Most Eligible?</h2>
        {about?.description && (
          <p className="phase-description">{about.description}</p>
        )}
      </section>

      {/* Who Competes */}
      <section className="phase-section">
        <WhoCompetes />
      </section>

      {/* Main CTA */}
      <section className="phase-cta-main">
        <span className="cta-label">Think you qualify?</span>
        <button className="btn btn-primary btn-large">
          Start Your Nomination
          <ArrowRight size={18} />
        </button>
        <span className="cta-alt">
          or <a href="#nominate-other">nominate someone you know</a>
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
    </div>
  );
}

export default NominationsPhase;
