import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Calendar, MapPin, Clock, ExternalLink, Crown, ChevronRight } from 'lucide-react';
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

  // Format date for display
  const formatEventDate = (dateStr) => {
    if (!dateStr) return 'Date TBD';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

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
          {/* Event Image */}
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

          {/* Event Details */}
          <div className="event-details">
            <h5 className="event-name">{nextEvent.name}</h5>

            <div className="event-meta">
              <span className="event-meta-item">
                <Calendar size={12} />
                {formatEventDate(nextEvent.date)}
              </span>
              {nextEvent.time && (
                <span className="event-meta-item">
                  <Clock size={12} />
                  {formatEventTime(nextEvent.time)}
                </span>
              )}
              {nextEvent.location && (
                <span className="event-meta-item">
                  <MapPin size={12} />
                  {nextEvent.location}
                </span>
              )}
            </div>

            {/* Ticket Link */}
            {nextEvent.ticket_url && (
              <a
                href={nextEvent.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-small event-tickets-btn"
              >
                Get Tickets
                <ExternalLink size={12} />
              </a>
            )}
          </div>
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
