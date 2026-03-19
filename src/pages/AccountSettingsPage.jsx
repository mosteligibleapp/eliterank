/**
 * AccountSettingsPage - Change password, email, and phone number
 */

import React, { useState, useCallback } from 'react';
import { Lock, Mail, Phone, Eye, EyeOff, Check, AlertCircle, Settings } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { useAuthStore } from '../stores';
import { supabase } from '../lib/supabase';
import { colors, spacing, borderRadius, typography, transitions, shadows } from '../styles/theme';
import { useResponsive } from '../hooks/useResponsive';
import { useToast } from '../contexts/ToastContext';

const styles = {
  page: {
    minHeight: '100vh',
    background: colors.background.primary,
  },
  container: {
    maxWidth: '560px',
    margin: '0 auto',
    padding: spacing.xl,
  },
  section: {
    background: colors.background.secondary,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.border.secondary}`,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    padding: `${spacing.lg} ${spacing.xl}`,
    borderBottom: `1px solid ${colors.border.secondary}`,
  },
  sectionIcon: {
    width: '36px',
    height: '36px',
    borderRadius: borderRadius.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  sectionBody: {
    padding: spacing.xl,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    display: 'block',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  inputWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: spacing.md,
    color: colors.text.muted,
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: `${spacing.md} ${spacing.lg}`,
    paddingLeft: '40px',
    background: colors.background.tertiary,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.md,
    color: colors.text.primary,
    fontSize: typography.fontSize.md,
    outline: 'none',
    transition: `border-color ${transitions.fast}`,
  },
  inputFocused: {
    borderColor: colors.border.focus,
    boxShadow: shadows.focus,
  },
  passwordToggle: {
    position: 'absolute',
    right: spacing.md,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: colors.text.muted,
    padding: spacing.xs,
    display: 'flex',
    alignItems: 'center',
  },
  button: {
    width: '100%',
    padding: `${spacing.md} ${spacing.lg}`,
    background: colors.gold.primary,
    color: colors.text.inverse,
    border: 'none',
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  success: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: `${spacing.md} ${spacing.lg}`,
    background: colors.status.successMuted,
    borderRadius: borderRadius.md,
    color: colors.status.success,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.lg,
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: `${spacing.md} ${spacing.lg}`,
    background: colors.status.errorMuted,
    borderRadius: borderRadius.md,
    color: colors.status.error,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.lg,
  },
  currentValue: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginBottom: spacing.lg,
  },
};

function PasswordSection() {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');

    if (!currentPassword) {
      setError('Current password is required');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      // Verify current password by re-authenticating
      const { data: { user } } = await supabase.auth.getUser();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        setError('Current password is incorrect');
        setSaving(false);
        return;
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;

      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  }, [currentPassword, newPassword, confirmPassword, toast]);

  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <div style={{ ...styles.sectionIcon, background: colors.accent.purpleMuted }}>
          <Lock size={18} color={colors.accent.purple} />
        </div>
        <span style={styles.sectionTitle}>Change Password</span>
      </div>
      <form onSubmit={handleSubmit} style={styles.sectionBody}>
        {error && (
          <div style={styles.error}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div style={styles.field}>
          <label style={styles.label}>Current Password</label>
          <div style={styles.inputWrap}>
            <Lock size={16} style={styles.inputIcon} />
            <input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              style={styles.input}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              style={styles.passwordToggle}
            >
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>New Password</label>
          <div style={styles.inputWrap}>
            <Lock size={16} style={styles.inputIcon} />
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              style={styles.input}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              style={styles.passwordToggle}
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Confirm New Password</label>
          <div style={styles.inputWrap}>
            <Lock size={16} style={styles.inputIcon} />
            <input
              type={showNew ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              style={styles.input}
              autoComplete="new-password"
            />
          </div>
        </div>

        <button
          type="submit"
          style={{ ...styles.button, ...(saving ? styles.buttonDisabled : {}) }}
          disabled={saving}
        >
          {saving ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}

function EmailSection() {
  const toast = useToast();
  const user = useAuthStore(s => s.user);
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) {
      setError('Email is required');
      return;
    }
    if (trimmed === user?.email?.toLowerCase()) {
      setError('This is already your current email');
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        email: trimmed,
      });
      if (updateError) throw updateError;

      setSuccess('A confirmation link has been sent to your new email address. Please check your inbox to verify the change.');
      setNewEmail('');
    } catch (err) {
      setError(err.message || 'Failed to update email');
    } finally {
      setSaving(false);
    }
  }, [newEmail, user?.email, toast]);

  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <div style={{ ...styles.sectionIcon, background: colors.status.infoMuted }}>
          <Mail size={18} color={colors.status.info} />
        </div>
        <span style={styles.sectionTitle}>Change Email</span>
      </div>
      <form onSubmit={handleSubmit} style={styles.sectionBody}>
        <p style={styles.currentValue}>
          Current email: <strong style={{ color: colors.text.primary }}>{user?.email}</strong>
        </p>

        {error && (
          <div style={styles.error}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}
        {success && (
          <div style={styles.success}>
            <Check size={16} />
            {success}
          </div>
        )}

        <div style={styles.field}>
          <label style={styles.label}>New Email Address</label>
          <div style={styles.inputWrap}>
            <Mail size={16} style={styles.inputIcon} />
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Enter new email address"
              style={styles.input}
              autoComplete="email"
            />
          </div>
        </div>

        <button
          type="submit"
          style={{ ...styles.button, ...(saving ? styles.buttonDisabled : {}) }}
          disabled={saving}
        >
          {saving ? 'Sending verification...' : 'Update Email'}
        </button>
      </form>
    </div>
  );
}

function PhoneSection() {
  const toast = useToast();
  const profile = useAuthStore(s => s.profile);
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');

    const trimmed = phone.trim();

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ phone: trimmed || null, updated_at: new Date().toISOString() })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      // Update Zustand store
      useAuthStore.getState().setProfile({ ...profile, phone: trimmed || null });
      window.dispatchEvent(new Event('profile-updated'));
      toast.success('Phone number updated');
    } catch (err) {
      setError(err.message || 'Failed to update phone number');
    } finally {
      setSaving(false);
    }
  }, [phone, profile, toast]);

  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <div style={{ ...styles.sectionIcon, background: colors.status.successMuted }}>
          <Phone size={18} color={colors.status.success} />
        </div>
        <span style={styles.sectionTitle}>Phone Number</span>
      </div>
      <form onSubmit={handleSubmit} style={styles.sectionBody}>
        {error && (
          <div style={styles.error}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div style={styles.field}>
          <label style={styles.label}>Phone Number</label>
          <div style={styles.inputWrap}>
            <Phone size={16} style={styles.inputIcon} />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              style={styles.input}
              autoComplete="tel"
            />
          </div>
        </div>

        <button
          type="submit"
          style={{ ...styles.button, ...(saving ? styles.buttonDisabled : {}) }}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Phone Number'}
        </button>
      </form>
    </div>
  );
}

export default function AccountSettingsPage() {
  const { isMobile } = useResponsive();

  return (
    <div style={styles.page}>
      <PageHeader title="Account Settings" />
      <div style={{
        ...styles.container,
        padding: isMobile ? spacing.lg : spacing.xl,
      }}>
        <PasswordSection />
        <EmailSection />
        <PhoneSection />
      </div>
    </div>
  );
}
