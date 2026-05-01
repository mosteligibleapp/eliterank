import React from 'react';
import { colors, spacing, typography, borderRadius, transitions } from '../../../styles/theme';
import StepShell from '../components/StepShell';
import { FieldError, Label } from '../components/Field';
import { START_TIMEFRAME_OPTIONS } from '../constants';

export default function StepTiming({ form, errors, showErrors, setField }) {
  return (
    <StepShell
      title="When do you want to get started?"
      subtitle="A rough sense — we'll tighten the schedule once we connect."
    >
      <div>
        <Label required>Target start</Label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
          {START_TIMEFRAME_OPTIONS.map((opt) => {
            const active = form.start_timeframe === opt.value;
            return (
              <button
                type="button"
                key={opt.value}
                onClick={() => setField('start_timeframe', opt.value)}
                aria-pressed={active}
                style={{
                  textAlign: 'left',
                  padding: spacing.md,
                  background: active ? colors.gold.muted : colors.background.tertiary,
                  border: `1px solid ${active ? colors.gold.primary : colors.border.primary}`,
                  borderRadius: borderRadius.md,
                  color: active ? colors.gold.primary : colors.text.primary,
                  fontSize: typography.fontSize.base,
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
        <FieldError>{showErrors && errors.start_timeframe}</FieldError>
      </div>
    </StepShell>
  );
}
