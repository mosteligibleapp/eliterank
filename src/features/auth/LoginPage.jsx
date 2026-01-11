import React, { useState } from 'react';
import { Crown, Mail, Lock, LogIn, UserPlus, Eye, EyeOff, User, AlertCircle, CheckCircle, ArrowLeft, ArrowRight, Send } from 'lucide-react';
import { colors, gradients, shadows, borderRadius, spacing, typography } from '../../styles/theme';
import { useSupabaseAuth } from '../../hooks';
import { supabase } from '../../lib/supabase';

/**
 * LoginPage - Two-step authentication flow
 *
 * Step 1: Email entry
 * Step 2: Based on account status:
 *   - New user → Signup form (name + password)
 *   - Existing user with password → Password entry
 *   - Nominee without password → Create password form
 */
export default function LoginPage({ onLogin, onBack }) {
  // Flow state
  const [step, setStep] = useState('email'); // 'email', 'password', 'create-password', 'signup', 'magic-link-sent'
  const [isNominee, setIsNominee] = useState(false);

  // Form data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { signIn, signUp } = useSupabaseAuth();

  // Step 1: Check email and determine next step
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      // Check if user is a nominee (may not have password set)
      const { data: nomineeData } = await supabase
        .from('nominees')
        .select('id, name')
        .eq('email', email)
        .limit(1);

      const isNomineeUser = nomineeData && nomineeData.length > 0;
      setIsNominee(isNomineeUser);

      // Pre-fill name from nominee data if available
      if (isNomineeUser && nomineeData[0]?.name) {
        const nameParts = nomineeData[0].name.split(' ');
        setFirstName(nameParts[0] || '');
        setLastName(nameParts.slice(1).join(' ') || '');
      }

      // Try to check if user exists by attempting OTP (won't create user)
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      });

      // If error contains "Signups not allowed" or similar, user doesn't exist
      // If no error, user exists (OTP was sent but we won't use it)
      const userExists = !otpError || !otpError.message?.includes('Signups not allowed');

      if (!userExists) {
        // New user - go to signup
        setStep('signup');
      } else if (isNomineeUser) {
        // Existing user who is a nominee - likely needs to create password
        // Show create password form with magic link option
        setStep('create-password');
      } else {
        // Regular existing user - show password field
        setStep('password');
      }
    } catch (err) {
      console.error('Email check error:', err);
      // Default to password step on error
      setStep('password');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password login
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      const { user, error: signInError } = await signIn(email, password);

      if (signInError) {
        setError(signInError);
      } else if (user) {
        onLogin({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.first_name || email.split('@')[0],
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle create password (for nominees)
  const handleCreatePassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      // Try to update password - this works if user is already authenticated via magic link
      // For users without session, we need to sign them up or use password recovery

      // First try signing up (in case account was pre-created without password)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message?.includes('already registered')) {
          // User exists - they need to use password reset flow
          // Send password reset email
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}?reset=true`,
          });

          if (resetError) {
            setError('Unable to set password. Please try the magic link option.');
          } else {
            setSuccess('Password reset email sent! Check your inbox to set your password.');
          }
        } else {
          setError(signUpError.message);
        }
      } else if (signUpData?.user) {
        // Sign up successful - they may need to confirm email
        if (signUpData.user.identities?.length === 0) {
          // User already existed, try to sign in
          const { user, error: signInError } = await signIn(email, password);
          if (signInError) {
            setError('Account exists. Please check your email for a confirmation link.');
          } else if (user) {
            onLogin({
              id: user.id,
              email: user.email,
              name: user.user_metadata?.first_name || firstName || email.split('@')[0],
            });
          }
        } else {
          setSuccess('Account created! Please check your email to confirm.');
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to create password');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle signup (new users)
  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (!firstName || !lastName) {
      setError('Please enter your first and last name');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const { user, error: signUpError } = await signUp(email, password, {
        first_name: firstName,
        last_name: lastName,
      });

      if (signUpError) {
        setError(signUpError);
      } else if (user) {
        setSuccess('Account created! Please check your email to confirm your account.');
      }
    } catch (err) {
      setError(err.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  // Send magic link
  const handleSendMagicLink = async () => {
    setIsLoading(true);
    setError('');

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (otpError) {
        setError(otpError.message || 'Failed to send sign-in link');
      } else {
        setStep('magic-link-sent');
      }
    } catch (err) {
      setError(err.message || 'Failed to send sign-in link');
    } finally {
      setIsLoading(false);
    }
  };

  // Go back to email step
  const handleBack = () => {
    setStep('email');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  // Styles
  const containerStyle = {
    minHeight: '100vh',
    background: gradients.background,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    fontFamily: typography.fontFamily,
  };

  const cardStyle = {
    background: colors.background.card,
    border: `1px solid ${colors.border.gold}`,
    borderRadius: borderRadius.xxl,
    padding: spacing.xxxl,
    width: '100%',
    maxWidth: '440px',
    boxShadow: shadows.goldLarge,
  };

  const logoStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  };

  const logoIconStyle = {
    width: '64px',
    height: '64px',
    background: gradients.gold,
    borderRadius: borderRadius.xl,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#0a0a0f',
    boxShadow: shadows.goldLarge,
    marginBottom: spacing.lg,
  };

  const titleStyle = {
    fontSize: typography.fontSize.hero,
    fontWeight: typography.fontWeight.bold,
    background: gradients.gold,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: spacing.sm,
  };

  const subtitleStyle = {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
  };

  const formStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  };

  const inputGroupStyle = {
    position: 'relative',
  };

  const labelStyle = {
    display: 'block',
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    fontWeight: typography.fontWeight.medium,
  };

  const inputWrapperStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  };

  const inputIconStyle = {
    position: 'absolute',
    left: spacing.md,
    color: colors.text.muted,
    pointerEvents: 'none',
  };

  const inputStyle = {
    width: '100%',
    padding: `${spacing.md} ${spacing.lg}`,
    paddingLeft: '44px',
    background: colors.background.secondary,
    border: `1px solid ${colors.border.light}`,
    borderRadius: borderRadius.lg,
    color: colors.text.primary,
    fontSize: typography.fontSize.md,
    outline: 'none',
    transition: 'all 0.2s ease',
  };

  const inputStyleNoIcon = {
    ...inputStyle,
    paddingLeft: spacing.lg,
  };

  const buttonStyle = {
    width: '100%',
    padding: spacing.lg,
    background: gradients.gold,
    border: 'none',
    borderRadius: borderRadius.lg,
    color: '#0a0a0f',
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    cursor: isLoading ? 'wait' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    boxShadow: shadows.gold,
    transition: 'all 0.2s ease',
    opacity: isLoading ? 0.7 : 1,
    marginTop: spacing.md,
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    background: 'transparent',
    border: `1px solid ${colors.gold.primary}`,
    color: colors.gold.primary,
    boxShadow: 'none',
  };

  const alertStyle = (type) => ({
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    background: type === 'error' ? 'rgba(248,113,113,0.1)' : 'rgba(74,222,128,0.1)',
    border: `1px solid ${type === 'error' ? colors.status.error : colors.status.success}`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: type === 'error' ? colors.status.error : colors.status.success,
    fontSize: typography.fontSize.sm,
  });

  const footerStyle = {
    marginTop: spacing.xl,
    textAlign: 'center',
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  };

  const handleInputFocus = (e) => {
    e.target.style.borderColor = colors.gold.primary;
    e.target.style.boxShadow = `0 0 0 3px rgba(212,175,55,0.1)`;
  };

  const handleInputBlur = (e) => {
    e.target.style.borderColor = colors.border.light;
    e.target.style.boxShadow = 'none';
  };

  // Get subtitle based on step
  const getSubtitle = () => {
    switch (step) {
      case 'email':
        return 'Enter your email to continue';
      case 'password':
        return 'Welcome back';
      case 'create-password':
        return 'Create your password';
      case 'signup':
        return 'Create your account';
      case 'magic-link-sent':
        return 'Check your email';
      default:
        return '';
    }
  };

  return (
    <div style={containerStyle}>
      {/* Background decoration */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.1) 0%, transparent 50%)',
          pointerEvents: 'none',
        }}
      />

      <div style={cardStyle}>
        {/* Back Button */}
        {onBack && step === 'email' && (
          <button
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              background: 'none',
              border: 'none',
              color: colors.text.secondary,
              fontSize: typography.fontSize.sm,
              cursor: 'pointer',
              marginBottom: spacing.lg,
              padding: 0,
            }}
          >
            <ArrowLeft size={16} />
            Back to competitions
          </button>
        )}

        {/* Back to email step */}
        {step !== 'email' && step !== 'magic-link-sent' && (
          <button
            onClick={handleBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              background: 'none',
              border: 'none',
              color: colors.text.secondary,
              fontSize: typography.fontSize.sm,
              cursor: 'pointer',
              marginBottom: spacing.lg,
              padding: 0,
            }}
          >
            <ArrowLeft size={16} />
            Change email
          </button>
        )}

        {/* Logo */}
        <div style={logoStyle}>
          <div style={logoIconStyle}>
            <Crown size={32} />
          </div>
          <h1 style={titleStyle}>EliteRank</h1>
          <p style={subtitleStyle}>{getSubtitle()}</p>
        </div>

        {/* Step: Email Entry */}
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} style={formStyle}>
            {error && (
              <div style={alertStyle('error')}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div style={inputGroupStyle}>
              <label style={labelStyle}>Email Address</label>
              <div style={inputWrapperStyle}>
                <Mail size={18} style={inputIconStyle} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={inputStyle}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <button type="submit" disabled={isLoading} style={buttonStyle}>
              {isLoading ? (
                <>
                  <span style={{
                    width: '18px',
                    height: '18px',
                    border: '2px solid rgba(0,0,0,0.3)',
                    borderTopColor: '#0a0a0f',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Checking...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Step: Password Entry (existing user) */}
        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} style={formStyle}>
            {error && (
              <div style={alertStyle('error')}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div style={{
              padding: spacing.md,
              background: 'rgba(255,255,255,0.03)',
              borderRadius: borderRadius.md,
              marginBottom: spacing.sm,
            }}>
              <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
                Signing in as
              </p>
              <p style={{ color: colors.text.primary, fontWeight: typography.fontWeight.medium }}>
                {email}
              </p>
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>Password</label>
              <div style={inputWrapperStyle}>
                <Lock size={18} style={inputIconStyle} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{ ...inputStyle, paddingRight: '44px' }}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  autoComplete="current-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: spacing.md,
                    background: 'none',
                    border: 'none',
                    color: colors.text.muted,
                    cursor: 'pointer',
                    padding: spacing.xs,
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} style={buttonStyle}>
              {isLoading ? (
                <>
                  <span style={{
                    width: '18px',
                    height: '18px',
                    border: '2px solid rgba(0,0,0,0.3)',
                    borderTopColor: '#0a0a0f',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSendMagicLink}
              disabled={isLoading}
              style={secondaryButtonStyle}
            >
              <Send size={16} />
              Send me a sign-in link instead
            </button>
          </form>
        )}

        {/* Step: Create Password (nominee without password) */}
        {step === 'create-password' && (
          <form onSubmit={handleCreatePassword} style={formStyle}>
            {error && (
              <div style={alertStyle('error')}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {success && (
              <div style={alertStyle('success')}>
                <CheckCircle size={16} />
                {success}
              </div>
            )}

            <div style={{
              padding: spacing.md,
              background: 'rgba(212, 175, 55, 0.1)',
              border: `1px solid ${colors.border.gold}`,
              borderRadius: borderRadius.md,
              marginBottom: spacing.sm,
            }}>
              <p style={{ color: colors.gold.primary, fontSize: typography.fontSize.sm, marginBottom: spacing.xs }}>
                You were nominated!
              </p>
              <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                Create a password to access your account and claim your nomination.
              </p>
            </div>

            <div style={{
              padding: spacing.md,
              background: 'rgba(255,255,255,0.03)',
              borderRadius: borderRadius.md,
            }}>
              <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
                Creating account for
              </p>
              <p style={{ color: colors.text.primary, fontWeight: typography.fontWeight.medium }}>
                {email}
              </p>
            </div>

            {/* Name fields - pre-filled from nominee data */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>First Name</label>
                <div style={inputWrapperStyle}>
                  <User size={18} style={inputIconStyle} />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    style={inputStyle}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                </div>
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  style={inputStyleNoIcon}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
              </div>
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>Create Password</label>
              <div style={inputWrapperStyle}>
                <Lock size={18} style={inputIconStyle} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  style={{ ...inputStyle, paddingRight: '44px' }}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  autoComplete="new-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: spacing.md,
                    background: 'none',
                    border: 'none',
                    color: colors.text.muted,
                    cursor: 'pointer',
                    padding: spacing.xs,
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>Confirm Password</label>
              <div style={inputWrapperStyle}>
                <Lock size={18} style={inputIconStyle} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  style={inputStyle}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button type="submit" disabled={isLoading || !!success} style={buttonStyle}>
              {isLoading ? (
                <>
                  <span style={{
                    width: '18px',
                    height: '18px',
                    border: '2px solid rgba(0,0,0,0.3)',
                    borderTopColor: '#0a0a0f',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Create Password & Continue
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: spacing.md }}>
              <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm, marginBottom: spacing.sm }}>
                Or sign in without a password
              </p>
              <button
                type="button"
                onClick={handleSendMagicLink}
                disabled={isLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.gold.primary,
                  cursor: 'pointer',
                  fontSize: typography.fontSize.sm,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: spacing.xs,
                }}
              >
                <Send size={14} />
                Send me a magic link
              </button>
            </div>
          </form>
        )}

        {/* Step: Signup (new user) */}
        {step === 'signup' && (
          <form onSubmit={handleSignup} style={formStyle}>
            {error && (
              <div style={alertStyle('error')}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {success && (
              <div style={alertStyle('success')}>
                <CheckCircle size={16} />
                {success}
              </div>
            )}

            <div style={{
              padding: spacing.md,
              background: 'rgba(255,255,255,0.03)',
              borderRadius: borderRadius.md,
            }}>
              <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
                Creating account for
              </p>
              <p style={{ color: colors.text.primary, fontWeight: typography.fontWeight.medium }}>
                {email}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>First Name</label>
                <div style={inputWrapperStyle}>
                  <User size={18} style={inputIconStyle} />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    style={inputStyle}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    autoFocus
                  />
                </div>
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  style={inputStyleNoIcon}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
              </div>
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>Password</label>
              <div style={inputWrapperStyle}>
                <Lock size={18} style={inputIconStyle} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  style={{ ...inputStyle, paddingRight: '44px' }}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: spacing.md,
                    background: 'none',
                    border: 'none',
                    color: colors.text.muted,
                    cursor: 'pointer',
                    padding: spacing.xs,
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>Confirm Password</label>
              <div style={inputWrapperStyle}>
                <Lock size={18} style={inputIconStyle} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  style={inputStyle}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button type="submit" disabled={isLoading || !!success} style={buttonStyle}>
              {isLoading ? (
                <>
                  <span style={{
                    width: '18px',
                    height: '18px',
                    border: '2px solid rgba(0,0,0,0.3)',
                    borderTopColor: '#0a0a0f',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Create Account
                </>
              )}
            </button>
          </form>
        )}

        {/* Step: Magic Link Sent */}
        {step === 'magic-link-sent' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'rgba(74, 222, 128, 0.1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <Mail size={32} style={{ color: colors.status.success }} />
            </div>
            <p style={{
              color: colors.text.primary,
              fontSize: typography.fontSize.md,
              marginBottom: spacing.md,
              lineHeight: 1.6,
            }}>
              We sent a sign-in link to <strong>{email}</strong>
            </p>
            <p style={{
              color: colors.text.secondary,
              fontSize: typography.fontSize.sm,
              marginBottom: spacing.xl,
              lineHeight: 1.6,
            }}>
              Click the link in your email to sign in. The link will expire in 1 hour.
            </p>
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setPassword('');
                setConfirmPassword('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: colors.gold.primary,
                cursor: 'pointer',
                fontSize: typography.fontSize.sm,
                textDecoration: 'underline',
              }}
            >
              Back to login
            </button>
          </div>
        )}

        {/* Footer */}
        <p style={footerStyle}>© 2025 EliteRank. All rights reserved.</p>
      </div>

      {/* CSS Animation for spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
