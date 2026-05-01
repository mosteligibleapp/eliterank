import React from 'react';
import StepShell from '../components/StepShell';
import { Label, TextArea } from '../components/Field';

export default function StepNotes({ form, setField }) {
  return (
    <StepShell
      title="Anything else?"
      subtitle="Optional. Tell us about partners, past events, or anything we should know."
    >
      <div>
        <Label htmlFor="notes">Notes</Label>
        <TextArea
          id="notes"
          rows={6}
          value={form.notes}
          onChange={(e) => setField('notes', e.target.value)}
          placeholder="Anything that doesn't fit elsewhere…"
        />
      </div>
    </StepShell>
  );
}
