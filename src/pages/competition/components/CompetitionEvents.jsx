import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Calendar } from 'lucide-react';
import EventCard from '../../../features/public-site/components/EventCard';

/**
 * CompetitionEvents — the competition's events rendered as a card grid, used on
 * the completed results page to look back on what happened. Past events are
 * dimmed via EventCard's `isPast` flag. Renders nothing when there are no
 * public events.
 */
export function CompetitionEvents() {
  const { events } = usePublicCompetition();

  const items = Array.isArray(events) ? events : [];
  if (!items.length) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const isPast = (event) => Boolean(event.date && event.date.split('T')[0] < todayStr);

  return (
    <div className="competition-events">
      <div className="competition-section-header">
        <Calendar size={20} className="competition-section-icon" />
        <h2 className="competition-section-title">Events</h2>
      </div>

      <div className="competition-events-grid">
        {items.map((event) => (
          <EventCard key={event.id} event={event} isPast={isPast(event)} />
        ))}
      </div>
    </div>
  );
}

export default CompetitionEvents;
