import React, { useState, useRef, useEffect } from 'react';
import { Crown, Camera, User, FileText, MapPin, Check, Loader, ArrowRight } from 'lucide-react';
import { Button, Input, Textarea } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';

/**
 * NomineeProfileCompletionPage
 *
 * Shown after a nominee accepts their nomination but has an incomplete profile.
 * Pre-fills with nomination data and requires: name, image, bio, city.
 *
 * After completion, the nomination is ready for admin approval.
 */
export default function NomineeProfileCompletionPage({
  nominee,
  competition,
  profile,
  user,
  onComplete,
  onCancel,
}) {
  const toast = useToast();
  const avatarInputRef = useRef(null);

  // Form state - pre-fill from nominee data and existing profile
  const [formData, setFormData] = useState({
    firstName: profile?.first_name || nominee?.name?.split(' ')[0] || '',
    lastName: profile?.last_name || nominee?.name?.split(' ').slice(1).join(' ') || '',
    avatarUrl: profile?.avatar_url || '',
    bio: profile?.bio || '',
    city: profile?.city || competition?.city || '',
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Update form when profile/nominee changes
  useEffect(() => {
    if (profile || nominee) {
      setFormData(prev => ({
        firstName: profile?.first_name || nominee?.name?.split(' ')[0] || prev.firstName,
        lastName: profile?.last_name || nominee?.name?.split(' ').slice(1).join(' ') || prev.lastName,
        avatarUrl: profile?.avatar_url || prev.avatarUrl,
        bio: profile?.bio || prev.bio,
        city: profile?.city || competition?.city || prev.city,
      }));
    }
  }, [profile, nominee, competition]);

  // Handle field change
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is edited
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Upload image to Vercel Blob
  const uploadImage = async (file) => {
    if (!file) return null;

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Image too large. Please choose an image under 10MB.');
      return null;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file.');
      return null;
    }

    try {
      const timestamp = Date.now();
      const ext = file.name.split('.').pop();
      const filename = `avatars/${timestamp}.${ext}`;

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
      toast.error(`Upload failed: ${error.message}`);
      return null;
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const url = await uploadImage(file);
    if (url) {
      handleFieldChange('avatarUrl', url);
    }
    setUploading(false);
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.avatarUrl) {
      newErrors.avatarUrl = 'Profile photo is required';
    }
    if (!formData.bio.trim()) {
      newErrors.bio = 'Bio is required';
    } else if (formData.bio.trim().length < 20) {
      newErrors.bio = 'Bio must be at least 20 characters';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);

    try {
      // Update user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          avatar_url: formData.avatarUrl,
          bio: formData.bio.trim(),
          city: formData.city.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast.success('Profile completed! Your nomination is pending admin approval.');
      onComplete?.();
    } catch (err) {
      console.error('Error saving profile:', err);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const initials = `${(formData.firstName || '?')[0]}${(formData.lastName || '?')[0]}`.toUpperCase();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
      padding: spacing.xl,
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: spacing.xxl,
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Crown size={36} style={{ color: colors.gold.primary }} />
          </div>
          <h1 style={{
            fontSize: typography.fontSize.xxl,
            fontWeight: typography.fontWeight.bold,
            color: '#fff',
            marginBottom: spacing.sm,
          }}>
            Complete Your Profile
          </h1>
          <p style={{
            fontSize: typography.fontSize.md,
            color: colors.text.secondary,
            maxWidth: '400px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}>
            You're almost in! Complete your profile to finalize your entry for
            <span style={{ color: colors.gold.primary, fontWeight: typography.fontWeight.semibold }}>
              {' '}Most Eligible {competition?.city} {competition?.season}
            </span>
          </p>
        </div>

        {/* Form Card */}
        <div style={{
          background: colors.background.card,
          border: `1px solid ${colors.border.light}`,
          borderRadius: borderRadius.xl,
          padding: spacing.xl,
        }}>
          {/* Avatar Upload */}
          <div style={{
            textAlign: 'center',
            marginBottom: spacing.xxl,
          }}>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              style={{ display: 'none' }}
            />
            <div
              onClick={() => !uploading && avatarInputRef.current?.click()}
              style={{
                width: '120px',
                height: '120px',
                margin: '0 auto 12px',
                borderRadius: borderRadius.xxl,
                background: formData.avatarUrl
                  ? `url(${formData.avatarUrl}) center/cover`
                  : 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))',
                border: errors.avatarUrl ? `2px solid ${colors.status.error}` : `3px solid ${colors.border.light}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: uploading ? 'wait' : 'pointer',
                position: 'relative',
                transition: 'all 0.2s ease',
              }}
            >
              {uploading ? (
                <Loader size={32} style={{ color: colors.gold.primary, animation: 'spin 1s linear infinite' }} />
              ) : !formData.avatarUrl ? (
                <div style={{ textAlign: 'center' }}>
                  <Camera size={32} style={{ color: colors.text.secondary, marginBottom: spacing.xs }} />
                  <p style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
                    Add Photo
                  </p>
                </div>
              ) : (
                <div style={{
                  position: 'absolute',
                  bottom: '-6px',
                  right: '-6px',
                  width: '32px',
                  height: '32px',
                  background: colors.gold.primary,
                  borderRadius: borderRadius.md,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0a0a0f',
                }}>
                  <Camera size={16} />
                </div>
              )}
            </div>
            {errors.avatarUrl && (
              <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>
                {errors.avatarUrl}
              </p>
            )}
            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>
              {formData.avatarUrl ? 'Click to change photo' : 'Required'}
            </p>
          </div>

          {/* Name Fields */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: spacing.md,
            marginBottom: spacing.lg,
          }}>
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.xs,
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
                marginBottom: spacing.xs,
              }}>
                <User size={14} />
                First Name *
              </label>
              <Input
                value={formData.firstName}
                onChange={(e) => handleFieldChange('firstName', e.target.value)}
                placeholder="Your first name"
                error={errors.firstName}
              />
            </div>
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.xs,
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
                marginBottom: spacing.xs,
              }}>
                <User size={14} />
                Last Name *
              </label>
              <Input
                value={formData.lastName}
                onChange={(e) => handleFieldChange('lastName', e.target.value)}
                placeholder="Your last name"
                error={errors.lastName}
              />
            </div>
          </div>

          {/* City Field */}
          <div style={{ marginBottom: spacing.lg }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              marginBottom: spacing.xs,
            }}>
              <MapPin size={14} />
              City *
            </label>
            <Input
              value={formData.city}
              onChange={(e) => handleFieldChange('city', e.target.value)}
              placeholder="e.g., Austin, TX"
              error={errors.city}
            />
          </div>

          {/* Bio Field */}
          <div style={{ marginBottom: spacing.xl }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              marginBottom: spacing.xs,
            }}>
              <FileText size={14} />
              Bio *
            </label>
            <Textarea
              value={formData.bio}
              onChange={(e) => handleFieldChange('bio', e.target.value)}
              placeholder="Tell us about yourself... What makes you Most Eligible material?"
              maxLength={500}
              showCount
              rows={4}
              error={errors.bio}
            />
            {errors.bio && (
              <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>
                {errors.bio}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={saving || uploading}
            style={{ width: '100%' }}
          >
            {saving ? (
              <>
                <Loader size={18} style={{ marginRight: spacing.xs, animation: 'spin 1s linear infinite' }} />
                Saving...
              </>
            ) : (
              <>
                Complete Profile
                <ArrowRight size={18} style={{ marginLeft: spacing.xs }} />
              </>
            )}
          </Button>

          {/* Skip option */}
          <button
            onClick={onCancel}
            style={{
              width: '100%',
              marginTop: spacing.md,
              padding: spacing.sm,
              background: 'transparent',
              border: 'none',
              color: colors.text.muted,
              fontSize: typography.fontSize.sm,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            I'll do this later
          </button>
        </div>

        {/* Info text */}
        <p style={{
          textAlign: 'center',
          fontSize: typography.fontSize.sm,
          color: colors.text.muted,
          marginTop: spacing.lg,
          lineHeight: 1.6,
        }}>
          Your profile will be reviewed by the competition admins.
          You'll be notified once you're approved as a contestant.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
