import React, { useMemo, useRef, useState } from 'react';
import { Check, Camera, Loader, X } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { useModalForm } from '../../hooks';

const INITIAL_STATE = {
  title: '',
  sponsorName: '',
  description: '',
  imageUrl: '',
  value: '',
  externalUrl: '',
};

export default function PrizeModal({
  isOpen,
  onClose,
  prize,
  onSave,
  prizeType = 'winner',
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const prizeData = useMemo(() => {
    if (!prize) return null;
    return {
      title: prize.title || '',
      sponsorName: prize.sponsorName || '',
      description: prize.description || '',
      imageUrl: prize.imageUrl || '',
      value: prize.value?.toString() || '',
      externalUrl: prize.externalUrl || '',
    };
  }, [prize]);

  const { form, updateField, getFormData } = useModalForm(INITIAL_STATE, prizeData, isOpen);
  const isEditing = !!prize;

  const uploadImage = async (file) => {
    if (!file) return null;

    const maxSize = 4.5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Image too large. Please choose an image under 4.5MB.');
      return null;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return null;
    }

    try {
      const timestamp = Date.now();
      const ext = file.name.split('.').pop();
      const filename = `prizes/${timestamp}.${ext}`;

      const response = await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, {
        method: 'POST',
        body: file,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      return data.url;
    } catch (error) {
      alert(`Upload failed: ${error.message}. Please try again.`);
      return null;
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const url = await uploadImage(file);
    if (url) {
      updateField('imageUrl', url);
    }
    setUploading(false);
  };

  const handleClearImage = () => {
    updateField('imageUrl', '');
  };

  const handleSave = () => {
    const data = getFormData();
    data.prizeType = prize?.prizeType || prizeType;
    onSave(data);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Prize' : `Add ${prizeType === 'contestant' ? 'Contestant Reward' : 'Winner Prize'}`}
      maxWidth="500px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} style={{ width: 'auto' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            icon={Check}
            disabled={!form.title}
          >
            {isEditing ? 'Save Changes' : 'Add Prize'}
          </Button>
        </>
      }
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: 'none' }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.lg }}>
          <Input
            label="Prize Title *"
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="e.g., Diamond Necklace"
          />
          <Input
            label="Brand / Sponsor Name"
            value={form.sponsorName}
            onChange={(e) => updateField('sponsorName', e.target.value)}
            placeholder="e.g., Kay Jewelers"
          />
        </div>

        {/* Prize Image Upload */}
        <div>
          <label style={{
            display: 'block',
            fontSize: typography.fontSize.sm,
            color: colors.text.secondary,
            marginBottom: spacing.sm,
          }}>
            Prize Image
          </label>
          <div style={{ display: 'flex', gap: spacing.md, alignItems: 'flex-start' }}>
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              style={{
                width: '100px',
                height: '100px',
                borderRadius: borderRadius.lg,
                background: form.imageUrl
                  ? `url(${form.imageUrl}) center/cover`
                  : colors.background.secondary,
                border: `2px dashed ${colors.border.light}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: uploading ? 'wait' : 'pointer',
                position: 'relative',
                flexShrink: 0,
              }}
            >
              {uploading ? (
                <>
                  <Loader size={20} style={{ color: colors.gold.primary, animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary, marginTop: spacing.xs }}>
                    Uploading...
                  </span>
                </>
              ) : form.imageUrl ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearImage();
                  }}
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    width: '24px',
                    height: '24px',
                    background: 'rgba(239, 68, 68, 0.9)',
                    border: 'none',
                    borderRadius: borderRadius.full,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#fff',
                  }}
                >
                  <X size={14} />
                </button>
              ) : (
                <>
                  <Camera size={20} style={{ color: colors.text.secondary }} />
                  <span style={{ fontSize: '10px', color: colors.text.secondary, marginTop: spacing.xs }}>
                    Upload
                  </span>
                </>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <Input
                label="Or enter image URL"
                value={form.imageUrl}
                onChange={(e) => updateField('imageUrl', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: typography.fontSize.sm,
            color: colors.text.secondary,
            marginBottom: spacing.sm,
          }}>
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Describe the prize..."
            rows={3}
            style={{
              width: '100%',
              padding: spacing.md,
              background: colors.background.secondary,
              border: `1px solid ${colors.border.light}`,
              borderRadius: borderRadius.md,
              color: colors.text.primary,
              fontSize: typography.fontSize.md,
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.lg }}>
          <Input
            label="Value ($)"
            value={form.value}
            onChange={(e) => updateField('value', e.target.value)}
            placeholder="e.g., 500"
          />
          <Input
            label="Link URL"
            value={form.externalUrl}
            onChange={(e) => updateField('externalUrl', e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Modal>
  );
}
