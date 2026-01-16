import React, { useState, useEffect } from 'react';
import { Palette, RotateCcw, Check, Eye, EyeOff } from 'lucide-react';
import { FieldLockIndicator, LockIcon } from './FieldLockIndicator';
import { EditWarningModal } from './EditWarningModal';
import { isFieldEditable, checkFieldsForWarning } from '../../../../utils/fieldEditability';
import { supabase } from '../../../../lib/supabase';
import { colors, spacing, borderRadius, typography } from '../../../../styles/theme';
import { useResponsive } from '../../../../hooks/useResponsive';
import { Button, Panel } from '../../../../components/ui';
import { useToast } from '../../../../contexts/ToastContext';

/**
 * Theme color editor for host dashboard
 * Allows customization of primary, voting, and resurrection colors
 *
 * @param {object} competition - Competition object
 * @param {object} organization - Organization object with defaults
 * @param {function} onSave - Callback when save completes
 */
export function ThemeEditor({ competition, organization, onSave }) {
  const toast = useToast();
  const { isMobile } = useResponsive();
  const status = competition?.status || 'draft';

  // Default colors
  const defaults = {
    primary: organization?.default_theme_primary || '#d4af37',
    voting: organization?.default_theme_voting || '#f472b6',
    resurrection: organization?.default_theme_resurrection || '#8b5cf6',
  };

  // Form state
  const [primaryColor, setPrimaryColor] = useState(defaults.primary);
  const [votingColor, setVotingColor] = useState(defaults.voting);
  const [resurrectionColor, setResurrectionColor] = useState(defaults.resurrection);

  // UI state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [warningModal, setWarningModal] = useState({ open: false, field: null });
  const [pendingChanges, setPendingChanges] = useState(null);

  // Initialize form
  useEffect(() => {
    if (competition) {
      setPrimaryColor(competition.theme_primary || defaults.primary);
      setVotingColor(competition.theme_voting || defaults.voting);
      setResurrectionColor(competition.theme_resurrection || defaults.resurrection);
    }
  }, [competition, defaults.primary, defaults.voting, defaults.resurrection]);

  // Check for changes
  const hasChanges = () => {
    if (!competition) return false;
    return (
      primaryColor !== (competition.theme_primary || defaults.primary) ||
      votingColor !== (competition.theme_voting || defaults.voting) ||
      resurrectionColor !== (competition.theme_resurrection || defaults.resurrection)
    );
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setPrimaryColor(defaults.primary);
    setVotingColor(defaults.voting);
    setResurrectionColor(defaults.resurrection);
  };

  // Save changes
  const saveChanges = async (confirmedFields = []) => {
    if (!competition?.id) return;

    const updates = {};
    const changedFields = [];

    if (primaryColor !== (competition.theme_primary || defaults.primary)) {
      updates.theme_primary = primaryColor;
      changedFields.push('theme_primary');
    }
    if (votingColor !== (competition.theme_voting || defaults.voting)) {
      updates.theme_voting = votingColor;
      changedFields.push('theme_voting');
    }
    if (resurrectionColor !== (competition.theme_resurrection || defaults.resurrection)) {
      updates.theme_resurrection = resurrectionColor;
      changedFields.push('theme_resurrection');
    }

    // Check for warnings
    const needsWarning = checkFieldsForWarning(changedFields, status);
    const unconfirmedWarnings = needsWarning.filter((f) => !confirmedFields.includes(f));

    if (unconfirmedWarnings.length > 0) {
      setPendingChanges({ updates, changedFields, confirmedFields });
      setWarningModal({ open: true, field: unconfirmedWarnings[0] });
      return;
    }

    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('competitions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', competition.id);

      if (updateError) throw updateError;

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success('Theme colors saved');

      if (onSave) onSave();
    } catch (err) {
      console.error('Error saving theme:', err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
      setPendingChanges(null);
    }
  };

  const handleWarningConfirm = () => {
    setWarningModal({ open: false, field: null });
    if (pendingChanges) {
      const newConfirmed = [...(pendingChanges.confirmedFields || []), warningModal.field];
      saveChanges(newConfirmed);
    }
  };

  const handleWarningCancel = () => {
    setWarningModal({ open: false, field: null });
    setPendingChanges(null);
  };

  // Styles
  const descStyle = {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    margin: `0 0 ${spacing.lg}`,
  };

  const colorEditorsStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
    gap: spacing.lg,
  };

  const colorEditorStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  };

  const labelStyle = {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    color: colors.text.secondary,
  };

  const colorInputGroupStyle = {
    display: 'flex',
    gap: spacing.xs,
  };

  const colorPickerStyle = {
    width: '48px',
    height: '44px', // Touch-friendly
    padding: '2px',
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    background: 'transparent',
  };

  const colorTextInputStyle = {
    flex: 1,
    padding: spacing.md,
    fontFamily: typography.fontFamily.mono,
    fontSize: '16px', // Prevents iOS zoom
    background: 'rgba(255, 255, 255, 0.05)',
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.md,
    color: colors.text.primary,
    outline: 'none',
    minHeight: '44px', // Touch-friendly
  };

  const usageStyle = {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  };

  const previewContainerStyle = {
    padding: spacing.lg,
    background: colors.background.primary,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  };

  const previewTitleStyle = {
    margin: `0 0 ${spacing.md}`,
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  };

  const previewSamplesStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
  };

  const actionsStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: spacing.md,
    borderTop: `1px solid ${colors.border.primary}`,
    marginTop: spacing.lg,
  };

  return (
    <Panel
      title="Theme Colors"
      icon={Palette}
      action={
        <div style={{ display: 'flex', gap: spacing.sm }}>
          <button
            onClick={() => setShowPreview(!showPreview)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              background: 'transparent',
              border: 'none',
              color: colors.text.secondary,
              fontSize: typography.fontSize.sm,
              cursor: 'pointer',
            }}
          >
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPreview ? 'Hide Preview' : 'Preview'}
          </button>
          <button
            onClick={resetToDefaults}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              background: 'transparent',
              border: 'none',
              color: colors.text.secondary,
              fontSize: typography.fontSize.sm,
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={14} />
            Reset
          </button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
        <p style={descStyle}>Customize the color scheme for your public competition page.</p>

        <div style={colorEditorsStyle}>
          {/* Primary Color */}
          <FieldLockIndicator fieldName="theme_primary" status={status}>
            <div style={colorEditorStyle}>
              <label style={labelStyle}>
                Primary (Gold)
                <LockIcon fieldName="theme_primary" status={status} />
              </label>
              <div style={colorInputGroupStyle}>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  disabled={isFieldEditable('theme_primary', status) === false}
                  style={colorPickerStyle}
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#d4af37"
                  maxLength={7}
                  disabled={isFieldEditable('theme_primary', status) === false}
                  style={colorTextInputStyle}
                />
              </div>
              <span style={usageStyle}>Headlines, CTAs, prize highlights</span>
            </div>
          </FieldLockIndicator>

          {/* Voting Color */}
          <FieldLockIndicator fieldName="theme_voting" status={status}>
            <div style={colorEditorStyle}>
              <label style={labelStyle}>
                Voting (Pink)
                <LockIcon fieldName="theme_voting" status={status} />
              </label>
              <div style={colorInputGroupStyle}>
                <input
                  type="color"
                  value={votingColor}
                  onChange={(e) => setVotingColor(e.target.value)}
                  disabled={isFieldEditable('theme_voting', status) === false}
                  style={colorPickerStyle}
                />
                <input
                  type="text"
                  value={votingColor}
                  onChange={(e) => setVotingColor(e.target.value)}
                  placeholder="#f472b6"
                  maxLength={7}
                  disabled={isFieldEditable('theme_voting', status) === false}
                  style={colorTextInputStyle}
                />
              </div>
              <span style={usageStyle}>Vote buttons, Round 1 & 2 accents</span>
            </div>
          </FieldLockIndicator>

          {/* Resurrection Color */}
          <FieldLockIndicator fieldName="theme_resurrection" status={status}>
            <div style={colorEditorStyle}>
              <label style={labelStyle}>
                Resurrection (Purple)
                <LockIcon fieldName="theme_resurrection" status={status} />
              </label>
              <div style={colorInputGroupStyle}>
                <input
                  type="color"
                  value={resurrectionColor}
                  onChange={(e) => setResurrectionColor(e.target.value)}
                  disabled={isFieldEditable('theme_resurrection', status) === false}
                  style={colorPickerStyle}
                />
                <input
                  type="text"
                  value={resurrectionColor}
                  onChange={(e) => setResurrectionColor(e.target.value)}
                  placeholder="#8b5cf6"
                  maxLength={7}
                  disabled={isFieldEditable('theme_resurrection', status) === false}
                  style={colorTextInputStyle}
                />
              </div>
              <span style={usageStyle}>Resurrection round theming</span>
            </div>
          </FieldLockIndicator>
        </div>

        {/* Preview */}
        {showPreview && (
          <div style={previewContainerStyle}>
            <h4 style={previewTitleStyle}>Preview</h4>
            <div style={previewSamplesStyle}>
              {/* Card Preview */}
              <div
                style={{
                  padding: spacing.md,
                  border: `2px solid ${primaryColor}`,
                  borderRadius: borderRadius.md,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    display: 'inline-block',
                    padding: `${spacing.xs} ${spacing.sm}`,
                    borderRadius: borderRadius.sm,
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.bold,
                    color: '#000',
                    background: primaryColor,
                    marginBottom: spacing.sm,
                  }}
                >
                  1st Place
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span
                    style={{
                      fontFamily: typography.fontFamily.mono,
                      fontSize: typography.fontSize.lg,
                      fontWeight: typography.fontWeight.bold,
                      color: primaryColor,
                    }}
                  >
                    $2,500
                  </span>
                  <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                    Prize Amount
                  </span>
                </div>
              </div>

              {/* Vote Button Preview */}
              <button
                style={{
                  padding: `${spacing.sm} ${spacing.lg}`,
                  background: votingColor,
                  color: '#000',
                  border: 'none',
                  borderRadius: borderRadius.md,
                  fontWeight: typography.fontWeight.semibold,
                  cursor: 'pointer',
                }}
              >
                Vote Now
              </button>

              {/* Resurrection Badge Preview */}
              <div
                style={{
                  padding: `${spacing.xs} ${spacing.sm}`,
                  background: `${resurrectionColor}20`,
                  border: `1px solid ${resurrectionColor}`,
                  borderRadius: borderRadius.pill,
                  fontSize: typography.fontSize.xs,
                  color: resurrectionColor,
                }}
              >
                Resurrection Round
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div style={actionsStyle}>
          <Button onClick={() => saveChanges([])} disabled={!hasChanges() || saving} icon={saved ? Check : null}>
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <EditWarningModal
        isOpen={warningModal.open}
        fieldName={warningModal.field}
        onConfirm={handleWarningConfirm}
        onCancel={handleWarningCancel}
      />
    </Panel>
  );
}

export default ThemeEditor;
