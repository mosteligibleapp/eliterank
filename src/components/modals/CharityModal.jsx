import React, { useMemo, useRef, useState } from 'react';
import { Check, Upload, X } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { useModalForm } from '../../hooks';
import { supabase } from '../../lib/supabase';

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
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleSave = () => {
    onSave(getFormData());
  };

  const handleRemove = () => {
    if (onRemove) onRemove();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be under 2MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `charity-logos/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      updateField('logoUrl', urlData.publicUrl);
    } catch (err) {
      console.error('Logo upload failed:', err);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = () => {
    updateField('logoUrl', '');
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
              disabled={!form.name || uploading}
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

      {/* Logo Upload */}
      <div style={{ marginBottom: spacing.lg }}>
        <label style={{ display: 'block', fontSize: typography.fontSize.base, color: colors.text.secondary, marginBottom: spacing.sm }}>
          Logo
        </label>
        {form.logoUrl ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
            padding: spacing.md,
            background: colors.background.secondary,
            borderRadius: borderRadius.md,
          }}>
            <img
              src={form.logoUrl}
              alt="Charity logo"
              style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: borderRadius.sm }}
            />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>Logo uploaded</p>
            </div>
            <button
              onClick={handleRemoveLogo}
              style={{
                background: 'transparent',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: borderRadius.md,
                color: '#ef4444',
                cursor: 'pointer',
                padding: spacing.sm,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              width: '100%',
              padding: spacing.lg,
              background: 'transparent',
              border: `2px dashed ${uploading ? colors.gold.primary : 'rgba(255,255,255,0.15)'}`,
              borderRadius: borderRadius.md,
              color: uploading ? colors.gold.primary : colors.text.secondary,
              cursor: uploading ? 'wait' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: spacing.sm,
              transition: 'border-color 0.2s, color 0.2s',
            }}
          >
            <Upload size={24} style={{ opacity: 0.7 }} />
            <span style={{ fontSize: typography.fontSize.sm }}>
              {uploading ? 'Uploading...' : 'Click to upload logo'}
            </span>
            <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
              JPG, PNG, or WebP · Max 2MB
            </span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      <Input
        label="Website URL"
        value={form.websiteUrl}
        onChange={(e) => updateField('websiteUrl', e.target.value)}
        placeholder="https://example.org"
      />
    </Modal>
  );
}
