import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Crown, Pencil, X, Check } from 'lucide-react';
import { FieldLockIndicator, LockIcon } from './FieldLockIndicator';
import { EditWarningModal } from './EditWarningModal';
import { isFieldEditable, checkFieldsForWarning } from '../../../../utils/fieldEditability';
import { getCompetitionDefaults } from '../../../../utils/competitionDefaults';
import { supabase } from '../../../../lib/supabase';
import { colors, spacing, borderRadius, typography } from '../../../../styles/theme';
import { Button, Panel } from '../../../../components/ui';
import { useToast } from '../../../../contexts/ToastContext';

/**
 * About section editor for host dashboard
 * Edits description, traits, age range, requirement
 *
 * @param {object} competition - Competition object
 * @param {object} organization - Organization object with defaults
 * @param {function} onSave - Callback when save completes
 */
export function AboutSectionEditor({ competition, organization, onSave }) {
  const toast = useToast();
  const status = competition?.status || 'draft';

  // Compute template-based defaults from competition context
  const defaults = useMemo(() => getCompetitionDefaults(competition), [competition]);

  // Form state
  const [description, setDescription] = useState('');
  const [traits, setTraits] = useState(['', '', '', '']);
  const [ageRange, setAgeRange] = useState('');
  const [requirement, setRequirement] = useState('');

  // UI state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [warningModal, setWarningModal] = useState({ open: false, field: null });
  const [pendingChanges, setPendingChanges] = useState(null);

  // Load the form from the competition, prefilling every field with the
  // auto-generated value (built from the org name, competition name, territory &
  // demographic on file) when the host hasn't set their own yet — so the section
  // reads as fully filled-in and one Save persists it. Saved values always win.
  // Reused on mount and to revert an in-progress edit on Cancel.
  const loadFromSource = useCallback(() => {
    if (!competition) return;
    setDescription(competition.about_description || defaults.description || '');
    setTraits(
      competition.about_traits?.length
        ? [...competition.about_traits, '', '', '', ''].slice(0, 4)
        : [...(defaults.traits || []), '', '', '', ''].slice(0, 4)
    );
    setAgeRange(competition.about_age_range || defaults.ageRange || '');
    setRequirement(competition.about_requirement || defaults.requirement || '');
  }, [competition, defaults]);

  useEffect(() => { loadFromSource(); }, [loadFromSource]);

  // Check if form has changes vs. what's saved on the competition.
  const hasChanges = () => {
    if (!competition) return false;

    const currentTraits = traits.filter((t) => t.trim());
    const originalTraits = competition.about_traits || [];

    return (
      description !== (competition.about_description || '') ||
      JSON.stringify(currentTraits) !== JSON.stringify(originalTraits) ||
      ageRange !== (competition.about_age_range || '') ||
      requirement !== (competition.about_requirement || '')
    );
  };

  // Discard in-progress edits and leave edit mode.
  const handleCancel = () => {
    loadFromSource();
    setEditing(false);
  };

  // Update single trait
  const updateTrait = (index, value) => {
    const newTraits = [...traits];
    newTraits[index] = value;
    setTraits(newTraits);
  };

  // Save changes
  const saveChanges = async (confirmedFields = []) => {
    if (!competition?.id) return;

    // Build update object with only changed fields
    const updates = {};
    const changedFields = [];

    // Only persist a field if it's editable in the current phase — the inputs
    // are disabled when locked, but we also prefill them with defaults, so guard
    // the save so a locked field (e.g. age range / requirement after submit)
    // can't be written by the prefill.
    const canEdit = (field) => isFieldEditable(field, status) !== false;

    if (canEdit('about_description') && description !== (competition.about_description || '')) {
      updates.about_description = description || null;
      changedFields.push('about_description');
    }

    const cleanTraits = traits.filter((t) => t.trim());
    if (canEdit('about_traits') && JSON.stringify(cleanTraits) !== JSON.stringify(competition.about_traits || [])) {
      updates.about_traits = cleanTraits.length > 0 ? cleanTraits : null;
      changedFields.push('about_traits');
    }

    if (canEdit('about_age_range') && ageRange !== (competition.about_age_range || organization?.default_age_range || '')) {
      updates.about_age_range = ageRange || null;
      changedFields.push('about_age_range');
    }
    if (canEdit('about_requirement') && requirement !== (competition.about_requirement || organization?.default_requirement || '')) {
      updates.about_requirement = requirement || null;
      changedFields.push('about_requirement');
    }

    // Check for fields that need warning confirmation
    const needsWarning = checkFieldsForWarning(changedFields, status);
    const unconfirmedWarnings = needsWarning.filter((f) => !confirmedFields.includes(f));

    if (unconfirmedWarnings.length > 0) {
      // Show warning modal for first unconfirmed field
      setPendingChanges({ updates, changedFields, confirmedFields });
      setWarningModal({ open: true, field: unconfirmedWarnings[0] });
      return;
    }

    // All warnings confirmed, proceed with save
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
      setEditing(false);
      toast.success('About section saved — it’s live on your competition page');

      // Refresh competition data
      if (onSave) onSave();
    } catch (err) {
      console.error('Error saving about section:', err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
      setPendingChanges(null);
    }
  };

  // Handle warning modal confirm
  const handleWarningConfirm = () => {
    setWarningModal({ open: false, field: null });

    if (pendingChanges) {
      const newConfirmed = [...(pendingChanges.confirmedFields || []), warningModal.field];
      saveChanges(newConfirmed);
    }
  };

  // Handle warning modal cancel
  const handleWarningCancel = () => {
    setWarningModal({ open: false, field: null });
    setPendingChanges(null);
  };

  // Get placeholder from org defaults or computed template defaults
  const getPlaceholder = (field) => {
    switch (field) {
      case 'description':
        return organization?.default_about_description || defaults.description;
      case 'ageRange':
        return organization?.default_age_range || defaults.ageRange;
      case 'requirement':
        return organization?.default_requirement || defaults.requirement;
      default:
        return '';
    }
  };

  // Styles
  const sectionHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  };

  const sectionTitleStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  };

  const descStyle = {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    margin: `0 0 ${spacing.lg}`,
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

  const inputStyle = {
    width: '100%',
    padding: `${spacing.sm} ${spacing.md}`,
    background: 'rgba(255, 255, 255, 0.05)',
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.lg,
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const textareaStyle = {
    ...inputStyle,
    resize: 'none',
    minHeight: '80px',
    fontFamily: 'inherit',
  };

  const hintStyle = {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    marginTop: spacing.xs,
  };

  const traitsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: spacing.sm,
  };

  const traitInputStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  };

  const traitNumberStyle = {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: colors.background.tertiary,
    borderRadius: '50%',
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    flexShrink: 0,
  };

  const formRowStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.md,
  };

  const actionsStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTop: `1px solid ${colors.border.primary}`,
    marginTop: spacing.lg,
  };

  // Read-only display (view mode) styles.
  const readValueStyle = {
    margin: 0,
    padding: `${spacing.sm} ${spacing.md}`,
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid ${colors.border.lighter}`,
    borderRadius: borderRadius.lg,
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    lineHeight: 1.5,
  };
  const chipStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: `${spacing.xs} ${spacing.md}`,
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${colors.border.lighter}`,
    borderRadius: '999px',
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  };
  const editBtnStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    background: 'transparent',
    border: 'none',
    color: colors.gold.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
  };
  const notSet = <span style={{ color: colors.text.muted }}>Not set</span>;

  return (
    <Panel
      title="About Section"
      icon={Crown}
      action={
        !editing ? (
          <button onClick={() => setEditing(true)} style={editBtnStyle}>
            <Pencil size={14} />
            Edit
          </button>
        ) : null
      }
    >
      <div style={{ padding: spacing.xl }}>
        <p style={descStyle}>
          {editing
            ? 'Customize how your competition appears on the public page.'
            : 'This is how your competition appears on the public page.'}
        </p>

        {editing ? (
          <>
            {/* Description */}
            <FieldLockIndicator fieldName="about_description" status={status}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>
                  Description
                  <LockIcon fieldName="about_description" status={status} />
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={getPlaceholder('description')}
                  rows={3}
                  maxLength={500}
                  disabled={isFieldEditable('about_description', status) === false}
                  style={textareaStyle}
                />
                <span style={hintStyle}>What makes this competition special? (max 500 characters)</span>
              </div>
            </FieldLockIndicator>

            {/* Who Competes - Traits */}
            <FieldLockIndicator fieldName="about_traits" status={status}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>
                  Who Competes?
                  <LockIcon fieldName="about_traits" status={status} />
                </label>
                <div style={traitsGridStyle}>
                  {traits.map((trait, index) => (
                    <div key={index} style={traitInputStyle}>
                      <span style={traitNumberStyle}>{index + 1}</span>
                      <input
                        type="text"
                        value={trait}
                        onChange={(e) => updateTrait(index, e.target.value)}
                        placeholder={defaults.traits[index] || `Trait ${index + 1}`}
                        maxLength={50}
                        disabled={isFieldEditable('about_traits', status) === false}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                    </div>
                  ))}
                </div>
                <span style={hintStyle}>4 traits that describe your ideal contestants</span>
              </div>
            </FieldLockIndicator>

            {/* Age Range & Requirement Row */}
            <div style={formRowStyle}>
              <FieldLockIndicator fieldName="about_age_range" status={status}>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>
                    Age Range
                    <LockIcon fieldName="about_age_range" status={status} />
                  </label>
                  <input
                    type="text"
                    value={ageRange}
                    onChange={(e) => setAgeRange(e.target.value)}
                    placeholder={getPlaceholder('ageRange')}
                    maxLength={20}
                    disabled={isFieldEditable('about_age_range', status) === false}
                    style={inputStyle}
                  />
                </div>
              </FieldLockIndicator>

              <FieldLockIndicator fieldName="about_requirement" status={status}>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>
                    Key Requirement
                    <LockIcon fieldName="about_requirement" status={status} />
                  </label>
                  <input
                    type="text"
                    value={requirement}
                    onChange={(e) => setRequirement(e.target.value)}
                    placeholder={getPlaceholder('requirement')}
                    maxLength={50}
                    disabled={isFieldEditable('about_requirement', status) === false}
                    style={inputStyle}
                  />
                </div>
              </FieldLockIndicator>
            </div>

            {/* Save / Cancel */}
            <div style={actionsStyle}>
              <Button variant="secondary" icon={X} onClick={handleCancel} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={() => saveChanges([])} disabled={!hasChanges() || saving} icon={saved ? Check : null}>
                {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Read-only view */}
            <div style={formGroupStyle}>
              <label style={labelStyle}>Description</label>
              <p style={readValueStyle}>{description || notSet}</p>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Who Competes?</label>
              {traits.filter((t) => t.trim()).length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
                  {traits.filter((t) => t.trim()).map((t, i) => (
                    <span key={i} style={chipStyle}>{t}</span>
                  ))}
                </div>
              ) : (
                <p style={readValueStyle}>{notSet}</p>
              )}
            </div>

            <div style={formRowStyle}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>
                  Age Range
                  <LockIcon fieldName="about_age_range" status={status} />
                </label>
                <p style={readValueStyle}>{ageRange || notSet}</p>
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>
                  Key Requirement
                  <LockIcon fieldName="about_requirement" status={status} />
                </label>
                <p style={readValueStyle}>{requirement || notSet}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Warning Modal */}
      <EditWarningModal
        isOpen={warningModal.open}
        fieldName={warningModal.field}
        onConfirm={handleWarningConfirm}
        onCancel={handleWarningCancel}
      />
    </Panel>
  );
}

export default AboutSectionEditor;
