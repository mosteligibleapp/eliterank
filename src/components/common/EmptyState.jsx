/**
 * EmptyState — icon + title + description + optional CTA button
 */

import React from 'react';
import { colors, spacing, borderRadius, typography, gradients } from '../../styles/theme';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing[12]} ${spacing[6]}`,
    textAlign: 'center',
  },
  iconWrap: {
    width: '72px',
    height: '72px',
    borderRadius: borderRadius.full,
    background: 'rgba(212, 175, 55, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[5],
    color: colors.gold.primary,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  description: {
    fontSize: typography.fontSize.base,
    color: colors.text.tertiary,
    maxWidth: '360px',
    lineHeight: typography.lineHeight.normal,
    marginBottom: spacing[6],
  },
  button: {
    padding: `${spacing[3]} ${spacing[6]}`,
    background: gradients.gold,
    color: colors.text.inverse,
    border: 'none',
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
  },
};

export default function EmptyState({ icon, title, description, ctaLabel, onCta }) {
  return (
    <div style={styles.container}>
      {icon && <div style={styles.iconWrap}>{icon}</div>}
      {title && <h2 style={styles.title}>{title}</h2>}
      {description && <p style={styles.description}>{description}</p>}
      {ctaLabel && onCta && (
        <button style={styles.button} onClick={onCta}>
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
