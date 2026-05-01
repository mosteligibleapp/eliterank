import React from 'react';
import StepShell from '../components/StepShell';
import { ChipGroup, FieldError, Label } from '../components/Field';
import { REVENUE_MODELS } from '../constants';

export default function StepRevenue({ form, errors, showErrors, setField }) {
  return (
    <StepShell
      title="How will it make money?"
      subtitle="Pick every model you might use — you can refine later."
    >
      <div>
        <Label required>Revenue models</Label>
        <ChipGroup
          options={REVENUE_MODELS}
          value={form.revenue_models}
          onChange={(v) => setField('revenue_models', v)}
        />
        <FieldError>{showErrors && errors.revenue_models}</FieldError>
      </div>
    </StepShell>
  );
}
