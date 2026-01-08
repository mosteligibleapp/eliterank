import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Check, Circle } from 'lucide-react';
import { formatDate } from '../../../utils/formatters';

/**
 * Competition timeline showing events and rounds
 */
export function Timeline() {
  const { events, votingRounds, phase } = usePublicCompetition();

  // Combine events and voting rounds into timeline
  const timelineItems = [
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
      title: r.title,
      subtitle: `${r.contestants_advance || 'Top'} advance`,
      status: getRoundStatus(r, phase),
    })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  if (timelineItems.length === 0) return null;

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
              <span className="timeline-date">{formatDate(item.date)}</span>
              <span className="timeline-title">
                {item.title}
                {item.isDoubleVote && (
                  <span className="timeline-badge">2x Votes</span>
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

export default Timeline;
