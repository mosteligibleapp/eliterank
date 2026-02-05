import React, { useState, useRef } from 'react';
import { Crown, User, Users, Mail, Phone, Camera, Check, Share2, Copy, UserPlus, Lock, Instagram, AtSign, Eye, EyeOff } from 'lucide-react';
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
  const [step, setStep] = useState(1); // 1 = choose type, 2 = form, 3 = profile completion
  const [nominationType, setNominationType] = useState(null); // 'self' or 'other'

  // Profile completion state (step 3)
  const [profileCompletion, setProfileCompletion] = useState({
    password: '',
    confirmPassword: '',
    showPassword: false,
    instagram: '',
    tiktok: '',
    twitter: '',
    passwordComplete: false,
    photoComplete: false,
    socialComplete: false,
  });
  const [pendingContestantId, setPendingContestantId] = useState(null);

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
    // Photo is no longer required at initial submission

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

  // Submit self-nomination (to nominees table with pending status)
  const handleSelfSubmit = async () => {
    if (!validateSelfNomination()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Insert to nominees table (allows anonymous inserts)
      const nomineeData = {
        competition_id: competitionId,
        user_id: user?.id || null, // May be null if not logged in
        name: `${selfData.firstName} ${selfData.lastName}`.trim(),
        email: selfData.email,
        city: selfData.city || city,
        nominated_by: 'self',
        status: 'pending', // Will become 'profile-complete' after steps done
        profile_complete: false,
      };

      const { data: insertedNominee, error } = await supabase
        .from('nominees')
        .insert(nomineeData)
        .select('id')
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('You have already entered this competition.');
        }
        throw error;
      }

      // Store the nominee ID for profile completion
      setPendingContestantId(insertedNominee.id); // Reusing state name

      // If user is already logged in, mark password as complete
      if (user) {
        setProfileCompletion(prev => ({ ...prev, passwordComplete: true }));
      }

      // If photo was already uploaded, mark as complete
      if (selfData.photo || photoFile) {
        setProfileCompletion(prev => ({ ...prev, photoComplete: true }));
      }

      // Move to profile completion step
      setStep(3);
      toast.success('Nomination submitted!');
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
        nomination_reason: thirdPartyData.reason || null,
        nominator_anonymous: thirdPartyData.isAnonymous,
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
          await supabase.functions.invoke('send-nomination-invite', {
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
              border: `2px dashed ${colors.border.light}`,
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
            color: colors.text.muted,
            marginTop: spacing.sm
          }}>
            {selfData.photo ? 'Click to change photo' : 'Upload your photo (optional)'}
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
            {isSubmitting || uploadingPhoto ? 'Submitting...' : 'Request to Compete'}
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

  // Step 3: Profile completion (after self-nomination)
  if (step === 3 && nominationType === 'self') {
    const allStepsComplete = profileCompletion.passwordComplete &&
                             profileCompletion.photoComplete &&
                             profileCompletion.socialComplete;

    // Handle password creation
    const handlePasswordSubmit = async () => {
      if (profileCompletion.password.length < 8) {
        setErrors({ password: 'Password must be at least 8 characters' });
        return;
      }
      if (profileCompletion.password !== profileCompletion.confirmPassword) {
        setErrors({ confirmPassword: 'Passwords do not match' });
        return;
      }

      setIsSubmitting(true);
      setErrors({});

      try {
        // Create Supabase auth user with email and password
        const { data, error } = await supabase.auth.signUp({
          email: selfData.email,
          password: profileCompletion.password,
          options: {
            data: {
              first_name: selfData.firstName,
              last_name: selfData.lastName,
            }
          }
        });

        if (error) throw error;

        // Update the nominee record with the new user_id
        if (data.user && pendingContestantId) {
          await supabase
            .from('nominees')
            .update({ user_id: data.user.id })
            .eq('id', pendingContestantId);
        }

        setProfileCompletion(prev => ({ ...prev, passwordComplete: true }));
        toast.success('Account created!');
      } catch (err) {
        console.error('Error creating account:', err);
        setErrors({ password: err.message || 'Failed to create account' });
      } finally {
        setIsSubmitting(false);
      }
    };

    // Handle photo upload in profile completion
    const handlePhotoUploadComplete = async () => {
      if (!photoFile) return;

      // Get current user (should exist after password step)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        toast.error('Please complete the password step first');
        return;
      }

      setUploadingPhoto(true);
      try {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, photoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        // Update user's profile with avatar
        await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', currentUser.id);

        setProfileCompletion(prev => ({ ...prev, photoComplete: true }));
        toast.success('Photo uploaded!');
      } catch (err) {
        console.error('Error uploading photo:', err);
        toast.error('Failed to upload photo');
      } finally {
        setUploadingPhoto(false);
      }
    };

    // Handle social media save
    const handleSocialSubmit = async () => {
      const { instagram, tiktok, twitter } = profileCompletion;

      // At least one required
      if (!instagram.trim() && !tiktok.trim() && !twitter.trim()) {
        setErrors({ social: 'Please enter at least one social media handle' });
        return;
      }

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        toast.error('Please complete the password step first');
        return;
      }

      setIsSubmitting(true);
      setErrors({});

      try {
        // Update user's profile with social handles
        await supabase
          .from('profiles')
          .update({
            instagram: instagram.trim() || null,
            tiktok: tiktok.trim() || null,
            twitter: twitter.trim() || null,
          })
          .eq('id', currentUser.id);

        // Also update nominee record with instagram (for host visibility)
        await supabase
          .from('nominees')
          .update({ instagram: instagram.trim() || null })
          .eq('id', pendingContestantId);

        setProfileCompletion(prev => ({ ...prev, socialComplete: true }));
        toast.success('Social accounts saved!');
      } catch (err) {
        console.error('Error saving social handles:', err);
        setErrors({ social: 'Failed to save social handles' });
      } finally {
        setIsSubmitting(false);
      }
    };

    // Final completion
    const handleFinalComplete = async () => {
      try {
        // Update nominee status to profile-complete (awaiting host approval)
        await supabase
          .from('nominees')
          .update({
            status: 'profile-complete',
            profile_complete: true
          })
          .eq('id', pendingContestantId);

        setIsSuccess(true);
        if (onSubmit) onSubmit({ type: 'self', complete: true });
      } catch (err) {
        console.error('Error completing profile:', err);
        toast.error('Failed to complete profile');
      }
    };

    // Final success screen
    if (isSuccess) {
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
            Application Complete!
          </h2>

          <p style={{
            fontSize: typography.fontSize.lg,
            color: colors.text.secondary,
            maxWidth: '400px',
            margin: `0 auto ${spacing.xl}`,
            lineHeight: 1.6,
          }}>
            The host will review your application and approve or deny before nominations close. We'll notify you by email.
          </p>

          <Button onClick={onClose} style={{ minWidth: '200px' }}>
            Done
          </Button>
        </div>
      );
    }

    // Profile completion checklist
    return (
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: spacing.xl }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            marginBottom: spacing.lg,
          }}>
            <Check size={28} style={{ color: colors.gold.primary }} />
          </div>

          <h3 style={{
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.bold,
            color: '#fff',
            marginBottom: spacing.sm,
          }}>
            Your nomination has been submitted!
          </h3>

          <p style={{
            fontSize: typography.fontSize.md,
            color: colors.text.secondary,
          }}>
            Complete the next steps to get approved
          </p>
        </div>

        {/* Step 1: Create Password */}
        <div style={{
          background: profileCompletion.passwordComplete ? 'rgba(74,222,128,0.1)' : colors.background.card,
          border: `1px solid ${profileCompletion.passwordComplete ? colors.status.success : colors.border.light}`,
          borderRadius: borderRadius.xl,
          padding: spacing.lg,
          marginBottom: spacing.md,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: profileCompletion.passwordComplete ? 0 : spacing.lg }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: profileCompletion.passwordComplete ? colors.status.success : 'rgba(212,175,55,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {profileCompletion.passwordComplete ? (
                <Check size={18} style={{ color: '#fff' }} />
              ) : (
                <span style={{ color: colors.gold.primary, fontWeight: 'bold' }}>1</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, margin: 0 }}>
                Create a password
              </h4>
              {profileCompletion.passwordComplete && (
                <p style={{ fontSize: typography.fontSize.sm, color: colors.status.success, margin: 0 }}>Complete</p>
              )}
            </div>
          </div>

          {!profileCompletion.passwordComplete && (
            <div style={{ marginTop: spacing.md }}>
              <div style={{ position: 'relative', marginBottom: spacing.md }}>
                <Lock size={18} style={{
                  position: 'absolute',
                  left: spacing.md,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: colors.text.muted
                }} />
                <input
                  type={profileCompletion.showPassword ? 'text' : 'password'}
                  value={profileCompletion.password}
                  onChange={(e) => setProfileCompletion(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Create password"
                  style={{
                    ...inputStyle,
                    paddingLeft: '44px',
                    paddingRight: '44px',
                    borderColor: errors.password ? colors.status.error : colors.border.light,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setProfileCompletion(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                  style={{
                    position: 'absolute',
                    right: spacing.md,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: colors.text.muted,
                    cursor: 'pointer',
                  }}
                >
                  {profileCompletion.showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div style={{ position: 'relative', marginBottom: spacing.md }}>
                <Lock size={18} style={{
                  position: 'absolute',
                  left: spacing.md,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: colors.text.muted
                }} />
                <input
                  type={profileCompletion.showPassword ? 'text' : 'password'}
                  value={profileCompletion.confirmPassword}
                  onChange={(e) => setProfileCompletion(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm password"
                  style={{
                    ...inputStyle,
                    paddingLeft: '44px',
                    borderColor: errors.confirmPassword ? colors.status.error : colors.border.light,
                  }}
                />
              </div>
              {(errors.password || errors.confirmPassword) && (
                <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginBottom: spacing.md }}>
                  {errors.password || errors.confirmPassword}
                </p>
              )}
              <Button
                onClick={handlePasswordSubmit}
                disabled={isSubmitting}
                size="sm"
                style={{ width: '100%' }}
              >
                {isSubmitting ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          )}
        </div>

        {/* Step 2: Upload Photo */}
        <div style={{
          background: profileCompletion.photoComplete ? 'rgba(74,222,128,0.1)' : colors.background.card,
          border: `1px solid ${profileCompletion.photoComplete ? colors.status.success : colors.border.light}`,
          borderRadius: borderRadius.xl,
          padding: spacing.lg,
          marginBottom: spacing.md,
          opacity: profileCompletion.passwordComplete ? 1 : 0.5,
          pointerEvents: profileCompletion.passwordComplete ? 'auto' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: profileCompletion.photoComplete ? 0 : spacing.lg }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: profileCompletion.photoComplete ? colors.status.success : 'rgba(212,175,55,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {profileCompletion.photoComplete ? (
                <Check size={18} style={{ color: '#fff' }} />
              ) : (
                <span style={{ color: colors.gold.primary, fontWeight: 'bold' }}>2</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, margin: 0 }}>
                Upload a photo
              </h4>
              {profileCompletion.photoComplete && (
                <p style={{ fontSize: typography.fontSize.sm, color: colors.status.success, margin: 0 }}>Complete</p>
              )}
            </div>
          </div>

          {!profileCompletion.photoComplete && (
            <div style={{ marginTop: spacing.md }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoSelect}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <div style={{ display: 'flex', gap: spacing.md, alignItems: 'center' }}>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: borderRadius.lg,
                    background: selfData.photo ? `url(${selfData.photo}) center/cover` : colors.background.secondary,
                    border: `2px dashed ${colors.border.light}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {!selfData.photo && <Camera size={24} style={{ color: colors.text.muted }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <Button
                    onClick={selfData.photo || photoFile ? handlePhotoUploadComplete : () => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    size="sm"
                    variant={selfData.photo || photoFile ? 'primary' : 'secondary'}
                    style={{ width: '100%' }}
                  >
                    {uploadingPhoto ? 'Uploading...' : selfData.photo || photoFile ? 'Save Photo' : 'Choose Photo'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Social Media */}
        <div style={{
          background: profileCompletion.socialComplete ? 'rgba(74,222,128,0.1)' : colors.background.card,
          border: `1px solid ${profileCompletion.socialComplete ? colors.status.success : colors.border.light}`,
          borderRadius: borderRadius.xl,
          padding: spacing.lg,
          marginBottom: spacing.xl,
          opacity: profileCompletion.photoComplete ? 1 : 0.5,
          pointerEvents: profileCompletion.photoComplete ? 'auto' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: profileCompletion.socialComplete ? 0 : spacing.lg }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: profileCompletion.socialComplete ? colors.status.success : 'rgba(212,175,55,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {profileCompletion.socialComplete ? (
                <Check size={18} style={{ color: '#fff' }} />
              ) : (
                <span style={{ color: colors.gold.primary, fontWeight: 'bold' }}>3</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, margin: 0 }}>
                Connect social media
              </h4>
              {profileCompletion.socialComplete ? (
                <p style={{ fontSize: typography.fontSize.sm, color: colors.status.success, margin: 0 }}>Complete</p>
              ) : (
                <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, margin: 0 }}>At least one required</p>
              )}
            </div>
          </div>

          {!profileCompletion.socialComplete && (
            <div style={{ marginTop: spacing.md }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, marginBottom: spacing.md }}>
                <div style={{ position: 'relative' }}>
                  <Instagram size={18} style={{
                    position: 'absolute',
                    left: spacing.md,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#E4405F'
                  }} />
                  <input
                    type="text"
                    value={profileCompletion.instagram}
                    onChange={(e) => setProfileCompletion(prev => ({ ...prev, instagram: e.target.value }))}
                    placeholder="Instagram handle"
                    style={{ ...inputStyle, paddingLeft: '44px' }}
                  />
                </div>
                <div style={{ position: 'relative' }}>
                  <AtSign size={18} style={{
                    position: 'absolute',
                    left: spacing.md,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#000'
                  }} />
                  <input
                    type="text"
                    value={profileCompletion.tiktok}
                    onChange={(e) => setProfileCompletion(prev => ({ ...prev, tiktok: e.target.value }))}
                    placeholder="TikTok handle"
                    style={{ ...inputStyle, paddingLeft: '44px' }}
                  />
                </div>
                <div style={{ position: 'relative' }}>
                  <AtSign size={18} style={{
                    position: 'absolute',
                    left: spacing.md,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: colors.text.muted
                  }} />
                  <input
                    type="text"
                    value={profileCompletion.twitter}
                    onChange={(e) => setProfileCompletion(prev => ({ ...prev, twitter: e.target.value }))}
                    placeholder="X (Twitter) handle"
                    style={{ ...inputStyle, paddingLeft: '44px' }}
                  />
                </div>
              </div>
              {errors.social && (
                <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginBottom: spacing.md }}>
                  {errors.social}
                </p>
              )}
              <Button
                onClick={handleSocialSubmit}
                disabled={isSubmitting}
                size="sm"
                style={{ width: '100%' }}
              >
                {isSubmitting ? 'Saving...' : 'Save Social Accounts'}
              </Button>
            </div>
          )}
        </div>

        {/* Final submission */}
        {allStepsComplete && (
          <Button
            onClick={handleFinalComplete}
            style={{ width: '100%' }}
          >
            Complete Application
          </Button>
        )}
      </div>
    );
  }

  return null;
}
