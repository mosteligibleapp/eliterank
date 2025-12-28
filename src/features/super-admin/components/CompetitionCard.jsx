import React from 'react';
import { MapPin, Calendar, Users, Edit2, Trash2, UserPlus, Eye, Activity } from 'lucide-react';
import { Button, Badge } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { STATUS_STYLES, CATEGORY_TYPES } from '../constants/competitionConfig';
import { computeCompetitionPhase, COMPETITION_STATUSES } from '../../../utils/competitionPhase';

export default function CompetitionCard({
  template,
  onAssignHost,
  onViewDashboard,
  onEdit,
  onDelete,
}) {
  const status = STATUS_STYLES[template.status];
  const category = CATEGORY_TYPES.find((c) => c.id === template.category);

  // Compute current phase for active competitions
  const currentPhase = template.status === COMPETITION_STATUSES.ACTIVE
    ? computeCompetitionPhase(template)
    : null;
  const phaseStyle = currentPhase ? STATUS_STYLES[currentPhase] : null;

  return (
    <div
      style={{
        background: colors.background.card,
        border: `1px solid ${colors.border.light}`,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.lg,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              background: colors.background.secondary,
              borderRadius: borderRadius.lg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            }}
          >
            {template.organization?.logo || '👑'}
          </div>
          <div>
            <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>
              {template.name}
            </h3>
            <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
              {template.organization?.name}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: spacing.xs }}>
          <div
            style={{
              padding: `${spacing.xs} ${spacing.md}`,
              background: status.bg,
              borderRadius: borderRadius.pill,
            }}
          >
            <span style={{ color: status.color, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
              {status.label}
            </span>
          </div>
          {/* Show current phase for active competitions */}
          {currentPhase && phaseStyle && (
            <div
              style={{
                padding: `${spacing.xs} ${spacing.sm}`,
                background: phaseStyle.bg,
                borderRadius: borderRadius.pill,
                display: 'flex',
                alignItems: 'center',
                gap: spacing.xs,
              }}
            >
              <Activity size={12} style={{ color: phaseStyle.color }} />
              <span style={{ color: phaseStyle.color, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium }}>
                {phaseStyle.label}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      <div style={{ display: 'flex', gap: spacing.lg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, color: colors.text.secondary }}>
          <MapPin size={14} />
          <span style={{ fontSize: typography.fontSize.sm }}>{template.city}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, color: colors.text.secondary }}>
          <Calendar size={14} />
          <span style={{ fontSize: typography.fontSize.sm }}>Season {template.season}</span>
        </div>
        {category && (
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, color: category.color }}>
            <category.icon size={14} />
            <span style={{ fontSize: typography.fontSize.sm }}>{category.name}</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, color: colors.text.secondary }}>
          <Users size={14} />
          <span style={{ fontSize: typography.fontSize.sm }}>Max {template.maxContestants}</span>
        </div>
      </div>

      {/* Assigned Host */}
      {template.assignedHost && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            padding: spacing.md,
            background: 'rgba(212,175,55,0.1)',
            borderRadius: borderRadius.md,
            border: '1px solid rgba(212,175,55,0.2)',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #d4af37, #f4d03f)',
              borderRadius: borderRadius.full,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: typography.fontWeight.bold,
              color: '#000',
              fontSize: typography.fontSize.sm,
            }}
          >
            {template.assignedHost.name.charAt(0)}
          </div>
          <div>
            <p style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
              {template.assignedHost.name}
            </p>
            <p style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
              {template.assignedHost.email}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: spacing.sm, marginTop: 'auto' }}>
        {/* Assign Host - show for draft competitions without a host */}
        {template.status === COMPETITION_STATUSES.DRAFT && !template.assignedHost && (
          <Button
            variant="primary"
            size="sm"
            icon={UserPlus}
            onClick={() => onAssignHost(template)}
            style={{ flex: 1 }}
          >
            Assign Host
          </Button>
        )}
        {/* View Dashboard - show for any competition with a host assigned */}
        {template.assignedHost && onViewDashboard && (
          <Button
            variant="secondary"
            size="sm"
            icon={Eye}
            onClick={() => onViewDashboard(template)}
            style={{ flex: 1 }}
          >
            View Dashboard
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          icon={Edit2}
          onClick={() => onEdit(template)}
          style={{ width: '40px', padding: spacing.sm }}
        />
        <Button
          variant="secondary"
          size="sm"
          icon={Trash2}
          onClick={() => onDelete(template.id)}
          style={{ width: '40px', padding: spacing.sm }}
        />
      </div>
    </div>
  );
}
