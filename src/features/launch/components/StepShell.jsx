import React from 'react';
import { colors, spacing, typography } from '../../../styles/theme';

const styles = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    margin: 0,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    margin: 0,
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  },
};

export default function StepShell({ title, subtitle, children }) {
  return (
    <div style={styles.wrap}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
        <h2 style={styles.title}>{title}</h2>
        {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
      </div>
      <div style={styles.body}>{children}</div>
    </div>
  );
}
