import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Check, Circle } from 'lucide-react';
import { formatDate } from '../../../utils/formatters';

/**
 * Competition timeline showing nomination periods, events, and voting rounds
 */
export function Timeline() {
  const { competition, events, votingRounds, nominationPeriods, phase } = usePublicCompetition();

  // Build nomination items from nominationPeriods or fallback to competition dates
  const nominationItems = [];

  if (nominationPeriods?.length > 0) {
    // Use nomination_periods table data
    nominationPeriods.forEach(np => {
      nominationItems.push({
        id: `nom-${np.id}`,
        type: 'nomination',
        date: np.start_date,
        endDate: np.end_date,
        title: np.title || 'Nominations',
        subtitle: np.max_submissions ? `Max ${np.max_submissions} submissions` : null,
        status: getPeriodStatus(np.start_date, np.end_date),
      });
    });
  } else if (competition?.nomination_start || competition?.nomination_end) {
    // Fallback to competition-level nomination dates
    nominationItems.push({
      id: 'nom-main',
      type: 'nomination',
      date: competition.nomination_start,
      endDate: competition.nomination_end,
      title: 'Nominations',
      subtitle: 'Submit your nomination',
      status: getPeriodStatus(competition.nomination_start, competition.nomination_end),
    });
  }

  // Build finale item from competition record
  const finaleItems = [];
  const finaleDate = competition?.finale_date || competition?.finals_date;
  if (finaleDate) {
    finaleItems.push({
      id: 'finale',
      type: 'finale',
      date: finaleDate,
      title: 'Finals Event',
      subtitle: 'Live finale & winner announcement',
      status: getFinaleStatus(finaleDate),
      isFinale: true,
    });
  }

  // Combine all timeline items
  const timelineItems = [
    ...nominationItems,
    ...(events || []).map(e => ({
      id: e.id,
      type: 'event',
      date: e.date,
      title: e.name,
      subtitle: e.location,
      isDoubleVote: e.is_double_vote_day,
      status: getEventStatus(e.date, e.end_date),
    })),
    ...(votingRounds || []).map(r => ({
      id: r.id,
      type: 'round',
      date: r.start_date,
      endDate: r.end_date,
      title: r.title || `Round ${r.round_order}`,
      subtitle: r.contestants_advance
        ? `Top ${r.contestants_advance} advance`
        : (r.round_type === 'finals' ? 'Final round' : null),
      status: getRoundStatus(r, phase),
      roundType: r.round_type,
    })),
    ...finaleItems,
  ]
    .filter(item => item.date) // Only include items with dates
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (timelineItems.length === 0) {
    return (
      <div className="timeline">
        <h4 className="section-label">Timeline</h4>
        <div className="timeline-empty">
          <p>Timeline coming soon</p>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline">
      <h4 className="section-label">Timeline</h4>
      <div className="timeline-list">
        {timelineItems.map((item, index) => (
          <div
            key={item.id}
            className={`timeline-item timeline-item-${item.status}`}
          >
            <div className="timeline-marker">
              {item.status === 'complete' ? (
                <Check size={12} />
              ) : item.status === 'active' ? (
                <Circle size={12} className="timeline-active-dot" />
              ) : (
                <Circle size={12} />
              )}
              {index < timelineItems.length - 1 && (
                <div className={`timeline-line timeline-line-${item.status}`} />
              )}
            </div>
            <div className="timeline-content">
              <span className="timeline-date">
                {formatDate(item.date)}
                {item.endDate && item.endDate !== item.date && (
                  <> - {formatDate(item.endDate)}</>
                )}
              </span>
              <span className="timeline-title">
                {item.title}
                {item.isDoubleVote && (
                  <span className="timeline-badge">2x Votes</span>
                )}
                {item.roundType === 'finals' && (
                  <span className="timeline-badge timeline-badge-finals">Finals</span>
                )}
                {item.isFinale && (
                  <span className="timeline-badge timeline-badge-finals">Finale</span>
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

function getEventStatus(startDate, endDate) {
  const now = new Date();
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;

  if (now > end) return 'complete';
  if (now >= start && now <= end) return 'active';
  return 'upcoming';
}

function getRoundStatus(round, phase) {
  const now = new Date();
  const start = new Date(round.start_date);
  const end = new Date(round.end_date);

  if (now > end) return 'complete';
  if (now >= start && now <= end) return 'active';
  return 'upcoming';
}

function getFinaleStatus(finaleDate) {
  const now = new Date();
  const finale = new Date(finaleDate);

  // Consider finale "active" on the day of the event
  const finaleDay = new Date(finale.getFullYear(), finale.getMonth(), finale.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (today > finaleDay) return 'complete';
  if (today.getTime() === finaleDay.getTime()) return 'active';
  return 'upcoming';
}

export default Timeline;
