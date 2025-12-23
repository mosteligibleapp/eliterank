import React, { useState } from 'react';
import { Crown, User, Phone, Mail, Instagram, MapPin, Heart, Users, Check, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';

export default function NominationForm({ city, onSubmit, onClose }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    age: '',
    livesNearCity: null,
    contactMethod: 'email',
    email: '',
    phone: '',
    instagram: '',
    relationshipStatus: null,
    nominationType: 'self',
    nomineeName: '',
    nomineeContact: '',
    optInMarketing: false,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateStep = () => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.fullName.trim()) newErrors.fullName = 'Name is required';
      if (!formData.age || formData.age < 21 || formData.age > 45) newErrors.age = 'Age must be between 21-45';
      if (formData.livesNearCity === null) newErrors.livesNearCity = 'Please select an option';
    }

    if (step === 2) {
      if (formData.contactMethod === 'email' && !formData.email.includes('@')) {
        newErrors.email = 'Valid email is required';
      }
      if (formData.contactMethod === 'phone' && formData.phone.length < 10) {
        newErrors.phone = 'Valid phone number is required';
      }
      if (!formData.instagram.trim()) newErrors.instagram = 'Instagram handle is required';
    }

    if (step === 3) {
      if (formData.relationshipStatus === null) newErrors.relationshipStatus = 'Please select an option';
    }

    if (step === 4) {
      if (formData.nominationType === 'other') {
        if (!formData.nomineeName.trim()) newErrors.nomineeName = 'Nominee name is required';
        if (!formData.nomineeContact.trim()) newErrors.nomineeContact = 'Contact info is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (step < 5) {
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
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setIsSuccess(true);
    if (onSubmit) onSubmit(formData);
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

  if (isSuccess) {
    return (
      <div style={{ textAlign: 'center', padding: spacing.xxxl }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, rgba(74,222,128,0.2), rgba(74,222,128,0.05))',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          marginBottom: spacing.xl,
        }}>
          <Check size={40} style={{ color: colors.status.success }} />
        </div>
        <h2 style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, color: '#fff', marginBottom: spacing.md }}>
          Nomination Submitted!
        </h2>
        <p style={{ fontSize: typography.fontSize.md, color: colors.text.secondary, marginBottom: spacing.xl, maxWidth: '400px', margin: '0 auto' }}>
          {formData.nominationType === 'self'
            ? "Thank you for nominating yourself! We'll review your application and get back to you soon."
            : `Thank you for nominating ${formData.nomineeName}! We'll reach out to them shortly.`
          }
        </p>
        <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted, marginBottom: spacing.xxl }}>
          Check your {formData.contactMethod === 'email' ? 'email' : 'phone'} for updates on your nomination status.
        </p>
        <Button onClick={onClose}>Back to Competition</Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      {/* Progress */}
      <div style={progressStyle}>
        {[1, 2, 3, 4, 5].map(num => (
          <div key={num} style={progressDotStyle(num)} />
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div>
          <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, color: '#fff', marginBottom: spacing.lg }}>
            Let's Start With the Basics
          </h3>

          <div style={{ marginBottom: spacing.lg }}>
            <label style={labelStyle}>Full Name *</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
              placeholder="Enter your full name"
              style={{
                ...inputStyle,
                borderColor: errors.fullName ? colors.status.error : colors.border.light,
              }}
            />
            {errors.fullName && (
              <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>{errors.fullName}</p>
            )}
          </div>

          <div style={{ marginBottom: spacing.lg }}>
            <label style={labelStyle}>Age *</label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => updateField('age', parseInt(e.target.value) || '')}
              placeholder="Must be 21-45"
              min="21"
              max="45"
              style={{
                ...inputStyle,
                borderColor: errors.age ? colors.status.error : colors.border.light,
              }}
            />
            {errors.age && (
              <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>{errors.age}</p>
            )}
          </div>

          <div style={{ marginBottom: spacing.lg }}>
            <label style={labelStyle}>Do you live within 100 miles of {city}? *</label>
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
              <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>{errors.livesNearCity}</p>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Contact Info */}
      {step === 2 && (
        <div>
          <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, color: '#fff', marginBottom: spacing.lg }}>
            How Can We Reach You?
          </h3>

          <div style={{ marginBottom: spacing.lg }}>
            <label style={labelStyle}>Preferred Contact Method *</label>
            <div style={{ display: 'flex', gap: spacing.md }}>
              <button
                type="button"
                onClick={() => updateField('contactMethod', 'email')}
                style={optionButtonStyle(formData.contactMethod === 'email')}
              >
                <Mail size={24} />
                Email
              </button>
              <button
                type="button"
                onClick={() => updateField('contactMethod', 'phone')}
                style={optionButtonStyle(formData.contactMethod === 'phone')}
              >
                <Phone size={24} />
                Phone
              </button>
            </div>
          </div>

          {formData.contactMethod === 'email' ? (
            <div style={{ marginBottom: spacing.lg }}>
              <label style={labelStyle}>Email Address *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="you@example.com"
                style={{
                  ...inputStyle,
                  borderColor: errors.email ? colors.status.error : colors.border.light,
                }}
              />
              {errors.email && (
                <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>{errors.email}</p>
              )}
            </div>
          ) : (
            <div style={{ marginBottom: spacing.lg }}>
              <label style={labelStyle}>Phone Number *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="(555) 555-5555"
                style={{
                  ...inputStyle,
                  borderColor: errors.phone ? colors.status.error : colors.border.light,
                }}
              />
              {errors.phone && (
                <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>{errors.phone}</p>
              )}
            </div>
          )}

          <div style={{ marginBottom: spacing.lg }}>
            <label style={labelStyle}>Instagram Handle *</label>
            <div style={{ position: 'relative' }}>
              <Instagram size={18} style={{ position: 'absolute', left: spacing.md, top: '50%', transform: 'translateY(-50%)', color: colors.text.muted }} />
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
              <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>{errors.instagram}</p>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Eligibility */}
      {step === 3 && (
        <div>
          <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, color: '#fff', marginBottom: spacing.lg }}>
            Eligibility Check
          </h3>

          <div style={{ marginBottom: spacing.lg }}>
            <label style={labelStyle}>Are you currently single (not married or engaged)? *</label>
            <div style={{ display: 'flex', gap: spacing.md }}>
              <button
                type="button"
                onClick={() => updateField('relationshipStatus', 'single')}
                style={optionButtonStyle(formData.relationshipStatus === 'single')}
              >
                <Heart size={24} />
                Yes, I'm Single
              </button>
              <button
                type="button"
                onClick={() => updateField('relationshipStatus', 'taken')}
                style={optionButtonStyle(formData.relationshipStatus === 'taken')}
              >
                <Users size={24} />
                No
              </button>
            </div>
            {errors.relationshipStatus && (
              <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>{errors.relationshipStatus}</p>
            )}
          </div>

          {formData.relationshipStatus === 'taken' && (
            <div style={{
              padding: spacing.lg,
              background: 'rgba(248,113,113,0.1)',
              border: `1px solid ${colors.status.error}`,
              borderRadius: borderRadius.lg,
            }}>
              <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm }}>
                Unfortunately, contestants must be single to participate. You can still nominate someone else who is eligible!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Nomination Type */}
      {step === 4 && (
        <div>
          <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, color: '#fff', marginBottom: spacing.lg }}>
            Who Are You Nominating?
          </h3>

          <div style={{ marginBottom: spacing.lg }}>
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
          </div>

          {formData.nominationType === 'other' && (
            <>
              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Nominee's Full Name *</label>
                <input
                  type="text"
                  value={formData.nomineeName}
                  onChange={(e) => updateField('nomineeName', e.target.value)}
                  placeholder="Their full name"
                  style={{
                    ...inputStyle,
                    borderColor: errors.nomineeName ? colors.status.error : colors.border.light,
                  }}
                />
                {errors.nomineeName && (
                  <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>{errors.nomineeName}</p>
                )}
              </div>

              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Nominee's Email or Phone *</label>
                <input
                  type="text"
                  value={formData.nomineeContact}
                  onChange={(e) => updateField('nomineeContact', e.target.value)}
                  placeholder="How can we reach them?"
                  style={{
                    ...inputStyle,
                    borderColor: errors.nomineeContact ? colors.status.error : colors.border.light,
                  }}
                />
                {errors.nomineeContact && (
                  <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>{errors.nomineeContact}</p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 5: Marketing Opt-in */}
      {step === 5 && (
        <div>
          <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, color: '#fff', marginBottom: spacing.lg }}>
            Stay Updated
          </h3>

          <div style={{
            padding: spacing.xl,
            background: colors.background.card,
            border: `1px solid ${colors.border.light}`,
            borderRadius: borderRadius.xl,
            marginBottom: spacing.xl,
          }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.md, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.optInMarketing}
                onChange={(e) => updateField('optInMarketing', e.target.checked)}
                style={{
                  width: '24px',
                  height: '24px',
                  accentColor: colors.gold.primary,
                  cursor: 'pointer',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              />
              <div>
                <p style={{ fontSize: typography.fontSize.md, color: '#fff', fontWeight: typography.fontWeight.medium, marginBottom: spacing.xs }}>
                  Keep me updated
                </p>
                <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: 1.5 }}>
                  I'd like to receive updates about the competition, nominee status, exclusive events, and special offers from Most Eligible {city}.
                </p>
              </div>
            </label>
          </div>

          <div style={{
            padding: spacing.lg,
            background: 'rgba(212,175,55,0.1)',
            border: `1px solid ${colors.border.gold}`,
            borderRadius: borderRadius.lg,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
              <Sparkles size={18} style={{ color: colors.gold.primary }} />
              <span style={{ fontSize: typography.fontSize.md, color: colors.gold.primary, fontWeight: typography.fontWeight.semibold }}>
                Ready to Submit
              </span>
            </div>
            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
              By submitting, you confirm that all information provided is accurate and you agree to our terms and conditions.
            </p>
          </div>
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
          disabled={isSubmitting || (step === 3 && formData.relationshipStatus === 'taken')}
          style={{ flex: 1 }}
        >
          {isSubmitting ? (
            'Submitting...'
          ) : step === 5 ? (
            <>Submit Nomination</>
          ) : (
            <>Continue <ChevronRight size={18} /></>
          )}
        </Button>
      </div>
    </div>
  );
}
