import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Plus } from 'lucide-react';
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  transitions,
} from '../../styles/theme';

const styles = {
  page: {
    minHeight: '100vh',
    background: colors.background.primary,
    color: colors.text.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 540,
    padding: spacing.xxl,
    background: colors.background.secondary,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.xl,
    boxShadow: shadows.card,
    textAlign: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    margin: `0 auto ${spacing.lg}`,
    borderRadius: borderRadius.full,
    background: colors.status.successMuted,
    color: colors.status.success,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    margin: `0 0 ${spacing.sm}`,
  },
  body: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    margin: `0 0 ${spacing.lg}`,
    lineHeight: typography.lineHeight.relaxed,
  },
  idBox: {
    display: 'inline-block',
    padding: `${spacing.sm} ${spacing.md}`,
    background: colors.background.tertiary,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.md,
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.xs,
    color: colors.gold.primary,
    marginBottom: spacing.xl,
    wordBreak: 'break-all',
  },
  actions: {
    display: 'flex',
    gap: spacing.sm,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.sm} ${spacing.lg}`,
    background: colors.gold.primary,
    color: colors.text.inverse,
    border: 'none',
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
    textDecoration: 'none',
  },
  ghostBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.sm} ${spacing.lg}`,
    background: 'transparent',
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.md,
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
  },
};

export default function LaunchSuccess({ submission, onSubmitAnother }) {
  const navigate = useNavigate();
  const id = submission?.id;
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.iconWrap}>
          <Check size={32} />
        </div>
        <h1 style={styles.title}>Thanks — we'll be in touch.</h1>
        <p style={styles.body}>
          Your concept is in front of our team. We review every submission personally and
          will reach out to <strong style={{ color: colors.text.primary }}>
            {submission?.contact_email || 'you'}
          </strong> within 1-2 business days to discuss next steps.
        </p>
        {id && (
          <div>
            <div style={styles.idBox}>Submission ID: {id}</div>
          </div>
        )}
        <div style={styles.actions}>
          <button type="button" style={styles.primaryBtn} onClick={() => navigate('/')}>
            Back to home
          </button>
          {onSubmitAnother && (
            <button type="button" style={styles.ghostBtn} onClick={onSubmitAnother}>
              <Plus size={14} /> Submit another concept
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
