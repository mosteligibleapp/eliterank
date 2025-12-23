import React from 'react';
import { MapPin, Users, Calendar, Clock, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';

// City-specific events data
const CITY_EVENTS = {
  'New York': [
    {
      id: 1,
      featured: true,
      name: 'New York Most Eligible Finals Gala',
      date: 'FEB 20, 2025',
      time: '7:00 PM',
      venue: 'The Plaza Hotel, NYC',
      capacity: '500 Guests',
      description: 'Join us for an unforgettable evening as we crown New York\'s Most Eligible. Red carpet, live entertainment, and the final reveal.',
      price: '$150',
    },
    {
      id: 2,
      name: 'Double Vote Day Mixer',
      date: 'FEB 10, 2025',
      time: '6:00 PM',
      venue: 'Soho House NYC',
      description: 'Meet the contestants in person during our special double vote day event.',
      price: 'Free',
    },
    {
      id: 3,
      name: 'Semi-Finals Watch Party',
      date: 'FEB 15, 2025',
      time: '8:00 PM',
      venue: '1 Oak NYC',
      description: 'Watch the semi-finals announcement live with fellow fans and supporters.',
      price: 'Free',
    },
  ],
  'Chicago': {
    '2025': [
      {
        id: 1,
        name: 'Chicago Finals Gala',
        date: 'DEC 15, 2025',
        time: '7:00 PM',
        venue: 'The Signature Room',
        description: 'The grand finale where Chicago\'s Most Eligible was crowned.',
        status: 'completed',
      },
      {
        id: 2,
        name: 'Meet the Finalists',
        date: 'DEC 10, 2025',
        time: '6:00 PM',
        venue: 'Chicago Athletic Association',
        description: 'An exclusive evening with the top 10 finalists.',
        status: 'completed',
      },
    ],
    '2026': [], // No events yet for nomination phase
  },
};

export default function EventsTab({ events, city = 'New York', season = '2026', phase = 'voting' }) {
  // Get city-specific events
  let cityEvents = [];

  if (city === 'Chicago') {
    cityEvents = CITY_EVENTS['Chicago']?.[season] || [];
  } else {
    cityEvents = CITY_EVENTS[city] || [];
  }

  // For nomination phase or if no events
  if (cityEvents.length === 0) {
    return (
      <div>
        <div style={{ textAlign: 'center', marginBottom: spacing.xxxl }}>
          <h1 style={{ fontSize: typography.fontSize.hero, fontWeight: typography.fontWeight.bold, marginBottom: spacing.md }}>
            Events
          </h1>
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.lg }}>
            Exclusive Most Eligible {city} events
          </p>
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

  const featuredEvent = cityEvents.find(e => e.featured);
  const otherEvents = cityEvents.filter(e => !e.featured);

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: spacing.xxxl }}>
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

      <div style={{ display: 'grid', gap: spacing.xxl }}>
        {/* Featured Event */}
        {featuredEvent && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(139,92,246,0.1))',
              border: `1px solid ${colors.border.gold}`,
              borderRadius: borderRadius.xxl,
              padding: spacing.xxxl,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: spacing.xl,
                right: spacing.xl,
                padding: `${spacing.sm} ${spacing.md}`,
                background: colors.gold.primary,
                color: '#0a0a0f',
                borderRadius: borderRadius.xxl,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.bold,
              }}
            >
              FEATURED
            </span>
            <p style={{ color: colors.gold.primary, fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.sm }}>
              {featuredEvent.date} • {featuredEvent.time}
            </p>
            <h2 style={{ fontSize: typography.fontSize.display, fontWeight: typography.fontWeight.bold, marginBottom: spacing.md }}>
              {featuredEvent.name}
            </h2>
            <p style={{ color: colors.text.light, fontSize: typography.fontSize.lg, marginBottom: spacing.xl, maxWidth: '600px' }}>
              {featuredEvent.description}
            </p>
            <div style={{ display: 'flex', gap: spacing.lg, alignItems: 'center', marginBottom: spacing.xxl }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, color: colors.text.secondary, fontSize: typography.fontSize.md }}>
                <MapPin size={16} /> {featuredEvent.venue}
              </span>
              {featuredEvent.capacity && (
                <span style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, color: colors.text.secondary, fontSize: typography.fontSize.md }}>
                  <Users size={16} /> {featuredEvent.capacity}
                </span>
              )}
            </div>
            <Button size="lg" style={{ padding: `${spacing.md} ${spacing.xxxl}` }}>
              {featuredEvent.price === 'Free' ? 'RSVP Free' : `Get Tickets - ${featuredEvent.price}`}
            </Button>
          </div>
        )}

        {/* Other Events */}
        {otherEvents.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: spacing.xl }}>
            {otherEvents.map(event => (
              <div
                key={event.id}
                style={{
                  background: colors.background.card,
                  border: `1px solid ${colors.border.light}`,
                  borderRadius: borderRadius.xxl,
                  padding: spacing.xxl,
                  opacity: event.status === 'completed' ? 0.8 : 1,
                }}
              >
                {event.status === 'completed' && (
                  <span style={{
                    display: 'inline-block',
                    padding: `${spacing.xs} ${spacing.sm}`,
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: borderRadius.sm,
                    fontSize: typography.fontSize.xs,
                    color: colors.text.muted,
                    marginBottom: spacing.sm,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}>
                    Past Event
                  </span>
                )}
                <p style={{ color: colors.gold.primary, fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.sm }}>
                  {event.date} • {event.time}
                </p>
                <h3 style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.sm }}>
                  {event.name}
                </h3>
                <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.md, marginBottom: spacing.lg }}>
                  {event.description}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, color: colors.text.secondary, fontSize: typography.fontSize.base, marginBottom: spacing.lg }}>
                  <MapPin size={14} /> {event.venue}
                </div>
                {event.status !== 'completed' && (
                  <Button variant="secondary" fullWidth>
                    {event.price === 'Free' ? 'RSVP Free' : `Get Tickets - ${event.price}`}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
