import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Calendar, ChevronRight } from 'lucide-react';
import EventCard from '../../../features/public-site/components/EventCard';

/**
 * Upcoming Event Card - Shows the next upcoming event for the competition.
 * Reuses the shared EventCard so this widget is visually identical to a
 * card on the Events page.
 */
export function UpcomingEventCard({ onViewAllEvents }) {
  const { events } = usePublicCompetition();

  // Get upcoming events - events without dates or with future/today dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Sort all events by date, putting events without dates at the end
  const sortedEvents = [...(events || [])].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date) - new Date(b.date);
  });

  // Find the first upcoming event (date is today or in the future, or no date set)
  const upcomingEvents = sortedEvents.filter(e => {
    if (!e.date) return true; // Include events without dates
    // Compare using date strings to avoid timezone issues
    const eventDateStr = e.date.split('T')[0]; // Get YYYY-MM-DD part
    const todayStr = today.toISOString().split('T')[0];
    return eventDateStr >= todayStr;
  });

  const nextEvent = upcomingEvents[0] || null;
  const totalEvents = events?.length || 0;

  return (
    <div className="upcoming-event-card">
      <div className="upcoming-event-header">
        <h4 className="section-label">
          <Calendar size={14} />
          Upcoming Event
        </h4>
        {totalEvents > 0 && onViewAllEvents && (
          <button className="view-all-link" onClick={onViewAllEvents}>
            View All
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {nextEvent ? (
        // Cap width so the 3:2 cover stays the same size as an events-page
        // card even when this widget drops into a wide sidebar slot.
        <div style={{ maxWidth: '320px' }}>
          <EventCard event={nextEvent} />
        </div>
      ) : (
        <div className="upcoming-event-empty">
          <Calendar size={24} />
          <p>No upcoming events</p>
        </div>
      )}
    </div>
  );
}

export default UpcomingEventCard;
