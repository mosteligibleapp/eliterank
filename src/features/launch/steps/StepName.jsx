import React from 'react';
import { colors, spacing, typography, borderRadius, transitions } from '../../../styles/theme';
import StepShell from '../components/StepShell';
import { FieldError, Hint, Label, TextInput } from '../components/Field';
import { SCOPE_OPTIONS } from '../constants';

export default function StepName({ form, errors, showErrors, setField }) {
  return (
    <StepShell
      title="Name and scope"
      subtitle="A working name and how far it reaches."
    >
      <div>
        <Label htmlFor="competition_name">Competition name (optional)</Label>
        <TextInput
          id="competition_name"
          autoFocus
          value={form.competition_name}
          onChange={(e) => setField('competition_name', e.target.value)}
          placeholder="e.g. Most Eligible Chicago"
        />
        <Hint>Don't worry, you can change this later.</Hint>
      </div>

      <div>
        <Label required>Scope</Label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: spacing.sm,
          }}
        >
          {SCOPE_OPTIONS.map((opt) => {
            const active = form.scope === opt.value;
            return (
              <button
                type="button"
                key={opt.value}
                onClick={() => setField('scope', opt.value)}
                aria-pressed={active}
                style={{
                  textAlign: 'left',
                  padding: spacing.md,
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
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.semibold,
                    color: active ? colors.gold.primary : colors.text.primary,
                    marginBottom: 2,
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
        <FieldError>{showErrors && errors.scope}</FieldError>
      </div>
    </StepShell>
  );
}
