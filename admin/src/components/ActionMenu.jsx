import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import { colors, spacing, borderRadius, typography, transitions, shadows, zIndex } from '@shared/styles/theme';

/**
 * Compact 3-dot action menu for table row actions.
 * Renders dropdown via portal to avoid overflow clipping from parent containers.
 *
 * @param {Object} props
 * @param {Array<{label: string, icon?: React.ElementType, onClick: Function, variant?: 'default'|'danger', disabled?: boolean}>} props.actions
 */
export default function ActionMenu({ actions = [] }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, placement: 'below' });
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  // Calculate portal position from button rect
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuEstimatedHeight = actions.length * 36 + 16;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placement = spaceBelow < menuEstimatedHeight ? 'above' : 'below';

    setMenuPos({
      top: placement === 'below' ? rect.bottom + 4 : rect.top - menuEstimatedHeight - 4,
      left: rect.right,
      placement,
    });
  }, [actions.length]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    // Close on scroll (menu position would be stale)
    const handleScroll = () => setOpen(false);

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  const handleToggle = useCallback((e) => {
    e.stopPropagation();
    if (!open) updatePosition();
    setOpen((prev) => !prev);
  }, [open, updatePosition]);

  const handleAction = useCallback((action, e) => {
    e.stopPropagation();
    if (action.disabled) return;
    setOpen(false);
    action.onClick();
  }, []);

  // Separate regular and danger actions for divider rendering
  const { regularActions, dangerActions } = useMemo(() => {
    const regular = [];
    const danger = [];
    actions.forEach((action) => {
      if (action.variant === 'danger') {
        danger.push(action);
      } else {
        regular.push(action);
      }
    });
    return { regularActions: regular, dangerActions: danger };
  }, [actions]);

  const styles = {
    wrapper: {
      position: 'relative',
      display: 'inline-flex',
    },
    trigger: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '28px',
      height: '28px',
      background: open ? colors.interactive.active : 'transparent',
      border: 'none',
      borderRadius: borderRadius.sm,
      color: colors.text.tertiary,
      cursor: 'pointer',
      transition: transitions.colors,
      padding: 0,
    },
    menu: {
      position: 'fixed',
      top: `${menuPos.top}px`,
      left: `${menuPos.left}px`,
      transform: 'translateX(-100%)',
      minWidth: '160px',
      background: colors.background.elevated,
      border: `1px solid ${colors.border.primary}`,
      borderRadius: borderRadius.md,
      boxShadow: shadows.lg,
      zIndex: zIndex.popover,
      padding: `${spacing[1]} 0`,
      animation: 'actionMenuIn 120ms ease',
      overflow: 'hidden',
    },
    divider: {
      height: '1px',
      background: colors.border.secondary,
      margin: `${spacing[1]} 0`,
    },
    item: {
      display: 'flex',
      alignItems: 'center',
      gap: spacing.sm,
      width: '100%',
      padding: `${spacing.sm} ${spacing.md}`,
      background: 'none',
      border: 'none',
      fontSize: typography.fontSize.sm,
      fontFamily: typography.fontFamily.sans,
      fontWeight: typography.fontWeight.normal,
      textAlign: 'left',
      cursor: 'pointer',
      transition: transitions.colors,
      whiteSpace: 'nowrap',
      lineHeight: typography.lineHeight.tight,
    },
    itemDefault: {
      color: colors.text.primary,
    },
    itemDanger: {
      color: colors.status.error,
    },
    itemDisabled: {
      opacity: 0.4,
      cursor: 'not-allowed',
    },
    itemHover: {
      background: colors.interactive.hover,
    },
  };

  const menuContent = open ? createPortal(
    <div ref={menuRef} style={styles.menu} role="menu">
      <style>{`@keyframes actionMenuIn { from { opacity: 0; transform: translateX(-100%) scale(0.95); } to { opacity: 1; transform: translateX(-100%) scale(1); } }`}</style>
      {regularActions.map((action, idx) => {
        const Icon = action.icon;
        return (
          <button
            key={idx}
            style={{
              ...styles.item,
              ...styles.itemDefault,
              ...(action.disabled ? styles.itemDisabled : {}),
              ...(hoveredIdx === idx && !action.disabled ? styles.itemHover : {}),
            }}
            onClick={(e) => handleAction(action, e)}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            disabled={action.disabled}
            role="menuitem"
          >
            {Icon && <Icon size={14} />}
            {action.label}
          </button>
        );
      })}

      {regularActions.length > 0 && dangerActions.length > 0 && (
        <div style={styles.divider} role="separator" />
      )}

      {dangerActions.map((action, idx) => {
        const globalIdx = regularActions.length + idx;
        const Icon = action.icon;
        return (
          <button
            key={globalIdx}
            style={{
              ...styles.item,
              ...styles.itemDanger,
              ...(action.disabled ? styles.itemDisabled : {}),
              ...(hoveredIdx === globalIdx && !action.disabled ? styles.itemHover : {}),
            }}
            onClick={(e) => handleAction(action, e)}
            onMouseEnter={() => setHoveredIdx(globalIdx)}
            onMouseLeave={() => setHoveredIdx(null)}
            disabled={action.disabled}
            role="menuitem"
          >
            {Icon && <Icon size={14} />}
            {action.label}
          </button>
        );
      })}
    </div>,
    document.body
  ) : null;

  return (
    <div style={styles.wrapper}>
      <button
        ref={buttonRef}
        style={styles.trigger}
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Row actions"
        type="button"
      >
        <MoreVertical size={16} />
      </button>

      {menuContent}
    </div>
  );
}
