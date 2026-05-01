import React from 'react';
import { spacing } from '../../../styles/theme';
import StepShell from '../components/StepShell';
import { ChipGroup, FieldError, Label, TextInput } from '../components/Field';

export default function StepOrg({ form, errors, showErrors, setField }) {
  return (
    <StepShell
      title="Tell us about your org"
      subtitle="Helps us understand where you're starting from."
    >
      <div>
        <Label htmlFor="org_name" required>Organization name</Label>
        <TextInput
          id="org_name"
          autoFocus
          value={form.org_name}
          onChange={(e) => setField('org_name', e.target.value)}
          error={showErrors && errors.org_name}
          placeholder="e.g. Most Eligible Co."
        />
        <FieldError>{showErrors && errors.org_name}</FieldError>
      </div>

      <div>
        <Label>Have you organized competitions before?</Label>
        <div style={{ marginTop: spacing.xs }}>
          <ChipGroup
            options={[
              { value: 'new', label: 'New to hosting' },
              { value: 'experienced', label: "I've been running competitions" },
            ]}
            value={form.is_new_to_hosting ? 'new' : 'experienced'}
            onChange={(v) => setField('is_new_to_hosting', v === 'new')}
            multiSelect={false}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="contact_name">Your name</Label>
        <TextInput
          id="contact_name"
          value={form.contact_name}
          onChange={(e) => setField('contact_name', e.target.value)}
          placeholder="Full name"
        />
      </div>

      <div>
        <Label htmlFor="contact_email" required>Contact email</Label>
        <TextInput
          id="contact_email"
          type="email"
          value={form.contact_email}
          onChange={(e) => setField('contact_email', e.target.value)}
          error={showErrors && errors.contact_email}
          placeholder="you@org.com"
        />
        <FieldError>{showErrors && errors.contact_email}</FieldError>
      </div>
    </StepShell>
  );
}
