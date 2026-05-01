import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { colors, spacing, borderRadius, typography, transitions } from '../../../styles/theme';
import StepShell from '../components/StepShell';
import { FieldError, Hint, Label, Stepper, TextInput } from '../components/Field';

export default function StepWinning({ form, errors, showErrors, setField, update }) {
  const [draftPrize, setDraftPrize] = useState('');

  const addPrize = () => {
    const trimmed = draftPrize.trim();
    if (!trimmed) return;
    if (form.in_kind_prizes.includes(trimmed)) {
      setDraftPrize('');
      return;
    }
    update({ in_kind_prizes: [...form.in_kind_prizes, trimmed] });
    setDraftPrize('');
  };

  const removePrize = (val) => {
    update({ in_kind_prizes: form.in_kind_prizes.filter((p) => p !== val) });
  };

  const onPrizeKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPrize();
    }
  };

  return (
    <StepShell title="What does winning look like?">
      <div>
        <Label>Number of winners per round</Label>
        <Stepper
          value={form.num_winners}
          onChange={(v) => setField('num_winners', v === '' ? 1 : v)}
          min={1}
          max={50}
        />
        <FieldError>{showErrors && errors.num_winners}</FieldError>
      </div>

      <div>
        <Label htmlFor="cash_pool_usd">Cash prize pool (USD)</Label>
        <TextInput
          id="cash_pool_usd"
          type="number"
          min={0}
          value={form.cash_pool_usd}
          onChange={(e) => setField('cash_pool_usd', e.target.value)}
          error={showErrors && errors.cash_pool_usd}
          placeholder="e.g. 10000"
        />
        <FieldError>{showErrors && errors.cash_pool_usd}</FieldError>
      </div>

      <div>
        <Label>In-kind prizes</Label>
        <div style={{ display: 'flex', gap: spacing.sm }}>
          <TextInput
            value={draftPrize}
            onChange={(e) => setDraftPrize(e.target.value)}
            onKeyDown={onPrizeKey}
            placeholder="e.g. Photoshoot with X studio"
          />
          <button
            type="button"
            onClick={addPrize}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing.xs,
              padding: `0 ${spacing.lg}`,
              background: colors.gold.primary,
              color: colors.text.inverse,
              border: 'none',
              borderRadius: borderRadius.md,
              fontWeight: typography.fontWeight.semibold,
              fontSize: typography.fontSize.sm,
              cursor: 'pointer',
              transition: `all ${transitions.fast}`,
              whiteSpace: 'nowrap',
            }}
          >
            <Plus size={14} /> Add
          </button>
        </div>
        <Hint>Press Enter or click Add to attach each prize.</Hint>

        {form.in_kind_prizes.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: spacing.sm,
              marginTop: spacing.md,
            }}
          >
            {form.in_kind_prizes.map((prize) => (
              <span
                key={prize}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: spacing.xs,
                  padding: `${spacing.xs} ${spacing.md}`,
                  background: colors.gold.muted,
                  border: `1px solid ${colors.gold.primary}`,
                  borderRadius: borderRadius.pill,
                  color: colors.gold.primary,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                }}
              >
                {prize}
                <button
                  type="button"
                  onClick={() => removePrize(prize)}
                  aria-label={`Remove ${prize}`}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: colors.gold.primary,
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                  }}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </StepShell>
  );
}
