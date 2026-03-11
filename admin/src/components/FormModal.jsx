import React, { useEffect, useRef, useCallback } from 'react';
import { X, Loader } from 'lucide-react';
import { colors, spacing, borderRadius, typography, transitions, shadows, zIndex } from '@shared/styles/theme';
import { useResponsive } from '@shared/hooks/useResponsive';

const SIZE_MAP = {
  sm: '400px',
  md: '560px',
  lg: '720px',
};

/**
 * Standardized modal for create/edit forms across admin managers.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {Function} props.onSubmit - Form submit handler
 * @param {string} [props.submitLabel] - Button text (default: "Save")
 * @param {boolean} [props.loading]
 * @param {'sm'|'md'|'lg'} [props.size] - Width preset
 * @param {React.ReactNode} props.children - Form content
 */
export default function FormModal({
  isOpen,
  onClose,
  title,
  subtitle,
  onSubmit,
  submitLabel = 'Save',
  loading = false,
  size = 'md',
  children,
}) {
  const overlayRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen]);

  // Close on Escape
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && !loading) {
      onClose();
    }
  }, [onClose, loading]);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // Close on overlay click
  const handleOverlayClick = useCallback((e) => {
    if (e.target === overlayRef.current && !loading) {
      onClose();
    }
  }, [onClose, loading]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!loading && onSubmit) {
      onSubmit(e);
    }
  }, [loading, onSubmit]);

  const { isMobile } = useResponsive();

  if (!isOpen) return null;

  const modalWidth = SIZE_MAP[size] || SIZE_MAP.md;

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: isMobile ? 'flex-end' : 'center',
      justifyContent: 'center',
      zIndex: zIndex.modal,
      padding: isMobile ? 0 : spacing.lg,
      animation: 'modalOverlayIn 200ms ease',
    },
    card: {
      width: '100%',
      maxWidth: isMobile ? '100%' : modalWidth,
      maxHeight: isMobile ? '95vh' : '85vh',
      background: colors.background.card,
      border: isMobile ? 'none' : `1px solid ${colors.border.primary}`,
      borderRadius: isMobile ? `${borderRadius.xl} ${borderRadius.xl} 0 0` : borderRadius.xl,
      boxShadow: shadows.xxl,
      display: 'flex',
      flexDirection: 'column',
      animation: isMobile ? 'modalSlideUp 250ms ease' : 'modalCardIn 250ms ease',
      overflow: 'hidden',
    },
    header: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: isMobile ? `${spacing.md} ${spacing.lg}` : `${spacing.lg} ${spacing.xl}`,
      borderBottom: `1px solid ${colors.border.primary}`,
      flexShrink: 0,
    },
    headerText: {
      display: 'flex',
      flexDirection: 'column',
      gap: spacing[1],
      minWidth: 0,
    },
    title: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      color: colors.text.primary,
      lineHeight: typography.lineHeight.tight,
      margin: 0,
    },
    subtitle: {
      fontSize: typography.fontSize.sm,
      color: colors.text.tertiary,
      lineHeight: typography.lineHeight.normal,
      margin: 0,
    },
    closeButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '32px',
      height: '32px',
      background: 'none',
      border: `1px solid ${colors.border.secondary}`,
      borderRadius: borderRadius.sm,
      color: colors.text.tertiary,
      cursor: loading ? 'not-allowed' : 'pointer',
      transition: transitions.colors,
      flexShrink: 0,
      marginLeft: spacing.md,
      padding: 0,
    },
    body: {
      flex: 1,
      overflowY: 'auto',
      padding: isMobile ? spacing.lg : spacing.xl,
      WebkitOverflowScrolling: 'touch',
    },
    footer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: isMobile ? 'stretch' : 'flex-end',
      gap: spacing.md,
      padding: isMobile ? `${spacing.md} ${spacing.lg}` : `${spacing.lg} ${spacing.xl}`,
      borderTop: `1px solid ${colors.border.primary}`,
      flexShrink: 0,
    },
    cancelButton: {
      height: '40px',
      padding: `0 ${spacing.lg}`,
      flex: isMobile ? 1 : undefined,
      background: 'none',
      border: `1px solid ${colors.border.primary}`,
      borderRadius: borderRadius.md,
      color: colors.text.secondary,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      fontFamily: typography.fontFamily.sans,
      cursor: loading ? 'not-allowed' : 'pointer',
      transition: transitions.colors,
    },
    submitButton: {
      height: '40px',
      padding: `0 ${spacing.xl}`,
      flex: isMobile ? 1 : undefined,
      background: colors.gold.primary,
      border: 'none',
      borderRadius: borderRadius.md,
      color: colors.text.inverse,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semibold,
      fontFamily: typography.fontFamily.sans,
      cursor: loading ? 'not-allowed' : 'pointer',
      transition: transitions.colors,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      opacity: loading ? 0.7 : 1,
    },
  };

  return (
    <div
      ref={overlayRef}
      style={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="form-modal-title"
    >
      <style>{`
        @keyframes modalOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalCardIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerText}>
            <h2 id="form-modal-title" style={styles.title}>{title}</h2>
            {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
          </div>
          <button
            style={styles.closeButton}
            onClick={onClose}
            disabled={loading}
            aria-label="Close modal"
            type="button"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={styles.body}>
            {children}
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <button
              type="button"
              style={styles.cancelButton}
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={styles.submitButton}
              disabled={loading}
            >
              {loading && (
                <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
              )}
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
