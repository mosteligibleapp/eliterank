import React from 'react';
import { MapPin, Calendar, Clock, Sparkles, Edit2, Plus, ExternalLink, Crown } from 'lucide-react';
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
  const now = new Date();
  const upcomingEvents = visibleEvents.filter(e => {
    if (e.status === 'completed') return false;
    if (!e.date) return true;
    return new Date(e.date) >= now;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  const pastEvents = visibleEvents.filter(e => {
    if (e.status === 'completed') return true;
    if (!e.date) return false;
    return new Date(e.date) < now;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const renderEventCard = (event, isPast = false) => (
    <div
      key={event.id}
      style={{
        background: colors.background.card,
        border: `1px solid ${colors.border.light}`,
        borderRadius: borderRadius.xxl,
        overflow: 'hidden',
        opacity: isPast ? 0.75 : 1,
        position: 'relative',
      }}
    >
      {/* Edit button */}
      {canEdit && onEditEvent && (
        <button
          onClick={() => onEditEvent(event)}
          style={{
            position: 'absolute',
            top: spacing.md,
            left: spacing.md,
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.xs,
            padding: `${spacing.xs} ${spacing.sm}`,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)',
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

      {/* Cover Image */}
      <div style={{
        width: '100%',
        height: '200px',
        background: event.imageUrl
          ? `url(${event.imageUrl}) center/cover no-repeat`
          : 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(139,92,246,0.1) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {!event.imageUrl && (
          <Crown size={56} style={{ color: 'rgba(212,175,55,0.35)' }} />
        )}

        {/* Date badge */}
        <div style={{
          position: 'absolute',
          top: spacing.md,
          right: spacing.md,
          background: 'rgba(10,10,15,0.85)',
          backdropFilter: 'blur(8px)',
          borderRadius: borderRadius.lg,
          padding: `${spacing.sm} ${spacing.md}`,
          textAlign: 'center',
          minWidth: '56px',
        }}>
          <div style={{
            fontSize: typography.fontSize.xs,
            color: colors.gold.primary,
            fontWeight: typography.fontWeight.bold,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {event.date
              ? new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })
              : 'TBD'}
          </div>
          <div style={{
            fontSize: typography.fontSize.xxl,
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            lineHeight: 1,
          }}>
            {event.date ? new Date(event.date + 'T00:00:00').getDate() : '?'}
          </div>
        </div>

        {isPast && (
          <div style={{
            position: 'absolute',
            bottom: spacing.md,
            left: spacing.md,
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            borderRadius: borderRadius.md,
            padding: `${spacing.xs} ${spacing.sm}`,
            fontSize: typography.fontSize.xs,
            color: colors.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Past Event
          </div>
        )}
      </div>

      {/* Card Body */}
      <div style={{ padding: spacing.xl }}>
        <h3 style={{
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.bold,
          color: colors.text.primary,
          marginBottom: spacing.sm,
        }}>
          {event.name}
        </h3>

        {event.description && (
          <p style={{
            color: colors.text.secondary,
            fontSize: typography.fontSize.sm,
            lineHeight: 1.6,
            marginBottom: spacing.lg,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {event.description}
          </p>
        )}

        {/* Meta info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
          {event.time && (
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
              <Clock size={14} style={{ flexShrink: 0 }} />
              <span>{formatEventTime(event.time)}</span>
            </div>
          )}
          {(event.location || event.venue) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
              <MapPin size={14} style={{ flexShrink: 0 }} />
              <span>{event.location || event.venue}</span>
            </div>
          )}
        </div>

        {/* Ticket link */}
        {event.ticketUrl && !isPast && (
          <a
            href={event.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              width: '100%',
              padding: `${spacing.md} ${spacing.xl}`,
              background: `linear-gradient(135deg, ${colors.gold.primary}, ${colors.gold.light || '#f4d03f'})`,
              color: '#0a0a0f',
              borderRadius: borderRadius.lg,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.bold,
              textDecoration: 'none',
              marginTop: spacing.lg,
            }}
          >
            Get Tickets
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  );

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: spacing.xl }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: spacing.xl }}>
            {pastEvents.map(event => renderEventCard(event, true))}
          </div>
        </div>
      )}
    </div>
  );
}
