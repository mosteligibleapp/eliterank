import React from 'react';
import { X } from 'lucide-react';
import { colors, borderRadius, spacing, typography } from '../../styles/theme';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = '500px',
  headerStyle = {},
}) {
  if (!isOpen) return null;

  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    background: colors.background.overlay,
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 50,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    overflowY: 'auto',
  };

  const modalStyle = {
    background: '#1a1a24',
    border: `1px solid ${colors.border.light}`,
    borderRadius: borderRadius.xxl,
    width: '100%',
    maxWidth,
    marginBottom: spacing.xl,
  };

  const headerBaseStyle = {
    padding: spacing.xl,
    borderBottom: `1px solid ${colors.border.lighter}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...headerStyle,
  };

  const titleStyle = {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.semibold,
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    color: colors.text.secondary,
    cursor: 'pointer',
    padding: spacing.sm,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const bodyStyle = {
    padding: spacing.xxl,
  };

  const footerStyle = {
    padding: spacing.xl,
    borderTop: `1px solid ${colors.border.lighter}`,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: spacing.md,
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerBaseStyle}>
          <h2 style={titleStyle}>{title}</h2>
          <button style={closeButtonStyle} onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        <div style={bodyStyle}>{children}</div>
        {footer && <div style={footerStyle}>{footer}</div>}
      </div>
    </div>
  );
}
