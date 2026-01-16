import React, { useState } from 'react';
import { Calendar, User, Star, Plus, Trash2, Lock, MapPin, DollarSign, Users, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Badge, Avatar, Panel } from '../../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../../styles/theme';
import { useResponsive } from '../../../../hooks/useResponsive';
import TimelineSettings from '../TimelineSettings';
import { ThemeEditor } from '../settings';

// Helper to format currency from cents
const formatCurrency = (cents) => {
  const dollars = (cents || 0) / 100;
  return dollars.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
};

// Helper to format radius display
const formatRadius = (miles) => {
  if (miles === 0) return 'No restriction';
  return `${miles} miles`;
};

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

/**
 * SetupTab - Configuration settings tab
 * Contains competition details, timeline, judges, sponsors, events, and theme colors
 */
export default function SetupTab({
  competition,
  judges,
  sponsors,
  events,
  isSuperAdmin = false,
  onRefresh,
  onDeleteJudge,
  onDeleteSponsor,
  onDeleteEvent,
  onOpenJudgeModal,
  onOpenSponsorModal,
  onOpenEventModal,
}) {
  const { isMobile } = useResponsive();
  const [showCompetitionDetails, setShowCompetitionDetails] = useState(false);

  // View-only field component - stacked layout for better mobile display
  const ViewOnlyField = ({ label, value, icon: Icon }) => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: spacing.xs,
      padding: isMobile ? spacing.md : `${spacing.md} ${spacing.lg}`,
      background: colors.background.secondary,
      borderRadius: borderRadius.md,
      border: `1px solid ${colors.border.lighter}`,
      minHeight: '44px', // Touch-friendly
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.xs,
        color: colors.text.muted,
        fontSize: typography.fontSize.xs,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {Icon && <Icon size={12} />}
        <span>{label}</span>
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{
          fontWeight: typography.fontWeight.medium,
          fontSize: typography.fontSize.base,
          wordBreak: 'break-word',
        }}>
          {value || '—'}
        </span>
        <Lock size={14} style={{ color: colors.text.muted, opacity: 0.4, flexShrink: 0, marginLeft: spacing.sm }} />
      </div>
    </div>
  );

  return (
    <div>
      {/* Competition Details - View Only (Admin Controlled) - Collapsed by default */}
      <Panel
        title="Competition Details"
        icon={Lock}
        action={
          <button
            onClick={() => setShowCompetitionDetails(!showCompetitionDetails)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              background: 'none',
              border: 'none',
              color: colors.text.secondary,
              cursor: 'pointer',
              fontSize: typography.fontSize.sm,
            }}
          >
            {showCompetitionDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showCompetitionDetails ? 'Hide' : 'Show'}
          </button>
        }
      >
        {showCompetitionDetails && (
          <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
            <p style={{
              color: colors.text.muted,
              fontSize: typography.fontSize.sm,
              marginBottom: spacing.md,
            }}>
              These settings are managed by the admin.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: spacing.sm,
            }}>
              {/* Slot Fields */}
              <ViewOnlyField
                label="Category"
                value={competition?.categoryName}
                icon={Tag}
              />
              <ViewOnlyField
                label="Demographic"
                value={competition?.demographicName}
                icon={Users}
              />
              <ViewOnlyField
                label="City"
                value={competition?.city}
                icon={MapPin}
              />
              <ViewOnlyField
                label="Season"
                value={competition?.season}
                icon={Calendar}
              />

              {/* Economics Fields */}
              <ViewOnlyField
                label="Price per Vote"
                value={competition?.pricePerVote ? `$${competition.pricePerVote.toFixed(2)}` : '$1.00'}
                icon={DollarSign}
              />
              <ViewOnlyField
                label="Minimum Prize"
                value={formatCurrency(competition?.minimumPrizeCents)}
                icon={DollarSign}
              />
              <ViewOnlyField
                label="Number of Winners"
                value={competition?.numberOfWinners}
                icon={Star}
              />
              <ViewOnlyField
                label="Eligibility Radius"
                value={formatRadius(competition?.eligibilityRadiusMiles)}
                icon={MapPin}
              />

              {/* Contestant Limits */}
              <ViewOnlyField
                label="Min Contestants"
                value={competition?.minContestants || 40}
                icon={Users}
              />
              <ViewOnlyField
                label="Max Contestants"
                value={competition?.maxContestants || 'No limit'}
                icon={Users}
              />
            </div>
          </div>
        )}
        {!showCompetitionDetails && (
          <div style={{
            padding: isMobile ? spacing.md : spacing.lg,
            color: colors.text.muted,
            fontSize: typography.fontSize.sm,
          }}>
            <Lock size={14} style={{ display: 'inline', marginRight: spacing.xs, verticalAlign: 'middle' }} />
            Admin-managed slot and economics settings. Click "Show" to view.
          </div>
        )}
      </Panel>

      {/* Timeline & Status Settings */}
      <Panel title="Timeline & Status" icon={Calendar}>
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          <TimelineSettings competition={competition} onSave={onRefresh} isSuperAdmin={isSuperAdmin} />
        </div>
      </Panel>

      {/* Judges Section */}
      <Panel
        title={`Judges (${judges.length})`}
        icon={User}
        action={<Button size="sm" icon={Plus} onClick={() => onOpenJudgeModal(null)}>Add Judge</Button>}
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {judges.length === 0 ? (
            <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
              <User size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
              <p>No judges assigned yet</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: spacing.lg }}>
              {judges.map((judge) => (
                <div key={judge.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.lg,
                  background: colors.background.secondary,
                  borderRadius: borderRadius.lg,
                }}>
                  <Avatar name={judge.name} size={isMobile ? 40 : 48} avatarUrl={judge.avatarUrl} variant="gold" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: typography.fontWeight.medium, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{judge.name}</p>
                    <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{judge.title}</p>
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
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
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
                  flexWrap: isMobile ? 'wrap' : 'nowrap',
                }}>
                  {sponsor.logoUrl ? (
                    <img src={sponsor.logoUrl} alt={sponsor.name} style={{ width: 48, height: 48, borderRadius: borderRadius.md, objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: 48, height: 48, background: 'rgba(212,175,55,0.2)', borderRadius: borderRadius.md, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Star size={24} style={{ color: colors.gold.primary }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
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

      {/* Theme Colors */}
      <ThemeEditor competition={competition} organization={null} onSave={onRefresh} />
    </div>
  );
}
