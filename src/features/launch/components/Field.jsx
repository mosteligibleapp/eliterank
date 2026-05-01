import React from 'react';
import { colors, spacing, typography, borderRadius, transitions } from '../../../styles/theme';

const labelStyle = {
  display: 'block',
  fontSize: typography.fontSize.sm,
  fontWeight: typography.fontWeight.semibold,
  color: colors.text.secondary,
  marginBottom: spacing.xs,
};

const hintStyle = {
  fontSize: typography.fontSize.xs,
  color: colors.text.tertiary,
  marginTop: spacing.xs,
};

const errorStyle = {
  fontSize: typography.fontSize.xs,
  color: colors.status.error,
  marginTop: spacing.xs,
};

const inputBase = {
  width: '100%',
  padding: spacing.md,
  background: colors.background.tertiary,
  border: `1px solid ${colors.border.primary}`,
  borderRadius: borderRadius.md,
  color: colors.text.primary,
  fontSize: typography.fontSize.base,
  outline: 'none',
  transition: `border-color ${transitions.fast}`,
  boxSizing: 'border-box',
};

const inputErrorStyle = { borderColor: colors.status.error };

export function Label({ children, htmlFor, required }) {
  return (
    <label htmlFor={htmlFor} style={labelStyle}>
      {children}
      {required && <span style={{ color: colors.gold.primary, marginLeft: 4 }}>*</span>}
    </label>
  );
}

export function Hint({ children }) {
  return <div style={hintStyle}>{children}</div>;
}

export function FieldError({ children }) {
  if (!children) return null;
  return <div style={errorStyle}>{children}</div>;
}

export function TextInput({ error, style, ...props }) {
  return (
    <input
      {...props}
      style={{
        ...inputBase,
        ...(error ? inputErrorStyle : null),
        ...style,
      }}
    />
  );
}

export function TextArea({ error, style, rows = 4, ...props }) {
  return (
    <textarea
      {...props}
      rows={rows}
      style={{
        ...inputBase,
        resize: 'vertical',
        minHeight: 96,
        fontFamily: 'inherit',
        ...(error ? inputErrorStyle : null),
        ...style,
      }}
    />
  );
}

export function Stepper({ value, onChange, min = 0, max = 99 }) {
  const dec = () => onChange(Math.max(min, Number(value) - 1));
  const inc = () => onChange(Math.min(max, Number(value) + 1));
  const btn = {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    background: colors.background.tertiary,
    border: `1px solid ${colors.border.primary}`,
    color: colors.text.primary,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    cursor: 'pointer',
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
      <button type="button" onClick={dec} style={btn} aria-label="decrease">−</button>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const v = e.target.value === '' ? '' : Number(e.target.value);
          onChange(v);
        }}
        min={min}
        max={max}
        style={{
          ...inputBase,
          width: 80,
          textAlign: 'center',
        }}
      />
      <button type="button" onClick={inc} style={btn} aria-label="increase">+</button>
    </div>
  );
}

export function ChipGroup({ options, value, onChange, multiSelect = true }) {
  const selected = new Set(Array.isArray(value) ? value : value ? [value] : []);
  const toggle = (opt) => {
    if (!multiSelect) {
      onChange(opt);
      return;
    }
    const next = new Set(selected);
    if (next.has(opt)) next.delete(opt);
    else next.add(opt);
    onChange(Array.from(next));
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
      {options.map((opt) => {
        const isActive = selected.has(opt.value);
        return (
          <button
            type="button"
            key={opt.value}
            onClick={() => toggle(opt.value)}
            aria-pressed={isActive}
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              background: isActive ? colors.gold.muted : colors.background.tertiary,
              border: `1px solid ${isActive ? colors.gold.primary : colors.border.primary}`,
              borderRadius: borderRadius.pill,
              color: isActive ? colors.gold.primary : colors.text.secondary,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              cursor: 'pointer',
              transition: `all ${transitions.fast}`,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
