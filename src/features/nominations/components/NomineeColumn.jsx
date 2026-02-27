import React from 'react';
import { Trophy, UserPlus, Users } from 'lucide-react';
import NomineeCard from './NomineeCard';
import { EmptyState } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';

const COLUMN_CONFIG = {
  contestants: {
    title: 'Contestants',
    subtitle: 'Active & voting enabled',
    icon: Trophy,
    color: colors.status.success,
    bgColor: 'rgba(34,197,94,0.15)',
    borderColor: 'rgba(34,197,94,0.2)',
  },
  pending: {
    title: 'Pending Contestants',
    subtitle: 'Profile complete, ready to convert',
    icon: UserPlus,
    color: colors.gold.primary,
    bgColor: 'rgba(212,175,55,0.15)',
    borderColor: 'rgba(212,175,55,0.2)',
  },
  nominees: {
    title: 'Pending Nominees',
    subtitle: 'Need to complete profile',
    icon: Users,
    color: colors.status.purple,
    bgColor: 'rgba(139,92,246,0.15)',
    borderColor: 'rgba(139,92,246,0.2)',
  },
};

export default function NomineeColumn({
  type,
  nominees,
  onConvert,
  onApprove,
  onReject,
  onSimulateComplete,
  onResend,
}) {
  const config = COLUMN_CONFIG[type];
  const Icon = config.icon;

  const headerStyle = {
    background: `linear-gradient(135deg, ${config.bgColor}, ${config.bgColor.replace('0.15', '0.05')})`,
    border: `1px solid ${config.borderColor}`,
    borderRadius: borderRadius.xl,
    padding: `${spacing.lg} ${spacing.xl}`,
    marginBottom: spacing.lg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const iconBoxStyle = {
    width: '36px',
    height: '36px',
    borderRadius: borderRadius.md,
    background: config.bgColor.replace('0.15', '0.2'),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const countBadgeStyle = {
    padding: `${spacing.sm} ${spacing.md}`,
    background: config.bgColor.replace('0.15', '0.2'),
    borderRadius: borderRadius.xxl,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: config.color,
  };


  return (
    <div>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <div style={iconBoxStyle}>
            <Icon size={18} style={{ color: config.color }} />
          </div>
          <div>
            <h3
              style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
                color: config.color,
              }}
            >
              {config.title}
            </h3>
            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
              {config.subtitle}
            </p>
          </div>
        </div>
        <div style={countBadgeStyle}>{nominees.length}</div>
      </div>

      {/* Scrollable content */}
      <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: spacing.sm }}>
        {nominees.length > 0 ? (
          nominees.map((nominee) => (
            <NomineeCard
              key={nominee.id}
              nominee={nominee}
              compact
              onConvert={onConvert}
              onApprove={onApprove}
              onReject={onReject}
              onSimulateComplete={onSimulateComplete}
              onResend={onResend}
            />
          ))
        ) : (
          <EmptyState
            icon={Icon}
            title={
              type === 'contestants' ? 'No active contestants yet' :
              type === 'pending' ? 'No pending contestants' :
              'No pending nominees'
            }
            compact
          />
        )}
      </div>
    </div>
  );
}
