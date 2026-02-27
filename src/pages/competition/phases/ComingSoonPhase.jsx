import { useState } from 'react';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Bell, Crown, Users, User, Briefcase } from 'lucide-react';
import { HallOfWinnersSection } from '../components/HallOfWinnersSection';
import { HostSection } from '../components/HostSection';
import { CompetitionHeader } from '../components/CompetitionHeader';
import { InterestModal } from '../components/InterestModal';
import { INTEREST_TYPE } from '../../../types/competition';

/**
 * Coming Soon phase view
 * Shows before nominations open
 */
export function ComingSoonPhase() {
  const { competition, sponsors } = usePublicCompetition();
  const [activeModal, setActiveModal] = useState(null);

  const openModal = (type) => setActiveModal(type);
  const closeModal = () => setActiveModal(null);

  // Only show HostSection below for sponsors (host is in the CTA grid)
  const hasSponsors = sponsors && sponsors.length > 0;

  return (
    <div className="phase-view phase-coming-soon">
      {/* Competition Header - Consistent across all phases */}
      <CompetitionHeader
        badge="Coming Soon"
        badgeVariant="default"
      />

      {/* Hall of Winners - Past Champions */}
      <section className="phase-section">
        <HallOfWinnersSection />
      </section>

      {/* CTA Buttons */}
      <section className="phase-cta-grid">
        <button className="cta-card" onClick={() => openModal(INTEREST_TYPE.COMPETING)}>
          <Crown size={24} />
          <span className="cta-title">Compete</span>
          <span className="cta-desc">Enter the arena</span>
        </button>
        {competition?.host ? (
          <div className="cta-card cta-card-host">
            {competition.host.avatar_url ? (
              <img src={competition.host.avatar_url} alt={`${competition.host.first_name || ''} ${competition.host.last_name || ''}`.trim()} className="cta-host-avatar" />
            ) : (
              <User size={24} />
            )}
            <span className="cta-title">Your Host</span>
            <span className="cta-desc">{competition.host.first_name} {competition.host.last_name}</span>
          </div>
        ) : (
          <button className="cta-card" onClick={() => openModal(INTEREST_TYPE.HOSTING)}>
            <Users size={24} />
            <span className="cta-title">Host</span>
            <span className="cta-desc">Host a competition</span>
          </button>
        )}
        <button className="cta-card" onClick={() => openModal(INTEREST_TYPE.SPONSORING)}>
          <Briefcase size={24} />
          <span className="cta-title">Sponsor</span>
          <span className="cta-desc">Back the winners</span>
        </button>
        <button className="cta-card" onClick={() => openModal(INTEREST_TYPE.FAN)}>
          <Bell size={24} />
          <span className="cta-title">Notify Me</span>
          <span className="cta-desc">Get updates</span>
        </button>
      </section>

      {/* Interest Modals */}
      {activeModal && (
        <InterestModal
          type={activeModal}
          competition={competition}
          onClose={closeModal}
        />
      )}

      {/* Sponsors */}
      {hasSponsors && (
        <>
          <hr className="phase-divider" />
          <section className="phase-section">
            <HostSection />
          </section>
        </>
      )}

    </div>
  );
}

export default ComingSoonPhase;
