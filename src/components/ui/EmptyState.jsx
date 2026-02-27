import { memo, useMemo } from 'react';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';

/**
 * EmptyState - Consistent empty/null state messaging
 *
 * @param {Object} props
 * @param {import('lucide-react').LucideIcon} props.icon - Lucide icon component
 * @param {string} props.title - Primary message
 * @param {string} [props.description] - Optional secondary text
 * @param {React.ReactNode} [props.action] - Optional CTA button
 * @param {boolean} [props.compact] - Smaller variant for card/section contexts
 * @param {Object} [props.style] - Style overrides for the container
 */
function EmptyState({ icon: Icon, title, description, action, compact = false, style }) {
  const containerStyle = useMemo(() => ({
    textAlign: 'center',
    padding: compact ? `${spacing.xl} ${spacing.lg}` : `${spacing.xxl} ${spacing.xl}`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    ...style,
  }), [compact, style]);

  const iconSize = compact ? 32 : 48;

  return (
    <div style={containerStyle}>
      {Icon && (
        <Icon
          size={iconSize}
          style={{
            color: colors.text.muted,
            opacity: 0.5,
            marginBottom: compact ? spacing.sm : spacing.md,
          }}
        />
      )}
      <p style={{
        color: colors.text.secondary,
        fontSize: compact ? typography.fontSize.sm : typography.fontSize.md,
        fontWeight: typography.fontWeight.medium,
        margin: 0,
        lineHeight: 1.4,
      }}>
        {title}
      </p>
      {description && (
        <p style={{
          color: colors.text.muted,
          fontSize: typography.fontSize.sm,
          margin: `${spacing.xs} 0 0`,
          lineHeight: 1.4,
          maxWidth: '280px',
        }}>
          {description}
        </p>
      )}
      {action && (
        <div style={{ marginTop: spacing.lg }}>
          {action}
        </div>
      )}
    </div>
  );
}

export default memo(EmptyState);
