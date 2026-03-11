import React, { useState, useId } from 'react';
import { colors, spacing, borderRadius, typography, transitions, shadows } from '@shared/styles/theme';
import { useResponsive } from '@shared/hooks/useResponsive';

// ── FormField ──────────────────────────────────────────────
// Wrapper with label, optional description, and error message.

/**
 * @param {Object} props
 * @param {string} props.label
 * @param {string} [props.description]
 * @param {string} [props.error]
 * @param {boolean} [props.required]
 * @param {React.ReactNode} props.children
 */
export function FormField({ label, description, error, required, children }) {
  const fieldId = useId();

  const styles = {
    wrapper: {
      display: 'flex',
      flexDirection: 'column',
      gap: spacing[1],
    },
    label: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: colors.text.primary,
      lineHeight: typography.lineHeight.tight,
    },
    required: {
      color: colors.status.error,
      marginLeft: spacing[0.5],
    },
    description: {
      fontSize: typography.fontSize.xs,
      color: colors.text.tertiary,
      lineHeight: typography.lineHeight.normal,
      marginTop: 0,
      marginBottom: spacing[0.5],
    },
    error: {
      fontSize: typography.fontSize.xs,
      color: colors.status.error,
      lineHeight: typography.lineHeight.normal,
      marginTop: spacing[0.5],
    },
  };

  return (
    <div style={styles.wrapper}>
      <label htmlFor={fieldId} style={styles.label}>
        {label}
        {required && <span style={styles.required}>*</span>}
      </label>
      {description && <p style={styles.description}>{description}</p>}
      {/* Clone child to inject id and error state */}
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child, {
          id: child.props.id || fieldId,
          hasError: !!error,
        });
      })}
      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}


// ── Shared input style helpers ─────────────────────────────

function getInputBaseStyle(focused, hasError) {
  return {
    width: '100%',
    height: '40px',
    padding: `0 ${spacing.md}`,
    background: colors.background.tertiary,
    border: `1px solid ${
      hasError
        ? colors.border.error
        : focused
          ? colors.border.focus
          : colors.border.primary
    }`,
    borderRadius: borderRadius.md,
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.sans,
    fontWeight: typography.fontWeight.normal,
    outline: 'none',
    transition: transitions.colors,
    boxShadow: hasError
      ? shadows.focusError
      : focused
        ? shadows.focus
        : 'none',
    boxSizing: 'border-box',
  };
}


// ── TextInput ──────────────────────────────────────────────

/**
 * Styled text input.
 *
 * @param {Object} props - Standard input props + hasError
 */
export function TextInput({ hasError, style, ...props }) {
  const [focused, setFocused] = useState(false);

  return (
    <input
      {...props}
      style={{
        ...getInputBaseStyle(focused, hasError),
        ...style,
      }}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
    />
  );
}


// ── TextArea ───────────────────────────────────────────────

/**
 * Styled textarea.
 *
 * @param {Object} props - Standard textarea props + hasError + rows
 */
export function TextArea({ hasError, style, rows = 4, ...props }) {
  const [focused, setFocused] = useState(false);

  return (
    <textarea
      {...props}
      rows={rows}
      style={{
        ...getInputBaseStyle(focused, hasError),
        height: 'auto',
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm,
        resize: 'vertical',
        lineHeight: typography.lineHeight.normal,
        ...style,
      }}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
    />
  );
}


// ── SelectInput ────────────────────────────────────────────

/**
 * Styled select dropdown.
 *
 * @param {Object} props
 * @param {Array<{value: string, label: string}>} props.options
 * @param {string} [props.placeholder] - Placeholder option text
 * @param {boolean} [props.hasError]
 */
export function SelectInput({ options = [], placeholder, hasError, style, ...props }) {
  const [focused, setFocused] = useState(false);

  return (
    <select
      {...props}
      style={{
        ...getInputBaseStyle(focused, hasError),
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: `right ${spacing.md} center`,
        paddingRight: spacing.xxl,
        cursor: 'pointer',
        ...style,
      }}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}


// ── ToggleSwitch ───────────────────────────────────────────

/**
 * On/off toggle switch.
 *
 * @param {Object} props
 * @param {boolean} props.checked
 * @param {Function} props.onChange - (checked: boolean) => void
 * @param {boolean} [props.disabled]
 * @param {string} [props.id]
 */
export function ToggleSwitch({ checked, onChange, disabled = false, id, ...rest }) {
  const styles = {
    track: {
      position: 'relative',
      width: '40px',
      height: '22px',
      borderRadius: borderRadius.pill,
      background: checked ? colors.gold.primary : colors.background.elevated,
      border: `1px solid ${checked ? colors.gold.dark : colors.border.primary}`,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: transitions.colors,
      opacity: disabled ? 0.5 : 1,
      flexShrink: 0,
    },
    thumb: {
      position: 'absolute',
      top: '2px',
      left: checked ? '20px' : '2px',
      width: '16px',
      height: '16px',
      borderRadius: borderRadius.full,
      background: checked ? colors.text.inverse : colors.text.tertiary,
      transition: `left ${transitions.fast} ${transitions.ease}`,
      boxShadow: shadows.xs,
    },
    hiddenInput: {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: 0,
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: 0,
    },
  };

  return (
    <label style={{ display: 'inline-flex', cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        disabled={disabled}
        id={id}
        style={styles.hiddenInput}
        {...rest}
      />
      <div style={styles.track}>
        <div style={styles.thumb} />
      </div>
    </label>
  );
}


// ── FormGrid ───────────────────────────────────────────────
// 2-column responsive grid for form layout.

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export function FormGrid({ children }) {
  const { isMobile } = useResponsive();

  const styles = {
    grid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: spacing.lg,
    },
  };

  return <div style={styles.grid}>{children}</div>;
}


// ── FormSection ────────────────────────────────────────────
// Labeled section within a form with optional divider.

/**
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {React.ReactNode} props.children
 * @param {boolean} [props.divider] - Show top divider (default: true)
 */
export function FormSection({ title, description, children, divider = true }) {
  const styles = {
    section: {
      display: 'flex',
      flexDirection: 'column',
      gap: spacing.lg,
    },
    divider: {
      borderTop: `1px solid ${colors.border.secondary}`,
      margin: `${spacing.sm} 0 0 0`,
      paddingTop: spacing.lg,
    },
    header: {
      display: 'flex',
      flexDirection: 'column',
      gap: spacing[0.5],
    },
    title: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semibold,
      color: colors.text.primary,
      textTransform: 'uppercase',
      letterSpacing: typography.letterSpacing.wide,
      margin: 0,
    },
    description: {
      fontSize: typography.fontSize.xs,
      color: colors.text.tertiary,
      lineHeight: typography.lineHeight.normal,
      margin: 0,
    },
    content: {
      display: 'flex',
      flexDirection: 'column',
      gap: spacing.lg,
    },
  };

  return (
    <div style={{ ...styles.section, ...(divider ? styles.divider : {}) }}>
      <div style={styles.header}>
        <h3 style={styles.title}>{title}</h3>
        {description && <p style={styles.description}>{description}</p>}
      </div>
      <div style={styles.content}>{children}</div>
    </div>
  );
}
