import React, { useState, useEffect } from 'react';
import { Crown, Check, AlertCircle, Clock, ArrowRight, User } from 'lucide-react';
import { Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';

export default function ClaimNominationPage({ token, onClose, onSuccess }) {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [nominee, setNominee] = useState(null);
  const [competition, setCompetition] = useState(null);
  const [error, setError] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [claimEmail, setClaimEmail] = useState('');

  // Fetch nominee and competition data
  useEffect(() => {
    const fetchNomination = async () => {
      if (!token) {
        setError('Invalid nomination link');
        setLoading(false);
        return;
      }

      try {
        // Fetch nominee by invite token
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
              organization:organizations(name, logo_url)
            )
          `)
          .eq('invite_token', token)
          .single();

        if (nomineeError || !nomineeData) {
          setError('Nomination not found. This link may be invalid or expired.');
          setLoading(false);
          return;
        }

        // Check if already claimed
        if (nomineeData.claimed_at || nomineeData.converted_to_contestant) {
          setError('This nomination has already been claimed.');
          setLoading(false);
          return;
        }

        // Check if nomination period is still open
        const comp = nomineeData.competition;
        if (comp?.nomination_end) {
          const endDate = new Date(comp.nomination_end);
          if (new Date() > endDate) {
            setError('Sorry, the nomination period for this competition has ended.');
            setLoading(false);
            return;
          }
        }

        setNominee(nomineeData);
        setCompetition(comp);
        setClaimEmail(nomineeData.email || '');
      } catch (err) {
        console.error('Error fetching nomination:', err);
        setError('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchNomination();
  }, [token]);

  // Send magic link to claim nomination
  const handleClaim = async () => {
    if (!claimEmail || !claimEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setClaiming(true);

    try {
      // Send magic link via Supabase Auth
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: claimEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/claim/${token}/complete`,
          data: {
            nomination_token: token,
            nominee_id: nominee.id,
          },
        },
      });

      if (authError) throw authError;

      setEmailSent(true);
      toast.success('Check your email for the magic link!');
    } catch (err) {
      console.error('Error sending magic link:', err);
      toast.error('Failed to send magic link. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  // Loading state
  if (loading) {
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

  // Error state
  if (error) {
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
            {error.includes('ended') ? 'Nomination Closed' : 'Oops!'}
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

  // Email sent - waiting for click
  if (emailSent) {
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
            background: 'rgba(212, 175, 55, 0.1)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <Check size={32} style={{ color: colors.gold.primary }} />
          </div>
          <h2 style={{
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.bold,
            color: '#fff',
            marginBottom: spacing.md,
          }}>
            Check Your Email!
          </h2>
          <p style={{
            fontSize: typography.fontSize.md,
            color: colors.text.secondary,
            marginBottom: spacing.lg,
            lineHeight: 1.6,
          }}>
            We sent a magic link to <strong style={{ color: '#fff' }}>{claimEmail}</strong>
          </p>
          <p style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.muted,
            lineHeight: 1.6,
          }}>
            Click the link in your email to complete your entry.
            Don't see it? Check your spam folder.
          </p>
        </div>
      </div>
    );
  }

  // Main claim form
  const nominatorDisplay = nominee.nominator_anonymous
    ? 'Someone'
    : (nominee.nominator_name || 'Someone');

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
        maxWidth: '480px',
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
            You've Been Nominated! 👑
          </h1>
          <p style={{
            fontSize: typography.fontSize.lg,
            color: colors.gold.primary,
          }}>
            Most Eligible {competition?.city} {competition?.season}
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: spacing.xl }}>
          {/* Nominator message */}
          <div style={{
            background: colors.background.secondary,
            borderRadius: borderRadius.lg,
            padding: spacing.lg,
            marginBottom: spacing.xl,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              marginBottom: spacing.sm,
            }}>
              <User size={16} style={{ color: colors.text.muted }} />
              <span style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>
                {nominatorDisplay} thinks you're Most Eligible material
              </span>
            </div>
            {nominee.nomination_reason && (
              <p style={{
                fontSize: typography.fontSize.md,
                color: colors.text.primary,
                fontStyle: 'italic',
                lineHeight: 1.5,
              }}>
                "{nominee.nomination_reason}"
              </p>
            )}
          </div>

          {/* Claim form */}
          <div style={{ marginBottom: spacing.lg }}>
            <label style={{
              display: 'block',
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              marginBottom: spacing.sm,
            }}>
              Enter your email to claim your spot
            </label>
            <input
              type="email"
              value={claimEmail}
              onChange={(e) => setClaimEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: spacing.md,
                background: colors.background.secondary,
                border: `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.lg,
                color: colors.text.primary,
                fontSize: typography.fontSize.md,
                outline: 'none',
              }}
            />
          </div>

          <Button
            onClick={handleClaim}
            disabled={claiming}
            style={{ width: '100%' }}
          >
            {claiming ? 'Sending...' : 'Claim My Spot'}
            {!claiming && <ArrowRight size={18} style={{ marginLeft: spacing.sm }} />}
          </Button>

          {/* Deadline notice */}
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
    </div>
  );
}
