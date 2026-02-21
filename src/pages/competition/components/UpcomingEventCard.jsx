import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Calendar, Crown, ChevronRight } from 'lucide-react';
import { formatEventTime } from '../../../utils/formatters';

/**
 * Upcoming Event Card - Shows the next upcoming event for the competition
 * Displays above the Rules accordion in the sidebar
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

  const formatDateBadge = (dateStr, timeStr) => {
    if (!dateStr) return 'Date TBD';
    const eventDate = new Date(dateStr + 'T00:00:00');
    const isToday = eventDate.getTime() === today.getTime();
    const datePart = isToday
      ? 'TODAY'
      : eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
    if (timeStr) {
      return `${datePart}  •  ${formatEventTime(timeStr)}`;
    }
    return datePart;
  };

  const CardTag = nextEvent?.ticket_url ? 'a' : 'div';
  const cardProps = nextEvent?.ticket_url
    ? { href: nextEvent.ticket_url, target: '_blank', rel: 'noopener noreferrer' }
    : {};

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
        <div className="upcoming-event-content">
          <CardTag className="upcoming-event-link" {...cardProps}>
            {/* Image with date badge */}
            <div className="event-image-wrapper">
              {nextEvent.image_url ? (
                <div
                  className="event-image"
                  style={{ backgroundImage: `url(${nextEvent.image_url})` }}
                />
              ) : (
                <div className="event-image event-image-placeholder">
                  <Crown size={28} />
                </div>
              )}
              <div className="event-image-gradient" />
              <div className="event-date-badge">
                {formatDateBadge(nextEvent.date, nextEvent.time)}
              </div>
            </div>

            {/* Event info below image */}
            <div className="event-details">
              <h5 className="event-name">{nextEvent.name}</h5>
              {nextEvent.location && (
                <p className="event-location">{nextEvent.location}</p>
              )}
            </div>
          </CardTag>
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
