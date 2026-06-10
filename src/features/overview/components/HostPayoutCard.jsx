import React from 'react';
import { DollarSign } from 'lucide-react';
import { StatCard } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { formatCurrency } from '../../../utils/formatters';
import { HOST_PAYOUT_PERCENTAGE } from '../../../constants';

export default function HostPayoutCard({ totalRevenue }) {
  const hostPayout = totalRevenue * HOST_PAYOUT_PERCENTAGE;

  return (
    <StatCard
      label="Estimated Host Payout"
      value={formatCurrency(hostPayout)}
      icon={DollarSign}
      iconColor="green"
      style={{ color: colors.status.success }}
    >
      <div
        style={{
          marginTop: spacing.md,
          padding: `${spacing.md} ${spacing.md}`,
          background: 'rgba(var(--color-success-rgb),0.1)',
          borderRadius: borderRadius.md,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.base }}>
            Your share
          </span>
          <span style={{ color: colors.status.success, fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.md }}>
            {HOST_PAYOUT_PERCENTAGE * 100}% of revenue
          </span>
        </div>
      </div>
      <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs, marginTop: spacing.md }}>
        Paid out after competition ends
      </p>
    </StatCard>
  );
}
