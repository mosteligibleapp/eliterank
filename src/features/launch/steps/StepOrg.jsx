import React from 'react';
import { spacing } from '../../../styles/theme';
import StepShell from '../components/StepShell';
import { ChipGroup, FieldError, Label, TextInput } from '../components/Field';

export default function StepOrg({ form, errors, showErrors, setField }) {
  return (
    <StepShell
      title="Tell us about your org"
      subtitle="We'll match you to existing infrastructure if you already host with us."
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
        <Label>Are you new or do you already host with us?</Label>
        <div style={{ marginTop: spacing.xs }}>
          <ChipGroup
            options={[
              { value: 'new', label: 'New org' },
              { value: 'existing', label: 'Existing host' },
            ]}
            value={form.org_is_new ? 'new' : 'existing'}
            onChange={(v) => setField('org_is_new', v === 'new')}
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
