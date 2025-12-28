import React, { useEffect, useState } from 'react';
import { Check, X, AlertCircle, Info } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';

const TOAST_TYPES = {
  success: {
    icon: Check,
    bg: 'rgba(34, 197, 94, 0.15)',
    border: 'rgba(34, 197, 94, 0.3)',
    color: '#22c55e',
  },
  error: {
    icon: X,
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.3)',
    color: '#ef4444',
  },
  warning: {
    icon: AlertCircle,
    bg: 'rgba(251, 191, 36, 0.15)',
    border: 'rgba(251, 191, 36, 0.3)',
    color: '#fbbf24',
  },
  info: {
    icon: Info,
    bg: 'rgba(59, 130, 246, 0.15)',
    border: 'rgba(59, 130, 246, 0.3)',
    color: '#3b82f6',
  },
};

export function Toast({ id, type = 'success', message, onDismiss, duration = 4000 }) {
  const [isExiting, setIsExiting] = useState(false);
  const config = TOAST_TYPES[type] || TOAST_TYPES.info;
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(id), 300);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.md,
        padding: `${spacing.md} ${spacing.lg}`,
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: borderRadius.lg,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        minWidth: '300px',
        maxWidth: '450px',
        animation: isExiting ? 'slideOut 0.3s ease-out forwards' : 'slideIn 0.3s ease-out',
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: borderRadius.full,
          background: config.bg,
          border: `1px solid ${config.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={16} style={{ color: config.color }} />
      </div>
      <p style={{
        flex: 1,
        fontSize: typography.fontSize.sm,
        color: colors.text.primary,
        margin: 0,
      }}>
        {message}
      </p>
      <button
        onClick={handleDismiss}
        style={{
          background: 'transparent',
          border: 'none',
          padding: spacing.xs,
          cursor: 'pointer',
          color: colors.text.muted,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: borderRadius.sm,
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => e.target.style.color = colors.text.primary}
        onMouseLeave={(e) => e.target.style.color = colors.text.muted}
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }) {
  return (
    <>
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          @keyframes slideOut {
            from {
              transform: translateX(0);
              opacity: 1;
            }
            to {
              transform: translateX(100%);
              opacity: 0;
            }
          }
        `}
      </style>
      <div
        style={{
          position: 'fixed',
          top: spacing.xl,
          right: spacing.xl,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.md,
        }}
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onDismiss={onDismiss} />
        ))}
      </div>
    </>
  );
}

export default Toast;
