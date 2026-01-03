import React, { useState, useMemo } from 'react';
import { Crown, User, Phone, Mail, Instagram, MapPin, Heart, Users, Check, ChevronRight, Sparkles, AlertCircle, Share2, Copy, EyeOff, Bell } from 'lucide-react';
import { Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';

// Default form fields config (used when no config is provided)
const DEFAULT_FORM_FIELDS = [
  { key: 'nomineeName', label: "Nominee's Full Name", type: 'text', required: true, enabled: true },
  { key: 'nomineeAge', label: 'Age', type: 'number', required: true, enabled: true, min: 21, max: 45, description: 'Must be between 21-45' },
  { key: 'livesNearCity', label: 'Do they live within 100 miles of the city?', type: 'boolean', required: true, enabled: true },
  { key: 'isSingle', label: 'Are they single (not married or engaged)?', type: 'boolean', required: true, enabled: true },
  { key: 'email', label: 'Email Address', type: 'email', required: true, enabled: true },
  { key: 'phone', label: 'Phone Number', type: 'phone', required: true, enabled: true },
  { key: 'instagram', label: 'Instagram Handle', type: 'text', required: true, enabled: true },
];

export default function NominationForm({ city, competitionId, onSubmit, onClose, userEmail, userInstagram, formConfig }) {
  const toast = useToast();
  const [step, setStep] = useState(1);

  // Parse and merge form config with defaults
  const formFields = useMemo(() => {
    if (!formConfig) return DEFAULT_FORM_FIELDS;

    try {
      const config = typeof formConfig === 'string' ? JSON.parse(formConfig) : formConfig;
      if (config.fields && Array.isArray(config.fields)) {
        return config.fields;
      }
    } catch (e) {
      console.error('Failed to parse form config:', e);
    }
    return DEFAULT_FORM_FIELDS;
  }, [formConfig]);

  // Helper to get field config
  const getField = (key) => formFields.find(f => f.key === key) || { enabled: false, required: false, label: '' };
  const isFieldEnabled = (key) => getField(key).enabled !== false;
  const isFieldRequired = (key) => getField(key).required !== false;
  const getFieldLabel = (key, fallback) => getField(key).label || fallback;

  const [formData, setFormData] = useState({
    // Step 1: Nominee info
    nomineeName: '',
    nomineeAge: '',
    livesNearCity: null,
    isSingle: null,
    // Step 2: Nomination type & contact
    nominationType: null, // 'self' or 'other'
    email: userEmail || '',
    phone: '',
    instagram: userInstagram || '',
    stayAnonymous: null,
    // Step 3: Updates opt-in (only for "other" nominations)
    wantsUpdates: null,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [nomineeId, setNomineeId] = useState(null);
  const [copied, setCopied] = useState(false);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Calculate total steps based on nomination type
  const getTotalSteps = () => {
    if (formData.nominationType === 'other') return 3;
    return 2; // self-nomination only needs 2 steps
  };

  const validateStep = () => {
    const newErrors = {};
    const ageField = getField('nomineeAge');

    if (step === 1) {
      // Validate enabled fields only
      if (isFieldEnabled('nomineeName') && isFieldRequired('nomineeName') && !formData.nomineeName.trim()) {
        newErrors.nomineeName = 'Full name is required';
      }
      if (isFieldEnabled('nomineeAge') && isFieldRequired('nomineeAge')) {
        const minAge = ageField.min || 21;
        const maxAge = ageField.max || 45;
        if (!formData.nomineeAge || formData.nomineeAge < minAge || formData.nomineeAge > maxAge) {
          newErrors.nomineeAge = `Age must be between ${minAge}-${maxAge}`;
        }
      }
      if (isFieldEnabled('livesNearCity') && isFieldRequired('livesNearCity') && formData.livesNearCity === null) {
        newErrors.livesNearCity = 'Please select an option';
      }
      if (isFieldEnabled('isSingle') && isFieldRequired('isSingle') && formData.isSingle === null) {
        newErrors.isSingle = 'Please select an option';
      }
    }

    if (step === 2) {
      if (formData.nominationType === null) newErrors.nominationType = 'Please select an option';

      if (formData.nominationType === 'self') {
        if (isFieldEnabled('email') && isFieldRequired('email') && !formData.email.includes('@')) {
          newErrors.email = 'Valid email is required';
        }
        if (isFieldEnabled('phone') && isFieldRequired('phone') && (!formData.phone || formData.phone.length < 10)) {
          newErrors.phone = 'Phone number is required';
        }
        if (isFieldEnabled('instagram') && isFieldRequired('instagram') && !formData.instagram.trim()) {
          newErrors.instagram = 'Instagram handle is required';
        }
      }

      if (formData.nominationType === 'other') {
        if (formData.stayAnonymous === null) newErrors.stayAnonymous = 'Please select an option';
      }
    }

    if (step === 3 && formData.nominationType === 'other') {
      if (formData.wantsUpdates === null) newErrors.wantsUpdates = 'Please select an option';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      const totalSteps = getTotalSteps();
      if (step < totalSteps) {
        setStep(step + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (!competitionId) {
        throw new Error('Competition ID is required');
      }

      const isSelfNomination = formData.nominationType === 'self';

      // Build the nominee record
      const nomineeData = {
        competition_id: competitionId,
        name: formData.nomineeName,
        age: parseInt(formData.nomineeAge),
        city: city,
        lives_near_city: formData.livesNearCity,
        is_single: formData.isSingle,
        nominated_by: isSelfNomination ? 'self' : 'third_party',
        status: 'pending',
        profile_complete: isSelfNomination,
        // Self-nomination contact info
        email: isSelfNomination ? formData.email : null,
        phone: isSelfNomination ? formData.phone : null,
        instagram: isSelfNomination ? formData.instagram : null,
        // Third-party nomination info
        nominator_anonymous: !isSelfNomination ? formData.stayAnonymous : null,
        nominator_wants_updates: !isSelfNomination ? formData.wantsUpdates : null,
      };

      // Insert into Supabase
      const { data, error } = await supabase
        .from('nominees')
        .insert(nomineeData)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('This person has already been nominated for this competition.');
        }
        throw error;
      }

      if (!data) {
        throw new Error('Failed to create nomination. Please try again.');
      }

      setNomineeId(data.id);
      setIsSuccess(true);
      toast.success('Nomination submitted successfully!');
      if (onSubmit) onSubmit({ ...formData, nomineeId: data.id });
    } catch (err) {
      console.error('Error submitting nomination:', err);
      const errorMessage = err.message || 'Failed to submit nomination. Please try again.';
      setSubmitError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getShareableLink = () => {
    // Generate a shareable link for the competition/nominee
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
      text: formData.nominationType === 'self'
        ? `I just entered to be Most Eligible ${city}! Support me by voting!`
        : `I just nominated someone for Most Eligible ${city}! Check it out!`,
      url: getShareableLink(),
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

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
    padding: spacing.lg,
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

  const progressStyle = {
    display: 'flex',
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  };

  const progressDotStyle = (stepNum) => ({
    flex: 1,
    height: '4px',
    background: stepNum <= step ? colors.gold.primary : colors.border.light,
    borderRadius: '2px',
    transition: 'background 0.3s',
  });

  // Success screen
  if (isSuccess) {
    const isSelfNomination = formData.nominationType === 'self';

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
          Congrats!
        </h2>

        <p style={{
          fontSize: typography.fontSize.lg,
          color: colors.text.secondary,
          maxWidth: '400px',
          margin: `0 auto ${spacing.xl}`,
          lineHeight: 1.6,
        }}>
          Your nomination has been recorded.
        </p>

        {isSelfNomination ? (
          <>
            <p style={{
              fontSize: typography.fontSize.md,
              color: colors.text.primary,
              marginBottom: spacing.lg,
              lineHeight: 1.6,
            }}>
              Share the news on socials to get your supporters engaged early!
            </p>

            <div style={{
              padding: spacing.lg,
              background: 'rgba(212,175,55,0.1)',
              border: `1px solid ${colors.border.gold}`,
              borderRadius: borderRadius.lg,
              marginBottom: spacing.xl,
            }}>
              <p style={{
                fontSize: typography.fontSize.sm,
                color: colors.gold.primary,
                fontWeight: typography.fontWeight.medium,
              }}>
                You will be contacted within 24 hours regarding next steps.
              </p>
            </div>
          </>
        ) : (
          <p style={{
            fontSize: typography.fontSize.md,
            color: colors.text.primary,
            marginBottom: spacing.xl,
            lineHeight: 1.6,
          }}>
            Share the nomination link with your network.
          </p>
        )}

        {/* Shareable link section */}
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
          <div style={{
            display: 'flex',
            gap: spacing.sm,
            alignItems: 'center',
          }}>
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
            Share
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      {/* Progress */}
      <div style={progressStyle}>
        {Array.from({ length: getTotalSteps() }, (_, i) => i + 1).map(num => (
          <div key={num} style={progressDotStyle(num)} />
        ))}
      </div>

      {/* Step 1: Nominee Eligibility Info */}
      {step === 1 && (
        <div>
          <h3 style={{
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            color: '#fff',
            marginBottom: spacing.lg
          }}>
            Nominee Information
          </h3>

          {isFieldEnabled('nomineeName') && (
            <div style={{ marginBottom: spacing.lg }}>
              <label style={labelStyle}>{getFieldLabel('nomineeName', "Nominee's Full Name")} {isFieldRequired('nomineeName') && '*'}</label>
              <input
                type="text"
                value={formData.nomineeName}
                onChange={(e) => updateField('nomineeName', e.target.value)}
                placeholder="Enter full name"
                style={{
                  ...inputStyle,
                  borderColor: errors.nomineeName ? colors.status.error : colors.border.light,
                }}
              />
              {errors.nomineeName && (
                <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>
                  {errors.nomineeName}
                </p>
              )}
            </div>
          )}

          {isFieldEnabled('nomineeAge') && (
            <div style={{ marginBottom: spacing.lg }}>
              <label style={labelStyle}>{getFieldLabel('nomineeAge', 'Age')} {isFieldRequired('nomineeAge') && '*'}</label>
              <input
                type="number"
                value={formData.nomineeAge}
                onChange={(e) => updateField('nomineeAge', parseInt(e.target.value) || '')}
                placeholder={`Must be ${getField('nomineeAge').min || 21}-${getField('nomineeAge').max || 45}`}
                min={getField('nomineeAge').min || 21}
                max={getField('nomineeAge').max || 45}
                style={{
                  ...inputStyle,
                  borderColor: errors.nomineeAge ? colors.status.error : colors.border.light,
                }}
              />
              {errors.nomineeAge && (
                <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>
                  {errors.nomineeAge}
                </p>
              )}
            </div>
          )}

          {isFieldEnabled('livesNearCity') && (
            <div style={{ marginBottom: spacing.lg }}>
              <label style={labelStyle}>{getFieldLabel('livesNearCity', `Do they live within 100 miles of ${city}?`).replace('{city}', city).replace('the city', city)} {isFieldRequired('livesNearCity') && '*'}</label>
              <div style={{ display: 'flex', gap: spacing.md }}>
                <button
                  type="button"
                  onClick={() => updateField('livesNearCity', true)}
                  style={optionButtonStyle(formData.livesNearCity === true)}
                >
                  <MapPin size={24} />
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => updateField('livesNearCity', false)}
                  style={optionButtonStyle(formData.livesNearCity === false)}
                >
                  <MapPin size={24} style={{ opacity: 0.5 }} />
                  No
                </button>
              </div>
              {errors.livesNearCity && (
                <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>
                  {errors.livesNearCity}
                </p>
              )}
            </div>
          )}

          {isFieldEnabled('isSingle') && (
            <div style={{ marginBottom: spacing.lg }}>
              <label style={labelStyle}>{getFieldLabel('isSingle', 'Are they single (not married or engaged)?')} {isFieldRequired('isSingle') && '*'}</label>
              <div style={{ display: 'flex', gap: spacing.md }}>
                <button
                  type="button"
                  onClick={() => updateField('isSingle', true)}
                  style={optionButtonStyle(formData.isSingle === true)}
                >
                  <Heart size={24} />
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => updateField('isSingle', false)}
                  style={optionButtonStyle(formData.isSingle === false)}
                >
                  <Users size={24} />
                  No
                </button>
              </div>
              {errors.isSingle && (
                <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>
                  {errors.isSingle}
                </p>
              )}
            </div>
          )}

          {isFieldEnabled('isSingle') && formData.isSingle === false && (
            <div style={{
              padding: spacing.lg,
              background: 'rgba(248,113,113,0.1)',
              border: `1px solid ${colors.status.error}`,
              borderRadius: borderRadius.lg,
            }}>
              <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm }}>
                Unfortunately, contestants must be single to participate.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Nomination Type & Contact */}
      {step === 2 && (
        <div>
          <h3 style={{
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            color: '#fff',
            marginBottom: spacing.lg
          }}>
            Who Are You Nominating?
          </h3>

          <div style={{ marginBottom: spacing.xl }}>
            <div style={{ display: 'flex', gap: spacing.md }}>
              <button
                type="button"
                onClick={() => updateField('nominationType', 'self')}
                style={optionButtonStyle(formData.nominationType === 'self')}
              >
                <User size={24} />
                Myself
              </button>
              <button
                type="button"
                onClick={() => updateField('nominationType', 'other')}
                style={optionButtonStyle(formData.nominationType === 'other')}
              >
                <Users size={24} />
                Someone Else
              </button>
            </div>
            {errors.nominationType && (
              <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>
                {errors.nominationType}
              </p>
            )}
          </div>

          {/* Self-nomination: Contact info */}
          {formData.nominationType === 'self' && (
            <>
              <h4 style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.medium,
                color: '#fff',
                marginBottom: spacing.md
              }}>
                Your Contact Information
              </h4>

              {isFieldEnabled('email') && (
                <div style={{ marginBottom: spacing.lg }}>
                  <label style={labelStyle}>{getFieldLabel('email', 'Email Address')} {isFieldRequired('email') && '*'}</label>
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
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="you@example.com"
                      style={{
                        ...inputStyle,
                        paddingLeft: '44px',
                        borderColor: errors.email ? colors.status.error : colors.border.light,
                      }}
                    />
                  </div>
                  {errors.email && (
                    <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>
                      {errors.email}
                    </p>
                  )}
                </div>
              )}

              {isFieldEnabled('phone') && (
                <div style={{ marginBottom: spacing.lg }}>
                  <label style={labelStyle}>{getFieldLabel('phone', 'Phone Number')} {isFieldRequired('phone') && '*'}</label>
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
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      placeholder="(555) 555-5555"
                      style={{
                        ...inputStyle,
                        paddingLeft: '44px',
                        borderColor: errors.phone ? colors.status.error : colors.border.light,
                      }}
                    />
                  </div>
                  {errors.phone && (
                    <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>
                      {errors.phone}
                    </p>
                  )}
                </div>
              )}

              {isFieldEnabled('instagram') && (
                <div style={{ marginBottom: spacing.lg }}>
                  <label style={labelStyle}>{getFieldLabel('instagram', 'Instagram Handle')} {isFieldRequired('instagram') && '*'}</label>
                  <div style={{ position: 'relative' }}>
                    <Instagram size={18} style={{
                      position: 'absolute',
                      left: spacing.md,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: colors.text.muted
                    }} />
                    <input
                      type="text"
                      value={formData.instagram}
                      onChange={(e) => updateField('instagram', e.target.value)}
                      placeholder="@yourusername"
                      style={{
                        ...inputStyle,
                        paddingLeft: '44px',
                        borderColor: errors.instagram ? colors.status.error : colors.border.light,
                      }}
                    />
                  </div>
                  {errors.instagram && (
                    <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>
                      {errors.instagram}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Nominating someone else: Anonymous option */}
          {formData.nominationType === 'other' && (
            <div style={{ marginBottom: spacing.lg }}>
              <label style={labelStyle}>Do you wish to stay anonymous? *</label>
              <div style={{ display: 'flex', gap: spacing.md }}>
                <button
                  type="button"
                  onClick={() => updateField('stayAnonymous', true)}
                  style={optionButtonStyle(formData.stayAnonymous === true)}
                >
                  <EyeOff size={24} />
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => updateField('stayAnonymous', false)}
                  style={optionButtonStyle(formData.stayAnonymous === false)}
                >
                  <User size={24} />
                  No
                </button>
              </div>
              {errors.stayAnonymous && (
                <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>
                  {errors.stayAnonymous}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Updates opt-in (ONLY for "other" nominations) */}
      {step === 3 && formData.nominationType === 'other' && (
        <div>
          <h3 style={{
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            color: '#fff',
            marginBottom: spacing.lg
          }}>
            Stay Updated
          </h3>

          <div style={{ marginBottom: spacing.lg }}>
            <label style={labelStyle}>
              Do you want to receive competition updates to see how your nominee is performing? *
            </label>
            <div style={{ display: 'flex', gap: spacing.md }}>
              <button
                type="button"
                onClick={() => updateField('wantsUpdates', true)}
                style={optionButtonStyle(formData.wantsUpdates === true)}
              >
                <Bell size={24} />
                Yes
              </button>
              <button
                type="button"
                onClick={() => updateField('wantsUpdates', false)}
                style={optionButtonStyle(formData.wantsUpdates === false)}
              >
                <Bell size={24} style={{ opacity: 0.5 }} />
                No
              </button>
            </div>
            {errors.wantsUpdates && (
              <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>
                {errors.wantsUpdates}
              </p>
            )}
          </div>

          <div style={{
            padding: spacing.lg,
            background: 'rgba(212,175,55,0.1)',
            border: `1px solid ${colors.border.gold}`,
            borderRadius: borderRadius.lg,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
              <Sparkles size={18} style={{ color: colors.gold.primary }} />
              <span style={{
                fontSize: typography.fontSize.md,
                color: colors.gold.primary,
                fontWeight: typography.fontWeight.semibold
              }}>
                Ready to Submit
              </span>
            </div>
            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
              By submitting, you confirm that all information provided is accurate.
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {submitError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          padding: spacing.md,
          background: 'rgba(239,68,68,0.1)',
          border: `1px solid ${colors.status.error}`,
          borderRadius: borderRadius.lg,
          marginTop: spacing.lg,
        }}>
          <AlertCircle size={18} style={{ color: colors.status.error, flexShrink: 0 }} />
          <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm }}>
            {submitError}
          </p>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.xxl }}>
        {step > 1 && (
          <Button variant="secondary" onClick={handleBack} style={{ flex: 1 }}>
            Back
          </Button>
        )}
        <Button
          onClick={handleNext}
          disabled={isSubmitting || (step === 1 && formData.isSingle === false)}
          style={{ flex: 1 }}
        >
          {isSubmitting ? (
            'Submitting...'
          ) : step === getTotalSteps() ? (
            <>Submit Nomination</>
          ) : (
            <>Continue <ChevronRight size={18} /></>
          )}
        </Button>
      </div>
    </div>
  );
}
