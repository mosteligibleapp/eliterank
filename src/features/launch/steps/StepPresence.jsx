import React from 'react';
import StepShell from '../components/StepShell';
import { FieldError, Hint, Label, TextInput } from '../components/Field';

export default function StepPresence({ form, errors, showErrors, setField }) {
  return (
    <StepShell
      title="Where can we find your org online?"
      subtitle="Optional — share whatever you have. You can skip this step."
    >
      <div>
        <Label htmlFor="website_url">Website</Label>
        <TextInput
          id="website_url"
          type="url"
          inputMode="url"
          value={form.website_url}
          onChange={(e) => setField('website_url', e.target.value)}
          placeholder="https://yourorg.com"
          error={showErrors && errors.website_url}
        />
        <FieldError>{showErrors && errors.website_url}</FieldError>
      </div>

      <div>
        <Label htmlFor="social_url">Social media page</Label>
        <TextInput
          id="social_url"
          type="url"
          inputMode="url"
          value={form.social_url}
          onChange={(e) => setField('social_url', e.target.value)}
          placeholder="https://instagram.com/yourorg or https://tiktok.com/@yourorg"
          error={showErrors && errors.social_url}
        />
        <Hint>Instagram, TikTok, or wherever you're most active.</Hint>
        <FieldError>{showErrors && errors.social_url}</FieldError>
      </div>
    </StepShell>
  );
}
