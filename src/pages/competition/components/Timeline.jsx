import { useState } from 'react';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Check, Circle, ChevronDown, Trophy } from 'lucide-react';
import { formatDate } from '../../../utils/formatters';

/**
 * Competition timeline — simplified 3-phase view:
 * Entry Period | Voting Period | Finale
 */
export function Timeline() {
  const { competition, votingRounds, nominationPeriods, phase } = usePublicCompetition();

  // --- Build 3 high-level phases ---

  // 1. Entry period — earliest nom start → latest nom end
  let entryStart = null;
  let entryEnd = null;

  if (nominationPeriods?.length > 0) {
    const starts = nominationPeriods.map(np => np.start_date).filter(Boolean);
    const ends = nominationPeriods.map(np => np.end_date).filter(Boolean);
    if (starts.length) entryStart = starts.sort()[0];
    if (ends.length) entryEnd = ends.sort().pop();
  } else {
    entryStart = competition?.nomination_start;
    entryEnd = competition?.nomination_end;
  }

  // 2. Voting period — earliest round start → latest round end
  let votingStart = null;
  let votingEnd = null;
  const rounds = votingRounds || [];
  if (rounds.length > 0) {
    const starts = rounds.map(r => r.start_date).filter(Boolean);
    const ends = rounds.map(r => r.end_date).filter(Boolean);
    if (starts.length) votingStart = starts.sort()[0];
    if (ends.length) votingEnd = ends.sort().pop();
  }

  // 3. Finale
  const finaleDate = competition?.finals_date;

  const phases = [
    entryStart || entryEnd ? {
      id: 'entry',
      title: 'Entry Period',
      subtitle: 'Nominations open',
      date: entryStart,
      endDate: entryEnd,
      status: getPeriodStatus(entryStart, entryEnd),
    } : null,
    votingStart || votingEnd ? {
      id: 'voting',
      title: 'Voting Period',
      subtitle: rounds.length > 1 ? `${rounds.length} rounds of public voting` : 'Public voting',
      date: votingStart,
      endDate: votingEnd,
      status: getPeriodStatus(votingStart, votingEnd),
    } : null,
    finaleDate ? {
      id: 'finale',
      title: 'Finale',
      subtitle: 'Live crowning event',
      date: finaleDate,
      status: getFinaleStatus(finaleDate),
      isFinale: true,
    } : null,
  ].filter(Boolean);

  // Mobile collapsible state
  const [sectionOpen, setSectionOpen] = useState(false);

  if (phases.length === 0) {
    return (
      <div className="timeline">
        <button className="timeline-header timeline-header-mobile" onClick={() => setSectionOpen(!sectionOpen)}>
          <h4 className="section-label">Timeline</h4>
          <ChevronDown size={18} className={`timeline-header-chevron ${sectionOpen ? 'timeline-header-chevron-open' : ''}`} />
        </button>
        <div className="timeline-header-desktop">
          <h4 className="section-label">Timeline</h4>
        </div>
        {sectionOpen && (
          <div className="timeline-empty">
            <p>Timeline coming soon</p>
          </div>
        )}
      </div>
    );
  }

  const activePhase = phases.find(p => p.status === 'active');

  return (
    <div className={`timeline ${sectionOpen ? 'timeline-open' : ''}`}>
      {/* Mobile-only collapsible header */}
      <button className="timeline-header timeline-header-mobile" onClick={() => setSectionOpen(!sectionOpen)}>
        <div className="timeline-header-left">
          <h4 className="section-label">Timeline</h4>
          {!sectionOpen && activePhase && (
            <span className="timeline-summary">
              <Circle size={8} className="timeline-summary-dot" />
              {activePhase.title}
            </span>
          )}
        </div>
        <ChevronDown size={18} className={`timeline-header-chevron ${sectionOpen ? 'timeline-header-chevron-open' : ''}`} />
      </button>

      {/* Desktop always-visible header */}
      <div className="timeline-header-desktop">
        <h4 className="section-label">Timeline</h4>
      </div>

      {/* Desktop: always visible, Mobile: collapsible */}
      <div className="timeline-body">
        <div className="timeline-list">
          {phases.map((item, index) => (
            <div
              key={item.id}
              className={`timeline-item timeline-item-${item.status}`}
            >
              <div className="timeline-marker">
                <div className={`timeline-step timeline-step-${item.status}`}>
                  {item.status === 'complete' ? (
                    <Check size={14} />
                  ) : item.isFinale ? (
                    <Trophy size={14} />
                  ) : (
                    <span className="timeline-step-number">{index + 1}</span>
                  )}
                </div>
                {index < phases.length - 1 && (
                  <div className={`timeline-line timeline-line-${item.status}`} />
                )}
              </div>
              <div className="timeline-content">
                <span className="timeline-title">{item.title}</span>
                <span className="timeline-date">
                  {formatDate(item.date)}
                  {item.endDate && item.endDate !== item.date && (
                    <> — {formatDate(item.endDate)}</>
                  )}
                </span>
                {item.subtitle && (
                  <span className="timeline-subtitle">{item.subtitle}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getPeriodStatus(startDate, endDate) {
  const now = new Date();
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (!start && !end) return 'upcoming';
  if (end && now > end) return 'complete';
  if (start && end && now >= start && now <= end) return 'active';
  if (start && !end && now >= start) return 'active';
  return 'upcoming';
}

function getFinaleStatus(finaleDate) {
  const now = new Date();
  const finale = new Date(finaleDate);

  const finaleDay = new Date(finale.getFullYear(), finale.getMonth(), finale.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (today > finaleDay) return 'complete';
  if (today.getTime() === finaleDay.getTime()) return 'active';
  return 'upcoming';
}

export default Timeline;
