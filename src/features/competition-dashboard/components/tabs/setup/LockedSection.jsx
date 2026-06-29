import React from 'react';
import { Lock } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../../../../../styles/theme';

/**
 * LockedSection — a grayed-out, inaccessible placeholder for a Setup section
 * that doesn't apply to this competition (e.g. no charity, or no judges
 * because winners are decided by public vote). Stays visible so the host can
 * see it exists, but is dimmed and non-interactive.
 */
export default function LockedSection({ title, icon: Icon = Lock, reason }) {
  return (
    <div style={{
      background: colors.background.card,
      border: `1px solid ${colors.border.light}`,
      borderRadius: borderRadius.xxl,
      boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      opacity: 0.5,
      pointerEvents: 'none',
      padding: spacing.xl,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
        <Icon size={22} style={{ color: colors.gold.primary }} />
        <span style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>{title}</span>
        <Lock size={16} style={{ color: colors.text.muted, marginLeft: 'auto' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, color: colors.text.muted, fontSize: typography.fontSize.sm }}>
        <Lock size={14} style={{ flexShrink: 0 }} />
        <span>{reason}</span>
      </div>
    </div>
  );
}
