import { useState } from 'react';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Bell, Crown, Users, Briefcase } from 'lucide-react';
import { HallOfWinnersSection } from '../components/HallOfWinnersSection';
import { HostSection } from '../components/HostSection';
import { CompetitionHeader } from '../components/CompetitionHeader';
import { InterestModal } from '../components/InterestModal';
import { CountdownDisplay } from '../components/CountdownDisplay';
import { Timeline } from '../components/Timeline';
import { PrizePool } from '../components/PrizePool';
import { JudgesSection } from '../components/JudgesSection';
import { CharityHighlight } from '../components/CharityHighlight';
import { HostCard } from '../components/HostCard';
import { PoweredByEliteRank } from '../components/PoweredByEliteRank';
import { INTEREST_TYPE } from '../../../types/competition';
import { getCityImage } from '../../../utils/cityImages';

/**
 * Coming Soon phase view
 * Shows before nominations open
 */
export function ComingSoonPhase() {
  const { competition, sponsors, judges, prizePool, countdown } = usePublicCompetition();
  const [activeModal, setActiveModal] = useState(null);

  const openModal = (type) => setActiveModal(type);
  const closeModal = () => setActiveModal(null);

  const hasSponsors = sponsors && sponsors.length > 0;
  const hasHost = Boolean(competition?.host);
  const hasJudges = judges && judges.length > 0;
  const hasPrize = Boolean(prizePool);
  const hasCountdown = Boolean(countdown && !countdown.isExpired);
  const hasCharity = Boolean(competition?.charity_name);

  const heroImage = competition?.cover_image || getCityImage(competition?.city, competition?.name);

  return (
    <div className="phase-view phase-coming-soon">
      {/* Hero — backdrop image + header + countdown */}
      <section
        className="phase-coming-soon-hero"
        style={heroImage ? { '--hero-image': `url("${heroImage}")` } : undefined}
      >
        <div className="phase-coming-soon-hero-inner">
          <CompetitionHeader badge="Coming Soon" badgeVariant="default" />
          {hasCountdown && (
            <div className="phase-coming-soon-countdown">
              <CountdownDisplay label="Nominations open in" large showPlaceholder={false} />
            </div>
          )}
        </div>
      </section>

      {/* Primary CTA — email capture */}
      <section className="phase-coming-soon-cta">
        <button
          className="phase-cta-primary"
          onClick={() => openModal(INTEREST_TYPE.FAN)}
        >
          <Bell size={20} />
          <span className="phase-cta-primary-label">Get notified when nominations open</span>
        </button>
        <div className="phase-cta-secondary">
          <button className="phase-cta-secondary-btn" onClick={() => openModal(INTEREST_TYPE.COMPETING)}>
            <Crown size={16} />
            <span>Compete</span>
          </button>
          {hasHost ? null : (
            <button className="phase-cta-secondary-btn" onClick={() => openModal(INTEREST_TYPE.HOSTING)}>
              <Users size={16} />
              <span>Host</span>
            </button>
          )}
          <button className="phase-cta-secondary-btn" onClick={() => openModal(INTEREST_TYPE.SPONSORING)}>
            <Briefcase size={16} />
            <span>Sponsor</span>
          </button>
        </div>
      </section>

      {/* Host credibility — full card variant */}
      {hasHost && (
        <section className="phase-section phase-coming-soon-host">
          <HostCard />
        </section>
      )}

      {/* Journey + Prize side-by-side on desktop, stacked on mobile */}
      {(hasPrize || competition?.nomination_start || competition?.finals_date) && (
        <section className="phase-coming-soon-stakes">
          <div className="phase-coming-soon-stakes-timeline">
            <Timeline />
          </div>
          {hasPrize && (
            <div className="phase-coming-soon-stakes-prize">
              <PrizePool showLiveBadge={false} />
            </div>
          )}
        </section>
      )}

      {/* Judges credibility */}
      {hasJudges && (
        <section className="phase-section">
          <JudgesSection />
        </section>
      )}

      {/* Charity tie-in */}
      {hasCharity && (
        <section className="phase-section">
          <CharityHighlight />
        </section>
      )}

      {/* Hall of Winners — past champions / cross-comp prestige */}
      <section className="phase-section">
        <HallOfWinnersSection />
      </section>

      {/* Sponsors */}
      {hasSponsors && (
        <>
          <hr className="phase-divider" />
          <section className="phase-section">
            <HostSection />
          </section>
        </>
      )}

      {/* Attribution */}
      <PoweredByEliteRank />

      {/* Interest Modals */}
      {activeModal && (
        <InterestModal
          type={activeModal}
          competition={competition}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

export default ComingSoonPhase;
