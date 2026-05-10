import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { Modal, Button, Avatar, InterestTag } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';

export default function ConvertNomineeModal({
  isOpen,
  onClose,
  nominee,
  onConfirm,
}) {
  if (!nominee) return null;

  const benefits = [
    { text: <><strong style={{ color: '#fff' }}>Send notification</strong> via email that they have been accepted to compete</> },
    { text: <><strong style={{ color: '#fff' }}>Create public profile</strong> automatically visible on the Contestants page</> },
    { text: <><strong style={{ color: '#fff' }}>Enable voting</strong> so fans can immediately start casting votes</> },
    { text: <><strong style={{ color: '#fff' }}>Add to leaderboard</strong> and begin tracking their vote rankings</> },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Convert to Contestant"
      maxWidth="500px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} style={{ width: 'auto' }}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            icon={Check}
            style={{ background: 'linear-gradient(135deg, #4ade80, #22c55e)' }}
          >
            Accept & Notify Contestant
          </Button>
        </>
      }
    >
      {/* Nominee Preview */}
      <div style={{ textAlign: 'center', marginBottom: spacing.xxl }}>
        <div
          style={{
            width: '100px',
            height: '100px',
            borderRadius: borderRadius.xxl,
            background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            fontWeight: typography.fontWeight.semibold,
            color: colors.gold.primary,
            margin: '0 auto 16px',
            border: `3px solid ${colors.border.gold}`,
          }}
        >
          {nominee.name.split(' ').map((n) => n[0]).join('')}
        </div>
        <h3 style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, marginBottom: spacing.xs }}>
          {nominee.name}
        </h3>
        <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.md }}>
          {nominee.age} • {nominee.occupation}
        </p>
        <p style={{ color: colors.text.muted, fontSize: typography.fontSize.base, marginTop: spacing.xs }}>
          {nominee.city}
        </p>
      </div>

      {/* Profile Preview */}
      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: borderRadius.xl,
          padding: spacing.xl,
          marginBottom: spacing.xxl,
        }}
      >
        <h4
          style={{
            fontSize: typography.fontSize.base,
            color: colors.gold.primary,
            fontWeight: typography.fontWeight.semibold,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: spacing.md,
          }}
        >
          Profile Preview
        </h4>
        <p style={{ color: colors.text.light, fontSize: typography.fontSize.md, lineHeight: '1.6', marginBottom: spacing.md }}>
          {nominee.bio}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
          {nominee.interests?.map((interest) => (
            <InterestTag key={interest}>{interest}</InterestTag>
          ))}
        </div>
      </div>

      {/* What Happens Next */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.05))',
          border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: borderRadius.xl,
          padding: spacing.xl,
        }}
      >
        <p
          style={{
            color: colors.status.success,
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            marginBottom: spacing.lg,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <Sparkles size={18} /> Accepting this nominee will:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {benefits.map((benefit, i) => (
            <li
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: spacing.md,
                padding: `${spacing.md} 0`,
                borderBottom: i < benefits.length - 1 ? `1px solid ${colors.border.lighter}` : 'none',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: borderRadius.full,
                  background: 'rgba(34,197,94,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Check size={14} style={{ color: colors.status.success }} />
              </div>
              <span style={{ color: colors.text.light, fontSize: typography.fontSize.md, lineHeight: '1.5' }}>
                {benefit.text}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
