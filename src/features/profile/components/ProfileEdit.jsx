import React from 'react';
import { Edit, User, FileText, Globe, Heart, Camera, Save, Plus } from 'lucide-react';
import { Button, Input, Textarea, FormSection, FormGrid, HobbySelector } from '../../../components/ui';
import { colors, spacing, borderRadius, typography, gradients } from '../../../styles/theme';
import { ALL_HOBBIES, MAX_HOBBIES } from '../../../constants';

export default function ProfileEdit({ hostProfile, onSave, onCancel, onChange }) {
  if (!hostProfile) return null;
  const initials = `${(hostProfile.firstName || '?')[0]}${(hostProfile.lastName || '?')[0]}`;

  const handleFieldChange = (field, value) => {
    onChange({ ...hostProfile, [field]: value });
  };

  const handleHobbiesChange = (hobbies) => {
    onChange({ ...hostProfile, hobbies });
  };

  return (
    <div>
      {/* Edit Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.xxl,
          padding: spacing.xl,
          background: colors.background.card,
          border: `1px solid ${colors.border.light}`,
          borderRadius: borderRadius.xl,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <Edit size={24} style={{ color: colors.gold.primary }} />
          <div>
            <h2 style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.semibold }}>
              Edit Profile
            </h2>
            <p style={{ fontSize: typography.fontSize.base, color: colors.text.secondary }}>
              Update your public host profile
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: spacing.md }}>
          <Button variant="secondary" onClick={onCancel} style={{ width: 'auto' }}>
            Cancel
          </Button>
          <Button onClick={onSave} icon={Save}>
            Save Changes
          </Button>
        </div>
      </div>

      {/* Cover & Avatar */}
      <div
        style={{
          background: colors.background.card,
          border: `1px solid ${colors.border.light}`,
          borderRadius: borderRadius.xxl,
          overflow: 'hidden',
          marginBottom: spacing.xl,
        }}
      >
        <div
          style={{
            height: '180px',
            background: gradients.cover,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                margin: '0 auto 12px',
                borderRadius: borderRadius.full,
                background: 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Camera size={24} style={{ color: colors.text.secondary }} />
            </div>
            <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.md }}>Upload Cover Image</p>
            <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>Recommended: 1500 x 400px</p>
          </div>
          <button
            style={{
              position: 'absolute',
              bottom: spacing.lg,
              right: spacing.lg,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              padding: `${spacing.sm} ${spacing.lg}`,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: borderRadius.sm,
              fontSize: typography.fontSize.base,
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            <Camera size={16} /> Change Cover
          </button>
        </div>
        <div style={{ padding: `0 ${spacing.xxl} ${spacing.xxl}`, marginTop: '-48px' }}>
          <div style={{ display: 'flex', gap: spacing.xl, alignItems: 'flex-end' }}>
            <div
              style={{
                width: '120px',
                height: '120px',
                borderRadius: borderRadius.xxl,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))',
                border: '4px solid #1a1a24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                fontWeight: typography.fontWeight.semibold,
                color: colors.gold.primary,
                position: 'relative',
              }}
            >
              {initials}
              <button
                style={{
                  position: 'absolute',
                  bottom: '-8px',
                  right: '-8px',
                  width: '36px',
                  height: '36px',
                  background: colors.gold.primary,
                  borderRadius: borderRadius.md,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0a0a0f',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                <Camera size={16} />
              </button>
            </div>
            <div style={{ paddingBottom: spacing.sm }}>
              <h2 style={{ fontSize: typography.fontSize.xxxl, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.xs }}>
                {hostProfile.firstName} {hostProfile.lastName}
              </h2>
              <p style={{ color: colors.text.secondary, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                {hostProfile.city}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Info Form */}
      <FormSection title="Personal Information" icon={User}>
        <FormGrid>
          <Input
            label="First Name"
            value={hostProfile.firstName}
            onChange={(e) => handleFieldChange('firstName', e.target.value)}
          />
          <Input
            label="Last Name"
            value={hostProfile.lastName}
            onChange={(e) => handleFieldChange('lastName', e.target.value)}
          />
          <Input
            label="City"
            value={hostProfile.city}
            onChange={(e) => handleFieldChange('city', e.target.value)}
          />
        </FormGrid>
      </FormSection>

      {/* Bio Form */}
      <FormSection title="Bio" icon={FileText}>
        <Textarea
          value={hostProfile.bio}
          onChange={(e) => handleFieldChange('bio', e.target.value)}
          maxLength={500}
          showCount
          rows={4}
        />
      </FormSection>

      {/* Social Media Form */}
      <FormSection title="Social Media" icon={Globe}>
        <FormGrid>
          <Input
            label="Instagram"
            value={hostProfile.instagram}
            onChange={(e) => handleFieldChange('instagram', e.target.value)}
            placeholder="@username"
          />
          <Input
            label="Twitter / X"
            value={hostProfile.twitter}
            onChange={(e) => handleFieldChange('twitter', e.target.value)}
            placeholder="@username"
          />
          <Input
            label="LinkedIn"
            value={hostProfile.linkedin}
            onChange={(e) => handleFieldChange('linkedin', e.target.value)}
            placeholder="username"
          />
          <Input
            label="TikTok"
            value={hostProfile.tiktok}
            onChange={(e) => handleFieldChange('tiktok', e.target.value)}
            placeholder="@username"
          />
        </FormGrid>
      </FormSection>

      {/* Hobbies Selection */}
      <FormSection title="Hobbies & Interests" icon={Heart}>
        <HobbySelector
          hobbies={ALL_HOBBIES}
          selected={hostProfile.hobbies}
          onChange={handleHobbiesChange}
          max={MAX_HOBBIES}
        />
      </FormSection>

      {/* Photo Gallery Upload */}
      <FormSection title="Photo Gallery" icon={Camera}>
        <p style={{ fontSize: typography.fontSize.base, color: colors.text.secondary, marginBottom: spacing.lg }}>
          Upload up to 6 photos to showcase your hosting experience
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.md }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                aspectRatio: '1',
                background: 'rgba(255,255,255,0.03)',
                border: `2px dashed ${colors.border.light}`,
                borderRadius: borderRadius.lg,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Plus size={24} style={{ color: colors.text.secondary, marginBottom: spacing.xs }} />
              <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>Add Photo</span>
            </div>
          ))}
        </div>
      </FormSection>

      {/* Bottom Save Button */}
      <Button
        onClick={onSave}
        icon={Save}
        fullWidth
        size="xl"
        style={{
          padding: spacing.lg,
          fontSize: typography.fontSize.lg,
        }}
      >
        Save Profile
      </Button>
    </div>
  );
}
