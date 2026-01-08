import React, { useRef, useState } from 'react';
import { Edit, User, FileText, Globe, Heart, Camera, Save, Plus, X, Loader, ChevronLeft } from 'lucide-react';
import { Button, Input, Textarea, FormSection, FormGrid, HobbySelector } from '../../../components/ui';
import { colors, spacing, borderRadius, typography, gradients } from '../../../styles/theme';
import { ALL_HOBBIES, MAX_HOBBIES } from '../../../constants';
import { useResponsive } from '../../../hooks/useResponsive';

export default function ProfileEdit({ hostProfile, onSave, onCancel, onChange, userId }) {
  const { isMobile, isSmall } = useResponsive();

  if (!hostProfile) return null;

  const [uploading, setUploading] = useState({ cover: false, avatar: false, gallery: null });
  const coverInputRef = useRef(null);
  const avatarInputRef = useRef(null);

  const initials = `${(hostProfile.firstName || '?')[0]}${(hostProfile.lastName || '?')[0]}`;

  const handleFieldChange = (field, value) => {
    onChange({ ...hostProfile, [field]: value });
  };

  const handleHobbiesChange = (hobbies) => {
    onChange({ ...hostProfile, hobbies });
  };

  // Upload image to Vercel Blob
  const uploadImage = async (file, folder) => {
    if (!file) return null;

    // Validate file size (max 4.5MB for Vercel Blob free tier)
    const maxSize = 4.5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Image too large. Please choose an image under 4.5MB.');
      return null;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return null;
    }

    try {
      const timestamp = Date.now();
      const ext = file.name.split('.').pop();
      const filename = `${folder}/${timestamp}.${ext}`;

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

  // Handle cover image upload
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(prev => ({ ...prev, cover: true }));
    const url = await uploadImage(file, 'covers');
    if (url) {
      handleFieldChange('coverImage', url);
    }
    setUploading(prev => ({ ...prev, cover: false }));
  };

  // Handle avatar image upload
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(prev => ({ ...prev, avatar: true }));
    const url = await uploadImage(file, 'avatars');
    if (url) {
      handleFieldChange('avatarUrl', url);
    }
    setUploading(prev => ({ ...prev, avatar: false }));
  };

  // Handle gallery image upload
  const handleGalleryUpload = async (e, index) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(prev => ({ ...prev, gallery: index }));
    const url = await uploadImage(file, 'gallery');
    if (url) {
      const gallery = [...(hostProfile.gallery || [])];
      gallery[index] = url;
      handleFieldChange('gallery', gallery);
    }
    setUploading(prev => ({ ...prev, gallery: null }));
  };

  // Remove gallery image
  const handleRemoveGalleryImage = (index) => {
    const gallery = [...(hostProfile.gallery || [])];
    gallery[index] = null;
    handleFieldChange('gallery', gallery.filter(Boolean));
  };

  const gallery = hostProfile.gallery || [];

  return (
    <div>
      {/* Hidden file inputs */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        onChange={handleCoverUpload}
        style={{ display: 'none' }}
      />
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarUpload}
        style={{ display: 'none' }}
      />

      {/* Edit Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: isMobile ? spacing.md : 0,
          marginBottom: isMobile ? spacing.lg : spacing.xxl,
          padding: isMobile ? spacing.md : spacing.xl,
          background: colors.background.card,
          border: `1px solid ${colors.border.light}`,
          borderRadius: borderRadius.xl,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          {isMobile && (
            <button
              onClick={onCancel}
              style={{
                background: 'none',
                border: 'none',
                color: colors.text.primary,
                cursor: 'pointer',
                padding: spacing.xs,
                marginLeft: `-${spacing.xs}`,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <Edit size={isMobile ? 20 : 24} style={{ color: colors.gold.primary }} />
          <div>
            <h2 style={{
              fontSize: isMobile ? typography.fontSize.lg : typography.fontSize.xxl,
              fontWeight: typography.fontWeight.semibold
            }}>
              Edit Profile
            </h2>
            {!isMobile && (
              <p style={{ fontSize: typography.fontSize.base, color: colors.text.secondary }}>
                Update your public profile
              </p>
            )}
          </div>
        </div>
        <div style={{
          display: 'flex',
          gap: spacing.sm,
          ...(isMobile && { marginTop: spacing.sm })
        }}>
          {!isMobile && (
            <Button variant="secondary" onClick={onCancel} size={isMobile ? 'sm' : 'md'}>
              Cancel
            </Button>
          )}
          <Button
            onClick={onSave}
            icon={Save}
            size={isMobile ? 'md' : 'md'}
            fullWidth={isMobile}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Cover & Avatar */}
      <div
        style={{
          background: colors.background.card,
          border: `1px solid ${colors.border.light}`,
          borderRadius: isMobile ? borderRadius.xl : borderRadius.xxl,
          overflow: 'hidden',
          marginBottom: isMobile ? spacing.md : spacing.xl,
        }}
      >
        <div
          style={{
            height: isMobile ? '120px' : '180px',
            background: hostProfile.coverImage ? `url(${hostProfile.coverImage}) center/cover` : gradients.cover,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {!hostProfile.coverImage && !isMobile && (
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
          )}
          <button
            onClick={() => coverInputRef.current?.click()}
            disabled={uploading.cover}
            style={{
              position: 'absolute',
              bottom: isMobile ? spacing.sm : spacing.lg,
              right: isMobile ? spacing.sm : spacing.lg,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              padding: isMobile ? `${spacing.xs} ${spacing.sm}` : `${spacing.sm} ${spacing.lg}`,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: borderRadius.sm,
              fontSize: isMobile ? typography.fontSize.xs : typography.fontSize.base,
              color: '#fff',
              cursor: uploading.cover ? 'wait' : 'pointer',
            }}
          >
            {uploading.cover ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={14} />}
            {uploading.cover ? 'Uploading...' : (isMobile ? 'Change' : 'Change Cover')}
          </button>
        </div>
        <div style={{
          padding: isMobile ? `0 ${spacing.md} ${spacing.md}` : `0 ${spacing.xxl} ${spacing.xxl}`,
          marginTop: isMobile ? '-36px' : '-48px'
        }}>
          <div style={{
            display: 'flex',
            gap: isMobile ? spacing.md : spacing.xl,
            alignItems: isMobile ? 'center' : 'flex-end'
          }}>
            <div
              style={{
                width: isMobile ? '80px' : '120px',
                height: isMobile ? '80px' : '120px',
                borderRadius: borderRadius.xxl,
                background: hostProfile.avatarUrl
                  ? `url(${hostProfile.avatarUrl}) center/cover`
                  : 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))',
                border: isMobile ? '3px solid #1a1a24' : '4px solid #1a1a24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '28px' : '36px',
                fontWeight: typography.fontWeight.semibold,
                color: colors.gold.primary,
                position: 'relative',
                flexShrink: 0,
              }}
            >
              {!hostProfile.avatarUrl && initials}
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploading.avatar}
                style={{
                  position: 'absolute',
                  bottom: '-6px',
                  right: '-6px',
                  width: isMobile ? '28px' : '36px',
                  height: isMobile ? '28px' : '36px',
                  background: colors.gold.primary,
                  borderRadius: borderRadius.md,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0a0a0f',
                  cursor: uploading.avatar ? 'wait' : 'pointer',
                  border: 'none',
                }}
              >
                {uploading.avatar ? <Loader size={isMobile ? 12 : 16} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={isMobile ? 12 : 16} />}
              </button>
            </div>
            <div style={{ paddingBottom: isMobile ? 0 : spacing.sm, minWidth: 0 }}>
              <h2 style={{
                fontSize: isMobile ? typography.fontSize.xl : typography.fontSize.xxxl,
                fontWeight: typography.fontWeight.semibold,
                marginBottom: spacing.xs,
                wordBreak: 'break-word',
              }}>
                {hostProfile.firstName} {hostProfile.lastName}
              </h2>
              {hostProfile.city && (
                <p style={{
                  color: colors.text.secondary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  fontSize: isMobile ? typography.fontSize.sm : typography.fontSize.md,
                }}>
                  {hostProfile.city}
                </p>
              )}
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
        <p style={{
          fontSize: isMobile ? typography.fontSize.sm : typography.fontSize.base,
          color: colors.text.secondary,
          marginBottom: spacing.md
        }}>
          Upload up to 6 photos to showcase your hosting experience
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
          gap: isMobile ? spacing.sm : spacing.md
        }}>
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const imageUrl = gallery[index];
            const isUploading = uploading.gallery === index;

            return (
              <div
                key={index}
                style={{
                  aspectRatio: '1',
                  background: imageUrl ? `url(${imageUrl}) center/cover` : 'rgba(255,255,255,0.03)',
                  border: `2px ${imageUrl ? 'solid' : 'dashed'} ${colors.border.light}`,
                  borderRadius: borderRadius.lg,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isUploading ? 'wait' : 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onClick={() => {
                  if (!imageUrl && !isUploading) {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => handleGalleryUpload(e, index);
                    input.click();
                  }
                }}
              >
                {isUploading ? (
                  <>
                    <Loader size={isMobile ? 20 : 24} style={{ color: colors.gold.primary, animation: 'spin 1s linear infinite', marginBottom: spacing.xs }} />
                    <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>Uploading...</span>
                  </>
                ) : imageUrl ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveGalleryImage(index);
                    }}
                    style={{
                      position: 'absolute',
                      top: spacing.xs,
                      right: spacing.xs,
                      width: isMobile ? '24px' : '28px',
                      height: isMobile ? '24px' : '28px',
                      background: 'rgba(0,0,0,0.7)',
                      border: 'none',
                      borderRadius: borderRadius.full,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#fff',
                    }}
                  >
                    <X size={isMobile ? 14 : 16} />
                  </button>
                ) : (
                  <>
                    <Plus size={isMobile ? 20 : 24} style={{ color: colors.text.secondary, marginBottom: spacing.xs }} />
                    <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>Add Photo</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </FormSection>

      {/* Bottom Save Button */}
      <Button
        onClick={onSave}
        icon={Save}
        fullWidth
        size={isMobile ? 'lg' : 'xl'}
        style={{
          padding: isMobile ? spacing.md : spacing.lg,
          fontSize: isMobile ? typography.fontSize.md : typography.fontSize.lg,
          marginBottom: isMobile ? spacing.xxl : 0,
        }}
      >
        Save Profile
      </Button>

      {/* Spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
