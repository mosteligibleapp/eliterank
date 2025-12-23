import React, { useState } from 'react';
import { Crown, Mail, Lock, LogIn, UserPlus, Eye, EyeOff, User, AlertCircle, CheckCircle } from 'lucide-react';
import { colors, gradients, shadows, borderRadius, spacing, typography } from '../../styles/theme';
import { useSupabaseAuth } from '../../hooks';

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { signIn, signUp, isDemoMode } = useSupabaseAuth();

  const validateForm = () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return false;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    if (mode === 'signup') {
      if (!firstName || !lastName) {
        setError('Please enter your first and last name');
        return false;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    setIsLoading(true);

    // Mock login - bypass Supabase for testing
    // Super Admin login
    if (mode === 'login' && email === 'admin@eliterank.com' && password === 'superadmin123') {
      await new Promise(resolve => setTimeout(resolve, 500));
      onLogin({
        id: 'mock-super-admin-id',
        email: 'admin@eliterank.com',
        name: 'Super Admin',
        role: 'super_admin',
      });
      setIsLoading(false);
      return;
    }

    // Host login
    if (mode === 'login' && email === 'host@eliterank.com' && password === 'hostname123') {
      await new Promise(resolve => setTimeout(resolve, 500));
      onLogin({
        id: 'mock-host-id',
        email: 'host@eliterank.com',
        name: 'James Davidson',
        role: 'host',
      });
      setIsLoading(false);
      return;
    }

    try {
      if (mode === 'signup') {
        const { user, error } = await signUp(email, password, {
          first_name: firstName,
          last_name: lastName,
        });

        if (error) {
          setError(error);
        } else if (user) {
          if (isDemoMode) {
            // Demo mode - log in immediately
            onLogin({ email, name: `${firstName} ${lastName}` });
          } else {
            // Real Supabase - check for email confirmation
            setSuccess('Account created! Please check your email to confirm your account.');
            setMode('login');
          }
        }
      } else {
        const { user, error } = await signIn(email, password);

        if (error) {
          setError(error);
        } else if (user) {
          onLogin({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.first_name || email.split('@')[0],
          });
        }
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError('');
    setSuccess('');
  };

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
  };

  const formStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  };

  const rowStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.md,
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

  const passwordToggleStyle = {
    position: 'absolute',
    right: spacing.md,
    background: 'none',
    border: 'none',
    color: colors.text.muted,
    cursor: 'pointer',
    padding: spacing.xs,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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

  const switchStyle = {
    marginTop: spacing.xl,
    textAlign: 'center',
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  };

  const linkStyle = {
    color: colors.gold.primary,
    cursor: 'pointer',
    fontWeight: typography.fontWeight.medium,
    marginLeft: spacing.xs,
  };

  const demoNoteStyle = {
    marginTop: spacing.lg,
    padding: spacing.md,
    background: 'rgba(212,175,55,0.1)',
    border: `1px solid ${colors.border.gold}`,
    borderRadius: borderRadius.lg,
    fontSize: typography.fontSize.sm,
    color: colors.gold.primary,
    textAlign: 'center',
  };

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
        {/* Logo */}
        <div style={logoStyle}>
          <div style={logoIconStyle}>
            <Crown size={32} />
          </div>
          <h1 style={titleStyle}>EliteRank</h1>
          <p style={subtitleStyle}>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={formStyle}>
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

          {mode === 'signup' && (
            <div style={rowStyle}>
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
                  />
                </div>
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Last Name</label>
                <div style={inputWrapperStyle}>
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
                placeholder={mode === 'signup' ? 'Min. 6 characters' : 'Enter your password'}
                style={{ ...inputStyle, paddingRight: '44px' }}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={passwordToggleStyle}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Confirm Password</label>
              <div style={inputWrapperStyle}>
                <Lock size={18} style={inputIconStyle} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  style={inputStyle}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={buttonStyle}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = shadows.goldLarge;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = shadows.gold;
            }}
          >
            {isLoading ? (
              <>
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    border: '2px solid rgba(0,0,0,0.3)',
                    borderTopColor: '#0a0a0f',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                {mode === 'login' ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              <>
                {mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </>
            )}
          </button>
        </form>

        {/* Switch mode */}
        <p style={switchStyle}>
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          <span style={linkStyle} onClick={switchMode}>
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </span>
        </p>

        {/* Demo Note */}
        {isDemoMode && (
          <div style={demoNoteStyle}>
            <strong>Demo Mode:</strong> Supabase not configured. Any credentials work.
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
