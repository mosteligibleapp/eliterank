import React, { useState } from 'react';
import { Crown, Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import { colors, gradients, shadows, borderRadius, spacing, typography } from '../../styles/theme';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock validation - accept any email/password for demo
    if (email && password) {
      onLogin({
        email,
        name: email.split('@')[0],
      });
    } else {
      setError('Please enter both email and password');
    }
    setIsLoading(false);
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
    maxWidth: '420px',
    boxShadow: shadows.goldLarge,
  };

  const logoStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: spacing.xxxl,
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
    gap: spacing.xl,
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
  };

  const errorStyle = {
    background: 'rgba(248,113,113,0.1)',
    border: `1px solid ${colors.status.error}`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.status.error,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  };

  const footerStyle = {
    marginTop: spacing.xxl,
    textAlign: 'center',
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  };

  const demoNoteStyle = {
    marginTop: spacing.xl,
    padding: spacing.lg,
    background: 'rgba(212,175,55,0.1)',
    border: `1px solid ${colors.border.gold}`,
    borderRadius: borderRadius.lg,
    fontSize: typography.fontSize.sm,
    color: colors.gold.primary,
    textAlign: 'center',
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
          <p style={subtitleStyle}>Host Dashboard Login</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={formStyle}>
          {error && <div style={errorStyle}>{error}</div>}

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Email Address</label>
            <div style={inputWrapperStyle}>
              <Mail size={18} style={inputIconStyle} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="host@eliterank.com"
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = colors.gold.primary;
                  e.target.style.boxShadow = `0 0 0 3px rgba(212,175,55,0.1)`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = colors.border.light;
                  e.target.style.boxShadow = 'none';
                }}
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
                placeholder="Enter your password"
                style={{ ...inputStyle, paddingRight: '44px' }}
                onFocus={(e) => {
                  e.target.style.borderColor = colors.gold.primary;
                  e.target.style.boxShadow = `0 0 0 3px rgba(212,175,55,0.1)`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = colors.border.light;
                  e.target.style.boxShadow = 'none';
                }}
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
                Signing in...
              </>
            ) : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Demo Note */}
        <div style={demoNoteStyle}>
          <strong>Demo Mode:</strong> Enter any email and password to login
        </div>

        {/* Footer */}
        <p style={footerStyle}>
          © 2025 EliteRank. All rights reserved.
        </p>
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
