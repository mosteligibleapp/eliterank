import React, { useState, useEffect, useRef } from 'react';
import { Crown, Check, X, AlertCircle, Clock, User, MapPin, Calendar, Camera, FileText, ArrowRight, Loader, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button, Input, Textarea } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';

/**
 * ClaimNominationPage - Unified claim flow
 *
 * User clicks magic link in email → lands here → Accept/Reject → Signup → Profile completion
 * Requires account creation before accepting to ensure they can log back in.
 */
export default function ClaimNominationPage({ token, onClose, onSuccess }) {
  const toast = useToast();
  const avatarInputRef = useRef(null);

  // Auth state
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Data state
  const [loading, setLoading] = useState(true);
  const [nominee, setNominee] = useState(null);
  const [competition, setCompetition] = useState(null);
  const [error, setError] = useState(null);

  // UI state
  const [stage, setStage] = useState('loading'); // 'loading', 'decide', 'set-password', 'signup', 'profile', 'success'
  const [processing, setProcessing] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false); // Track if authenticated user needs to set password

  // Set password form state (for users authenticated via magic link)
  const [setPasswordData, setSetPasswordData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [setPasswordErrors, setSetPasswordErrors] = useState({});

  // Signup form state
  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [signupErrors, setSignupErrors] = useState({});

  // Profile form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    avatarUrl: '',
    bio: '',
    city: '',
  });
  const [uploading, setUploading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);

          // Fetch profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          setProfile(profileData);
        }
      } catch (err) {
        console.error('Auth check error:', err);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes (magic link completion)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);

        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        setProfile(profileData);
        setAuthLoading(false);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Fetch nominee data
  useEffect(() => {
    const fetchNomination = async () => {
      if (!token) {
        setError('Invalid nomination link');
        setLoading(false);
        setStage('error');
        return;
      }

      try {
        const { data: nomineeData, error: nomineeError } = await supabase
          .from('nominees')
          .select(`
            *,
            competition:competitions(
              id,
              city,
              season,
              status,
              nomination_start,
              nomination_end,
              organization:organizations(name, logo_url, slug)
            )
          `)
          .eq('invite_token', token)
          .single();

        if (nomineeError || !nomineeData) {
          setError('Nomination not found. This link may be invalid or expired.');
          setLoading(false);
          setStage('error');
          return;
        }

        // Check if already converted to contestant (fully complete)
        if (nomineeData.converted_to_contestant) {
          setError('This nomination has already been fully processed.');
          setLoading(false);
          setStage('error');
          return;
        }

        // Check if rejected
        if (nomineeData.status === 'rejected') {
          setError('This nomination was previously declined.');
          setLoading(false);
          setStage('error');
          return;
        }

        // Check if nomination period ended
        const comp = nomineeData.competition;
        if (comp?.nomination_end) {
          const endDate = new Date(comp.nomination_end);
          if (new Date() > endDate) {
            setError('Sorry, the nomination period for this competition has ended.');
            setLoading(false);
            setStage('error');
            return;
          }
        }

        setNominee(nomineeData);
        setCompetition(comp);
        setLoading(false);

        // Determine which stage to show
        if (nomineeData.claimed_at) {
          // Already claimed - check if profile is complete
          // We'll check this after profile loads, for now go to profile stage
          // The profile stage will redirect to success if already complete
          setStage('profile');
        } else {
          setStage('decide');
        }
      } catch (err) {
        console.error('Error fetching nomination:', err);
        setError('Something went wrong. Please try again.');
        setLoading(false);
        setStage('error');
      }
    };

    fetchNomination();
  }, [token]);

  // Initialize form data when profile/nominee loads
  useEffect(() => {
    if (profile || nominee) {
      setFormData({
        firstName: profile?.first_name || nominee?.name?.split(' ')[0] || '',
        lastName: profile?.last_name || nominee?.name?.split(' ').slice(1).join(' ') || '',
        avatarUrl: profile?.avatar_url || '',
        bio: profile?.bio || '',
        city: profile?.city || competition?.city || '',
      });
    }
  }, [profile, nominee, competition]);

  // Check if profile is complete
  const isProfileComplete = () => {
    if (!profile) return false;
    return profile.first_name && profile.last_name && profile.avatar_url && profile.bio && profile.city;
  };

  // Handle Accept - check if user needs to create account or set password first
  const handleAccept = async () => {
    // If not authenticated, go to signup stage first
    if (!user) {
      // Pre-fill email from nominee data
      setSignupData(prev => ({
        ...prev,
        email: nominee?.email || '',
      }));
      setStage('signup');
      return;
    }

    // User is authenticated (likely via magic link) - require password setup before accepting
    // This ensures they can log back in later with a password
    setNeedsPassword(true);
    setStage('set-password');
  };

  // Handle Set Password - for users authenticated via magic link
  const handleSetPassword = async () => {
    // Validate
    const errors = {};
    if (!setPasswordData.password || setPasswordData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    if (setPasswordData.password !== setPasswordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setSetPasswordErrors(errors);
      return;
    }

    setProcessing(true);

    try {
      // Use updateUser to set password (works because user is already authenticated via magic link)
      const { error: updateError } = await supabase.auth.updateUser({
        password: setPasswordData.password,
      });

      if (updateError) throw updateError;

      toast.success('Password set successfully!');

      // Now proceed with accepting the nomination
      await completeAccept();
    } catch (err) {
      console.error('Set password error:', err);
      toast.error(err.message || 'Failed to set password. Please try again.');
      setProcessing(false);
    }
  };

  // Complete the accept process (called after signup or if already authenticated)
  const completeAccept = async () => {
    setProcessing(true);

    try {
      // Update nominee record
      const updateData = {
        claimed_at: new Date().toISOString(),
        user_id: user?.id,
      };

      const { error: updateError } = await supabase
        .from('nominees')
        .update(updateData)
        .eq('invite_token', token);

      if (updateError) throw updateError;

      // Check if profile needs completion
      if (!isProfileComplete()) {
        setStage('profile');
        toast.success('Nomination accepted! Please complete your profile.');
      } else {
        // Profile complete, go to success
        toast.success('Nomination accepted! You\'re in the running.');
        handleComplete();
      }
    } catch (err) {
      console.error('Error accepting nomination:', err);
      toast.error('Failed to accept nomination. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Handle Signup
  const handleSignup = async () => {
    // Validate
    const errors = {};
    if (!signupData.email || !signupData.email.includes('@')) {
      errors.email = 'Valid email required';
    }
    if (!signupData.password || signupData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    if (signupData.password !== signupData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setSignupErrors(errors);
      return;
    }

    setProcessing(true);

    try {
      // Try to sign up
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          data: {
            full_name: nominee?.name,
            nominee_id: nominee?.id,
          },
        },
      });

      if (signUpError) {
        // If user already exists (likely from invite), try to sign in or send magic link
        if (signUpError.message?.includes('already registered')) {
          // First try to sign in with the password they entered
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: signupData.email,
            password: signupData.password,
          });

          if (signInError) {
            // Password didn't work - send magic link instead
            const { error: otpError } = await supabase.auth.signInWithOtp({
              email: signupData.email,
              options: {
                emailRedirectTo: `${window.location.origin}/claim/${token}`,
              },
            });

            if (otpError) {
              toast.error('Failed to send sign-in link. Please try again.');
              setProcessing(false);
              return;
            }

            toast.success('Account found! Check your email for a sign-in link.');
            setSignupErrors({ email: 'Check your email for a sign-in link to continue' });
            setProcessing(false);
            return;
          }

          // Sign in succeeded
          setUser(signInData.user);

          // Fetch profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', signInData.user.id)
            .single();
          setProfile(profileData);
        } else {
          throw signUpError;
        }
      } else if (data?.user) {
        setUser(data.user);

        // Fetch or wait for profile to be created
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        setProfile(profileData);
      }

      toast.success('Account created!');

      // Now complete the accept process
      await completeAccept();
    } catch (err) {
      console.error('Signup error:', err);
      toast.error(err.message || 'Failed to create account. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async () => {
    if (!signupData.email || !signupData.email.includes('@')) {
      setSignupErrors({ email: 'Enter your email first' });
      return;
    }

    setProcessing(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(signupData.email, {
        redirectTo: `${window.location.origin}/claim/${token}`,
      });

      if (error) throw error;

      toast.success('Password reset email sent! Check your inbox.');
    } catch (err) {
      console.error('Password reset error:', err);
      toast.error('Failed to send reset email. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Handle Reject
  const handleReject = async () => {
    setProcessing(true);

    try {
      const updateData = {
        status: 'rejected',
      };

      if (user?.id) {
        updateData.user_id = user.id;
      }

      const { error: updateError } = await supabase
        .from('nominees')
        .update(updateData)
        .eq('invite_token', token);

      if (updateError) throw updateError;

      toast.success('Nomination declined');
      onClose?.();
    } catch (err) {
      console.error('Error rejecting nomination:', err);
      toast.error('Failed to decline nomination. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Handle profile field change
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Upload avatar
  const uploadImage = async (file) => {
    if (!file) return null;

    const maxSize = 4.5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Image too large. Please choose an image under 4.5MB.');
      return null;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file.');
      return null;
    }

    try {
      const timestamp = Date.now();
      const ext = file.name.split('.').pop();
      const filename = `avatars/${timestamp}.${ext}`;

      const response = await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, {
        method: 'POST',
        body: file,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      return data.url;
    } catch (error) {
      toast.error(`Upload failed: ${error.message}`);
      return null;
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const url = await uploadImage(file);
    if (url) {
      handleFieldChange('avatarUrl', url);
    }
    setUploading(false);
  };

  // Validate profile form
  const validateForm = () => {
    const errors = {};

    if (!formData.firstName.trim()) errors.firstName = 'Required';
    if (!formData.lastName.trim()) errors.lastName = 'Required';
    if (!formData.avatarUrl) errors.avatarUrl = 'Profile photo required';
    if (!formData.bio.trim()) errors.bio = 'Required';
    else if (formData.bio.trim().length < 20) errors.bio = 'At least 20 characters';
    if (!formData.city.trim()) errors.city = 'Required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save profile and complete
  const handleSaveProfile = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setProcessing(true);

    try {
      if (user?.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
            avatar_url: formData.avatarUrl,
            bio: formData.bio.trim(),
            city: formData.city.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (profileError) throw profileError;
      }

      toast.success('Profile saved! Your nomination is pending approval.');
      handleComplete();
    } catch (err) {
      console.error('Error saving profile:', err);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Navigate to competition page
  const handleComplete = () => {
    const orgSlug = competition?.organization?.slug || 'most-eligible';
    const citySlug = competition?.city
      ? competition.city.toLowerCase().replace(/\s+/g, '-').replace(/,/g, '')
      : '';
    const year = competition?.season || '';

    onSuccess?.();
  };

  // =========================================================================
  // RENDER: Loading
  // =========================================================================
  if (loading || authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid rgba(212, 175, 55, 0.2)',
            borderTopColor: colors.gold.primary,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: colors.text.secondary }}>Loading your nomination...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: Error
  // =========================================================================
  if (stage === 'error' || error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
        padding: spacing.xl,
      }}>
        <div style={{
          maxWidth: '400px',
          textAlign: 'center',
          background: colors.background.card,
          border: `1px solid ${colors.border.light}`,
          borderRadius: borderRadius.xl,
          padding: spacing.xxxl,
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <AlertCircle size={32} style={{ color: colors.status.error }} />
          </div>
          <h2 style={{
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.bold,
            color: '#fff',
            marginBottom: spacing.md,
          }}>
            Oops!
          </h2>
          <p style={{
            fontSize: typography.fontSize.md,
            color: colors.text.secondary,
            marginBottom: spacing.xl,
            lineHeight: 1.6,
          }}>
            {error}
          </p>
          <Button variant="secondary" onClick={onClose}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: Signup Form
  // =========================================================================
  if (stage === 'signup') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
        padding: spacing.xl,
      }}>
        <div style={{
          maxWidth: '440px',
          width: '100%',
          background: colors.background.card,
          border: `1px solid ${colors.border.light}`,
          borderRadius: borderRadius.xl,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
            padding: spacing.xl,
            textAlign: 'center',
            borderBottom: `1px solid ${colors.border.light}`,
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Crown size={32} style={{ color: colors.gold.primary }} />
            </div>
            <h1 style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              color: '#fff',
              marginBottom: spacing.sm,
            }}>
              Create Your Account
            </h1>
            <p style={{
              fontSize: typography.fontSize.md,
              color: colors.text.secondary,
            }}>
              Set up your account to accept your nomination
            </p>
          </div>

          {/* Signup Form */}
          <div style={{ padding: spacing.xl }}>
            {/* Email */}
            <div style={{ marginBottom: spacing.lg }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.xs,
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
                marginBottom: spacing.xs,
              }}>
                <Mail size={14} />
                Email
              </label>
              <Input
                type="email"
                value={signupData.email}
                onChange={(e) => {
                  setSignupData(prev => ({ ...prev, email: e.target.value }));
                  if (signupErrors.email) setSignupErrors(prev => ({ ...prev, email: null }));
                }}
                placeholder="you@example.com"
                error={signupErrors.email}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: spacing.lg }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.xs,
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
                marginBottom: spacing.xs,
              }}>
                <Lock size={14} />
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={signupData.password}
                  onChange={(e) => {
                    setSignupData(prev => ({ ...prev, password: e.target.value }));
                    if (signupErrors.password) setSignupErrors(prev => ({ ...prev, password: null }));
                  }}
                  placeholder="At least 6 characters"
                  error={signupErrors.password}
                  style={{ paddingRight: '48px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: colors.text.muted,
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: spacing.xl }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.xs,
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
                marginBottom: spacing.xs,
              }}>
                <Lock size={14} />
                Confirm Password
              </label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={signupData.confirmPassword}
                onChange={(e) => {
                  setSignupData(prev => ({ ...prev, confirmPassword: e.target.value }));
                  if (signupErrors.confirmPassword) setSignupErrors(prev => ({ ...prev, confirmPassword: null }));
                }}
                placeholder="Confirm your password"
                error={signupErrors.confirmPassword}
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSignup}
              disabled={processing}
              style={{ width: '100%' }}
            >
              {processing ? (
                <>
                  <Loader size={18} style={{ marginRight: 8, animation: 'spin 1s linear infinite' }} />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account & Accept
                  <ArrowRight size={18} style={{ marginLeft: 8 }} />
                </>
              )}
            </Button>

            {/* Already have account / Forgot password */}
            <div style={{
              marginTop: spacing.lg,
              textAlign: 'center',
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
            }}>
              <p style={{ marginBottom: spacing.xs }}>
                Already have an account? Enter your password above.
              </p>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={processing}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.gold.primary,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: typography.fontSize.sm,
                }}
              >
                Forgot your password?
              </button>
            </div>

            {/* Back button */}
            <button
              onClick={() => setStage('decide')}
              disabled={processing}
              style={{
                width: '100%',
                marginTop: spacing.md,
                padding: spacing.sm,
                background: 'transparent',
                border: 'none',
                color: colors.text.muted,
                fontSize: typography.fontSize.sm,
                cursor: 'pointer',
              }}
            >
              ← Back to nomination
            </button>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // =========================================================================
  // RENDER: Set Password (for users authenticated via magic link)
  // =========================================================================
  if (stage === 'set-password') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
        padding: spacing.xl,
      }}>
        <div style={{
          maxWidth: '440px',
          width: '100%',
          background: colors.background.card,
          border: `1px solid ${colors.border.light}`,
          borderRadius: borderRadius.xl,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
            padding: spacing.xl,
            textAlign: 'center',
            borderBottom: `1px solid ${colors.border.light}`,
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Lock size={32} style={{ color: colors.gold.primary }} />
            </div>
            <h1 style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              color: '#fff',
              marginBottom: spacing.sm,
            }}>
              Set Your Password
            </h1>
            <p style={{
              fontSize: typography.fontSize.md,
              color: colors.text.secondary,
            }}>
              Create a password so you can log in later
            </p>
          </div>

          {/* Form */}
          <div style={{ padding: spacing.xl }}>
            {/* Info message */}
            <div style={{
              background: 'rgba(212, 175, 55, 0.1)',
              border: `1px solid rgba(212, 175, 55, 0.2)`,
              borderRadius: borderRadius.md,
              padding: spacing.md,
              marginBottom: spacing.xl,
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              lineHeight: 1.5,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.sm }}>
                <AlertCircle size={16} style={{ color: colors.gold.primary, flexShrink: 0, marginTop: '2px' }} />
                <span>
                  Before accepting your nomination, please set a password. This will allow you to log back in anytime.
                </span>
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: spacing.lg }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.xs,
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
                marginBottom: spacing.xs,
              }}>
                <Lock size={14} />
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Input
                  type={showSetPassword ? 'text' : 'password'}
                  value={setPasswordData.password}
                  onChange={(e) => {
                    setSetPasswordData(prev => ({ ...prev, password: e.target.value }));
                    if (setPasswordErrors.password) setSetPasswordErrors(prev => ({ ...prev, password: null }));
                  }}
                  placeholder="At least 6 characters"
                  error={setPasswordErrors.password}
                  style={{ paddingRight: '48px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowSetPassword(!showSetPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: colors.text.muted,
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  {showSetPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: spacing.xl }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.xs,
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
                marginBottom: spacing.xs,
              }}>
                <Lock size={14} />
                Confirm Password
              </label>
              <Input
                type={showSetPassword ? 'text' : 'password'}
                value={setPasswordData.confirmPassword}
                onChange={(e) => {
                  setSetPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }));
                  if (setPasswordErrors.confirmPassword) setSetPasswordErrors(prev => ({ ...prev, confirmPassword: null }));
                }}
                placeholder="Confirm your password"
                error={setPasswordErrors.confirmPassword}
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSetPassword}
              disabled={processing}
              style={{ width: '100%' }}
            >
              {processing ? (
                <>
                  <Loader size={18} style={{ marginRight: 8, animation: 'spin 1s linear infinite' }} />
                  Setting Password...
                </>
              ) : (
                <>
                  Set Password & Accept Nomination
                  <ArrowRight size={18} style={{ marginLeft: 8 }} />
                </>
              )}
            </Button>

            {/* Back button */}
            <button
              onClick={() => {
                setStage('decide');
                setNeedsPassword(false);
              }}
              disabled={processing}
              style={{
                width: '100%',
                marginTop: spacing.md,
                padding: spacing.sm,
                background: 'transparent',
                border: 'none',
                color: colors.text.muted,
                fontSize: typography.fontSize.sm,
                cursor: 'pointer',
              }}
            >
              ← Back to nomination
            </button>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // =========================================================================
  // RENDER: Profile Completion (or Success if already complete)
  // =========================================================================
  if (stage === 'profile') {
    // If profile is already complete, show success message
    if (isProfileComplete()) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
          padding: spacing.xl,
        }}>
          <div style={{
            maxWidth: '400px',
            textAlign: 'center',
            background: colors.background.card,
            border: `1px solid ${colors.border.light}`,
            borderRadius: borderRadius.xl,
            padding: spacing.xxxl,
          }}>
            <div style={{
              width: '72px',
              height: '72px',
              background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <Check size={36} style={{ color: colors.gold.primary }} />
            </div>
            <h2 style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              color: '#fff',
              marginBottom: spacing.md,
            }}>
              You're All Set!
            </h2>
            <p style={{
              fontSize: typography.fontSize.md,
              color: colors.text.secondary,
              marginBottom: spacing.xl,
              lineHeight: 1.6,
            }}>
              Your nomination for <span style={{ color: colors.gold.primary }}>Most Eligible {competition?.city} {competition?.season}</span> is pending admin approval.
            </p>
            <Button onClick={onSuccess}>
              Explore Competitions
            </Button>
          </div>
        </div>
      );
    }

    // Profile incomplete - show completion form
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
        padding: spacing.xl,
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: spacing.xxl }}>
            <div style={{
              width: '72px',
              height: '72px',
              background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Crown size={36} style={{ color: colors.gold.primary }} />
            </div>
            <h1 style={{
              fontSize: typography.fontSize.xxl,
              fontWeight: typography.fontWeight.bold,
              color: '#fff',
              marginBottom: spacing.sm,
            }}>
              Complete Your Profile
            </h1>
            <p style={{
              fontSize: typography.fontSize.md,
              color: colors.text.secondary,
              maxWidth: '400px',
              margin: '0 auto',
            }}>
              Almost there! Complete your profile to finalize your entry for{' '}
              <span style={{ color: colors.gold.primary }}>
                Most Eligible {competition?.city} {competition?.season}
              </span>
            </p>
          </div>

          {/* Form */}
          <div style={{
            background: colors.background.card,
            border: `1px solid ${colors.border.light}`,
            borderRadius: borderRadius.xl,
            padding: spacing.xl,
          }}>
            {/* Avatar */}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              style={{ display: 'none' }}
            />
            <div style={{ textAlign: 'center', marginBottom: spacing.xl }}>
              <div
                onClick={() => !uploading && avatarInputRef.current?.click()}
                style={{
                  width: '120px',
                  height: '120px',
                  margin: '0 auto 12px',
                  borderRadius: borderRadius.xxl,
                  background: formData.avatarUrl
                    ? `url(${formData.avatarUrl}) center/cover`
                    : 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))',
                  border: formErrors.avatarUrl ? `2px solid ${colors.status.error}` : `3px solid ${colors.border.light}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: uploading ? 'wait' : 'pointer',
                  position: 'relative',
                }}
              >
                {uploading ? (
                  <Loader size={32} style={{ color: colors.gold.primary, animation: 'spin 1s linear infinite' }} />
                ) : !formData.avatarUrl ? (
                  <div style={{ textAlign: 'center' }}>
                    <Camera size={32} style={{ color: colors.text.secondary }} />
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary, marginTop: 4 }}>
                      Add Photo
                    </p>
                  </div>
                ) : (
                  <div style={{
                    position: 'absolute',
                    bottom: '-6px',
                    right: '-6px',
                    width: '32px',
                    height: '32px',
                    background: colors.gold.primary,
                    borderRadius: borderRadius.md,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0a0a0f',
                  }}>
                    <Camera size={16} />
                  </div>
                )}
              </div>
              {formErrors.avatarUrl && (
                <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm }}>
                  {formErrors.avatarUrl}
                </p>
              )}
            </div>

            {/* Name fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md, marginBottom: spacing.lg }}>
              <div>
                <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.xs }}>
                  First Name *
                </label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => handleFieldChange('firstName', e.target.value)}
                  placeholder="First name"
                  error={formErrors.firstName}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.xs }}>
                  Last Name *
                </label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => handleFieldChange('lastName', e.target.value)}
                  placeholder="Last name"
                  error={formErrors.lastName}
                />
              </div>
            </div>

            {/* City */}
            <div style={{ marginBottom: spacing.lg }}>
              <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.xs }}>
                City *
              </label>
              <Input
                value={formData.city}
                onChange={(e) => handleFieldChange('city', e.target.value)}
                placeholder="e.g., Austin, TX"
                error={formErrors.city}
              />
            </div>

            {/* Bio */}
            <div style={{ marginBottom: spacing.xl }}>
              <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.xs }}>
                Bio *
              </label>
              <Textarea
                value={formData.bio}
                onChange={(e) => handleFieldChange('bio', e.target.value)}
                placeholder="Tell us about yourself... What makes you Most Eligible material?"
                maxLength={500}
                showCount
                rows={4}
              />
              {formErrors.bio && (
                <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>
                  {formErrors.bio}
                </p>
              )}
            </div>

            <Button onClick={handleSaveProfile} disabled={processing || uploading} style={{ width: '100%' }}>
              {processing ? (
                <>
                  <Loader size={18} style={{ marginRight: 8, animation: 'spin 1s linear infinite' }} />
                  Saving...
                </>
              ) : (
                <>
                  Complete Profile
                  <ArrowRight size={18} style={{ marginLeft: 8 }} />
                </>
              )}
            </Button>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // =========================================================================
  // RENDER: Accept/Reject Decision
  // =========================================================================
  const nominatorDisplay = nominee?.nominator_anonymous
    ? 'Someone special'
    : (nominee?.nominator_name || 'Someone');

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
      padding: spacing.xl,
    }}>
      <div style={{
        maxWidth: '520px',
        width: '100%',
        background: colors.background.card,
        border: `1px solid ${colors.border.light}`,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
          padding: spacing.xl,
          textAlign: 'center',
          borderBottom: `1px solid ${colors.border.light}`,
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Crown size={36} style={{ color: colors.gold.primary }} />
          </div>
          <h1 style={{
            fontSize: typography.fontSize.xxl,
            fontWeight: typography.fontWeight.bold,
            color: '#fff',
            marginBottom: spacing.sm,
          }}>
            You've Been Nominated!
          </h1>
          <p style={{ fontSize: typography.fontSize.lg, color: colors.gold.primary }}>
            Most Eligible {competition?.city} {competition?.season}
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: spacing.xl }}>
          {/* Nomination details */}
          <div style={{
            background: colors.background.secondary,
            borderRadius: borderRadius.lg,
            padding: spacing.lg,
            marginBottom: spacing.xl,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
              <User size={16} style={{ color: colors.gold.primary }} />
              <span style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>
                Nominated by
              </span>
            </div>
            <p style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              marginBottom: spacing.md,
            }}>
              {nominatorDisplay}
            </p>

            {nominee?.nomination_reason && (
              <>
                <div style={{ fontSize: typography.fontSize.sm, color: colors.text.muted, marginTop: spacing.lg, marginBottom: spacing.sm }}>
                  Why they nominated you:
                </div>
                <p style={{
                  fontSize: typography.fontSize.md,
                  color: colors.text.primary,
                  fontStyle: 'italic',
                  lineHeight: 1.6,
                  padding: spacing.md,
                  background: 'rgba(212, 175, 55, 0.05)',
                  borderRadius: borderRadius.md,
                  borderLeft: `3px solid ${colors.gold.primary}`,
                }}>
                  "{nominee.nomination_reason}"
                </p>
              </>
            )}
          </div>

          {/* Competition info */}
          <div style={{
            display: 'flex',
            gap: spacing.lg,
            marginBottom: spacing.xl,
            padding: spacing.md,
            background: 'rgba(255,255,255,0.02)',
            borderRadius: borderRadius.md,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
              <MapPin size={14} style={{ color: colors.text.muted }} />
              <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                {competition?.city}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
              <Calendar size={14} style={{ color: colors.text.muted }} />
              <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                {competition?.season}
              </span>
            </div>
          </div>

          {/* Info text */}
          <p style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.secondary,
            marginBottom: spacing.xl,
            lineHeight: 1.6,
            textAlign: 'center',
          }}>
            By accepting, you'll be entered into the competition pending admin approval.
            {!isProfileComplete() && (
              <span style={{ display: 'block', marginTop: spacing.sm, color: colors.gold.primary }}>
                You'll need to complete your profile to finalize your entry.
              </span>
            )}
          </p>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: spacing.md }}>
            <Button variant="secondary" onClick={handleReject} disabled={processing} style={{ flex: 1 }}>
              {processing ? (
                <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <>
                  <X size={18} style={{ marginRight: 8 }} />
                  Decline
                </>
              )}
            </Button>
            <Button onClick={handleAccept} disabled={processing} style={{ flex: 1 }}>
              {processing ? (
                <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <>
                  <Check size={18} style={{ marginRight: 8 }} />
                  Accept
                </>
              )}
            </Button>
          </div>

          {/* Deadline */}
          {competition?.nomination_end && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.xs,
              marginTop: spacing.lg,
              fontSize: typography.fontSize.sm,
              color: colors.text.muted,
            }}>
              <Clock size={14} />
              <span>
                Claim by {new Date(competition.nomination_end).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
