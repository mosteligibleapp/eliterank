import React, { useState, useRef, useEffect } from 'react';
import { Crown, User, Users, Mail, Phone, Camera, Check, Lock, Instagram, AtSign, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { useAuthContextSafe } from '../../../contexts/AuthContext';

/**
 * Nomination Form - Simplified Flow
 *
 * SELF NOMINATION:
 *   1. Choose "Apply Now"
 *   2. Fill basic info (name, email)
 *   3. Submit → Creates nominee record
 *   4. Optional: Create account to track status
 *   5. Success screen
 *
 * THIRD-PARTY NOMINATION:
 *   1. Choose "Nominate Someone"
 *   2. Fill nominee info
 *   3. Submit → Creates nominee record
 *   4. Success screen
 */
export default function NominationForm({ city, competitionId, onSubmit, onClose }) {
  const toast = useToast();
  const { user, profile } = useAuthContextSafe();
  const fileInputRef = useRef(null);

  // Simple flow state
  const [step, setStep] = useState('choose'); // 'choose' | 'self-form' | 'other-form' | 'account' | 'success'
  const [nomineeId, setNomineeId] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
    email: profile?.email || user?.email || '',
    photo: profile?.avatar_url || null,
  });

  const [otherData, setOtherData] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });

  // Account creation (optional after self-nomination)
  const [accountData, setAccountData] = useState({
    password: '',
    confirmPassword: '',
    showPassword: false,
  });
  const [accountMode, setAccountMode] = useState('signup'); // 'signup' | 'login'

  // UI state
  const [photoFile, setPhotoFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill form if user is logged in
  useEffect(() => {
    if (user && profile) {
      setFormData({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        email: profile.email || user.email || '',
        photo: profile.avatar_url || null,
      });
    }
  }, [user, profile]);

  // Styles
  const inputStyle = {
    width: '100%',
    padding: `${spacing.md} ${spacing.lg}`,
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
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  };

  // ============================================
  // PHOTO HANDLING
  // ============================================
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setFormData(prev => ({ ...prev, photo: e.target.result }));
    };
    reader.readAsDataURL(file);
    setPhotoFile(file);
  };

  // ============================================
  // SELF NOMINATION SUBMIT
  // ============================================
  const handleSelfSubmit = async () => {
    // Validate
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'Required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Required';
    if (!formData.email.trim()) newErrors.email = 'Required';
    if (formData.email && !formData.email.includes('@')) newErrors.email = 'Invalid email';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const { data: nominee, error } = await supabase
        .from('nominees')
        .insert({
          competition_id: competitionId,
          user_id: user?.id || null,
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.email,
          nominated_by: 'self',
          status: 'pending',
        })
        .select('id')
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('You have already entered this competition.');
        }
        throw error;
      }

      setNomineeId(nominee.id);
      toast.success('Nomination submitted!');

      // If already logged in, go straight to success
      if (user) {
        setStep('success');
      } else {
        // Offer account creation
        setStep('account');
      }
    } catch (err) {
      console.error('Nomination error:', err);
      toast.error(err.message || 'Failed to submit');
      setErrors({ submit: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // THIRD-PARTY NOMINATION SUBMIT
  // ============================================
  const handleOtherSubmit = async () => {
    const newErrors = {};
    if (!otherData.firstName.trim()) newErrors.firstName = 'Required';
    if (!otherData.lastName.trim()) newErrors.lastName = 'Required';
    if (!otherData.email.trim()) newErrors.email = 'Required';
    if (otherData.email && !otherData.email.includes('@')) newErrors.email = 'Invalid email';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const { error } = await supabase
        .from('nominees')
        .insert({
          competition_id: competitionId,
          name: `${otherData.firstName} ${otherData.lastName}`.trim(),
          email: otherData.email,
          nominated_by: 'third_party',
          nominator_id: user?.id || null,
          nominator_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : null,
          status: 'pending',
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('This person has already been nominated.');
        }
        throw error;
      }

      toast.success('Nomination submitted!');
      setStep('success');
    } catch (err) {
      console.error('Nomination error:', err);
      toast.error(err.message || 'Failed to submit');
      setErrors({ submit: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // ACCOUNT CREATION (Optional)
  // ============================================
  const handleAccountSubmit = async () => {
    if (accountData.password.length < 8) {
      setErrors({ password: 'Password must be at least 8 characters' });
      return;
    }

    if (accountMode === 'signup' && accountData.password !== accountData.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      let userData;

      if (accountMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: accountData.password,
        });
        if (error) throw error;
        userData = data.user;
        toast.success('Logged in!');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: accountData.password,
          options: {
            data: {
              first_name: formData.firstName,
              last_name: formData.lastName,
            }
          }
        });

        if (error?.message?.toLowerCase().includes('already')) {
          setAccountMode('login');
          setErrors({ password: 'Account exists. Enter your password to log in.' });
          setIsSubmitting(false);
          return;
        }

        if (error) throw error;
        userData = data.user;
        toast.success('Account created!');
      }

      // Link nominee to user
      if (userData && nomineeId) {
        await supabase
          .from('nominees')
          .update({ user_id: userData.id })
          .eq('id', nomineeId);
      }

      setStep('success');
    } catch (err) {
      console.error('Account error:', err);
      if (err.message?.toLowerCase().includes('invalid')) {
        setErrors({ password: 'Invalid password' });
      } else {
        setErrors({ password: err.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // RENDER: Choose Type
  // ============================================
  if (step === 'choose') {
    return (
      <div style={{ textAlign: 'center', padding: spacing.xl }}>
        <Crown size={48} style={{ color: colors.gold.primary, marginBottom: spacing.lg }} />

        <h2 style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, marginBottom: spacing.sm }}>
          Join the Competition
        </h2>
        <p style={{ color: colors.text.secondary, marginBottom: spacing.xxl }}>
          Apply to compete or nominate someone you know
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md, maxWidth: '300px', margin: '0 auto' }}>
          <Button onClick={() => setStep('self-form')} style={{ width: '100%' }}>
            <User size={18} style={{ marginRight: spacing.sm }} />
            Apply to Compete
          </Button>

          <Button variant="secondary" onClick={() => setStep('other-form')} style={{ width: '100%' }}>
            <Users size={18} style={{ marginRight: spacing.sm }} />
            Nominate Someone
          </Button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Self Nomination Form
  // ============================================
  if (step === 'self-form') {
    return (
      <div style={{ padding: spacing.lg, maxWidth: '400px', margin: '0 auto' }}>
        <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, textAlign: 'center', marginBottom: spacing.xl }}>
          Apply to Compete
        </h3>

        {/* Photo (Optional) */}
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
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: formData.photo ? `url(${formData.photo}) center/cover` : colors.background.secondary,
              border: `2px dashed ${colors.border.light}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              margin: '0 auto',
            }}
          >
            {!formData.photo && <Camera size={28} style={{ color: colors.text.muted }} />}
          </div>
          <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.sm }}>
            Photo (optional)
          </p>
        </div>

        {/* Name */}
        <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.md }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>First Name *</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              style={{ ...inputStyle, borderColor: errors.firstName ? colors.status.error : colors.border.light }}
              placeholder="First name"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Last Name *</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              style={{ ...inputStyle, borderColor: errors.lastName ? colors.status.error : colors.border.light }}
              placeholder="Last name"
            />
          </div>
        </div>

        {/* Email */}
        <div style={{ marginBottom: spacing.lg }}>
          <label style={labelStyle}>Email *</label>
          <div style={{ position: 'relative' }}>
            <Mail size={18} style={{ position: 'absolute', left: spacing.md, top: '50%', transform: 'translateY(-50%)', color: colors.text.muted }} />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              style={{ ...inputStyle, paddingLeft: '44px', borderColor: errors.email ? colors.status.error : colors.border.light }}
              placeholder="your@email.com"
            />
          </div>
          {errors.email && <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>{errors.email}</p>}
        </div>

        {errors.submit && (
          <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginBottom: spacing.md, textAlign: 'center' }}>
            {errors.submit}
          </p>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: spacing.md }}>
          <Button variant="secondary" onClick={() => setStep('choose')} style={{ flex: 1 }}>
            Back
          </Button>
          <Button onClick={handleSelfSubmit} disabled={isSubmitting} style={{ flex: 1 }}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Third-Party Nomination Form
  // ============================================
  if (step === 'other-form') {
    return (
      <div style={{ padding: spacing.lg, maxWidth: '400px', margin: '0 auto' }}>
        <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, textAlign: 'center', marginBottom: spacing.xl }}>
          Nominate Someone
        </h3>

        <p style={{ color: colors.text.secondary, textAlign: 'center', marginBottom: spacing.xl }}>
          Know someone who deserves to compete? Nominate them!
        </p>

        {/* Name */}
        <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.md }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Their First Name *</label>
            <input
              type="text"
              value={otherData.firstName}
              onChange={(e) => setOtherData(prev => ({ ...prev, firstName: e.target.value }))}
              style={{ ...inputStyle, borderColor: errors.firstName ? colors.status.error : colors.border.light }}
              placeholder="First name"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Their Last Name *</label>
            <input
              type="text"
              value={otherData.lastName}
              onChange={(e) => setOtherData(prev => ({ ...prev, lastName: e.target.value }))}
              style={{ ...inputStyle, borderColor: errors.lastName ? colors.status.error : colors.border.light }}
              placeholder="Last name"
            />
          </div>
        </div>

        {/* Email */}
        <div style={{ marginBottom: spacing.lg }}>
          <label style={labelStyle}>Their Email *</label>
          <div style={{ position: 'relative' }}>
            <Mail size={18} style={{ position: 'absolute', left: spacing.md, top: '50%', transform: 'translateY(-50%)', color: colors.text.muted }} />
            <input
              type="email"
              value={otherData.email}
              onChange={(e) => setOtherData(prev => ({ ...prev, email: e.target.value }))}
              style={{ ...inputStyle, paddingLeft: '44px', borderColor: errors.email ? colors.status.error : colors.border.light }}
              placeholder="their@email.com"
            />
          </div>
          {errors.email && <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>{errors.email}</p>}
        </div>

        {errors.submit && (
          <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginBottom: spacing.md, textAlign: 'center' }}>
            {errors.submit}
          </p>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: spacing.md }}>
          <Button variant="secondary" onClick={() => setStep('choose')} style={{ flex: 1 }}>
            Back
          </Button>
          <Button onClick={handleOtherSubmit} disabled={isSubmitting} style={{ flex: 1 }}>
            {isSubmitting ? 'Submitting...' : 'Nominate'}
          </Button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Account Creation (Optional)
  // ============================================
  if (step === 'account') {
    return (
      <div style={{ padding: spacing.lg, maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
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

        <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, marginBottom: spacing.sm }}>
          Nomination Submitted!
        </h3>

        <p style={{ color: colors.text.secondary, marginBottom: spacing.xl }}>
          {accountMode === 'login'
            ? 'Log in to track your application status'
            : 'Create an account to track your application and complete your profile'
          }
        </p>

        {/* Password Field */}
        <div style={{ marginBottom: spacing.md, textAlign: 'left' }}>
          <label style={labelStyle}>{accountMode === 'login' ? 'Password' : 'Create Password'}</label>
          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: spacing.md, top: '50%', transform: 'translateY(-50%)', color: colors.text.muted }} />
            <input
              type={accountData.showPassword ? 'text' : 'password'}
              value={accountData.password}
              onChange={(e) => setAccountData(prev => ({ ...prev, password: e.target.value }))}
              style={{ ...inputStyle, paddingLeft: '44px', paddingRight: '44px', borderColor: errors.password ? colors.status.error : colors.border.light }}
              placeholder={accountMode === 'login' ? 'Enter password' : 'Create password'}
            />
            <button
              type="button"
              onClick={() => setAccountData(prev => ({ ...prev, showPassword: !prev.showPassword }))}
              style={{ position: 'absolute', right: spacing.md, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: colors.text.muted, cursor: 'pointer' }}
            >
              {accountData.showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Confirm Password (signup only) */}
        {accountMode === 'signup' && (
          <div style={{ marginBottom: spacing.md, textAlign: 'left' }}>
            <label style={labelStyle}>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: spacing.md, top: '50%', transform: 'translateY(-50%)', color: colors.text.muted }} />
              <input
                type={accountData.showPassword ? 'text' : 'password'}
                value={accountData.confirmPassword}
                onChange={(e) => setAccountData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                style={{ ...inputStyle, paddingLeft: '44px', borderColor: errors.confirmPassword ? colors.status.error : colors.border.light }}
                placeholder="Confirm password"
              />
            </div>
          </div>
        )}

        {(errors.password || errors.confirmPassword) && (
          <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginBottom: spacing.md }}>
            {errors.password || errors.confirmPassword}
          </p>
        )}

        <Button onClick={handleAccountSubmit} disabled={isSubmitting} style={{ width: '100%', marginBottom: spacing.md }}>
          {isSubmitting ? 'Please wait...' : (accountMode === 'login' ? 'Log In' : 'Create Account')}
        </Button>

        <button
          type="button"
          onClick={() => setStep('success')}
          style={{
            background: 'none',
            border: 'none',
            color: colors.text.muted,
            fontSize: typography.fontSize.sm,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Skip for now
        </button>

        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.lg }}>
          You can create an account later from the competition page
        </p>
      </div>
    );
  }

  // ============================================
  // RENDER: Success
  // ============================================
  if (step === 'success') {
    return (
      <div style={{ textAlign: 'center', padding: spacing.xxxl }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, rgba(74,222,128,0.3), rgba(74,222,128,0.1))',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          marginBottom: spacing.xl,
        }}>
          <Check size={40} style={{ color: colors.status.success }} />
        </div>

        <h2 style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, marginBottom: spacing.md }}>
          You're In!
        </h2>

        <p style={{ color: colors.text.secondary, marginBottom: spacing.xl, maxWidth: '300px', margin: '0 auto', lineHeight: 1.6 }}>
          Your nomination has been submitted. The host will review and notify you by email.
        </p>

        <Button onClick={onClose} style={{ minWidth: '200px', marginTop: spacing.xl }}>
          Done
        </Button>
      </div>
    );
  }

  return null;
}
