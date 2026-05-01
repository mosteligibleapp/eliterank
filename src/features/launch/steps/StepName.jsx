import React from 'react';
import StepShell from '../components/StepShell';
import { FieldError, Hint, Label, TextInput } from '../components/Field';

export default function StepName({ form, errors, showErrors, setField }) {
  return (
    <StepShell
      title="Name your competition"
      subtitle="This is what contestants and voters will see."
    >
      <div>
        <Label htmlFor="competition_name" required>Competition name</Label>
        <TextInput
          id="competition_name"
          autoFocus
          value={form.competition_name}
          onChange={(e) => setField('competition_name', e.target.value)}
          error={showErrors && errors.competition_name}
          placeholder="e.g. Most Eligible Chicago"
        />
        <FieldError>{showErrors && errors.competition_name}</FieldError>
      </div>

      <div>
        <Label htmlFor="tagline">Tagline or season (optional)</Label>
        <TextInput
          id="tagline"
          value={form.tagline}
          onChange={(e) => setField('tagline', e.target.value)}
          placeholder="e.g. Summer 2026"
        />
        <Hint>Used for marketing — you can change this later.</Hint>
      </div>
    </StepShell>
  );
}
