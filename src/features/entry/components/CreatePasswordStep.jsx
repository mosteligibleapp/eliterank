import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Mail } from 'lucide-react';

/**
 * CreatePasswordStep - Account creation for nominees without a password
 *
 * Shown for:
 * - Not-logged-in self-nominees (create account)
 * - Magic-link third-party nominees (set password)
 * - Third-party nominees with no account (create account)
 *
 * "Skip for now" is allowed — data is already persisted from the details step.
 */
export default function CreatePasswordStep({
  email,
  onSubmit,
  onSkip,
  isSubmitting,
  error,
  isSettingPassword, // true = existing user setting password, false = new signup
}) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (!password || password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    onSubmit(password);
  };

  return (
    <form className="entry-step entry-step-password" onSubmit={handleSubmit}>
      <h2 className="entry-step-title">
        {isSettingPassword ? 'Set your password' : 'Create your account'}
      </h2>
      <p className="entry-step-subtitle">
        {isSettingPassword
          ? 'So you can log back in anytime'
          : 'Save your entry and track your progress'}
      </p>

      {/* Show email (read-only) */}
      {email && (
        <div className="entry-form-field">
          <label className="entry-label">Email</label>
          <div className="entry-input-icon">
            <Mail size={18} />
            <input
              type="email"
              className="entry-input"
              value={email}
              disabled
              style={{ opacity: 0.6 }}
            />
          </div>
        </div>
      )}

      <div className="entry-form-field">
        <label className="entry-label">Password *</label>
        <div className="entry-input-icon entry-input-password">
          <Lock size={18} />
          <input
            type={showPassword ? 'text' : 'password'}
            className="entry-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete="new-password"
          />
          <button
            type="button"
            className="entry-password-toggle"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="entry-form-field">
        <label className="entry-label">Confirm Password *</label>
        <div className="entry-input-icon">
          <Lock size={18} />
          <input
            type={showPassword ? 'text' : 'password'}
            className="entry-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            autoComplete="new-password"
          />
        </div>
      </div>

      {(validationError || error) && (
        <p className="entry-error">{validationError || error}</p>
      )}

      <button
        type="submit"
        className="entry-btn-primary"
        disabled={isSubmitting}
      >
        {isSubmitting
          ? (isSettingPassword ? 'Setting password...' : 'Creating account...')
          : (isSettingPassword ? 'Set Password & Continue' : 'Create Account & Continue')}
      </button>

      <button
        type="button"
        className="entry-btn-done"
        onClick={onSkip}
        disabled={isSubmitting}
      >
        Skip for now
      </button>
    </form>
  );
}
