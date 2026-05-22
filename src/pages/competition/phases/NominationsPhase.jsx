import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Users, Clock } from 'lucide-react';
import { Rewards } from '../components/Rewards';
import { WhoCompetes } from '../components/WhoCompetes';
import { HallOfWinnersSection } from '../components/HallOfWinnersSection';
import { Timeline } from '../components/Timeline';
import { RulesAccordion } from '../components/RulesAccordion';
import { HostCard } from '../components/HostCard';
import { CountdownDisplay } from '../components/CountdownDisplay';
import { CompetitionHeader } from '../components/CompetitionHeader';
import { CompetitionFooter } from '../components/CompetitionFooter';
import { CharityHighlight } from '../components/CharityHighlight';
import { JudgesSection } from '../components/JudgesSection';

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
  const {
    competition, orgSlug, competitionSlug, votingRounds, nominationPeriods,
    about, events, contestants, isPreview,
  } = usePublicCompetition();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const entryPath = `/${orgSlug}/${competitionSlug}/enter`;

  // Real entry count — the stat card only appears once entries exist.
  const entryCount = contestants?.length || 0;
  const hasEntries = entryCount > 0;

  // The timeline column (Timeline + Charity) only renders once a host has
  // added at least one date or a charity; otherwise the page drops to a
  // single column so the layout never goes lopsided.
  const hasTimelineData = Boolean(
    nominationPeriods?.some(p => p.start_date || p.end_date)
    || votingRounds?.some(r => r.start_date || r.end_date)
    || competition?.nomination_start
    || competition?.nomination_end
    || competition?.finals_date,
  );
  const hasTimelineColumn = hasTimelineData || Boolean(competition?.charity_name);

  // Auto-redirect if ?apply param is present (skipped in preview so hosts
  // don't get kicked out of the preview by a stray query param).
  useEffect(() => {
    if (isPreview) return;
    const applyParam = searchParams.get('apply');
    if (applyParam) {
      searchParams.delete('apply');
      setSearchParams(searchParams, { replace: true });
      navigate(entryPath);
    }
  }, [searchParams, setSearchParams, navigate, entryPath, isPreview]);

  const handleEnter = () => {
    // In preview the "Enter" CTA is disabled at the UI level, but no-op here
    // as a belt-and-suspenders guard in case a child component calls it.
    if (isPreview) return;
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
        <h3 className="nomination-cta-title">Who Deserves The Spotlight?</h3>
        <div className="nomination-cta-buttons">
          <button
            className="btn btn-primary btn-large"
            onClick={handleEnter}
          >
            Nominate
          </button>
        </div>
      </section>

      {/* Stats Row - Centered below CTA */}
      <section className={`phase-stats ${hasEntries ? 'phase-stats-centered' : 'phase-stats-solo'}`}>
        <div className="stat-card stat-card-urgent">
          <div className="stat-icon-wrap">
            <Clock size={20} className="stat-icon" />
          </div>
          <CountdownDisplay label="" />
          <span className="stat-label">Nominations Close</span>
        </div>
        {hasEntries && (
          <div className="stat-card">
            <div className="stat-icon-wrap">
              <Users size={20} className="stat-icon" />
            </div>
            <span className="stat-value">{entryCount.toLocaleString()}</span>
            <span className="stat-label">Entries</span>
          </div>
        )}
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

      {/* Judges */}
      <section className="phase-section">
        <JudgesSection />
      </section>

      <hr className="phase-divider" />

      {/* Timeline & Host + Rules — two columns once the host has added
          timeline/charity content, otherwise a single stacked column. */}
      {hasTimelineColumn ? (
        <section className="phase-grid phase-grid-2">
          <div>
            <Timeline />
            <CharityHighlight />
          </div>
          <div className="sidebar-stack">
            <HostCard />
            <RulesAccordion competition={competition} votingRounds={votingRounds} about={about} events={events} />
          </div>
        </section>
      ) : (
        <section className="sidebar-stack">
          <HostCard />
          <RulesAccordion competition={competition} votingRounds={votingRounds} about={about} events={events} />
        </section>
      )}

      {/* Footer */}
      <CompetitionFooter />
    </div>
  );
}

export default NominationsPhase;
