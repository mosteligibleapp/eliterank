import React from 'react';
import { Calendar, User, Star, FileText, Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Button, Badge, Avatar, Panel } from '../../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../../styles/theme';
import TimelineSettings from '../TimelineSettings';

// Helper to determine event status
const getEventStatus = (event) => {
  if (event.status === 'completed') return 'completed';
  if (!event.date && !event.startDate) return 'upcoming';
  const eventDate = new Date(event.date || event.startDate);
  const now = new Date();
  if (eventDate < now) return 'completed';
  if (event.endDate) {
    const endDate = new Date(event.endDate);
    if (eventDate <= now && now <= endDate) return 'active';
  }
  return 'upcoming';
};

export default function SettingsTab({
  competition,
  judges,
  sponsors,
  events,
  rules,
  formFields,
  onRefresh,
  onDeleteJudge,
  onDeleteSponsor,
  onDeleteEvent,
  onDeleteRule,
  onOpenJudgeModal,
  onOpenSponsorModal,
  onOpenEventModal,
  onOpenRuleModal,
  onShowNominationFormEditor,
}) {
  return (
    <div>
      {/* Timeline & Status Settings */}
      <Panel title="Timeline & Status" icon={Calendar}>
        <div style={{ padding: spacing.xl }}>
          <TimelineSettings competition={competition} onSave={onRefresh} />
        </div>
      </Panel>

      {/* Judges Section */}
      <Panel
        title={`Judges (${judges.length})`}
        icon={User}
        action={<Button size="sm" icon={Plus} onClick={() => onOpenJudgeModal(null)}>Add Judge</Button>}
      >
        <div style={{ padding: spacing.xl }}>
          {judges.length === 0 ? (
            <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
              <User size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
              <p>No judges assigned yet</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spacing.lg }}>
              {judges.map((judge) => (
                <div key={judge.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.lg,
                  background: colors.background.secondary,
                  borderRadius: borderRadius.lg,
                }}>
                  <Avatar name={judge.name} size={48} avatarUrl={judge.avatarUrl} variant="gold" />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: typography.fontWeight.medium }}>{judge.name}</p>
                    <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>{judge.title}</p>
                  </div>
                  <button
                    onClick={() => onDeleteJudge(judge.id)}
                    style={{
                      padding: spacing.sm,
                      background: 'transparent',
                      border: `1px solid rgba(239,68,68,0.3)`,
                      borderRadius: borderRadius.md,
                      color: '#ef4444',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>

      {/* Sponsors Section */}
      <Panel
        title={`Sponsors (${sponsors.length})`}
        icon={Star}
        action={<Button size="sm" icon={Plus} onClick={() => onOpenSponsorModal(null)}>Add Sponsor</Button>}
      >
        <div style={{ padding: spacing.xl }}>
          {sponsors.length === 0 ? (
            <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
              <Star size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
              <p>No sponsors yet</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: spacing.md }}>
              {sponsors.map((sponsor) => (
                <div key={sponsor.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.lg,
                  padding: spacing.lg,
                  background: colors.background.secondary,
                  borderRadius: borderRadius.lg,
                }}>
                  {sponsor.logoUrl ? (
                    <img src={sponsor.logoUrl} alt={sponsor.name} style={{ width: 48, height: 48, borderRadius: borderRadius.md, objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: 48, height: 48, background: 'rgba(212,175,55,0.2)', borderRadius: borderRadius.md, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Star size={24} style={{ color: colors.gold.primary }} />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: typography.fontWeight.medium }}>{sponsor.name}</p>
                    <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                      {sponsor.tier.charAt(0).toUpperCase() + sponsor.tier.slice(1)} Tier • ${sponsor.amount.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => onDeleteSponsor(sponsor.id)}
                    style={{
                      padding: spacing.sm,
                      background: 'transparent',
                      border: `1px solid rgba(239,68,68,0.3)`,
                      borderRadius: borderRadius.md,
                      color: '#ef4444',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>

      {/* Events Section */}
      <Panel
        title={`Events (${events.length})`}
        icon={Calendar}
        action={<Button size="sm" icon={Plus} onClick={() => onOpenEventModal(null)}>Add Event</Button>}
      >
        <div style={{ padding: spacing.xl }}>
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
                  }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      background: status === 'active' ? 'rgba(212,175,55,0.2)' : status === 'completed' ? 'rgba(34,197,94,0.2)' : 'rgba(59,130,246,0.2)',
                      borderRadius: borderRadius.lg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Calendar size={24} style={{ color: status === 'active' ? colors.gold.primary : status === 'completed' ? '#22c55e' : '#3b82f6' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: typography.fontWeight.medium }}>{event.name}</p>
                      <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                        {event.date ? new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'No date set'}
                        {event.location && ` • ${event.location}`}
                      </p>
                    </div>
                    <Badge variant={status === 'active' ? 'gold' : status === 'completed' ? 'success' : 'secondary'} size="sm">
                      {status}
                    </Badge>
                    <button
                      onClick={() => onDeleteEvent(event.id)}
                      style={{
                        padding: spacing.sm,
                        background: 'transparent',
                        border: `1px solid rgba(239,68,68,0.3)`,
                        borderRadius: borderRadius.md,
                        color: '#ef4444',
                        cursor: 'pointer',
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

      {/* Rules Section */}
      <Panel
        title={`Rules (${rules.length})`}
        icon={FileText}
        action={<Button size="sm" icon={Plus} onClick={() => onOpenRuleModal(null)}>Add Rule</Button>}
      >
        <div style={{ padding: spacing.xl }}>
          {rules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
              <FileText size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
              <p>No rules defined yet</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: spacing.md }}>
              {rules.map((rule) => (
                <div key={rule.id} style={{
                  padding: spacing.lg,
                  background: colors.background.secondary,
                  borderRadius: borderRadius.lg,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm }}>
                    <h4 style={{ fontWeight: typography.fontWeight.semibold }}>{rule.sectionTitle}</h4>
                    <div style={{ display: 'flex', gap: spacing.sm }}>
                      <button
                        onClick={() => onOpenRuleModal(rule)}
                        style={{
                          padding: spacing.sm,
                          background: 'transparent',
                          border: `1px solid ${colors.border.light}`,
                          borderRadius: borderRadius.md,
                          color: colors.text.secondary,
                          cursor: 'pointer',
                        }}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => onDeleteRule(rule.id)}
                        style={{
                          padding: spacing.sm,
                          background: 'transparent',
                          border: `1px solid rgba(239,68,68,0.3)`,
                          borderRadius: borderRadius.md,
                          color: '#ef4444',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>{rule.sectionContent || 'No content'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>

      {/* Nomination Form Fields Section */}
      <Panel
        title="Nomination Form Fields"
        icon={FileText}
        action={<Button size="sm" icon={Edit} onClick={onShowNominationFormEditor}>Edit Form</Button>}
      >
        <div style={{ padding: spacing.xl }}>
          <p style={{ color: colors.text.secondary, marginBottom: spacing.lg, fontSize: typography.fontSize.sm }}>
            Customize the fields shown in the nomination form. Toggle fields on/off or mark them as required.
          </p>
          <div style={{ display: 'grid', gap: spacing.sm }}>
            {formFields.map((field) => (
              <div
                key={field.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: spacing.md,
                  background: field.enabled ? colors.background.secondary : 'rgba(100,100,100,0.1)',
                  borderRadius: borderRadius.lg,
                  opacity: field.enabled ? 1 : 0.6,
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: typography.fontWeight.medium }}>{field.label}</p>
                  <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                    Type: {field.type} {field.required && '• Required'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                  {field.enabled ? (
                    <CheckCircle size={18} style={{ color: colors.status.success }} />
                  ) : (
                    <XCircle size={18} style={{ color: colors.text.muted }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}
