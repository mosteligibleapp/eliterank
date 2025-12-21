import React from 'react';
import { Award, Building, Calendar, Plus, Edit, Trash2, Check, Info, Link, Image } from 'lucide-react';
import { Panel, Avatar, Badge, Button } from '../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { formatCurrency, formatEventDateRange } from '../../utils/formatters';

export default function SettingsPage({
  judges,
  sponsors,
  events,
  onAddJudge,
  onEditJudge,
  onDeleteJudge,
  onAddSponsor,
  onEditSponsor,
  onDeleteSponsor,
  onEditEvent,
  onShowSponsorInfo,
}) {
  const getTierStyle = (tier) => {
    const tierMap = {
      Platinum: { bg: 'rgba(200,200,200,0.1)', color: colors.tier.platinum },
      Gold: { bg: 'rgba(212,175,55,0.1)', color: colors.tier.gold },
      Silver: { bg: 'rgba(139,92,246,0.1)', color: colors.tier.silver },
    };
    return tierMap[tier] || tierMap.Gold;
  };

  const sponsorshipTotal = sponsors.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div>
      {/* Judges Section */}
      <Panel
        title="Judges"
        icon={Award}
        action={
          <Button onClick={onAddJudge} icon={Plus} size="md">
            Add Judge
          </Button>
        }
      >
        <div style={{ padding: spacing.xl }}>
          {judges.map((judge) => (
            <div
              key={judge.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.lg,
                padding: spacing.lg,
                background: 'rgba(255,255,255,0.02)',
                borderRadius: borderRadius.lg,
                marginBottom: spacing.sm,
              }}
            >
              <Avatar name={judge.name} size={44} />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: typography.fontWeight.medium }}>{judge.name}</p>
                <p style={{ fontSize: typography.fontSize.base, color: colors.text.secondary }}>{judge.title}</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={Edit}
                onClick={() => onEditJudge(judge)}
                style={{ width: 'auto', padding: `${spacing.sm} ${spacing.md}` }}
              >
                Edit
              </Button>
              <Button
                variant="reject"
                size="sm"
                onClick={() => onDeleteJudge(judge.id)}
                style={{ padding: `${spacing.sm} ${spacing.md}` }}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
          {judges.length === 0 && (
            <div style={{ textAlign: 'center', padding: spacing.xxxl, color: colors.text.muted }}>
              <Award size={32} style={{ marginBottom: spacing.md, opacity: 0.3 }} />
              <p>No judges added yet</p>
            </div>
          )}
        </div>
      </Panel>

      {/* Sponsors Section */}
      <Panel
        title="Sponsors"
        icon={Building}
        action={
          <div style={{ display: 'flex', gap: spacing.md }}>
            <Button
              variant="secondary"
              size="md"
              icon={Info}
              onClick={onShowSponsorInfo}
              style={{ width: 'auto' }}
            >
              Sponsorship Guide
            </Button>
            <Button onClick={onAddSponsor} icon={Plus} size="md">
              Add Sponsor
            </Button>
          </div>
        }
      >
        <div style={{ padding: spacing.xl }}>
          {sponsors.map((sponsor) => {
            const tierStyle = getTierStyle(sponsor.tier);
            return (
              <div
                key={sponsor.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.lg,
                  padding: spacing.lg,
                  background: sponsor.tier === 'Platinum' ? 'rgba(200,200,200,0.05)' : 'rgba(255,255,255,0.02)',
                  border: sponsor.tier === 'Platinum' ? '1px solid rgba(200,200,200,0.2)' : 'none',
                  borderRadius: borderRadius.lg,
                  marginBottom: spacing.sm,
                }}
              >
                {/* Logo or Icon */}
                {sponsor.logoUrl ? (
                  <div
                    style={{
                      width: '60px',
                      height: '40px',
                      borderRadius: borderRadius.md,
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={sponsor.logoUrl}
                      alt={`${sponsor.name} logo`}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: '60px',
                      height: '40px',
                      borderRadius: borderRadius.md,
                      background: tierStyle.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Building size={20} style={{ color: tierStyle.color }} />
                  </div>
                )}

                {/* Sponsor Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
                    <p style={{ fontWeight: typography.fontWeight.medium }}>{sponsor.name}</p>
                    <Badge
                      variant={sponsor.tier === 'Platinum' ? 'platinum' : sponsor.tier === 'Gold' ? 'gold' : 'silver'}
                      size="sm"
                      uppercase
                    >
                      {sponsor.tier}
                    </Badge>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg }}>
                    {sponsor.websiteUrl && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                        <Link size={12} />
                        <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sponsor.websiteUrl.replace(/^https?:\/\//, '')}
                        </span>
                      </span>
                    )}
                    {sponsor.logoUrl && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, fontSize: typography.fontSize.sm, color: colors.status.success }}>
                        <Image size={12} /> Logo uploaded
                      </span>
                    )}
                    {!sponsor.logoUrl && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, fontSize: typography.fontSize.sm, color: colors.text.muted }}>
                        <Image size={12} /> No logo
                      </span>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <span style={{ color: colors.status.success, fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.lg }}>
                  {formatCurrency(sponsor.amount)}
                </span>

                {/* Actions */}
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Edit}
                  onClick={() => onEditSponsor(sponsor)}
                  style={{ width: 'auto', padding: `${spacing.sm} ${spacing.md}` }}
                >
                  Edit
                </Button>
                <Button
                  variant="reject"
                  size="sm"
                  onClick={() => onDeleteSponsor(sponsor.id)}
                  style={{ padding: `${spacing.sm} ${spacing.md}` }}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            );
          })}
          {sponsors.length === 0 && (
            <div style={{ textAlign: 'center', padding: spacing.xxxl, color: colors.text.muted }}>
              <Building size={32} style={{ marginBottom: spacing.md, opacity: 0.3 }} />
              <p style={{ marginBottom: spacing.md }}>No sponsors added yet</p>
              <Button variant="secondary" onClick={onShowSponsorInfo} icon={Info} style={{ width: 'auto' }}>
                View Sponsorship Guide
              </Button>
            </div>
          )}
          {sponsors.length > 0 && (
            <div
              style={{
                marginTop: spacing.lg,
                padding: spacing.lg,
                background: 'rgba(34,197,94,0.1)',
                borderRadius: borderRadius.lg,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ color: colors.text.secondary }}>Total Sponsorship Revenue</span>
              <span style={{ color: colors.status.success, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.xxl }}>
                {formatCurrency(sponsorshipTotal)}
              </span>
            </div>
          )}
        </div>
      </Panel>

      {/* Event Timeline Section */}
      <Panel title="Event Timeline" icon={Calendar}>
        <div style={{ padding: spacing.xl }}>
          {events.map((event, i) => (
            <div
              key={event.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.lg,
                padding: spacing.lg,
                background: event.status === 'active' ? 'rgba(212,175,55,0.05)' : 'transparent',
                borderRadius: borderRadius.lg,
                borderBottom: i < events.length - 1 ? `1px solid ${colors.border.lighter}` : 'none',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: borderRadius.full,
                  background:
                    event.status === 'completed'
                      ? 'rgba(34,197,94,0.2)'
                      : event.status === 'active'
                        ? 'rgba(212,175,55,0.2)'
                        : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${
                    event.status === 'completed'
                      ? colors.status.success
                      : event.status === 'active'
                        ? colors.gold.primary
                        : 'rgba(255,255,255,0.2)'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {event.status === 'completed' && <Check size={14} style={{ color: colors.status.success }} />}
                {event.status === 'active' && (
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: borderRadius.full,
                      background: colors.gold.primary,
                    }}
                  />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontWeight: typography.fontWeight.medium,
                    color: event.status === 'active' ? colors.gold.primary : '#fff',
                  }}
                >
                  {event.name}
                </p>
                <p style={{ fontSize: typography.fontSize.base, color: colors.text.secondary }}>
                  {formatEventDateRange(event)}
                  {event.time && ` at ${event.time}`}
                  {event.location && ` • ${event.location}`}
                </p>
              </div>
              <Badge
                variant={event.status === 'completed' ? 'success' : event.status === 'active' ? 'gold' : 'default'}
                size="md"
                uppercase
              >
                {event.status === 'completed' ? 'Completed' : event.status === 'active' ? 'Live Now' : 'Upcoming'}
              </Badge>
              <Button
                variant="secondary"
                size="sm"
                icon={Edit}
                onClick={() => onEditEvent(event)}
                style={{ width: 'auto', padding: `${spacing.sm} ${spacing.md}` }}
              >
                Edit
              </Button>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
