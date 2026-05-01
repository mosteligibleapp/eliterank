import React from 'react';
import StepShell from '../components/StepShell';
import { FieldError, Hint, Label, TextInput } from '../components/Field';

export default function StepCity({ form, errors, showErrors, setField }) {
  return (
    <StepShell
      title="Where is it happening?"
      subtitle="Pick the primary host city; we run regional competitions."
    >
      <div>
        <Label htmlFor="city" required>City</Label>
        <TextInput
          id="city"
          autoFocus
          value={form.city}
          onChange={(e) => setField('city', e.target.value)}
          error={showErrors && errors.city}
          placeholder="e.g. Chicago, IL"
        />
        <FieldError>{showErrors && errors.city}</FieldError>
      </div>

      <div>
        <Label htmlFor="venue">Primary venue</Label>
        <TextInput
          id="venue"
          value={form.venue}
          onChange={(e) => setField('venue', e.target.value)}
          placeholder="e.g. The Aragon Ballroom"
        />
        <Hint>Optional — leave blank if you haven't booked one yet.</Hint>
      </div>
    </StepShell>
  );
}
