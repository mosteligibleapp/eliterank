import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, DollarSign, Lock, Check, Info } from 'lucide-react';
import { FieldLockIndicator, LockIcon } from './FieldLockIndicator';
import { isFieldEditable } from '../../../../utils/fieldEditability';
import { calculatePrizePool } from '../../../../utils/calculatePrizePool';
import { supabase } from '../../../../lib/supabase';
import { colors, spacing, borderRadius, typography, gradients } from '../../../../styles/theme';
import { Button, Panel, Badge } from '../../../../components/ui';
import { useToast } from '../../../../contexts/ToastContext';

/**
 * Prize pool settings for host dashboard
 * Sets minimum contribution and shows calculated breakdown
 *
 * @param {object} competition - Competition object
 * @param {function} onSave - Callback when save completes
 */
export function PrizePoolSettings({ competition, onSave }) {
  const toast = useToast();
  const status = competition?.status || 'draft';

  // Form state
  const [minimum, setMinimum] = useState(1000);

  // UI state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Initialize
  useEffect(() => {
    if (competition?.prize_pool_minimum) {
      setMinimum(competition.prize_pool_minimum);
    }
  }, [competition]);

  // Calculate prize breakdown preview
  const prizePreview = useMemo(() => {
    return calculatePrizePool(minimum, 0); // 0 vote revenue for preview
  }, [minimum]);

  // Validate minimum
  const minError = minimum < 1000 ? 'Minimum prize pool is $1,000' : null;

  // Check for changes
  const hasChanges = () => {
    return minimum !== (competition?.prize_pool_minimum || 1000);
  };

  // Save changes
  const saveChanges = async () => {
    if (!competition?.id || minError) return;

    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('competitions')
        .update({
          prize_pool_minimum: minimum,
          updated_at: new Date().toISOString(),
        })
        .eq('id', competition.id);

      if (updateError) throw updateError;

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success('Prize pool saved');

      if (onSave) onSave();
    } catch (err) {
      console.error('Error saving prize pool:', err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const isLocked = isFieldEditable('prize_pool_minimum', status) === false;

  // Styles
  const descStyle = {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    margin: `0 0 ${spacing.lg}`,
    lineHeight: typography.lineHeight.relaxed,
  };

  const formGroupStyle = {
    marginBottom: spacing.lg,
  };

  const labelStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs,
    color: colors.text.secondary,
  };

  const inputContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.05)',
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  };

  const prefixStyle = {
    padding: `${spacing.sm} ${spacing.md}`,
    background: colors.background.tertiary,
    borderRight: `1px solid ${colors.border.primary}`,
    color: colors.text.muted,
    display: 'flex',
    alignItems: 'center',
  };

  const inputStyle = {
    flex: 1,
    padding: `${spacing.sm} ${spacing.md}`,
    border: 'none',
    background: 'transparent',
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    outline: 'none',
  };

  const errorStyle = {
    fontSize: typography.fontSize.xs,
    color: colors.status.error,
    marginTop: spacing.xs,
  };

  const hintStyle = {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    marginTop: spacing.xs,
  };

  const breakdownContainerStyle = {
    padding: spacing.lg,
    background: colors.background.primary,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  };

  const breakdownTitleStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    margin: `0 0 ${spacing.xs}`,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  };

  const breakdownNoteStyle = {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    margin: `0 0 ${spacing.md}`,
  };

  const breakdownGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: spacing.md,
    marginBottom: spacing.md,
  };

  const breakdownItemStyle = (isFirst) => ({
    padding: spacing.md,
    background: isFirst ? 'rgba(212, 175, 55, 0.1)' : colors.background.secondary,
    border: isFirst ? '1px solid rgba(212, 175, 55, 0.3)' : 'none',
    borderRadius: borderRadius.md,
    textAlign: 'center',
  });

  const placeStyle = {
    display: 'block',
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  };

  const amountStyle = (isFirst) => ({
    display: 'block',
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: isFirst ? colors.gold.primary : colors.text.primary,
  });

  const formulaStyle = {
    display: 'block',
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    marginTop: spacing.xs,
  };

  const totalStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    background: 'rgba(212, 175, 55, 0.1)',
    border: '1px solid rgba(212, 175, 55, 0.3)',
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  };

  const totalAmountStyle = {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.gold.primary,
  };

  const growthNoteStyle = {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    margin: 0,
    textAlign: 'center',
  };

  const revenueSplitStyle = {
    padding: spacing.lg,
    background: colors.background.primary,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.md,
  };

  const splitTitleStyle = {
    margin: `0 0 ${spacing.md}`,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  };

  const splitBarsStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  };

  const splitBarStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    height: '24px',
    background: colors.background.secondary,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  };

  const splitLabelStyle = {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    paddingRight: spacing.sm,
    minWidth: '120px',
    textAlign: 'right',
  };

  const actionsStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: spacing.md,
    borderTop: `1px solid ${colors.border.primary}`,
    marginTop: spacing.lg,
  };

  // Locked: compact read-only summary
  if (isLocked) {
    return (
      <Panel
        title="Prize Pool"
        icon={Trophy}
        action={
          <Badge variant="secondary" size="sm">
            <Lock size={12} style={{ marginRight: spacing.xs }} />
            Locked
          </Badge>
        }
      >
        <div style={{ padding: spacing.xl }}>
          <div style={breakdownGridStyle}>
            <div style={breakdownItemStyle(true)}>
              <span style={placeStyle}>1st Place</span>
              <span style={amountStyle(true)}>{prizePreview.formatted.firstPrize}</span>
            </div>
          </div>
          <div style={totalStyle}>
            <span style={{ color: colors.text.secondary }}>Starting Prize Pool</span>
            <span style={totalAmountStyle}>{prizePreview.formatted.totalPrizePool}</span>
          </div>
          <p style={growthNoteStyle}>
            Winner takes all — 1st place receives the full prize pool. The pool grows as votes are purchased (50% of vote revenue is added).
          </p>
        </div>
      </Panel>
    );
  }

  // Editable: full form
  return (
    <Panel
      title="Prize Pool"
      icon={Trophy}
    >
      <div style={{ padding: spacing.xl }}>
        <p style={descStyle}>
          Set your guaranteed minimum prize pool. This is your commitment to contestants and cannot
          be changed once voting begins.
        </p>

        {/* Minimum Input */}
        <FieldLockIndicator fieldName="prize_pool_minimum" status={status}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>
              Host Minimum Contribution
              <LockIcon fieldName="prize_pool_minimum" status={status} />
            </label>
            <div style={inputContainerStyle}>
              <span style={prefixStyle}>
                <DollarSign size={16} />
              </span>
              <input
                type="number"
                min={1000}
                step={100}
                value={minimum}
                onChange={(e) => setMinimum(Number(e.target.value))}
                style={inputStyle}
              />
            </div>
            {minError && <span style={errorStyle}>{minError}</span>}
            <span style={hintStyle}>Minimum $1,000 required</span>
          </div>
        </FieldLockIndicator>

        {/* Prize Breakdown Preview */}
        <div style={breakdownContainerStyle}>
          <h4 style={breakdownTitleStyle}>
            <Info size={14} />
            Prize Breakdown Preview
          </h4>
          <p style={breakdownNoteStyle}>
            Based on your ${minimum.toLocaleString()} minimum (before vote revenue)
          </p>

          <div style={breakdownGridStyle}>
            <div style={breakdownItemStyle(true)}>
              <span style={placeStyle}>1st Place</span>
              <span style={amountStyle(true)}>{prizePreview.formatted.firstPrize}</span>
              <span style={formulaStyle}>100% of pool</span>
            </div>
          </div>

          <div style={totalStyle}>
            <span style={{ color: colors.text.secondary }}>Starting Prize Pool</span>
            <span style={totalAmountStyle}>{prizePreview.formatted.totalPrizePool}</span>
          </div>

          <p style={growthNoteStyle}>
            Winner takes all — 1st place receives the full prize pool. The pool grows as votes are purchased (50% of vote revenue is added).
          </p>
        </div>

        {/* Revenue Split Info */}
        <div style={revenueSplitStyle}>
          <h4 style={splitTitleStyle}>Revenue Split</h4>
          <div style={splitBarsStyle}>
            <div style={splitBarStyle}>
              <div
                style={{
                  width: '50%',
                  height: '100%',
                  background: colors.gold.primary,
                  borderRadius: borderRadius.sm,
                }}
              />
              <span style={splitLabelStyle}>50% Prize Pool</span>
            </div>
            <div style={splitBarStyle}>
              <div
                style={{
                  width: '30%',
                  height: '100%',
                  background: colors.status.success,
                  borderRadius: borderRadius.sm,
                }}
              />
              <span style={splitLabelStyle}>30% Host Revenue</span>
            </div>
            <div style={splitBarStyle}>
              <div
                style={{
                  width: '20%',
                  height: '100%',
                  background: colors.text.muted,
                  borderRadius: borderRadius.sm,
                }}
              />
              <span style={splitLabelStyle}>20% Platform</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div style={actionsStyle}>
          <Button
            onClick={saveChanges}
            disabled={!hasChanges() || saving || minError}
            icon={saved ? Check : null}
          >
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

export default PrizePoolSettings;
