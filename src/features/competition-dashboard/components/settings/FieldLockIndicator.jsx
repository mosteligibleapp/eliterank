import React from 'react';
import { Lock, AlertTriangle } from 'lucide-react';
import { isFieldEditable, getLockedReason, getEditWarning } from '../../../../utils/fieldEditability';
import { colors, spacing, borderRadius, typography } from '../../../../styles/theme';

/**
 * Indicator for locked or warning fields
 * Wraps form fields to show lock state
 *
 * @param {string} fieldName - Field name for editability check
 * @param {string} status - Competition status
 * @param {ReactNode} children - Form field to wrap
 * @param {boolean} showLabel - Whether to show lock reason label
 */
export function FieldLockIndicator({
  fieldName,
  status,
  children,
  showLabel = true
}) {
  const editability = isFieldEditable(fieldName, status);
  const isLocked = editability === false;
  const needsWarning = editability === 'warn';

  const containerStyle = {
    position: 'relative',
  };

  // Dim + disable the field itself so it visibly reads as "not editable",
  // without an overlay that could overflow short fields and cover neighbours.
  const lockedContentStyle = {
    opacity: 0.45,
    pointerEvents: 'none',
  };

  // A contained caption tucked beneath the field — explains the lock without
  // floating on top of (and spilling past) a single-line input.
  const reasonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    lineHeight: 1.4,
  };

  const warningBadgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.xs} ${spacing.sm}`,
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: borderRadius.sm,
    fontSize: typography.fontSize.xs,
    color: colors.status.warning,
    marginBottom: spacing.xs,
  };

  if (isLocked) {
    return (
      <div style={containerStyle}>
        <div style={lockedContentStyle}>
          {children}
        </div>
        {showLabel && (
          <div style={reasonStyle}>
            <Lock size={12} style={{ flexShrink: 0 }} />
            <span>{getLockedReason(fieldName, status)}</span>
          </div>
        )}
      </div>
    );
  }

  if (needsWarning) {
    return (
      <div>
        <div style={warningBadgeStyle}>
          <AlertTriangle size={12} />
          <span>Live Competition</span>
        </div>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Simple lock icon for inline use
 */
export function LockIcon({ fieldName, status }) {
  const editability = isFieldEditable(fieldName, status);

  const lockIconStyle = {
    color: colors.text.muted,
    marginLeft: spacing.xs,
  };

  const warnIconStyle = {
    color: colors.status.warning,
    marginLeft: spacing.xs,
  };

  if (editability === false) {
    return <Lock size={14} style={lockIconStyle} />;
  }

  if (editability === 'warn') {
    return <AlertTriangle size={14} style={warnIconStyle} />;
  }

  return null;
}

export default FieldLockIndicator;
