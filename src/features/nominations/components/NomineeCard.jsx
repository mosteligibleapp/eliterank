import React from 'react';
import { Check, X } from 'lucide-react';
import { Avatar, Badge, Button, InterestTag } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { formatNumber } from '../../../utils/formatters';

export default function NomineeCard({
  nominee,
  compact = false,
  onConvert,
  onApprove,
  onReject,
  onSimulateComplete,
  onResend,
}) {
  const cardStyle = {
    background: colors.background.cardHover,
    border: `1px solid ${colors.border.lighter}`,
    borderRadius: borderRadius.xl,
    padding: compact ? spacing.lg : spacing.xl,
    marginBottom: spacing.md,
  };

  const renderActions = () => {
    switch (nominee.status) {
      // Self-nominated pending - can convert directly
      case 'pending':
        if (nominee.nominatedBy === 'Self') {
          return (
            <div style={{ display: 'flex', gap: spacing.sm }}>
              <Button
                variant="approve"
                onClick={() => onConvert(nominee)}
                icon={Check}
                style={{ flex: 1, justifyContent: 'center', padding: spacing.md, fontSize: typography.fontSize.sm }}
              >
                Convert
              </Button>
              <Button
                variant="reject"
                onClick={() => onReject(nominee.id)}
                style={{ padding: spacing.md, fontSize: typography.fontSize.sm }}
              >
                <X size={14} />
              </Button>
            </div>
          );
        }
        break;

      // Third party nomination pending approval
      case 'pending-approval':
        return (
          <div style={{ display: 'flex', gap: spacing.sm }}>
            <Button
              variant="purple"
              onClick={() => onApprove(nominee)}
              icon={Check}
              style={{ flex: 1, justifyContent: 'center', padding: spacing.md, fontSize: typography.fontSize.sm }}
            >
              Approve & Send
            </Button>
            <Button
              variant="reject"
              onClick={() => onReject(nominee.id)}
              style={{ padding: spacing.md, fontSize: typography.fontSize.sm }}
            >
              <X size={14} />
            </Button>
          </div>
        );

      // Awaiting profile completion
      case 'awaiting-profile':
        return (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                color: colors.status.purple,
                fontSize: typography.fontSize.sm,
                marginBottom: spacing.sm,
              }}
            >
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: borderRadius.full,
                  background: colors.status.purple,
                }}
              />
              Waiting for profile
            </div>
            <div style={{ display: 'flex', gap: spacing.sm }}>
              <Button
                variant="approve"
                onClick={() => onSimulateComplete(nominee)}
                icon={Check}
                size="sm"
                style={{ flex: 1, fontSize: typography.fontSize.sm }}
              >
                Simulate Complete
              </Button>
              <Button
                variant="secondary"
                onClick={() => onResend(nominee)}
                size="sm"
                style={{ flex: 1, fontSize: typography.fontSize.sm }}
              >
                Resend
              </Button>
            </div>
          </div>
        );

      // Profile complete - ready to convert
      case 'profile-complete':
        return (
          <div style={{ display: 'flex', gap: spacing.sm }}>
            <Button
              variant="approve"
              onClick={() => onConvert(nominee)}
              icon={Check}
              style={{ flex: 1, justifyContent: 'center', padding: spacing.md, fontSize: typography.fontSize.sm }}
            >
              Convert
            </Button>
            <Button
              variant="reject"
              onClick={() => onReject(nominee.id)}
              style={{ padding: spacing.md, fontSize: typography.fontSize.sm }}
            >
              <X size={14} />
            </Button>
          </div>
        );

      // Already approved - show votes
      case 'approved':
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                color: colors.status.success,
                fontSize: typography.fontSize.base,
              }}
            >
              <Check size={14} /> Active
            </div>
            <div
              style={{
                color: colors.gold.primary,
                fontWeight: typography.fontWeight.semibold,
                fontSize: typography.fontSize.md,
              }}
            >
              {formatNumber(nominee.votes || 0)} votes
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', gap: spacing.md, alignItems: 'flex-start' }}>
        <Avatar name={nominee.name} src={nominee.avatar_url} size={compact ? 48 : 56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              flexWrap: 'wrap',
              marginBottom: spacing.xs,
            }}
          >
            <span
              style={{
                fontWeight: typography.fontWeight.semibold,
                fontSize: compact ? typography.fontSize.md : typography.fontSize.lg,
              }}
            >
              {nominee.name}
            </span>
            {nominee.nominatedBy === 'Third Party' && (
              <Badge variant="purple" size="sm" uppercase>
                3RD PARTY
              </Badge>
            )}
          </div>
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.base, marginBottom: spacing.sm }}>
            {nominee.age} • {nominee.occupation}
          </p>

          {nominee.hasProfile && nominee.bio && (
            <p
              style={{
                color: colors.text.light,
                fontSize: typography.fontSize.sm,
                marginBottom: spacing.sm,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {nominee.bio}
            </p>
          )}

          {nominee.nominatedBy === 'Third Party' && nominee.nominatorName && (
            <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs }}>
              Nominated by {nominee.nominatorName}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          marginTop: spacing.md,
          paddingTop: spacing.md,
          borderTop: `1px solid ${colors.border.lighter}`,
        }}
      >
        {renderActions()}
      </div>
    </div>
  );
}
