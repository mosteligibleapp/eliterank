import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, Award, Mail, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button, Input } from '../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';

/**
 * JudgeClaimPage — entered via /claim-judge/:token
 *
 * 1. Look up the judge row by invite_token (publicly readable per RLS).
 * 2. Let the user confirm/edit their email and set a password.
 * 3. Call set-judge-password (creates or updates the auth user, links
 *    the judges.user_id, stamps claimed_at).
 * 4. Sign in with the new password and route to /judge.
 */

const styles = {
  page: {
    minHeight: '100vh',
    background: colors.background.primary,
    color: colors.text.primary,
    padding: spacing.xl,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 460,
    background: colors.background.secondary,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.xs} ${spacing.md}`,
    background: 'rgba(212,175,55,0.12)',
    color: colors.gold.primary,
    border: `1px solid rgba(212,175,55,0.3)`,
    borderRadius: borderRadius.full,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    margin: 0,
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    lineHeight: 1.6,
    marginBottom: spacing.xl,
  },
  error: {
    padding: spacing.md,
    background: 'rgba(239,68,68,0.1)',
    border: `1px solid ${colors.border.error}`,
    borderRadius: borderRadius.md,
    color: colors.status.error,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.lg,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  success: {
    padding: spacing.md,
    background: 'rgba(34,197,94,0.1)',
    border: `1px solid rgba(34,197,94,0.3)`,
    borderRadius: borderRadius.md,
    color: colors.status.success,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.lg,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
};

export default function JudgeClaimPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [judge, setJudge] = useState(null);
  const [competition, setCompetition] = useState(null);
  const [error, setError] = useState(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setError('Missing invite token');
        setLoading(false);
        return;
      }
      try {
        const { data, error: err } = await supabase
          .from('judges')
          .select(`
            id, name, email, claimed_at,
            competition:competitions(id, name, season, city:cities(name))
          `)
          .eq('invite_token', token)
          .maybeSingle();

        if (cancelled) return;
        if (err || !data) {
          setError("This invite link is invalid or has expired.");
        } else {
          setJudge(data);
          setCompetition(data.competition);
          setEmail(data.email || '');
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load invite');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const competitionLabel = (() => {
    if (!competition) return '';
    if (competition.name) return competition.name;
    const city = competition.city?.name || '';
    return city ? `Most Eligible ${city} ${competition.season || ''}`.trim() : 'this competition';
  })();

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setError(null);

    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('set-judge-password', {
        body: { invite_token: token, email: email.trim(), password },
      });
      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;

      setDone(true);
      setTimeout(() => navigate('/judge', { replace: true }), 600);
    } catch (e) {
      setError(e.message || 'Failed to set up your account');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p style={{ color: colors.text.secondary, textAlign: 'center' }}>Loading invite…</p>
        </div>
      </div>
    );
  }

  if (error && !judge) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.error}>
            <AlertTriangle size={18} /> {error}
          </div>
          <Button onClick={() => navigate('/')} variant="secondary" style={{ width: '100%' }}>
            Back to home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <div style={styles.badge}>
          <Award size={12} /> JUDGE INVITE
        </div>
        <h1 style={styles.title}>
          {judge?.claimed_at ? 'Welcome back' : `Hi ${judge?.name?.split(' ')[0] || 'there'}`}
        </h1>
        <p style={styles.subtitle}>
          You&rsquo;ve been invited to judge <strong style={{ color: colors.text.primary }}>{competitionLabel}</strong>.
          Confirm your email and set a password to get started.
        </p>

        {done && (
          <div style={styles.success}>
            <CheckCircle size={18} /> Account ready — taking you to the judge dashboard.
          </div>
        )}
        {error && !done && (
          <div style={styles.error}>
            <AlertTriangle size={18} /> {error}
          </div>
        )}

        <Input
          label="Email"
          type="email"
          icon={Mail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="judge@example.com"
          disabled={submitting || done}
        />
        <Input
          label="Password"
          type="password"
          icon={Lock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          disabled={submitting || done}
        />

        <Button
          type="submit"
          disabled={submitting || done || !email.trim() || password.length < 6}
          style={{ width: '100%', marginTop: spacing.lg }}
        >
          {submitting ? 'Setting up…' : done ? 'Done' : 'Accept & continue'}
        </Button>

        <p style={{
          marginTop: spacing.lg,
          fontSize: typography.fontSize.xs,
          color: colors.text.muted,
          textAlign: 'center',
        }}>
          Already have an EliteRank account? Use the same email and your existing password will be replaced with the one you set here.
        </p>
      </form>
    </div>
  );
}
