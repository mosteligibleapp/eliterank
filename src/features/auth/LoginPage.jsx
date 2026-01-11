import React, { useState } from 'react';
import { Crown, Mail, Lock, LogIn, UserPlus, Eye, EyeOff, User, AlertCircle, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { colors, gradients, shadows, borderRadius, spacing, typography } from '../../styles/theme';
import { useSupabaseAuth } from '../../hooks';
import { supabase } from '../../lib/supabase';

/**
 * LoginPage - Two-step authentication flow
 *
 * Step 1: Email entry
 * Step 2: Based on account status:
 *   - Nominee without profile → Show nomination popup with magic link option
 *   - Existing user (including claimed nominees) → Password entry with forgot password option
 *   - New user → Signup form (name + password)
 */
export default function LoginPage({ onLogin, onBack }) {
  // Flow state
  const [step, setStep] = useState('email'); // 'email', 'password', 'signup', 'nominee-popup', 'magic-link-sent'
  const [isNominee, setIsNominee] = useState(false);
  const [nomineeData, setNomineeData] = useState(null); // Store nominee info for magic link

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
      // Check if user is a nominee with pending (unclaimed) nomination
      const { data: nominees } = await supabase
        .from('nominees')
        .select(`
          id,
          name,
          email,
          invite_token,
          claimed_at,
          status,
          user_id,
          competition:competitions(id, city, season, status)
        `)
        .eq('email', email)
        .neq('status', 'rejected')
        .is('claimed_at', null)
        .limit(1);

      const hasUnclaimedNomination = nominees && nominees.length > 0;

      if (hasUnclaimedNomination) {
        // Nominee with unclaimed nomination - show nomination popup
        const nominee = nominees[0];
        setNomineeData(nominee);
        setIsNominee(true);

        // Pre-fill name from nominee data
        if (nominee.name) {
          const nameParts = nominee.name.split(' ');
          setFirstName(nameParts[0] || '');
          setLastName(nameParts.slice(1).join(' ') || '');
        }

        setStep('nominee-popup');
        setIsLoading(false);
        return;
      }

      // Check if they're a nominee with claimed nomination (has profile)
      const { data: claimedNominees } = await supabase
        .from('nominees')
        .select('id, name')
        .eq('email', email)
        .not('claimed_at', 'is', null)
        .limit(1);

      const isClaimedNominee = claimedNominees && claimedNominees.length > 0;
      setIsNominee(isClaimedNominee);

      // Pre-fill name from nominee data if available
      if (isClaimedNominee && claimedNominees[0]?.name) {
        const nameParts = claimedNominees[0].name.split(' ');
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
      } else {
        // Existing user (including claimed nominees) - show password field
        // If they don't have a password, they can use "Forgot password?" to set one
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

  // Send forgot password email
  const handleForgotPassword = async () => {
    setIsLoading(true);
    setError('');

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}?reset=true`,
      });

      if (resetError) {
        setError(resetError.message || 'Failed to send reset email');
      } else {
        setSuccess('Password reset email sent! Check your inbox.');
      }
    } catch (err) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  // Send magic link to nominee (for claiming nomination)
  const handleRequestMagicLink = async () => {
    if (!nomineeData?.invite_token) {
      setError('Unable to find your nomination. Please contact support.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Send magic link that redirects to the claim page
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/claim/${nomineeData.invite_token}`,
        },
      });

      if (otpError) {
        setError(otpError.message || 'Failed to send magic link');
      } else {
        setStep('magic-link-sent');
      }
    } catch (err) {
      setError(err.message || 'Failed to send magic link');
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
    setNomineeData(null);
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
        return isNominee ? 'Welcome back' : 'Welcome back';
      case 'signup':
        return 'Create your account';
      case 'nominee-popup':
        return "You've been nominated!";
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
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: spacing.md }}>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.text.secondary,
                  cursor: 'pointer',
                  fontSize: typography.fontSize.sm,
                  textDecoration: 'underline',
                }}
              >
                Forgot password?
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

        {/* Step: Nominee Popup (unclaimed nomination) */}
        {step === 'nominee-popup' && nomineeData && (
          <div style={formStyle}>
            {error && (
              <div style={alertStyle('error')}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Nomination announcement */}
            <div style={{
              padding: spacing.xl,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
              border: `1px solid ${colors.border.gold}`,
              borderRadius: borderRadius.lg,
              textAlign: 'center',
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                background: gradients.gold,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <Crown size={28} style={{ color: '#0a0a0f' }} />
              </div>
              <h3 style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.bold,
                color: colors.gold.primary,
                marginBottom: spacing.sm,
              }}>
                Congratulations, {nomineeData.name?.split(' ')[0] || 'Nominee'}!
              </h3>
              <p style={{
                fontSize: typography.fontSize.md,
                color: colors.text.secondary,
                marginBottom: spacing.md,
              }}>
                You've been nominated for
              </p>
              <p style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.primary,
              }}>
                Most Eligible {nomineeData.competition?.city} {nomineeData.competition?.season}
              </p>
            </div>

            {/* Email info */}
            <div style={{
              padding: spacing.md,
              background: 'rgba(255,255,255,0.03)',
              borderRadius: borderRadius.md,
            }}>
              <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
                Sending magic link to
              </p>
              <p style={{ color: colors.text.primary, fontWeight: typography.fontWeight.medium }}>
                {email}
              </p>
            </div>

            {/* Request magic link button */}
            <button
              onClick={handleRequestMagicLink}
              disabled={isLoading}
              style={buttonStyle}
            >
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
                  Sending...
                </>
              ) : (
                <>
                  <Mail size={18} />
                  Send Magic Link to Claim
                </>
              )}
            </button>

            <p style={{
              fontSize: typography.fontSize.sm,
              color: colors.text.muted,
              textAlign: 'center',
              marginTop: spacing.md,
            }}>
              We'll send you a secure link to accept or decline your nomination and set up your account.
            </p>
          </div>
        )}

        {/* Step: Magic Link Sent Confirmation */}
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
              <CheckCircle size={32} style={{ color: colors.status.success }} />
            </div>
            <h3 style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
              marginBottom: spacing.md,
            }}>
              Magic Link Sent!
            </h3>
            <p style={{
              fontSize: typography.fontSize.md,
              color: colors.text.secondary,
              marginBottom: spacing.lg,
              lineHeight: 1.6,
            }}>
              We sent a link to <strong style={{ color: colors.text.primary }}>{email}</strong>
            </p>
            <p style={{
              fontSize: typography.fontSize.sm,
              color: colors.text.muted,
              marginBottom: spacing.xl,
            }}>
              Click the link in your email to claim your nomination. The link will expire in 1 hour.
            </p>
            <button
              onClick={handleBack}
              style={{
                background: 'none',
                border: `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.lg,
                padding: `${spacing.md} ${spacing.xl}`,
                color: colors.text.secondary,
                fontSize: typography.fontSize.sm,
                cursor: 'pointer',
              }}
            >
              Use a different email
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
