import React from 'react';
import StepShell from '../components/StepShell';
import { ChipGroup, Hint, Label, TextInput } from '../components/Field';
import { SOCIAL_PLATFORMS } from '../constants';

export default function StepSocial({ form, setField }) {
  return (
    <StepShell
      title="Social presence"
      subtitle="Optional — helps us tailor the campaign. You can skip this step."
    >
      <div>
        <Label>Required platforms for contestants</Label>
        <ChipGroup
          options={SOCIAL_PLATFORMS}
          value={form.social_platforms}
          onChange={(v) => setField('social_platforms', v)}
        />
      </div>

      <div>
        <Label htmlFor="campaign_hashtag">Campaign hashtag</Label>
        <TextInput
          id="campaign_hashtag"
          value={form.campaign_hashtag}
          onChange={(e) => setField('campaign_hashtag', e.target.value)}
          placeholder="#MostEligibleChicago"
        />
      </div>

      <div>
        <Label htmlFor="min_followers">Minimum follower count</Label>
        <TextInput
          id="min_followers"
          type="number"
          min={0}
          value={form.min_followers}
          onChange={(e) => setField('min_followers', e.target.value)}
          placeholder="e.g. 1000"
        />
        <Hint>Leave blank if there's no minimum.</Hint>
      </div>
    </StepShell>
  );
}
