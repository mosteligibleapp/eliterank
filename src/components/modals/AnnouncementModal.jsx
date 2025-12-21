import React, { useState, useEffect } from 'react';
import { Check, Sparkles, FileText, MapPin } from 'lucide-react';
import { Modal, Button, Input, Textarea } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { ANNOUNCEMENT_TYPES } from '../../constants';

export default function AnnouncementModal({
  isOpen,
  onClose,
  announcement,
  onSave,
}) {
  const [form, setForm] = useState({ type: 'announcement', title: '', content: '', pinned: false });
  const isEditing = !!announcement;

  useEffect(() => {
    if (announcement) {
      setForm({
        type: announcement.type || 'announcement',
        title: announcement.title || '',
        content: announcement.content || '',
        pinned: announcement.pinned || false,
      });
    } else {
      setForm({ type: 'announcement', title: '', content: '', pinned: false });
    }
  }, [announcement, isOpen]);

  const handleSave = () => {
    onSave(form);
    setForm({ type: 'announcement', title: '', content: '', pinned: false });
  };

  const typeConfig = {
    announcement: { icon: Sparkles, color: colors.gold.primary },
    update: { icon: Check, color: colors.status.success },
    news: { icon: FileText, color: colors.status.info },
  };

  const typeButtonStyle = (type, isSelected) => {
    const config = typeConfig[type];
    return {
      flex: 1,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      border: 'none',
      background: isSelected ? `${config.color}20` : 'rgba(255,255,255,0.05)',
      color: isSelected ? config.color : colors.text.secondary,
      fontWeight: typography.fontWeight.semibold,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      fontSize: typography.fontSize.base,
      transition: 'all 0.2s',
    };
  };

  const toggleStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    background: form.pinned ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    border: form.pinned ? `1px solid rgba(212,175,55,0.2)` : `1px solid ${colors.border.lighter}`,
    cursor: 'pointer',
  };

  const switchStyle = {
    width: '44px',
    height: '24px',
    borderRadius: borderRadius.lg,
    background: form.pinned ? colors.gold.primary : 'rgba(255,255,255,0.1)',
    position: 'relative',
    transition: 'all 0.2s',
  };

  const switchDotStyle = {
    width: '20px',
    height: '20px',
    borderRadius: borderRadius.full,
    background: '#fff',
    position: 'absolute',
    top: '2px',
    left: form.pinned ? '22px' : '2px',
    transition: 'all 0.2s',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Announcement' : 'Create Announcement'}
      maxWidth="550px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.base }}>
            This will be visible on the public Announcements page
          </p>
          <div style={{ display: 'flex', gap: spacing.md }}>
            <Button variant="secondary" onClick={onClose} style={{ width: 'auto' }}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              icon={Check}
              disabled={!form.title || !form.content}
            >
              {isEditing ? 'Save Changes' : 'Publish'}
            </Button>
          </div>
        </div>
      }
    >
      {/* Post Type Selector */}
      <div style={{ marginBottom: spacing.lg }}>
        <label style={{ display: 'block', fontSize: typography.fontSize.base, color: colors.text.secondary, marginBottom: spacing.sm }}>
          Post Type
        </label>
        <div style={{ display: 'flex', gap: spacing.md }}>
          {ANNOUNCEMENT_TYPES.map((type) => {
            const Icon = typeConfig[type.value].icon;
            return (
              <button
                key={type.value}
                onClick={() => setForm({ ...form, type: type.value })}
                style={typeButtonStyle(type.value, form.type === type.value)}
              >
                <Icon size={14} /> {type.label}
              </button>
            );
          })}
        </div>
      </div>

      <Input
        label="Title"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder="e.g., Exciting News About Round 2!"
      />

      <Textarea
        label="Content"
        value={form.content}
        onChange={(e) => setForm({ ...form, content: e.target.value })}
        placeholder="Write your announcement here..."
        rows={5}
        maxLength={500}
        showCount
      />

      {/* Pin Option */}
      <div
        style={toggleStyle}
        onClick={() => setForm({ ...form, pinned: !form.pinned })}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <MapPin size={18} style={{ color: form.pinned ? colors.gold.primary : colors.text.secondary }} />
          <div>
            <p style={{ fontWeight: typography.fontWeight.medium, color: form.pinned ? colors.gold.primary : '#fff', fontSize: typography.fontSize.md }}>
              Pin to top
            </p>
            <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
              Pinned posts appear first in the feed
            </p>
          </div>
        </div>
        <div style={switchStyle}>
          <div style={switchDotStyle} />
        </div>
      </div>
    </Modal>
  );
}
