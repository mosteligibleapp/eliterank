import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Bell, Crown, Users, Briefcase } from 'lucide-react';
import { PrizePool } from '../components/PrizePool';
import { WhoCompetes } from '../components/WhoCompetes';
import { AboutSection } from '../components/AboutSection';
import { HostSection } from '../components/HostSection';
import { Timeline } from '../components/Timeline';
import { RulesAccordion } from '../components/RulesAccordion';
import { CountdownDisplay } from '../components/CountdownDisplay';

/**
 * Coming Soon phase view
 * Shows before nominations open
 */
export function ComingSoonPhase() {
  const { competition, about } = usePublicCompetition();

  return (
    <div className="phase-view phase-coming-soon">
      {/* Hero */}
      <section className="phase-hero">
        <span className="phase-tag">Season {competition?.season || '2026'}</span>
        <h1 className="phase-title">{competition?.name || 'Most Eligible'}</h1>
        <h2 className="phase-subtitle">{competition?.city}</h2>
        {about?.description && (
          <p className="phase-description">{about.description}</p>
        )}
      </section>

      {/* Who Competes - Prominent */}
      <section className="phase-section">
        <WhoCompetes />
      </section>

      {/* Prize Pool + Countdown Row */}
      <section className="phase-grid phase-grid-2">
        <div className="phase-card">
          <PrizePool compact showLiveBadge={false} />
        </div>
        <div className="phase-card">
          <CountdownDisplay label="Nominations Open In" large />
        </div>
      </section>

      {/* CTA Buttons */}
      <section className="phase-cta-grid">
        <button className="cta-card">
          <Crown size={24} />
          <span className="cta-title">Compete</span>
          <span className="cta-desc">Enter the arena</span>
        </button>
        <button className="cta-card">
          <Users size={24} />
          <span className="cta-title">Host</span>
          <span className="cta-desc">Run a competition</span>
        </button>
        <button className="cta-card">
          <Briefcase size={24} />
          <span className="cta-title">Sponsor</span>
          <span className="cta-desc">Back the winners</span>
        </button>
        <button className="cta-card">
          <Bell size={24} />
          <span className="cta-title">Notify Me</span>
          <span className="cta-desc">Get updates</span>
        </button>
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

export default ComingSoonPhase;
