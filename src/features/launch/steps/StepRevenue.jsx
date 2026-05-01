import React from 'react';
import StepShell from '../components/StepShell';
import { ChipGroup, FieldError, Hint, Label, TextArea, TextInput } from '../components/Field';
import { REVENUE_MODELS } from '../constants';

export default function StepRevenue({ form, errors, showErrors, setField }) {
  const showVotePrice = form.revenue_models.includes('Paid voting');
  const showSponsors = form.revenue_models.includes('Sponsorships');
  return (
    <StepShell
      title="How will it make money?"
      subtitle="Pick every revenue model you plan to use."
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

      {showVotePrice && (
        <div>
          <Label htmlFor="vote_price_usd">Price per vote (USD)</Label>
          <TextInput
            id="vote_price_usd"
            type="number"
            min={0}
            step="0.25"
            value={form.vote_price_usd}
            onChange={(e) => setField('vote_price_usd', e.target.value)}
            error={showErrors && errors.vote_price_usd}
            placeholder="1.00"
          />
          <Hint>Leave blank to use the platform default of $1.00.</Hint>
          <FieldError>{showErrors && errors.vote_price_usd}</FieldError>
        </div>
      )}

      {showSponsors && (
        <div>
          <Label htmlFor="sponsor_tiers">Sponsor tiers</Label>
          <TextArea
            id="sponsor_tiers"
            value={form.sponsor_tiers}
            onChange={(e) => setField('sponsor_tiers', e.target.value)}
            placeholder={'e.g.\nGold — $10k, logo on stage\nSilver — $5k, logo on web'}
          />
        </div>
      )}
    </StepShell>
  );
}
