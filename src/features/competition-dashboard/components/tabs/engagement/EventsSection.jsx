import React from 'react';
import { Calendar, Plus, Edit2, Trash2 } from 'lucide-react';
import { Button, Badge, Panel } from '../../../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../../../styles/theme';

// Parse a 'YYYY-MM-DD' string as a local date (avoids the UTC-shift you get
// from `new Date('YYYY-MM-DD')`).
const parseDateLocal = (dateStr) => {
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + 'T00:00:00');
  }
  return new Date(dateStr);
};

const getEventStatus = (event) => {
  if (event.status === 'completed') return 'completed';
  if (!event.date && !event.startDate) return 'upcoming';
  const eventDate = parseDateLocal(event.date || event.startDate);
  const now = new Date();
  if (eventDate < now) return 'completed';
  if (event.endDate) {
    const endDate = parseDateLocal(event.endDate);
    if (eventDate <= now && now <= endDate) return 'active';
  }
  return 'upcoming';
};

/**
 * EventsSection — Engagement tab. View, add, edit, and remove competition
 * events.
 */
export default function EventsSection({
  events = [],
  isMobile,
  focusId,
  focusNonce,
  style,
  onOpenEventModal,
  onDeleteEvent,
}) {
  return (
    <Panel
      key={`section-events-${focusId === 'events' ? focusNonce : 'x'}`}
      id="setup-section-events"
      title={`Events (${events.length})`}
      icon={Calendar}
      action={<Button size="sm" icon={Plus} onClick={() => onOpenEventModal(null)}>Add Event</Button>}
      collapsible
      defaultCollapsed={focusId !== 'events'}
      style={style}
    >
      <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
            <Calendar size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
            <p>No events scheduled yet</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: spacing.md }}>
            {events.map((event) => {
              const status = getEventStatus(event);
              return (
                <div key={event.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.lg,
                  padding: spacing.lg,
                  background: colors.background.secondary,
                  borderRadius: borderRadius.lg,
                  flexWrap: isMobile ? 'wrap' : 'nowrap',
                }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    background: status === 'active' ? 'rgba(212,175,55,0.2)' : status === 'completed' ? 'rgba(34,197,94,0.2)' : 'rgba(59,130,246,0.2)',
                    borderRadius: borderRadius.lg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Calendar size={24} style={{ color: status === 'active' ? colors.gold.primary : status === 'completed' ? '#22c55e' : '#3b82f6' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: typography.fontWeight.medium }}>{event.name}</p>
                    <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                      {event.date ? parseDateLocal(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'No date set'}
                      {event.location && ` • ${event.location}`}
                    </p>
                  </div>
                  <Badge variant={status === 'active' ? 'gold' : status === 'completed' ? 'success' : 'secondary'} size="sm">
                    {status}
                  </Badge>
                  <button
                    onClick={() => onOpenEventModal(event)}
                    style={{
                      padding: spacing.sm,
                      background: 'transparent',
                      border: `1px solid ${colors.border.primary || 'rgba(255,255,255,0.15)'}`,
                      borderRadius: borderRadius.md,
                      color: colors.text.secondary,
                      cursor: 'pointer',
                      minWidth: '36px',
                      minHeight: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => onDeleteEvent(event.id)}
                    style={{
                      padding: spacing.sm,
                      background: 'transparent',
                      border: `1px solid rgba(239,68,68,0.3)`,
                      borderRadius: borderRadius.md,
                      color: '#ef4444',
                      cursor: 'pointer',
                      minWidth: '36px',
                      minHeight: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Panel>
  );
}
