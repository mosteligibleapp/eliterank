import React from 'react';
import { Calendar, MapPin, Clock, ExternalLink, Crown } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { formatEventTime } from '../../../utils/formatters';

/**
 * Compact card showing the next upcoming event for a competition.
 * Displays "No upcoming events" if none are scheduled.
 */
export default function UpcomingEventCard({ events = [], onViewAllEvents }) {
  // Filter to only public/visible events that are upcoming
  const now = new Date();
  const upcomingEvents = events
    .filter(e => {
      if (e.publicVisible === false) return false;
      if (e.status === 'completed') return false;
      if (!e.date) return true; // Include events without dates as upcoming
      return new Date(e.date) >= now;
    })
    .sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date) - new Date(b.date);
    });

  const nextEvent = upcomingEvents[0] || null;

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
    <div
      style={{
        background: colors.background.card,
        border: `1px solid ${colors.border.light}`,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: `${spacing.md} ${spacing.lg}`,
          borderBottom: `1px solid ${colors.border.light}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <Calendar size={16} style={{ color: colors.gold.primary }} />
          <span
            style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
            }}
          >
            Upcoming Event
          </span>
        </div>
        {onViewAllEvents && (
          <button
            onClick={onViewAllEvents}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: colors.gold.primary,
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.medium,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
            }}
          >
            View All
            <ExternalLink size={12} />
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: spacing.lg }}>
        {nextEvent ? (
          <div>
            {/* Event Image or Fallback */}
            {nextEvent.imageUrl ? (
              <div
                style={{
                  width: '100%',
                  height: '120px',
                  borderRadius: borderRadius.lg,
                  marginBottom: spacing.md,
                  background: `url(${nextEvent.imageUrl}) center/cover no-repeat`,
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '80px',
                  borderRadius: borderRadius.lg,
                  marginBottom: spacing.md,
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(139,92,246,0.1) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Crown size={32} style={{ color: 'rgba(212,175,55,0.4)' }} />
              </div>
            )}

            {/* Event Name */}
            <h4
              style={{
                fontSize: typography.fontSize.md,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.primary,
                marginBottom: spacing.sm,
              }}
            >
              {nextEvent.name}
            </h4>

            {/* Event Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
              {/* Date */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                }}
              >
                <Calendar size={14} style={{ flexShrink: 0 }} />
                <span>{formatEventDate(nextEvent.date)}</span>
              </div>

              {/* Time */}
              {nextEvent.time && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    fontSize: typography.fontSize.sm,
                    color: colors.text.secondary,
                  }}
                >
                  <Clock size={14} style={{ flexShrink: 0 }} />
                  <span>{formatEventTime(nextEvent.time)}</span>
                </div>
              )}

              {/* Location */}
              {(nextEvent.location || nextEvent.venue) && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    fontSize: typography.fontSize.sm,
                    color: colors.text.secondary,
                  }}
                >
                  <MapPin size={14} style={{ flexShrink: 0 }} />
                  <span>{nextEvent.location || nextEvent.venue}</span>
                </div>
              )}
            </div>

            {/* Ticket Link */}
            {nextEvent.ticketUrl && (
              <a
                href={nextEvent.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.xs,
                  width: '100%',
                  padding: `${spacing.sm} ${spacing.md}`,
                  marginTop: spacing.md,
                  background: `linear-gradient(135deg, ${colors.gold.primary}, ${colors.gold.light || '#f4d03f'})`,
                  color: '#0a0a0f',
                  borderRadius: borderRadius.md,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  textDecoration: 'none',
                }}
              >
                Get Tickets
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        ) : (
          /* No Upcoming Events */
          <div style={{ textAlign: 'center', padding: spacing.lg }}>
            <Calendar
              size={32}
              style={{ color: colors.text.muted, marginBottom: spacing.sm }}
            />
            <p
              style={{
                fontSize: typography.fontSize.sm,
                color: colors.text.muted,
              }}
            >
              No upcoming events
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
