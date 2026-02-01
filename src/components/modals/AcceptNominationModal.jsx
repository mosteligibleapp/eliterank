import React, { useState, useRef, useEffect } from 'react';
import { Crown, Check, X, User, MapPin, Camera, Loader, AlertCircle, Quote } from 'lucide-react';
import { Modal, Button } from '../ui';
import { colors, spacing, borderRadius, typography, gradients } from '../../styles/theme';
import { supabase } from '../../lib/supabase';

/**
 * AcceptNominationModal - In-app modal for existing users to accept/decline nominations
 *
 * This modal is shown to users who already have an EliteRank profile and log in with
 * their password. It allows them to accept or decline nominations without needing
 * a magic link or redirecting to the ClaimNominationPage.
 */
export default function AcceptNominationModal({
  isOpen,
  onClose,
  nomination,
  profile,
  user,
  onAccept,
  onDecline,
}) {
  const avatarInputRef = useRef(null);

  // Stage: 'nomination' | 'profile' | 'success'
  const [stage, setStage] = useState('nomination');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  // Profile form state (pre-filled from existing profile)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    avatarUrl: '',
    bio: '',
    city: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [uploading, setUploading] = useState(false);

  // Initialize form data from profile/nomination
  useEffect(() => {
    if (profile || nomination) {
      setFormData({
        firstName: profile?.first_name || nomination?.name?.split(' ')[0] || '',
        lastName: profile?.last_name || nomination?.name?.split(' ').slice(1).join(' ') || '',
        avatarUrl: profile?.avatar_url || '',
        bio: profile?.bio || '',
        city: profile?.city || nomination?.competition?.city?.name || '',
      });
    }
  }, [profile, nomination]);

  // Reset stage when modal opens
  useEffect(() => {
    if (isOpen) {
      setStage('nomination');
      setError('');
      setFormErrors({});
    }
  }, [isOpen]);

  if (!nomination) return null;

  // Derived values
  const competition = nomination?.competition;
  const nominatorDisplay = nomination?.nominator_anonymous
    ? 'Someone special'
    : (nomination?.nominator_name || 'Someone');
  const nominationReason = nomination?.nomination_reason;

  // Check if profile is complete
  const isProfileComplete = () => {
    return profile?.first_name &&
           profile?.last_name &&
           profile?.avatar_url &&
           profile?.bio &&
           profile?.city;
  };

  // Validate profile form
  const validateForm = () => {
    const errors = {};
    if (!formData.firstName?.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName?.trim()) errors.lastName = 'Last name is required';
    if (!formData.avatarUrl) errors.avatarUrl = 'Profile photo is required';
    if (!formData.bio?.trim()) errors.bio = 'Bio is required';
    if (formData.bio?.trim().length < 20) errors.bio = 'Bio must be at least 20 characters';
    if (!formData.city?.trim()) errors.city = 'City is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Accept
  const handleAccept = async () => {
    setProcessing(true);
    setError('');

    try {
      // Update nominee record with claimed_at and user_id
      const { error: updateError } = await supabase
        .from('nominees')
        .update({
          claimed_at: new Date().toISOString(),
          user_id: user?.id,
        })
        .eq('id', nomination.id);

      if (updateError) throw updateError;

      // Check if profile is complete
      if (!isProfileComplete()) {
        setStage('profile');
      } else {
        setStage('success');
      }
    } catch (err) {
      console.error('Error accepting nomination:', err);
      setError(err.message || 'Failed to accept nomination');
    } finally {
      setProcessing(false);
    }
  };

  // Handle Decline
  const handleDecline = async () => {
    setProcessing(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('nominees')
        .update({
          status: 'rejected',
          user_id: user?.id,
        })
        .eq('id', nomination.id);

      if (updateError) throw updateError;

      onDecline?.();
    } catch (err) {
      console.error('Error declining nomination:', err);
      setError(err.message || 'Failed to decline nomination');
    } finally {
      setProcessing(false);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setFormErrors(prev => ({ ...prev, avatarUrl: 'Please select an image file' }));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setFormErrors(prev => ({ ...prev, avatarUrl: 'Image must be less than 5MB' }));
      return;
    }

    setUploading(true);
    setFormErrors(prev => ({ ...prev, avatarUrl: null }));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, avatarUrl: publicUrl }));
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setFormErrors(prev => ({ ...prev, avatarUrl: 'Failed to upload image' }));
    } finally {
      setUploading(false);
    }
  };

  // Handle profile save
  const handleSaveProfile = async () => {
    if (!validateForm()) return;

    setProcessing(true);
    setError('');

    try {
      const { error: updateError } = await supabase
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

      if (updateError) throw updateError;

      setStage('success');
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Failed to save profile');
    } finally {
      setProcessing(false);
    }
  };

  // Handle success close
  const handleSuccessClose = () => {
    onAccept?.({ nominee: nomination });
  };

  // Render nomination stage
  if (stage === 'nomination') {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title=""
        maxWidth="480px"
        centered
      >
        {/* Header with crown */}
        <div style={{ textAlign: 'center', marginBottom: spacing.xl }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Crown size={36} style={{ color: colors.gold.primary }} />
          </div>
          <h2
            style={{
              fontSize: typography.fontSize.hero,
              fontWeight: typography.fontWeight.bold,
              background: gradients.gold,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: spacing.sm,
            }}
          >
            You've Been Nominated!
          </h2>
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.md }}>
            for Most Eligible {competition?.city?.name} {competition?.season}
          </p>
        </div>

        {/* Nominator info */}
        <div
          style={{
            background: 'rgba(212, 175, 55, 0.1)',
            border: `1px solid ${colors.border.gold}`,
            borderRadius: borderRadius.lg,
            padding: spacing.lg,
            marginBottom: spacing.lg,
          }}
        >
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, marginBottom: spacing.xs }}>
            Nominated by
          </p>
          <p style={{ color: colors.text.primary, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>
            {nominatorDisplay}
          </p>
        </div>

        {/* Nomination reason */}
        {nominationReason && (
          <div
            style={{
              padding: spacing.lg,
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: borderRadius.md,
              borderLeft: `3px solid ${colors.gold.primary}`,
              marginBottom: spacing.lg,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.sm }}>
              <Quote size={16} style={{ color: colors.gold.primary, flexShrink: 0, marginTop: '2px' }} />
              <p style={{ color: colors.text.light, fontSize: typography.fontSize.md, fontStyle: 'italic', lineHeight: 1.6 }}>
                "{nominationReason}"
              </p>
            </div>
          </div>
        )}

        {/* Profile incomplete notice */}
        {!isProfileComplete() && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.md,
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: borderRadius.md,
              marginBottom: spacing.lg,
            }}
          >
            <AlertCircle size={18} style={{ color: '#fbbf24', flexShrink: 0 }} />
            <p style={{ color: '#fbbf24', fontSize: typography.fontSize.sm }}>
              You'll need to complete your profile after accepting
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.md,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: borderRadius.md,
              marginBottom: spacing.lg,
            }}
          >
            <AlertCircle size={18} style={{ color: colors.status.error }} />
            <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm }}>{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleAccept}
            loading={processing}
            icon={Check}
          >
            Accept Nomination
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={handleDecline}
            disabled={processing}
            icon={X}
          >
            Decline
          </Button>
        </div>

        {/* Fine print */}
        <p
          style={{
            color: colors.text.muted,
            fontSize: typography.fontSize.xs,
            textAlign: 'center',
            marginTop: spacing.lg,
          }}
        >
          By accepting, your profile will be submitted for host approval
        </p>
      </Modal>
    );
  }

  // Render profile completion stage
  if (stage === 'profile') {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Complete Your Profile"
        maxWidth="480px"
        centered
      >
        <p style={{ color: colors.text.secondary, marginBottom: spacing.xl }}>
          Add a few details to complete your nomination
        </p>

        {/* Avatar upload */}
        <div style={{ textAlign: 'center', marginBottom: spacing.xl }}>
          <div
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: formData.avatarUrl
                ? `url(${formData.avatarUrl}) center/cover`
                : 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))',
              border: formErrors.avatarUrl
                ? `2px solid ${colors.status.error}`
                : `2px solid ${colors.border.gold}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
            }}
            onClick={() => avatarInputRef.current?.click()}
          >
            {uploading ? (
              <Loader size={24} style={{ color: colors.gold.primary, animation: 'spin 1s linear infinite' }} />
            ) : !formData.avatarUrl ? (
              <Camera size={32} style={{ color: colors.gold.primary }} />
            ) : null}
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => avatarInputRef.current?.click()}
            style={{
              background: 'none',
              border: 'none',
              color: colors.gold.primary,
              fontSize: typography.fontSize.sm,
              cursor: 'pointer',
              marginTop: spacing.sm,
            }}
          >
            {formData.avatarUrl ? 'Change Photo' : 'Add Photo'}
          </button>
          {formErrors.avatarUrl && (
            <p style={{ color: colors.status.error, fontSize: typography.fontSize.xs, marginTop: spacing.xs }}>
              {formErrors.avatarUrl}
            </p>
          )}
        </div>

        {/* Name fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md, marginBottom: spacing.lg }}>
          <div>
            <label style={{ display: 'block', color: colors.text.secondary, fontSize: typography.fontSize.sm, marginBottom: spacing.xs }}>
              First Name
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              style={{
                width: '100%',
                padding: spacing.md,
                background: colors.background.secondary,
                border: formErrors.firstName ? `1px solid ${colors.status.error}` : `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.md,
                color: colors.text.primary,
                fontSize: typography.fontSize.md,
                outline: 'none',
              }}
              placeholder="John"
            />
            {formErrors.firstName && (
              <p style={{ color: colors.status.error, fontSize: typography.fontSize.xs, marginTop: spacing.xs }}>
                {formErrors.firstName}
              </p>
            )}
          </div>
          <div>
            <label style={{ display: 'block', color: colors.text.secondary, fontSize: typography.fontSize.sm, marginBottom: spacing.xs }}>
              Last Name
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              style={{
                width: '100%',
                padding: spacing.md,
                background: colors.background.secondary,
                border: formErrors.lastName ? `1px solid ${colors.status.error}` : `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.md,
                color: colors.text.primary,
                fontSize: typography.fontSize.md,
                outline: 'none',
              }}
              placeholder="Doe"
            />
            {formErrors.lastName && (
              <p style={{ color: colors.status.error, fontSize: typography.fontSize.xs, marginTop: spacing.xs }}>
                {formErrors.lastName}
              </p>
            )}
          </div>
        </div>

        {/* City field */}
        <div style={{ marginBottom: spacing.lg }}>
          <label style={{ display: 'block', color: colors.text.secondary, fontSize: typography.fontSize.sm, marginBottom: spacing.xs }}>
            City
          </label>
          <div style={{ position: 'relative' }}>
            <MapPin size={18} style={{ position: 'absolute', left: spacing.md, top: '50%', transform: 'translateY(-50%)', color: colors.text.muted }} />
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              style={{
                width: '100%',
                padding: spacing.md,
                paddingLeft: '44px',
                background: colors.background.secondary,
                border: formErrors.city ? `1px solid ${colors.status.error}` : `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.md,
                color: colors.text.primary,
                fontSize: typography.fontSize.md,
                outline: 'none',
              }}
              placeholder="New York, NY"
            />
          </div>
          {formErrors.city && (
            <p style={{ color: colors.status.error, fontSize: typography.fontSize.xs, marginTop: spacing.xs }}>
              {formErrors.city}
            </p>
          )}
        </div>

        {/* Bio field */}
        <div style={{ marginBottom: spacing.xl }}>
          <label style={{ display: 'block', color: colors.text.secondary, fontSize: typography.fontSize.sm, marginBottom: spacing.xs }}>
            Bio <span style={{ color: colors.text.muted }}>(min 20 characters)</span>
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
            rows={4}
            style={{
              width: '100%',
              padding: spacing.md,
              background: colors.background.secondary,
              border: formErrors.bio ? `1px solid ${colors.status.error}` : `1px solid ${colors.border.light}`,
              borderRadius: borderRadius.md,
              color: colors.text.primary,
              fontSize: typography.fontSize.md,
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
            placeholder="Tell us about yourself..."
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: spacing.xs }}>
            {formErrors.bio ? (
              <p style={{ color: colors.status.error, fontSize: typography.fontSize.xs }}>
                {formErrors.bio}
              </p>
            ) : <span />}
            <span style={{ color: colors.text.muted, fontSize: typography.fontSize.xs }}>
              {formData.bio?.length || 0} / 20 min
            </span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.md,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: borderRadius.md,
              marginBottom: spacing.lg,
            }}
          >
            <AlertCircle size={18} style={{ color: colors.status.error }} />
            <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm }}>{error}</p>
          </div>
        )}

        {/* Save button */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleSaveProfile}
          loading={processing}
          icon={Check}
        >
          Save & Continue
        </Button>

        {/* Spinner animation */}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </Modal>
    );
  }

  // Render success stage
  if (stage === 'success') {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleSuccessClose}
        title=""
        maxWidth="400px"
        centered
      >
        <div style={{ textAlign: 'center', padding: spacing.xl }}>
          {/* Success checkmark */}
          <div
            style={{
              width: '72px',
              height: '72px',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(34, 197, 94, 0.1))',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <Check size={36} style={{ color: colors.status.success }} />
          </div>

          <h2
            style={{
              fontSize: typography.fontSize.hero,
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
              marginBottom: spacing.sm,
            }}
          >
            You're In!
          </h2>

          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.md, marginBottom: spacing.lg }}>
            Your nomination for Most Eligible {competition?.city?.name} {competition?.season} has been accepted.
          </p>

          <div
            style={{
              padding: spacing.md,
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: borderRadius.md,
              marginBottom: spacing.xl,
            }}
          >
            <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
              Awaiting host approval. You'll be notified when your profile goes live.
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSuccessClose}
          >
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  return null;
}
