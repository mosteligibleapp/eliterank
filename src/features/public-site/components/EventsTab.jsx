import React from 'react';
import { Calendar, Sparkles, Edit2, Plus, Crown } from 'lucide-react';
import { Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { formatEventTime } from '../../../utils/formatters';

export default function EventsTab({
  events = [],
  city = 'New York',
  season = '2026',
  phase = 'voting',
  canEdit = false,
  onEditEvent,
  onAddEvent,
}) {
  // Filter to only show public/visible events
  const visibleEvents = events.filter(e => e.publicVisible !== false);

  // For nomination phase or if no events
  if (visibleEvents.length === 0) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xxxl }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <h1 style={{ fontSize: typography.fontSize.hero, fontWeight: typography.fontWeight.bold, marginBottom: spacing.md }}>
              Events
            </h1>
            <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.lg }}>
              Exclusive Most Eligible {city} events
            </p>
          </div>
          {canEdit && onAddEvent && (
            <Button
              onClick={onAddEvent}
              icon={Plus}
              style={{ flexShrink: 0 }}
            >
              Add Event
            </Button>
          )}
        </div>

        <div style={{
          textAlign: 'center',
          padding: spacing.xxxl,
          background: colors.background.card,
          border: `1px solid ${colors.border.light}`,
          borderRadius: borderRadius.xxl,
        }}>
          <Calendar size={64} style={{ color: colors.text.muted, marginBottom: spacing.xl }} />
          <h2 style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.md }}>
            Events Coming Soon
          </h2>
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.lg, maxWidth: '500px', margin: '0 auto', marginBottom: spacing.xl }}>
            {phase === 'nomination'
              ? 'Once nominations close and contestants are announced, we\'ll share exciting events for the season.'
              : 'Stay tuned for upcoming events in your area.'
            }
          </p>
          {phase === 'nomination' && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing.sm,
              padding: `${spacing.md} ${spacing.xl}`,
              background: 'rgba(212,175,55,0.1)',
              border: `1px solid ${colors.border.gold}`,
              borderRadius: borderRadius.pill,
            }}>
              <Sparkles size={18} style={{ color: colors.gold.primary }} />
              <span style={{ color: colors.gold.primary, fontWeight: typography.fontWeight.medium }}>
                Nominations are currently open!
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Split into upcoming and past
  // Use string comparison to avoid timezone issues
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format in local time
  const upcomingEvents = visibleEvents.filter(e => {
    if (e.status === 'completed') return false;
    if (!e.date) return true;
    return e.date >= todayStr;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  const pastEvents = visibleEvents.filter(e => {
    if (e.status === 'completed') return true;
    if (!e.date) return false;
    return e.date < todayStr;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const formatDateBadge = (dateStr, timeStr) => {
    if (!dateStr) return 'Date TBD';
    const eventDate = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = eventDate.getTime() === today.getTime();
    const datePart = isToday
      ? 'TODAY'
      : eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
    if (timeStr) {
      return `${datePart}  •  ${formatEventTime(timeStr)}`;
    }
    return datePart;
  };

  const renderEventCard = (event, isPast = false) => {
    const CardWrapper = event.ticketUrl && !isPast ? 'a' : 'div';
    const wrapperProps = event.ticketUrl && !isPast
      ? { href: event.ticketUrl, target: '_blank', rel: 'noopener noreferrer' }
      : {};

    return (
      <CardWrapper
        key={event.id}
        {...wrapperProps}
        style={{
          display: 'block',
          opacity: isPast ? 0.6 : 1,
          position: 'relative',
          textDecoration: 'none',
          color: 'inherit',
          transition: 'transform 0.2s ease, opacity 0.2s ease',
          cursor: event.ticketUrl && !isPast ? 'pointer' : 'default',
        }}
        onMouseEnter={e => {
          if (!isPast) e.currentTarget.style.transform = 'scale(1.02)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {/* Cover Image */}
        <div style={{
          width: '100%',
          aspectRatio: '3 / 2',
          borderRadius: '16px',
          overflow: 'hidden',
          position: 'relative',
          background: event.imageUrl
            ? `url(${event.imageUrl}) center/cover no-repeat`
            : 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(139,92,246,0.1) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {!event.imageUrl && (
            <Crown size={56} style={{ color: 'rgba(212,175,55,0.35)' }} />
          )}

          {/* Edit button */}
          {canEdit && onEditEvent && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEditEvent(event); }}
              style={{
                position: 'absolute',
                top: spacing.md,
                right: spacing.md,
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                gap: spacing.xs,
                padding: `${spacing.xs} ${spacing.sm}`,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: borderRadius.md,
                color: colors.text.secondary,
                cursor: 'pointer',
                fontSize: typography.fontSize.xs,
              }}
            >
              <Edit2 size={12} />
              Edit
            </button>
          )}

          {/* Bottom gradient fade */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '50%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)',
            pointerEvents: 'none',
          }} />

          {/* Date/time badge */}
          <div style={{
            position: 'absolute',
            bottom: spacing.md,
            left: spacing.md,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(12px)',
            borderRadius: '20px',
            padding: `5px ${spacing.md}`,
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            letterSpacing: '0.3px',
          }}>
            {formatDateBadge(event.date, event.time)}
          </div>

          {isPast && (
            <div style={{
              position: 'absolute',
              top: spacing.md,
              left: spacing.md,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              borderRadius: '20px',
              padding: `4px ${spacing.sm}`,
              fontSize: typography.fontSize.xs,
              color: colors.text.tertiary,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Past Event
            </div>
          )}
        </div>

        {/* Event Info */}
        <div style={{ padding: `${spacing.sm} 2px 0` }}>
          <h3 style={{
            fontSize: typography.fontSize.md,
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            marginBottom: '2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {event.name}
          </h3>

          {(event.location || event.venue) && (
            <p style={{
              fontSize: typography.fontSize.sm,
              color: colors.text.tertiary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {event.location || event.venue}
            </p>
          )}
        </div>
      </CardWrapper>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xxxl }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 style={{ fontSize: typography.fontSize.hero, fontWeight: typography.fontWeight.bold, marginBottom: spacing.md }}>
            Events
          </h1>
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.lg }}>
            {phase === 'completed'
              ? `Past events from Most Eligible ${city} Season ${season}`
              : `Don't miss our exclusive Most Eligible ${city} events`
            }
          </p>
        </div>
        {canEdit && onAddEvent && (
          <Button
            onClick={onAddEvent}
            icon={Plus}
            style={{ flexShrink: 0 }}
          >
            Add Event
          </Button>
        )}
      </div>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div style={{ marginBottom: spacing.xxxl }}>
          <h3 style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing.lg,
          }}>
            Upcoming
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: spacing.xl }}>
            {upcomingEvents.map(event => renderEventCard(event))}
          </div>
        </div>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div>
          <h3 style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.secondary,
            marginBottom: spacing.lg,
          }}>
            Past Events
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: spacing.xl }}>
            {pastEvents.map(event => renderEventCard(event, true))}
          </div>
        </div>
      )}
    </div>
  );
}
