import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, X } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';

export default function FanLoginPrompt({ isOpen, onClose }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLogin = () => {
    const returnTo = encodeURIComponent(window.location.pathname);
    navigate(`/login?returnTo=${returnTo}`);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: spacing.lg,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.background.card,
          border: `1px solid ${colors.border.primary}`,
          borderRadius: borderRadius.xxl,
          padding: spacing.xxl,
          maxWidth: '380px',
          width: '100%',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: spacing.md,
            right: spacing.md,
            background: 'none',
            border: 'none',
            color: colors.text.tertiary,
            cursor: 'pointer',
            padding: spacing.xs,
          }}
        >
          <X size={20} />
        </button>

        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: borderRadius.full,
          background: 'rgba(212,175,55,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          marginBottom: spacing.lg,
        }}>
          <Heart size={28} style={{ color: colors.gold.primary }} />
        </div>

        <h3 style={{
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.bold,
          color: colors.text.primary,
          marginBottom: spacing.sm,
        }}>
          Become a Fan
        </h3>

        <p style={{
          fontSize: typography.fontSize.sm,
          color: colors.text.secondary,
          marginBottom: spacing.xl,
          lineHeight: 1.5,
        }}>
          Sign in or create an account to become a fan and get updates on their competitions and performance.
        </p>

        <button
          onClick={handleLogin}
          style={{
            width: '100%',
            padding: `${spacing.md} ${spacing.xl}`,
            background: 'linear-gradient(135deg, #d4af37, #f4d03f)',
            color: '#0a0a0f',
            border: 'none',
            borderRadius: borderRadius.lg,
            fontSize: typography.fontSize.md,
            fontWeight: typography.fontWeight.semibold,
            cursor: 'pointer',
            marginBottom: spacing.sm,
          }}
        >
          Sign In / Create Account
        </button>
      </div>
    </div>
  );
}
