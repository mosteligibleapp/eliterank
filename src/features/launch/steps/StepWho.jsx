import React from 'react';
import { spacing, colors, typography } from '../../../styles/theme';
import StepShell from '../components/StepShell';
import { ChipGroup, FieldError, Label, TextInput } from '../components/Field';
import { GENDER_CHIPS } from '../constants';

export default function StepWho({ form, errors, showErrors, setField, update }) {
  const handleGenderChange = (next) => {
    // "All genders" is exclusive of the others.
    if (next.includes('All genders') && !form.gender_eligibility.includes('All genders')) {
      update({ gender_eligibility: ['All genders'] });
      return;
    }
    if (form.gender_eligibility.includes('All genders') && next.length > 1) {
      update({ gender_eligibility: next.filter((v) => v !== 'All genders') });
      return;
    }
    update({ gender_eligibility: next });
  };

  return (
    <StepShell
      title="Who is eligible?"
      subtitle='"All genders" replaces the others.'
    >
      <div>
        <Label required>Gender eligibility</Label>
        <ChipGroup
          options={GENDER_CHIPS}
          value={form.gender_eligibility}
          onChange={handleGenderChange}
        />
        <FieldError>{showErrors && errors.gender_eligibility}</FieldError>
      </div>

      <div>
        <Label>Age range</Label>
        <div
          style={{
            display: 'flex',
            gap: spacing.sm,
            alignItems: 'center',
            opacity: form.no_age_restrictions ? 0.45 : 1,
          }}
        >
          <TextInput
            type="number"
            min={13}
            max={120}
            value={form.age_min}
            onChange={(e) => setField('age_min', e.target.value)}
            placeholder="Min"
            disabled={form.no_age_restrictions}
            style={{ width: 120 }}
          />
          <span style={{ color: colors.text.tertiary, fontSize: typography.fontSize.sm }}>to</span>
          <TextInput
            type="number"
            min={13}
            max={120}
            value={form.age_max}
            onChange={(e) => setField('age_max', e.target.value)}
            placeholder="Max"
            disabled={form.no_age_restrictions}
            style={{ width: 120 }}
          />
        </div>
        <FieldError>{showErrors && errors.age_range}</FieldError>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.sm,
            marginTop: spacing.md,
            cursor: 'pointer',
            color: colors.text.secondary,
            fontSize: typography.fontSize.sm,
          }}
        >
          <input
            type="checkbox"
            checked={form.no_age_restrictions}
            onChange={(e) => setField('no_age_restrictions', e.target.checked)}
            style={{ accentColor: colors.gold.primary }}
          />
          No age restrictions
        </label>
      </div>
    </StepShell>
  );
}
