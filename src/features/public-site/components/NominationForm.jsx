import React, { useState, useRef } from 'react';
import { Crown, User, Users, Mail, Phone, Camera, Check, Share2, Copy, UserPlus } from 'lucide-react';
import { Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { useAuthContextSafe } from '../../../contexts/AuthContext';

export default function NominationForm({ city, competitionId, onSubmit, onClose }) {
  const toast = useToast();
  const { user, profile, updateProfile } = useAuthContextSafe();
  const fileInputRef = useRef(null);

  // Flow state
  const [step, setStep] = useState(1); // 1 = choose type, 2 = form
  const [nominationType, setNominationType] = useState(null); // 'self' or 'other'

  // Self-nomination state
  const [selfData, setSelfData] = useState({
    photo: profile?.avatar_url || null,
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
    email: profile?.email || user?.email || '',
    phone: profile?.phone || '',
    city: profile?.city || city || '',
    agreeToUpdates: true,
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Third-party nomination state
  const [thirdPartyData, setThirdPartyData] = useState({
    firstName: '',
    lastName: '',
    contactType: 'email', // 'email' or 'phone'
    contactValue: '',
    reason: '',
    isAnonymous: false,
    notifyMe: true,
  });

  // Shared state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Photo upload handler
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelfData(prev => ({ ...prev, photo: e.target.result }));
    };
    reader.readAsDataURL(file);
    setPhotoFile(file);
  };

  // Upload photo to storage and update profile
  const uploadPhoto = async () => {
    if (!photoFile || !user) return profile?.avatar_url;

    setUploadingPhoto(true);
    try {
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, photoFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar
      await updateProfile({ avatar_url: publicUrl });

      return publicUrl;
    } catch (err) {
      console.error('Error uploading photo:', err);
      toast.error('Failed to upload photo');
      return profile?.avatar_url;
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Validation
  const validateSelfNomination = () => {
    const newErrors = {};

    if (!selfData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!selfData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!selfData.email && !selfData.phone) {
      newErrors.contact = 'Please provide an email or phone number';
    }
    if (selfData.email && !selfData.email.includes('@')) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!selfData.photo && !photoFile) {
      newErrors.photo = 'Please upload a photo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateThirdParty = () => {
    const newErrors = {};

    if (!thirdPartyData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!thirdPartyData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!thirdPartyData.contactValue.trim()) {
      newErrors.contactValue = `${thirdPartyData.contactType === 'email' ? 'Email' : 'Phone number'} is required`;
    }
    if (thirdPartyData.contactType === 'email' && !thirdPartyData.contactValue.includes('@')) {
      newErrors.contactValue = 'Please enter a valid email';
    }
    if (thirdPartyData.contactType === 'phone' && thirdPartyData.contactValue.length < 10) {
      newErrors.contactValue = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit self-nomination (directly to contestants)
  const handleSelfSubmit = async () => {
    if (!validateSelfNomination()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Upload photo if new one selected
      let avatarUrl = selfData.photo;
      if (photoFile) {
        avatarUrl = await uploadPhoto();
      }

      // Update profile with any new info
      const profileUpdates = {};
      if (selfData.firstName !== profile?.first_name) profileUpdates.first_name = selfData.firstName;
      if (selfData.lastName !== profile?.last_name) profileUpdates.last_name = selfData.lastName;
      if (selfData.phone && selfData.phone !== profile?.phone) profileUpdates.phone = selfData.phone;
      if (selfData.city && selfData.city !== profile?.city) profileUpdates.city = selfData.city;

      if (Object.keys(profileUpdates).length > 0) {
        await updateProfile(profileUpdates);
      }

      // Insert directly to contestants
      const contestantData = {
        competition_id: competitionId,
        user_id: user.id,
        name: `${selfData.firstName} ${selfData.lastName}`.trim(),
        email: selfData.email,
        phone: selfData.phone || null,
        city: selfData.city || city,
        avatar_url: avatarUrl,
        status: 'active',
        votes: 0,
      };

      const { error } = await supabase
        .from('contestants')
        .insert(contestantData);

      if (error) {
        if (error.code === '23505') {
          throw new Error('You have already entered this competition.');
        }
        throw error;
      }

      setIsSuccess(true);
      toast.success("You're in! Good luck!");
      if (onSubmit) onSubmit({ type: 'self' });
    } catch (err) {
      console.error('Error submitting self-nomination:', err);
      setSubmitError(err.message || 'Failed to submit. Please try again.');
      toast.error(err.message || 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit third-party nomination (to nominees table)
  const handleThirdPartySubmit = async () => {
    if (!validateThirdParty()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const nomineeData = {
        competition_id: competitionId,
        name: `${thirdPartyData.firstName} ${thirdPartyData.lastName}`.trim(),
        email: thirdPartyData.contactType === 'email' ? thirdPartyData.contactValue : null,
        phone: thirdPartyData.contactType === 'phone' ? thirdPartyData.contactValue : null,
        nominated_by: 'third_party',
        nominator_id: user?.id || null,
        nominator_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : null,
        nominator_email: user?.email || null,
        nomination_reason: thirdPartyData.reason || null,
        nominator_anonymous: thirdPartyData.isAnonymous,
        nominator_wants_updates: thirdPartyData.notifyMe,
        status: 'pending',
      };

      // Insert nominee and get the ID back
      const { data: insertedNominee, error } = await supabase
        .from('nominees')
        .insert(nomineeData)
        .select('id')
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('This person has already been nominated for this competition.');
        }
        throw error;
      }

      // Auto-send invite via edge function
      if (insertedNominee?.id) {
        try {
          await supabase.functions.invoke('smooth-api', {
            body: { nominee_id: insertedNominee.id },
          });
        } catch (inviteErr) {
          // Don't fail the nomination if invite fails - it can be resent later
          console.error('Failed to send invite:', inviteErr);
        }
      }

      setIsSuccess(true);
      toast.success('Nomination sent!');
      if (onSubmit) onSubmit({ type: 'third_party' });
    } catch (err) {
      console.error('Error submitting nomination:', err);
      setSubmitError(err.message || 'Failed to submit. Please try again.');
      toast.error(err.message || 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers
  const handleNominateAnother = () => {
    setIsSuccess(false);
    setThirdPartyData({
      firstName: '',
      lastName: '',
      contactType: 'email',
      contactValue: '',
      reason: '',
      isAnonymous: false,
      notifyMe: true,
    });
    setErrors({});
    setSubmitError(null);
  };

  const getShareableLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/c/${city.toLowerCase().replace(/\s+/g, '-')}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareableLink());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `Most Eligible ${city}`,
      text: nominationType === 'self'
        ? `I just entered Most Eligible ${city}! Support me by voting!`
        : `I just nominated someone for Most Eligible ${city}!`,
      url: getShareableLink(),
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== 'AbortError') handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  // Styles
  const inputStyle = {
    width: '100%',
    padding: spacing.md,
    background: colors.background.secondary,
    border: `1px solid ${colors.border.light}`,
    borderRadius: borderRadius.lg,
    color: colors.text.primary,
    fontSize: typography.fontSize.md,
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    fontWeight: typography.fontWeight.medium,
  };

  const optionButtonStyle = (isSelected) => ({
    flex: 1,
    padding: spacing.xl,
    background: isSelected ? 'rgba(212,175,55,0.15)' : colors.background.secondary,
    border: `2px solid ${isSelected ? colors.gold.primary : colors.border.light}`,
    borderRadius: borderRadius.lg,
    color: isSelected ? colors.gold.primary : colors.text.secondary,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.sm,
  });

  const checkboxStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    cursor: 'pointer',
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  };

  // Success Screen - Self Nomination
  if (isSuccess && nominationType === 'self') {
    return (
      <div style={{ textAlign: 'center', padding: spacing.xxxl }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          marginBottom: spacing.xl,
        }}>
          <Crown size={40} style={{ color: colors.gold.primary }} />
        </div>

        <h2 style={{
          fontSize: typography.fontSize.xxl,
          fontWeight: typography.fontWeight.bold,
          color: '#fff',
          marginBottom: spacing.md
        }}>
          You're in! 🎉
        </h2>

        <p style={{
          fontSize: typography.fontSize.lg,
          color: colors.text.secondary,
          maxWidth: '400px',
          margin: `0 auto ${spacing.xl}`,
          lineHeight: 1.6,
        }}>
          Share with your friends and start collecting votes!
        </p>

        <div style={{
          background: colors.background.card,
          border: `1px solid ${colors.border.light}`,
          borderRadius: borderRadius.xl,
          padding: spacing.lg,
          marginBottom: spacing.xl,
        }}>
          <p style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.muted,
            marginBottom: spacing.sm
          }}>
            Share this link:
          </p>
          <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center' }}>
            <div style={{
              flex: 1,
              padding: spacing.md,
              background: colors.background.secondary,
              borderRadius: borderRadius.md,
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {getShareableLink()}
            </div>
            <button
              onClick={handleCopyLink}
              style={{
                padding: spacing.md,
                background: copied ? 'rgba(74,222,128,0.2)' : colors.background.secondary,
                border: `1px solid ${copied ? colors.status.success : colors.border.light}`,
                borderRadius: borderRadius.md,
                color: copied ? colors.status.success : colors.text.secondary,
                cursor: 'pointer',
              }}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: spacing.md }}>
          <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>
            Back to Competition
          </Button>
          <Button onClick={handleShare} icon={Share2} style={{ flex: 1 }}>
            Share My Profile
          </Button>
        </div>
      </div>
    );
  }

  // Success Screen - Third Party
  if (isSuccess && nominationType === 'other') {
    return (
      <div style={{ textAlign: 'center', padding: spacing.xxxl }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          marginBottom: spacing.xl,
        }}>
          <Check size={40} style={{ color: colors.gold.primary }} />
        </div>

        <h2 style={{
          fontSize: typography.fontSize.xxl,
          fontWeight: typography.fontWeight.bold,
          color: '#fff',
          marginBottom: spacing.md
        }}>
          Nomination Sent! 🎉
        </h2>

        <p style={{
          fontSize: typography.fontSize.lg,
          color: colors.text.secondary,
          maxWidth: '400px',
          margin: `0 auto ${spacing.xl}`,
          lineHeight: 1.6,
        }}>
          We'll reach out to let them know they've been nominated.
          {thirdPartyData.notifyMe && " You'll be notified when they enter!"}
        </p>

        <div style={{ display: 'flex', gap: spacing.md }}>
          <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>
            Done
          </Button>
          <Button onClick={handleNominateAnother} icon={UserPlus} style={{ flex: 1 }}>
            Nominate Someone Else
          </Button>
        </div>
      </div>
    );
  }

  // Step 1: Choose nomination type
  if (step === 1) {
    return (
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <h3 style={{
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.semibold,
          color: '#fff',
          marginBottom: spacing.md,
          textAlign: 'center'
        }}>
          Who are you nominating?
        </h3>

        <p style={{
          fontSize: typography.fontSize.md,
          color: colors.text.secondary,
          marginBottom: spacing.xl,
          textAlign: 'center'
        }}>
          Enter yourself or nominate someone you know
        </p>

        <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.xl }}>
          <button
            type="button"
            onClick={() => {
              setNominationType('self');
              setStep(2);
            }}
            style={optionButtonStyle(false)}
          >
            <User size={32} />
            <span style={{ fontSize: typography.fontSize.lg }}>Myself</span>
            <span style={{ fontSize: typography.fontSize.sm, opacity: 0.7 }}>Enter the competition</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setNominationType('other');
              setStep(2);
            }}
            style={optionButtonStyle(false)}
          >
            <Users size={32} />
            <span style={{ fontSize: typography.fontSize.lg }}>Someone Else</span>
            <span style={{ fontSize: typography.fontSize.sm, opacity: 0.7 }}>Nominate a friend</span>
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Self-nomination form
  if (step === 2 && nominationType === 'self') {
    return (
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <h3 style={{
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.semibold,
          color: '#fff',
          marginBottom: spacing.xl,
          textAlign: 'center'
        }}>
          Enter Most Eligible {city}
        </h3>

        {/* Photo Upload */}
        <div style={{ textAlign: 'center', marginBottom: spacing.xl }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoSelect}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: selfData.photo ? `url(${selfData.photo}) center/cover` : colors.background.secondary,
              border: `2px dashed ${errors.photo ? colors.status.error : colors.border.light}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              margin: '0 auto',
              transition: 'all 0.2s',
            }}
          >
            {!selfData.photo && (
              <Camera size={32} style={{ color: colors.text.muted }} />
            )}
          </div>
          <p style={{
            fontSize: typography.fontSize.sm,
            color: errors.photo ? colors.status.error : colors.text.muted,
            marginTop: spacing.sm
          }}>
            {selfData.photo ? 'Click to change photo' : 'Upload your photo *'}
          </p>
        </div>

        {/* Name Fields */}
        <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.lg }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>First Name *</label>
            <input
              type="text"
              value={selfData.firstName}
              onChange={(e) => setSelfData(prev => ({ ...prev, firstName: e.target.value }))}
              placeholder="First name"
              style={{
                ...inputStyle,
                borderColor: errors.firstName ? colors.status.error : colors.border.light,
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Last Name *</label>
            <input
              type="text"
              value={selfData.lastName}
              onChange={(e) => setSelfData(prev => ({ ...prev, lastName: e.target.value }))}
              placeholder="Last name"
              style={{
                ...inputStyle,
                borderColor: errors.lastName ? colors.status.error : colors.border.light,
              }}
            />
          </div>
        </div>

        {/* Contact Fields */}
        <div style={{ marginBottom: spacing.lg }}>
          <label style={labelStyle}>Email</label>
          <div style={{ position: 'relative' }}>
            <Mail size={18} style={{
              position: 'absolute',
              left: spacing.md,
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.text.muted
            }} />
            <input
              type="email"
              value={selfData.email}
              onChange={(e) => setSelfData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="your@email.com"
              style={{
                ...inputStyle,
                paddingLeft: '44px',
                borderColor: errors.email ? colors.status.error : colors.border.light,
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: spacing.lg }}>
          <label style={labelStyle}>Phone Number</label>
          <div style={{ position: 'relative' }}>
            <Phone size={18} style={{
              position: 'absolute',
              left: spacing.md,
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.text.muted
            }} />
            <input
              type="tel"
              value={selfData.phone}
              onChange={(e) => setSelfData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="(555) 555-5555"
              style={{
                ...inputStyle,
                paddingLeft: '44px',
              }}
            />
          </div>
          {errors.contact && (
            <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>
              {errors.contact}
            </p>
          )}
        </div>

        {/* City */}
        <div style={{ marginBottom: spacing.lg }}>
          <label style={labelStyle}>City</label>
          <input
            type="text"
            value={selfData.city}
            onChange={(e) => setSelfData(prev => ({ ...prev, city: e.target.value }))}
            placeholder="Your city"
            style={inputStyle}
          />
        </div>

        {/* Agreement Checkbox */}
        <label style={{ ...checkboxStyle, marginBottom: spacing.lg }}>
          <input
            type="checkbox"
            checked={selfData.agreeToUpdates}
            onChange={(e) => setSelfData(prev => ({ ...prev, agreeToUpdates: e.target.checked }))}
            style={{ width: '18px', height: '18px', accentColor: colors.gold.primary }}
          />
          <span>I agree to receive competition updates</span>
        </label>

        {/* Error Message */}
        {submitError && (
          <div style={{
            padding: spacing.md,
            background: 'rgba(239,68,68,0.1)',
            border: `1px solid ${colors.status.error}`,
            borderRadius: borderRadius.lg,
            marginBottom: spacing.lg,
          }}>
            <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm }}>
              {submitError}
            </p>
          </div>
        )}

        {/* Eligibility Attestation */}
        <p style={{
          fontSize: typography.fontSize.xs,
          color: colors.text.muted,
          textAlign: 'center',
          marginBottom: spacing.lg,
        }}>
          By submitting, I confirm I am at least 21 years old, single, and live within 100 miles of {city}.
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: spacing.md }}>
          <Button variant="secondary" onClick={() => setStep(1)} style={{ flex: 1 }}>
            Back
          </Button>
          <Button
            onClick={handleSelfSubmit}
            disabled={isSubmitting || uploadingPhoto}
            style={{ flex: 1 }}
          >
            {isSubmitting || uploadingPhoto ? 'Submitting...' : 'Enter Competition'}
          </Button>
        </div>
      </div>
    );
  }

  // Step 2: Third-party nomination form
  if (step === 2 && nominationType === 'other') {
    return (
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <h3 style={{
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.semibold,
          color: '#fff',
          marginBottom: spacing.xl,
          textAlign: 'center'
        }}>
          Nominate Someone
        </h3>

        {/* Name Fields */}
        <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.lg }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Their First Name *</label>
            <input
              type="text"
              value={thirdPartyData.firstName}
              onChange={(e) => setThirdPartyData(prev => ({ ...prev, firstName: e.target.value }))}
              placeholder="First name"
              style={{
                ...inputStyle,
                borderColor: errors.firstName ? colors.status.error : colors.border.light,
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Their Last Name *</label>
            <input
              type="text"
              value={thirdPartyData.lastName}
              onChange={(e) => setThirdPartyData(prev => ({ ...prev, lastName: e.target.value }))}
              placeholder="Last name"
              style={{
                ...inputStyle,
                borderColor: errors.lastName ? colors.status.error : colors.border.light,
              }}
            />
          </div>
        </div>

        {/* Contact Type Toggle */}
        <div style={{ marginBottom: spacing.lg }}>
          <label style={labelStyle}>How can we reach them? *</label>
          <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.sm }}>
            <button
              type="button"
              onClick={() => setThirdPartyData(prev => ({ ...prev, contactType: 'email', contactValue: '' }))}
              style={{
                flex: 1,
                padding: spacing.sm,
                background: thirdPartyData.contactType === 'email' ? 'rgba(212,175,55,0.15)' : 'transparent',
                border: `1px solid ${thirdPartyData.contactType === 'email' ? colors.gold.primary : colors.border.light}`,
                borderRadius: borderRadius.md,
                color: thirdPartyData.contactType === 'email' ? colors.gold.primary : colors.text.secondary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xs,
              }}
            >
              <Mail size={16} />
              Email
            </button>
            <button
              type="button"
              onClick={() => setThirdPartyData(prev => ({ ...prev, contactType: 'phone', contactValue: '' }))}
              style={{
                flex: 1,
                padding: spacing.sm,
                background: thirdPartyData.contactType === 'phone' ? 'rgba(212,175,55,0.15)' : 'transparent',
                border: `1px solid ${thirdPartyData.contactType === 'phone' ? colors.gold.primary : colors.border.light}`,
                borderRadius: borderRadius.md,
                color: thirdPartyData.contactType === 'phone' ? colors.gold.primary : colors.text.secondary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xs,
              }}
            >
              <Phone size={16} />
              Phone
            </button>
          </div>
          <input
            type={thirdPartyData.contactType === 'email' ? 'email' : 'tel'}
            value={thirdPartyData.contactValue}
            onChange={(e) => setThirdPartyData(prev => ({ ...prev, contactValue: e.target.value }))}
            placeholder={thirdPartyData.contactType === 'email' ? 'their@email.com' : '(555) 555-5555'}
            style={{
              ...inputStyle,
              borderColor: errors.contactValue ? colors.status.error : colors.border.light,
            }}
          />
          {errors.contactValue && (
            <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>
              {errors.contactValue}
            </p>
          )}
        </div>

        {/* Nomination Reason */}
        <div style={{ marginBottom: spacing.lg }}>
          <label style={labelStyle}>
            Why are you nominating them? <span style={{ opacity: 0.6 }}>(optional)</span>
          </label>
          <textarea
            value={thirdPartyData.reason}
            onChange={(e) => setThirdPartyData(prev => ({ ...prev, reason: e.target.value.slice(0, 140) }))}
            placeholder="They're amazing because..."
            maxLength={140}
            rows={3}
            style={{
              ...inputStyle,
              resize: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: spacing.xs }}>
            <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
              They'll see this when we notify them
            </span>
            <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
              {thirdPartyData.reason.length}/140
            </span>
          </div>
        </div>

        {/* Checkboxes */}
        <div style={{ marginBottom: spacing.lg }}>
          <label style={{ ...checkboxStyle, marginBottom: spacing.md }}>
            <input
              type="checkbox"
              checked={thirdPartyData.isAnonymous}
              onChange={(e) => setThirdPartyData(prev => ({ ...prev, isAnonymous: e.target.checked }))}
              style={{ width: '18px', height: '18px', accentColor: colors.gold.primary }}
            />
            <span>Keep my identity anonymous</span>
          </label>

          <label style={checkboxStyle}>
            <input
              type="checkbox"
              checked={thirdPartyData.notifyMe}
              onChange={(e) => setThirdPartyData(prev => ({ ...prev, notifyMe: e.target.checked }))}
              style={{ width: '18px', height: '18px', accentColor: colors.gold.primary }}
            />
            <span>Notify me when they enter</span>
          </label>
        </div>

        {/* Error Message */}
        {submitError && (
          <div style={{
            padding: spacing.md,
            background: 'rgba(239,68,68,0.1)',
            border: `1px solid ${colors.status.error}`,
            borderRadius: borderRadius.lg,
            marginBottom: spacing.lg,
          }}>
            <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm }}>
              {submitError}
            </p>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: spacing.md }}>
          <Button variant="secondary" onClick={() => setStep(1)} style={{ flex: 1 }}>
            Back
          </Button>
          <Button
            onClick={handleThirdPartySubmit}
            disabled={isSubmitting}
            style={{ flex: 1 }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Nomination'}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
