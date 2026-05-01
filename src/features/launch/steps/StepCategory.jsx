import React from 'react';
import { colors, spacing, typography, borderRadius, transitions } from '../../../styles/theme';
import StepShell from '../components/StepShell';
import { CATEGORY_OPTIONS } from '../constants';
import { FieldError, Label, TextInput } from '../components/Field';

export default function StepCategory({ form, errors, showErrors, setField }) {
  return (
    <StepShell
      title="What kind of competition?"
      subtitle="Pick the category that best fits — you can refine later."
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: spacing.md,
        }}
      >
        {CATEGORY_OPTIONS.map((opt) => {
          const active = form.category === opt.value;
          return (
            <button
              type="button"
              key={opt.value}
              onClick={() => setField('category', opt.value)}
              aria-pressed={active}
              style={{
                textAlign: 'left',
                padding: spacing.lg,
                background: active ? colors.gold.muted : colors.background.tertiary,
                border: `1px solid ${active ? colors.gold.primary : colors.border.primary}`,
                borderRadius: borderRadius.lg,
                color: colors.text.primary,
                cursor: 'pointer',
                transition: `all ${transitions.fast}`,
              }}
            >
              <div
                style={{
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.semibold,
                  color: active ? colors.gold.primary : colors.text.primary,
                  marginBottom: spacing.xs,
                }}
              >
                {opt.label}
              </div>
              <div style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
                {opt.description}
              </div>
            </button>
          );
        })}
      </div>
      <FieldError>{showErrors && errors.category}</FieldError>

      {form.category === 'other' && (
        <div>
          <Label htmlFor="category_other" required>Tell us what kind</Label>
          <TextInput
            id="category_other"
            value={form.category_other}
            onChange={(e) => setField('category_other', e.target.value)}
            error={showErrors && errors.category_other}
            placeholder="e.g. Best chef in the city"
          />
          <FieldError>{showErrors && errors.category_other}</FieldError>
        </div>
      )}
    </StepShell>
  );
}
