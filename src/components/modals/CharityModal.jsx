import React, { useMemo } from 'react';
import { Check, Heart } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { useModalForm } from '../../hooks';

const INITIAL_STATE = { name: '', logoUrl: '', websiteUrl: '' };

export default function CharityModal({
  isOpen,
  onClose,
  charity,
  onSave,
  onRemove,
}) {
  const charityData = useMemo(() => {
    if (!charity) return null;
    return { ...charity };
  }, [charity]);

  const { form, updateField, getFormData } = useModalForm(INITIAL_STATE, charityData, isOpen);
  const isEditing = !!charity;

  const handleSave = () => {
    onSave(getFormData());
  };

  const handleRemove = () => {
    if (onRemove) onRemove();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Charity' : 'Add Charity'}
      maxWidth="450px"
      footer={
        <div style={{ display: 'flex', justifyContent: isEditing ? 'space-between' : 'flex-end', width: '100%', gap: spacing.md }}>
          {isEditing && (
            <Button
              variant="secondary"
              onClick={handleRemove}
              style={{ width: 'auto', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
            >
              Remove
            </Button>
          )}
          <div style={{ display: 'flex', gap: spacing.md }}>
            <Button variant="secondary" onClick={onClose} style={{ width: 'auto' }}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              icon={Check}
              disabled={!form.name}
            >
              {isEditing ? 'Save Changes' : 'Add Charity'}
            </Button>
          </div>
        </div>
      }
    >
      <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, marginBottom: spacing.lg }}>
        Highlight a charity that benefits from a portion of competition proceeds. This will be displayed on the public competition page.
      </p>
      <Input
        label="Charity Name"
        value={form.name}
        onChange={(e) => updateField('name', e.target.value)}
        placeholder="e.g., Chicago Community Foundation"
      />
      <Input
        label="Logo URL"
        value={form.logoUrl}
        onChange={(e) => updateField('logoUrl', e.target.value)}
        placeholder="https://example.com/logo.png"
      />
      {form.logoUrl && (
        <div style={{
          marginBottom: spacing.lg,
          padding: spacing.md,
          background: colors.background.secondary,
          borderRadius: borderRadius.md,
          textAlign: 'center',
        }}>
          <img
            src={form.logoUrl}
            alt="Charity logo preview"
            style={{ maxWidth: 120, maxHeight: 60, objectFit: 'contain' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      )}
      <Input
        label="Website URL"
        value={form.websiteUrl}
        onChange={(e) => updateField('websiteUrl', e.target.value)}
        placeholder="https://example.org"
      />
    </Modal>
  );
}
