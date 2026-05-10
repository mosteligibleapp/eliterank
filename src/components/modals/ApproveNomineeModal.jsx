import React from 'react';
import { Check, UserPlus, Sparkles } from 'lucide-react';
import { Modal, Button } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';

export default function ApproveNomineeModal({
  isOpen,
  onClose,
  nominee,
  onConfirm,
}) {
  if (!nominee) return null;

  const steps = [
    { num: 1, text: <><strong style={{ color: '#fff' }}>Send email invitation</strong> to {nominee.name} asking them to accept or decline the nomination</> },
    { num: 2, text: <>If accepted, they will be prompted to <strong style={{ color: '#fff' }}>complete their profile</strong> (bio, photos, interests, social links)</> },
    { num: 3, text: <>Once profile is complete, you can <strong style={{ color: '#fff' }}>convert them to a contestant</strong> and enable voting</> },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Approve Third Party Nomination"
      maxWidth="500px"
      headerStyle={{ background: 'linear-gradient(90deg, rgba(139,92,246,0.1), transparent)' }}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} style={{ width: 'auto' }}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            icon={Check}
            style={{ background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)' }}
          >
            Approve & Send Invitation
          </Button>
        </>
      }
    >
      {/* Nomination Info */}
      <div
        style={{
          background: 'rgba(139,92,246,0.1)',
          border: '1px solid rgba(139,92,246,0.2)',
          borderRadius: borderRadius.xl,
          padding: spacing.xl,
          marginBottom: spacing.xxl,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
          <UserPlus size={18} style={{ color: colors.status.purple }} />
          <span
            style={{
              color: colors.status.purple,
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.semibold,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Third Party Nomination
          </span>
        </div>
        <p style={{ color: colors.text.light, fontSize: typography.fontSize.md, lineHeight: '1.6' }}>
          <strong style={{ color: '#fff' }}>{nominee.nominatorName}</strong> has nominated{' '}
          <strong style={{ color: '#fff' }}>{nominee.name}</strong> to compete.
        </p>
      </div>

      {/* Nominee Preview */}
      <div style={{ textAlign: 'center', marginBottom: spacing.xxl }}>
        <div
          style={{
            width: '100px',
            height: '100px',
            borderRadius: borderRadius.xxl,
            background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(139,92,246,0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            fontWeight: typography.fontWeight.semibold,
            color: colors.status.purple,
            margin: '0 auto 16px',
            border: '3px solid rgba(139,92,246,0.3)',
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
        {nominee.email && (
          <p style={{ color: colors.status.purple, fontSize: typography.fontSize.base, marginTop: spacing.sm }}>
            {nominee.email}
          </p>
        )}
      </div>

      {/* What Happens Next */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(139,92,246,0.05))',
          border: '1px solid rgba(139,92,246,0.2)',
          borderRadius: borderRadius.xl,
          padding: spacing.xl,
        }}
      >
        <p
          style={{
            color: colors.status.purple,
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            marginBottom: spacing.lg,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <Sparkles size={18} /> Approving this nomination will:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {steps.map((step, i) => (
            <li
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: spacing.md,
                padding: `${spacing.md} 0`,
                borderBottom: i < steps.length - 1 ? `1px solid ${colors.border.lighter}` : 'none',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: borderRadius.full,
                  background: 'rgba(139,92,246,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ color: colors.status.purple, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold }}>
                  {step.num}
                </span>
              </div>
              <span style={{ color: colors.text.light, fontSize: typography.fontSize.md, lineHeight: '1.5' }}>
                {step.text}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Note */}
      <div
        style={{
          marginTop: spacing.lg,
          padding: `${spacing.md} ${spacing.lg}`,
          background: 'rgba(255,255,255,0.03)',
          borderRadius: borderRadius.md,
        }}
      >
        <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.base }}>
          <strong style={{ color: '#fff' }}>Note:</strong> The nominee must accept and complete their profile before they can become an active contestant.
        </p>
      </div>
    </Modal>
  );
}
