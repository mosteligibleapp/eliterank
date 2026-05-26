import React from 'react';
import { X } from 'lucide-react';
import { colors, shadows, borderRadius, spacing, typography, zIndex } from '../../styles/theme';
import { useResponsive } from '../../hooks/useResponsive';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = '500px',
  centered = false,
  hideCloseButton = false,
  variant = 'default',
}) {
  const { isMobile } = useResponsive();
  if (!isOpen) return null;

  const showFullHeader = title && title.trim() !== '';

  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    background: colors.background.overlay,
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: centered ? 'center' : 'flex-start',
    justifyContent: 'center',
    zIndex: zIndex.modal,
    padding: spacing.lg,
    paddingTop: `max(${spacing.lg}, env(safe-area-inset-top, ${spacing.lg}))`,
    paddingBottom: `max(${spacing.lg}, env(safe-area-inset-bottom, ${spacing.lg}))`,
    overflowY: 'auto',
  };

  const cardStyle = {
    position: 'relative',
    background: colors.background.card,
    border: variant === 'gold'
      ? `1px solid ${colors.border.focus}`
      : `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.xxl,
    width: '100%',
    maxWidth,
    overflow: 'hidden',
    marginTop: centered ? 'auto' : spacing.sm,
    marginBottom: centered ? 'auto' : spacing.xl,
    boxShadow: variant === 'gold'
      ? `${shadows.gold}, ${shadows.goldGlow}`
      : shadows.xl,
  };

  const headerPadding = isMobile
    ? `${spacing.lg} ${spacing.lg}`
    : `${spacing.xl} ${spacing.xxl}`;
  const bodyPadding = isMobile
    ? `${spacing.lg} ${spacing.lg} ${spacing.xl}`
    : `${spacing.xl} ${spacing.xxl} ${spacing.xxl}`;
  const footerPadding = isMobile
    ? `${spacing.md} ${spacing.lg} ${spacing.lg}`
    : `${spacing.lg} ${spacing.xxl} ${spacing.xl}`;

  const headerStyle = {
    padding: headerPadding,
    borderBottom: `1px solid ${colors.border.secondary}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  };

  const titleStyle = {
    fontSize: isMobile ? typography.fontSize.xl : typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    margin: 0,
    lineHeight: typography.lineHeight.tight,
  };

  const closeButtonStyle = {
    background: 'transparent',
    border: 'none',
    color: colors.text.secondary,
    cursor: 'pointer',
    padding: spacing.xs,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    outline: 'none',
    WebkitTapHighlightColor: 'transparent',
    flexShrink: 0,
  };

  const floatingCloseStyle = {
    ...closeButtonStyle,
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 1,
  };

  const bodyStyle = {
    padding: showFullHeader ? bodyPadding : (hideCloseButton ? 0 : bodyPadding),
  };

  const footerStyle = {
    padding: footerPadding,
    borderTop: `1px solid ${colors.border.secondary}`,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: spacing.md,
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        {showFullHeader ? (
          <div style={headerStyle}>
            <h2 style={titleStyle}>{title}</h2>
            {!hideCloseButton && (
              <button type="button" onClick={onClose} style={closeButtonStyle} aria-label="Close">
                <X size={22} />
              </button>
            )}
          </div>
        ) : !hideCloseButton ? (
          <button type="button" onClick={onClose} style={floatingCloseStyle} aria-label="Close">
            <X size={22} />
          </button>
        ) : null}
        <div style={bodyStyle}>{children}</div>
        {footer && <div style={footerStyle}>{footer}</div>}
      </div>
    </div>
  );
}
