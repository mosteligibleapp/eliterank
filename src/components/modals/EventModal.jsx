import React, { useState, useRef } from 'react';
import { Check, Loader, Image as ImageIcon } from 'lucide-react';
import { Modal, Button, Input, FormGrid } from '../ui';
import { useModalForm } from '../../hooks';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';

const INITIAL_STATE = {
  name: '',
  date: '',
  endDate: '',
  time: '',
  location: '',
  description: '',
  ticketUrl: '',
  imageUrl: '',
};

export default function EventModal({
  isOpen,
  onClose,
  event,
  onSave,
}) {
  const { form, updateField, getFormData } = useModalForm(INITIAL_STATE, event, isOpen);
  const isEditing = !!event?.id;
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleSave = () => {
    onSave(getFormData());
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;

    setUploading(true);
    try {
      const timestamp = Date.now();
      const ext = file.name.split('.').pop();
      const filename = `event-images/${timestamp}.${ext}`;

      const response = await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, {
        method: 'POST',
        body: file,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed');

      updateField('imageUrl', data.url);
    } catch (err) {
      console.error('Error uploading event image:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Event' : 'Add Event'}
      maxWidth="560px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} style={{ width: 'auto' }}>
            Cancel
          </Button>
          <Button onClick={handleSave} icon={Check} disabled={!form.name || !form.date}>
            {isEditing ? 'Save Changes' : 'Add Event'}
          </Button>
        </>
      }
    >
      {/* Image Upload */}
      <div style={{ marginBottom: spacing.lg }}>
        <label style={{
          display: 'block',
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.medium,
          color: colors.text.secondary,
          marginBottom: spacing.sm,
        }}>
          Cover Image (Optional)
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: '100%',
            height: '160px',
            borderRadius: borderRadius.lg,
            border: `2px dashed ${colors.border.light}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            overflow: 'hidden',
            background: form.imageUrl ? 'transparent' : colors.background.secondary,
            position: 'relative',
          }}
        >
          {uploading ? (
            <Loader size={28} style={{ animation: 'spin 1s linear infinite', color: colors.gold.primary }} />
          ) : form.imageUrl ? (
            <img
              src={form.imageUrl}
              alt="Event cover preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <>
              <ImageIcon size={28} style={{ color: colors.text.muted, marginBottom: spacing.xs }} />
              <span style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>
                Click to upload cover image
              </span>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleImageUpload(e.target.files[0])}
          style={{ display: 'none' }}
        />
      </div>

      <Input
        label="Event Name"
        value={form.name}
        onChange={(e) => updateField('name', e.target.value)}
        placeholder="e.g., A Valentine Vendetta"
      />

      {/* Description */}
      <div style={{ marginBottom: spacing.lg }}>
        <label style={{
          display: 'block',
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.medium,
          color: colors.text.secondary,
          marginBottom: spacing.sm,
        }}>
          Description (Optional)
        </label>
        <textarea
          value={form.description || ''}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Describe the event..."
          rows={3}
          style={{
            width: '100%',
            padding: spacing.md,
            background: colors.background.secondary,
            border: `1px solid ${colors.border.light}`,
            borderRadius: borderRadius.md,
            color: colors.text.primary,
            fontSize: typography.fontSize.base,
            fontFamily: 'inherit',
            resize: 'vertical',
            outline: 'none',
          }}
        />
      </div>

      <FormGrid>
        <Input
          label="Start Date"
          type="date"
          value={form.date}
          onChange={(e) => updateField('date', e.target.value)}
        />
        <Input
          label="End Date (Optional)"
          type="date"
          value={form.endDate}
          onChange={(e) => updateField('endDate', e.target.value)}
        />
      </FormGrid>
      <FormGrid>
        <Input
          label="Time (Optional)"
          type="time"
          value={form.time}
          onChange={(e) => updateField('time', e.target.value)}
        />
        <Input
          label="Location (Optional)"
          value={form.location}
          onChange={(e) => updateField('location', e.target.value)}
          placeholder="e.g., The Plaza Hotel"
        />
      </FormGrid>

      <Input
        label="Ticket / RSVP Link (Optional)"
        value={form.ticketUrl || ''}
        onChange={(e) => updateField('ticketUrl', e.target.value)}
        placeholder="e.g., https://eventbrite.com/..."
      />
    </Modal>
  );
}
