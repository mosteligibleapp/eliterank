import React from 'react';
import { spacing } from '../../../styles/theme';
import StepShell from '../components/StepShell';
import { FieldError, Hint, Label, Stepper, TextInput } from '../components/Field';

export default function StepLaunch({ form, errors, showErrors, setField }) {
  return (
    <StepShell
      title="When does it run?"
      subtitle="Set the campaign window and how many voting rounds it spans."
    >
      <div>
        <Label>Number of voting rounds</Label>
        <Stepper
          value={form.num_rounds}
          onChange={(v) => setField('num_rounds', v === '' ? 1 : v)}
          min={1}
          max={20}
        />
        <Hint>Default is 6. Each round narrows the field.</Hint>
        <FieldError>{showErrors && errors.num_rounds}</FieldError>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: spacing.md,
        }}
      >
        <div>
          <Label htmlFor="start_date" required>Start date</Label>
          <TextInput
            id="start_date"
            type="date"
            value={form.start_date}
            onChange={(e) => setField('start_date', e.target.value)}
            error={showErrors && errors.start_date}
          />
          <FieldError>{showErrors && errors.start_date}</FieldError>
        </div>
        <div>
          <Label htmlFor="end_date" required>End date</Label>
          <TextInput
            id="end_date"
            type="date"
            value={form.end_date}
            onChange={(e) => setField('end_date', e.target.value)}
            error={showErrors && errors.end_date}
          />
          <FieldError>{showErrors && errors.end_date}</FieldError>
        </div>
      </div>
    </StepShell>
  );
}
