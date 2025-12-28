import React, { useState } from 'react';
import { DollarSign, ChevronRight, Building, Users, Calendar } from 'lucide-react';
import { StatCard } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { formatCurrency } from '../../../utils/formatters';

export default function RevenueCard({ revenueData, sponsors }) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const sponsorshipTotal = sponsors.reduce((sum, s) => sum + s.amount, 0);

  const breakdownItems = [
    { icon: Building, label: 'Sponsorships', amount: sponsorshipTotal, color: 'rgba(59,130,246,0.15)', iconColor: '#60a5fa' },
    { icon: Users, label: 'Paid Votes', amount: revenueData.paidVotes, color: 'rgba(139,92,246,0.15)', iconColor: '#a78bfa' },
    { icon: Calendar, label: 'Event Tickets', amount: revenueData.eventTickets, color: 'rgba(34,197,94,0.15)', iconColor: '#4ade80' },
  ];

  return (
    <StatCard
      label="Total Revenue"
      value={formatCurrency(revenueData.total)}
      icon={DollarSign}
      iconColor="gold"
      variant="gold"
      onClick={() => setShowBreakdown(!showBreakdown)}
      style={{ cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: spacing.md }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
          <span>View breakdown</span>
          <ChevronRight
            size={14}
            style={{
              transform: showBreakdown ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          />
        </div>
      </div>

      {showBreakdown && (
        <div
          style={{
            marginTop: spacing.lg,
            paddingTop: spacing.lg,
            borderTop: `1px solid rgba(212,175,55,0.2)`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {breakdownItems.map((item, index) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: `${spacing.md} 0`,
                borderBottom: index < breakdownItems.length - 1 ? `1px solid ${colors.border.lighter}` : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: borderRadius.sm,
                    background: item.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <item.icon size={16} style={{ color: item.iconColor }} />
                </div>
                <span style={{ color: colors.text.light, fontSize: typography.fontSize.md }}>
                  {item.label}
                </span>
              </div>
              <span style={{ color: '#fff', fontWeight: typography.fontWeight.semibold }}>
                {formatCurrency(item.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </StatCard>
  );
}
