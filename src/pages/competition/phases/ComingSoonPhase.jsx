import { useState } from 'react';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Bell } from 'lucide-react';
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
  const {
    competition, sponsors, judges, prizePool, countdown,
    nominationPeriods, votingRounds,
  } = usePublicCompetition();
  const [activeModal, setActiveModal] = useState(null);

  const openModal = (type) => setActiveModal(type);
  const closeModal = () => setActiveModal(null);

  const hasSponsors = sponsors && sponsors.length > 0;
  const hasHost = Boolean(competition?.host);
  const hasJudges = judges && judges.length > 0;
  const hasPrize = Boolean(prizePool) && Number(prizePool?.totalPrizePool) > 0;
  const hasCountdown = Boolean(countdown && !countdown.isExpired);
  const hasCharity = Boolean(competition?.charity_name);

  // Timeline renders nothing unless at least one phase has dates.
  const hasTimeline = Boolean(
    nominationPeriods?.some(p => p.start_date || p.end_date)
    || votingRounds?.some(r => r.start_date || r.end_date)
    || competition?.nomination_start
    || competition?.nomination_end
    || competition?.finals_date,
  );

  const heroImage = competition?.cover_image || getCityImage(competition?.city, competition?.name);

  return (
    <div
      className="phase-view phase-coming-soon"
      style={heroImage ? { '--hero-image': `url("${heroImage}")` } : undefined}
    >
      {/* Hero — header + countdown over the page-wide backdrop */}
      <section className="phase-coming-soon-hero">
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
      </section>

      {/* Host credibility — full card variant */}
      {hasHost && (
        <section className="phase-section phase-coming-soon-host">
          <HostCard variant="featured" />
        </section>
      )}

      {/* Journey + Prize side-by-side on desktop, stacked on mobile */}
      {(hasTimeline || hasPrize) && (
        <section className="phase-coming-soon-stakes">
          {hasTimeline && (
            <div className="phase-coming-soon-stakes-timeline">
              <Timeline />
            </div>
          )}
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
