import React from 'react';
import { Calendar, Sparkles, Plus } from 'lucide-react';
import { Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import EventCard from './EventCard';

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

  const renderEventCard = (event, isPast = false) => (
    <EventCard
      key={event.id}
      event={event}
      isPast={isPast}
      canEdit={canEdit}
      onEdit={onEditEvent}
    />
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
