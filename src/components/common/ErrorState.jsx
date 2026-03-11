/**
 * ErrorState — warning icon + message + "Try Again" button
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
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
    background: colors.status.errorMuted,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[5],
    color: colors.status.error,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  message: {
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

export default function ErrorState({ title = 'Something went wrong', message = 'An unexpected error occurred. Please try again.', onRetry }) {
  return (
    <div style={styles.container}>
      <div style={styles.iconWrap}>
        <AlertTriangle size={32} />
      </div>
      <h2 style={styles.title}>{title}</h2>
      <p style={styles.message}>{message}</p>
      {onRetry && (
        <button style={styles.button} onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}
