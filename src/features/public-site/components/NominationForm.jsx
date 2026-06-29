import React, { useState, useMemo } from 'react';
import { Crown, User, Users, Mail, Instagram, Check, Share2, Copy, Twitter, MessageCircle } from 'lucide-react';
import { Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { supabase } from '../../../lib/supabase';
import { resolveNominationFormConfig } from '../../../utils/nominationFormDefaults';

/**
 * Simple Nomination Form
 * - No photos, no accounts, no emails
 * - Just collect info and save to database
 *
 * The set of optional fields, eligibility questions, and custom questions is
 * driven by the host's `nomination_form_config` (passed in as `formConfig`).
 * When undefined we use the built-in defaults.
 */
export default function NominationForm({ city, competitionId, onClose, formConfig }) {
  const config = useMemo(() => resolveNominationFormConfig(formConfig), [formConfig]);
  const interpolate = (label) => (label || '').replace(/\{city\}/g, city || 'your city');

  const [step, setStep] = useState('choose'); // 'choose' | 'self' | 'other' | 'success-self' | 'success-other'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [nomineeInviteToken, setNomineeInviteToken] = useState(null);

  // Self nomination form — eligibility + custom answers live in `answers`
  // keyed by question id (matches what we persist to nominees.eligibility_answers).
  const [selfData, setSelfData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    instagram: '',
    answers: {},
  });

  const setAnswer = (id, value) => {
    setSelfData((prev) => ({ ...prev, answers: { ...prev.answers, [id]: value } }));
  };

  // Nominate someone else form
  const [otherData, setOtherData] = useState({
    nomineeName: '',
    nomineeEmail: '',
    instagram: '',
    reason: '',
    nominatorName: '',
    nominatorEmail: '',
    isAnonymous: false,
    notifyMe: true,
  });

  const inputStyle = {
    width: '100%',
    padding: spacing.md,
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

  // Yes/No button component
  const YesNoButtons = ({ value, onChange, label, required = false }) => (
    <div style={{ marginBottom: spacing.lg }}>
      <label style={labelStyle}>{label}{required ? ' *' : ''}</label>
      <div style={{ display: 'flex', gap: spacing.md }}>
        <button
          type="button"
          onClick={() => onChange(true)}
          style={{
            flex: 1,
            padding: spacing.md,
            background: value === true ? colors.gold.primary : colors.background.secondary,
            color: value === true ? '#000' : colors.text.primary,
            border: `1px solid ${value === true ? colors.gold.primary : colors.border.light}`,
            borderRadius: borderRadius.lg,
            cursor: 'pointer',
            fontWeight: typography.fontWeight.medium,
          }}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          style={{
            flex: 1,
            padding: spacing.md,
            background: value === false ? colors.background.tertiary : colors.background.secondary,
            color: colors.text.primary,
            border: `1px solid ${value === false ? colors.text.muted : colors.border.light}`,
            borderRadius: borderRadius.lg,
            cursor: 'pointer',
            fontWeight: typography.fontWeight.medium,
          }}
        >
          No
        </button>
      </div>
    </div>
  );

  // Renderer for one custom question (any non-yes/no type)
  const CustomQuestionField = ({ question, value, onChange }) => {
    const label = `${interpolate(question.label)}${question.required ? ' *' : ''}`;
    const helpText = question.help_text ? (
      <div style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
        {question.help_text}
      </div>
    ) : null;

    if (question.type === 'yes_no') {
      return (
        <YesNoButtons
          label={interpolate(question.label)}
          required={question.required}
          value={value ?? null}
          onChange={onChange}
        />
      );
    }

    if (question.type === 'long_text') {
      return (
        <div style={{ marginBottom: spacing.lg }}>
          <label style={labelStyle}>{label}</label>
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }}
            maxLength={1000}
          />
          {helpText}
        </div>
      );
    }

    if (question.type === 'select') {
      const opts = question.options || [];
      return (
        <div style={{ marginBottom: spacing.lg }}>
          <label style={labelStyle}>{label}</label>
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            style={inputStyle}
          >
            <option value="">— Select —</option>
            {opts.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          {helpText}
        </div>
      );
    }

    if (question.type === 'checkbox') {
      return (
        <div style={{ marginBottom: spacing.lg }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: colors.gold.primary }}
            />
            <span style={{ fontSize: typography.fontSize.sm, color: colors.text.primary }}>{label}</span>
          </label>
          {helpText}
        </div>
      );
    }

    // short_text (default)
    return (
      <div style={{ marginBottom: spacing.lg }}>
        <label style={labelStyle}>{label}</label>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
          maxLength={200}
        />
        {helpText}
      </div>
    );
  };

  // Handle self nomination submit
  const handleSelfSubmit = async () => {
    if (!selfData.firstName.trim() || !selfData.lastName.trim()) {
      setError('Name is required');
      return;
    }
    if (!selfData.email.trim() || !selfData.email.includes('@')) {
      setError('Valid email is required');
      return;
    }
    const a = selfData.answers;
    if (a.lives_in_city === undefined || a.is_single === undefined || a.is_age_eligible === undefined) {
      setError('Please answer all eligibility questions');
      return;
    }

    // Validate host-defined custom questions that are marked required.
    for (const q of config.custom_questions.filter((cq) => cq.required)) {
      const v = a[q.id];
      const empty =
        v === undefined ||
        v === null ||
        (typeof v === 'string' && !v.trim()) ||
        (q.type === 'checkbox' && v !== true);
      if (empty) {
        setError(`Please answer: ${interpolate(q.label) || 'all required questions'}`);
        return;
      }
    }

    setIsSubmitting(true);
    setError('');

    try {
      // We intentionally do NOT look up an existing profile by email here.
      // The anon key cannot read or filter profiles.email (PII lockdown,
      // migration 103), and doing so is exactly the email-probing we're closing
      // off. The nominee's user_id is linked when they claim / log in — handled
      // by the claim flow and the nominees_update_by_email RLS policy.
      const { error: dbError } = await supabase
        .from('nominees')
        .insert({
          competition_id: competitionId,
          name: `${selfData.firstName} ${selfData.lastName}`.trim(),
          email: selfData.email.trim().toLowerCase(),
          instagram: selfData.instagram.trim() || null,
          nominated_by: 'self',
          status: 'pending',
          user_id: null,
          eligibility_answers: selfData.answers,
        });

      if (dbError) {
        if (dbError.code === '23505') {
          throw new Error('You have already submitted a nomination.');
        }
        throw dbError;
      }

      setStep('success-self');
    } catch (err) {
      console.error('Nomination error:', err);
      setError(err.message || 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle third-party nomination submit
  const handleOtherSubmit = async () => {
    if (!otherData.nomineeName.trim()) {
      setError("Nominee's name is required");
      return;
    }
    if (!otherData.nomineeEmail.trim() || !otherData.nomineeEmail.includes('@')) {
      setError('Valid email is required');
      return;
    }
    if (!otherData.nominatorName.trim() || !otherData.nominatorEmail.trim() || !otherData.nominatorEmail.includes('@')) {
      setError('Your name and a valid email are required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { data: inserted, error: dbError } = await supabase
        .from('nominees')
        .insert({
          competition_id: competitionId,
          name: otherData.nomineeName.trim(),
          email: otherData.nomineeEmail.trim().toLowerCase(),
          instagram: otherData.instagram.trim() || null,
          nominated_by: 'third_party',
          nomination_reason: otherData.reason.trim() || null,
          nominator_name: otherData.isAnonymous ? null : otherData.nominatorName.trim(),
          nominator_email: otherData.nominatorEmail.trim().toLowerCase(),
          nominator_anonymous: otherData.isAnonymous,
          nominator_notify: otherData.notifyMe,
          status: 'pending',
        })
        .select('id, invite_token')
        .single();

      if (dbError) {
        if (dbError.code === '23505') {
          throw new Error('This person has already been nominated.');
        }
        throw dbError;
      }

      // Store invite token for sharing claim link
      if (inserted?.invite_token) {
        setNomineeInviteToken(inserted.invite_token);
      }

      // Send notification email to nominee (fire-and-forget)
      if (inserted?.id) {
        supabase.functions.invoke('send-nomination-invite', {
          body: { nominee_id: inserted.id },
        }).catch((inviteErr) => {
          console.warn('Failed to send nomination invite email:', inviteErr);
        });
      }

      setStep('success-other');
    } catch (err) {
      console.error('Nomination error:', err);
      setError(err.message || 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Share helpers
  const getShareUrl = () => {
    return `${window.location.origin}${window.location.pathname}?apply=true`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Get the nominee's display name for sharing
  const getNomineeName = () => {
    if (step === 'success-self') {
      return `${selfData.firstName} ${selfData.lastName}`.trim();
    }
    return otherData.nomineeName.trim();
  };

  const handleShareTwitter = () => {
    const nomineeName = getNomineeName();
    const text = `${nomineeName} has been nominated for Most Eligible ${city} Season 2026! Vote at eliterank.co`;
    const url = getShareUrl();
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const handleShareInstagram = () => {
    // Instagram doesn't have a direct share URL, so we'll copy the message
    const nomineeName = getNomineeName();
    const text = `${nomineeName} has been nominated for Most Eligible ${city} Season 2026! Vote at eliterank.co`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    const nomineeName = getNomineeName();
    const shareData = {
      title: `Most Eligible ${city}`,
      text: `${nomineeName} has been nominated for Most Eligible ${city} Season 2026! Vote at eliterank.co`,
      url: getShareUrl(),
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== 'AbortError') handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  // Share nomination with nominee via Messages (SMS) or Email
  const handleShareWithNominee = () => {
    const nomineeName = otherData.nomineeName.trim();
    const nominatorName = otherData.isAnonymous ? 'Someone' : otherData.nominatorName.trim();
    const claimUrl = nomineeInviteToken
      ? `${window.location.origin}/claim/${nomineeInviteToken}`
      : getShareUrl();

    const message = `Hey ${nomineeName}! ${nominatorName} nominated you for Most Eligible ${city} Season 2026 on EliteRank! Claim your nomination and build your card here: ${claimUrl}`;

    if (otherData.nomineeEmail) {
      const email = otherData.nomineeEmail.trim();
      const subject = `You've been nominated for Most Eligible ${city}!`;
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    } else {
      // Fallback: copy message to clipboard
      navigator.clipboard.writeText(message).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  // ========== CHOOSE SCREEN ==========
  if (step === 'choose') {
    return (
      <div style={{ textAlign: 'center', padding: spacing.xl }}>
        <Crown size={48} style={{ color: colors.gold.primary, marginBottom: spacing.lg }} />

        <h2 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, marginBottom: spacing.sm }}>
          Who are you nominating?
        </h2>
        <p style={{ color: colors.text.secondary, marginBottom: spacing.xxl }}>
          Enter yourself or nominate someone you know
        </p>

        <div style={{ display: 'flex', gap: spacing.lg, maxWidth: '400px', margin: '0 auto' }}>
          <button
            onClick={() => setStep('self')}
            style={{
              flex: 1,
              padding: spacing.xl,
              background: colors.background.secondary,
              border: `1px solid ${colors.border.light}`,
              borderRadius: borderRadius.xl,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <User size={32} style={{ color: colors.text.primary, marginBottom: spacing.md }} />
            <div style={{ fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.xs }}>
              Myself
            </div>
            <div style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>
              Enter the competition
            </div>
          </button>

          <button
            onClick={() => setStep('other')}
            style={{
              flex: 1,
              padding: spacing.xl,
              background: colors.background.secondary,
              border: `1px solid ${colors.border.light}`,
              borderRadius: borderRadius.xl,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <Users size={32} style={{ color: colors.text.primary, marginBottom: spacing.md }} />
            <div style={{ fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.xs }}>
              Someone Else
            </div>
            <div style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>
              Nominate a friend
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ========== SELF NOMINATION FORM ==========
  if (step === 'self') {
    return (
      <div style={{ padding: spacing.lg, maxWidth: '450px', margin: '0 auto' }}>
        <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, textAlign: 'center', marginBottom: spacing.xl }}>
          Apply for Most Eligible {city} 2026
        </h3>

        {/* Name */}
        <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.lg }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>First Name *</label>
            <input
              type="text"
              value={selfData.firstName}
              onChange={(e) => setSelfData(prev => ({ ...prev, firstName: e.target.value }))}
              style={inputStyle}
              placeholder="First name"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Last Name *</label>
            <input
              type="text"
              value={selfData.lastName}
              onChange={(e) => setSelfData(prev => ({ ...prev, lastName: e.target.value }))}
              style={inputStyle}
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
              value={selfData.email}
              onChange={(e) => setSelfData(prev => ({ ...prev, email: e.target.value }))}
              style={{ ...inputStyle, paddingLeft: '44px' }}
              placeholder="your@email.com"
            />
          </div>
        </div>

        {/* Instagram */}
        <div style={{ marginBottom: spacing.xl }}>
          <label style={labelStyle}>Instagram Handle</label>
          <div style={{ position: 'relative' }}>
            <Instagram size={18} style={{ position: 'absolute', left: spacing.md, top: '50%', transform: 'translateY(-50%)', color: colors.text.muted }} />
            <input
              type="text"
              value={selfData.instagram}
              onChange={(e) => setSelfData(prev => ({ ...prev, instagram: e.target.value.replace('@', '') }))}
              style={{ ...inputStyle, paddingLeft: '44px' }}
              placeholder="username"
            />
          </div>
        </div>

        {/* Standard eligibility questions */}
        <div style={{
          background: colors.background.secondary,
          padding: spacing.lg,
          borderRadius: borderRadius.xl,
          marginBottom: spacing.lg
        }}>
          <div style={{ fontSize: typography.fontSize.sm, color: colors.text.muted, marginBottom: spacing.lg, textAlign: 'center' }}>
            Eligibility Questions
          </div>

          <YesNoButtons
            label={`Do you live in ${city}?`}
            required
            value={selfData.answers.lives_in_city ?? null}
            onChange={(val) => setAnswer('lives_in_city', val)}
          />

          <YesNoButtons
            label="Are you single (not married or engaged)?"
            required
            value={selfData.answers.is_single ?? null}
            onChange={(val) => setAnswer('is_single', val)}
          />

          <YesNoButtons
            label="Are you between the ages of 21-39?"
            required
            value={selfData.answers.is_age_eligible ?? null}
            onChange={(val) => setAnswer('is_age_eligible', val)}
          />
        </div>

        {/* Host-defined custom questions */}
        {config.custom_questions.length > 0 && (
          <div style={{ marginBottom: spacing.lg }}>
            {config.custom_questions.map((q) => (
              <CustomQuestionField
                key={q.id}
                question={q}
                value={selfData.answers[q.id]}
                onChange={(val) => setAnswer(q.id, val)}
              />
            ))}
          </div>
        )}

        {error && (
          <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginBottom: spacing.md, textAlign: 'center' }}>
            {error}
          </p>
        )}

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

  // ========== NOMINATE SOMEONE ELSE FORM ==========
  if (step === 'other') {
    return (
      <div style={{ padding: spacing.lg, maxWidth: '450px', margin: '0 auto' }}>
        <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, textAlign: 'center', marginBottom: spacing.xl }}>
          Nominate Someone
        </h3>

        {/* Nominee Name */}
        <div style={{ marginBottom: spacing.lg }}>
          <label style={labelStyle}>Their Name *</label>
          <input
            type="text"
            value={otherData.nomineeName}
            onChange={(e) => setOtherData(prev => ({ ...prev, nomineeName: e.target.value }))}
            style={inputStyle}
            placeholder="Nominee's full name"
          />
        </div>

        {/* Nominee Email */}
        <div style={{ marginBottom: spacing.lg }}>
          <label style={labelStyle}>Their Email *</label>
          <div style={{ position: 'relative' }}>
            <Mail size={18} style={{ position: 'absolute', left: spacing.md, top: '50%', transform: 'translateY(-50%)', color: colors.text.muted }} />
            <input
              type="email"
              value={otherData.nomineeEmail}
              onChange={(e) => setOtherData(prev => ({ ...prev, nomineeEmail: e.target.value }))}
              style={{ ...inputStyle, paddingLeft: '44px' }}
              placeholder="their@email.com"
            />
          </div>
        </div>

        {/* Instagram */}
        <div style={{ marginBottom: spacing.lg }}>
          <label style={labelStyle}>Their Instagram Handle</label>
          <div style={{ position: 'relative' }}>
            <Instagram size={18} style={{ position: 'absolute', left: spacing.md, top: '50%', transform: 'translateY(-50%)', color: colors.text.muted }} />
            <input
              type="text"
              value={otherData.instagram}
              onChange={(e) => setOtherData(prev => ({ ...prev, instagram: e.target.value.replace('@', '') }))}
              style={{ ...inputStyle, paddingLeft: '44px' }}
              placeholder="username"
            />
          </div>
        </div>

        {/* Reason */}
        <div style={{ marginBottom: spacing.xl }}>
          <label style={labelStyle}>Why are you nominating them? (optional)</label>
          <textarea
            value={otherData.reason}
            onChange={(e) => setOtherData(prev => ({ ...prev, reason: e.target.value }))}
            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
            placeholder="They're amazing because..."
            maxLength={500}
          />
        </div>

        {/* Divider */}
        <div style={{ borderTop: `1px solid ${colors.border.light}`, margin: `${spacing.lg} 0`, paddingTop: spacing.lg }}>
          <div style={{ fontSize: typography.fontSize.sm, color: colors.text.muted, marginBottom: spacing.lg }}>
            Your Information
          </div>
        </div>

        {/* Nominator Name */}
        <div style={{ marginBottom: spacing.lg }}>
          <label style={labelStyle}>Your Name *</label>
          <input
            type="text"
            value={otherData.nominatorName}
            onChange={(e) => setOtherData(prev => ({ ...prev, nominatorName: e.target.value }))}
            style={inputStyle}
            placeholder="Your full name"
          />
        </div>

        {/* Nominator Email */}
        <div style={{ marginBottom: spacing.lg }}>
          <label style={labelStyle}>Your Email *</label>
          <input
            type="email"
            value={otherData.nominatorEmail}
            onChange={(e) => setOtherData(prev => ({ ...prev, nominatorEmail: e.target.value }))}
            style={inputStyle}
            placeholder="your@email.com"
          />
        </div>

        {/* Checkboxes */}
        <div style={{ marginBottom: spacing.xl }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, cursor: 'pointer', marginBottom: spacing.md }}>
            <input
              type="checkbox"
              checked={otherData.isAnonymous}
              onChange={(e) => setOtherData(prev => ({ ...prev, isAnonymous: e.target.checked }))}
              style={{ width: '18px', height: '18px', accentColor: colors.gold.primary }}
            />
            <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
              Keep my identity anonymous
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={otherData.notifyMe}
              onChange={(e) => setOtherData(prev => ({ ...prev, notifyMe: e.target.checked }))}
              style={{ width: '18px', height: '18px', accentColor: colors.gold.primary }}
            />
            <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
              Notify me when they enter
            </span>
          </label>
        </div>

        {error && (
          <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginBottom: spacing.md, textAlign: 'center' }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: spacing.md }}>
          <Button variant="secondary" onClick={() => setStep('choose')} style={{ flex: 1 }}>
            Back
          </Button>
          <Button onClick={handleOtherSubmit} disabled={isSubmitting} style={{ flex: 1 }}>
            {isSubmitting ? 'Submitting...' : 'Submit Nomination'}
          </Button>
        </div>
      </div>
    );
  }

  // ========== SELF-NOMINATION SUCCESS SCREEN ==========
  if (step === 'success-self') {
    const displayName = `${selfData.firstName} ${selfData.lastName}`.trim();
    const initial = selfData.firstName ? selfData.firstName[0].toUpperCase() : '?';
    const instagramHandle = selfData.instagram ? `@${selfData.instagram.replace('@', '')}` : null;

    return (
      <div style={{ textAlign: 'center', padding: spacing.xl }}>
        {/* ELITERANK Header */}
        <p style={{
          fontSize: typography.fontSize.sm,
          letterSpacing: '0.3em',
          color: colors.text.secondary,
          marginBottom: spacing.md,
          fontWeight: typography.fontWeight.medium,
        }}>
          ELITERANK
        </p>

        {/* NOMINATED - Large text */}
        <h2 style={{
          fontSize: '2rem',
          fontWeight: typography.fontWeight.bold,
          marginBottom: spacing.lg,
          color: colors.gold.primary,
        }}>
          NOMINATED
        </h2>

        {/* Avatar circle with initial */}
        <div style={{
          width: '100px',
          height: '100px',
          margin: '0 auto',
          marginBottom: spacing.lg,
          borderRadius: '50%',
          border: `3px solid ${colors.gold.primary}`,
          background: colors.background.secondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{
            fontSize: '2.5rem',
            fontWeight: typography.fontWeight.bold,
            color: colors.gold.primary,
          }}>
            {initial}
          </span>
        </div>

        {/* Nominee Name */}
        <h3 style={{
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.bold,
          color: colors.text.primary,
          marginBottom: spacing.xs,
        }}>
          {displayName}
        </h3>

        {/* Instagram Handle */}
        {instagramHandle && (
          <p style={{
            fontSize: typography.fontSize.md,
            color: colors.text.secondary,
            marginBottom: spacing.lg,
          }}>
            {instagramHandle}
          </p>
        )}

        {/* Competition Info */}
        <p style={{
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.primary,
          marginBottom: spacing.xs,
        }}>
          Most Eligible {city}
        </p>
        <p style={{
          fontSize: typography.fontSize.md,
          color: colors.text.secondary,
          marginBottom: spacing.xl,
        }}>
          Season 2026
        </p>

        <p style={{
          color: colors.text.muted,
          fontSize: typography.fontSize.sm,
          maxWidth: '280px',
          margin: '0 auto',
          marginBottom: spacing.xl,
          lineHeight: 1.5,
        }}>
          The host will review your nomination and contact you with next steps.
        </p>

        {/* Share section */}
        <div style={{
          background: colors.background.secondary,
          borderRadius: borderRadius.xl,
          padding: spacing.lg,
          marginBottom: spacing.lg,
        }}>
          <p style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.muted,
            marginBottom: spacing.md,
          }}>
            Share on social media
          </p>

          <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'center' }}>
            <button
              onClick={handleShareInstagram}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: borderRadius.lg,
                background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Instagram size={22} style={{ color: '#fff' }} />
            </button>

            <button
              onClick={handleShareTwitter}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: borderRadius.lg,
                background: '#000',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Twitter size={22} style={{ color: '#fff' }} />
            </button>

            <button
              onClick={handleNativeShare}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: borderRadius.lg,
                background: colors.gold.primary,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Share2 size={22} style={{ color: '#000' }} />
            </button>
          </div>
        </div>

        {/* Copy link */}
        <button
          onClick={handleCopyLink}
          style={{
            width: '100%',
            padding: spacing.md,
            background: copied ? 'rgba(74,222,128,0.2)' : colors.background.secondary,
            border: `1px solid ${copied ? colors.status.success : colors.border.light}`,
            borderRadius: borderRadius.lg,
            color: copied ? colors.status.success : colors.text.secondary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            fontSize: typography.fontSize.sm,
            marginBottom: spacing.lg,
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Link Copied!' : 'Copy nomination link'}
        </button>

        <Button onClick={onClose} variant="secondary" style={{ width: '100%' }}>
          Done
        </Button>
      </div>
    );
  }

  // ========== THIRD-PARTY NOMINATION SUCCESS SCREEN ==========
  if (step === 'success-other') {
    const displayName = otherData.nomineeName.trim();
    const initial = displayName ? displayName[0].toUpperCase() : '?';
    const instagramHandle = otherData.instagram ? `@${otherData.instagram.replace('@', '')}` : null;

    return (
      <div style={{ textAlign: 'center', padding: spacing.xl }}>
        {/* ELITERANK Header */}
        <p style={{
          fontSize: typography.fontSize.sm,
          letterSpacing: '0.3em',
          color: colors.text.secondary,
          marginBottom: spacing.md,
          fontWeight: typography.fontWeight.medium,
        }}>
          ELITERANK
        </p>

        {/* NOMINATED - Large text */}
        <h2 style={{
          fontSize: '2rem',
          fontWeight: typography.fontWeight.bold,
          marginBottom: spacing.lg,
          color: colors.gold.primary,
        }}>
          NOMINATED
        </h2>

        {/* Avatar circle with initial */}
        <div style={{
          width: '100px',
          height: '100px',
          margin: '0 auto',
          marginBottom: spacing.lg,
          borderRadius: '50%',
          border: `3px solid ${colors.gold.primary}`,
          background: colors.background.secondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{
            fontSize: '2.5rem',
            fontWeight: typography.fontWeight.bold,
            color: colors.gold.primary,
          }}>
            {initial}
          </span>
        </div>

        {/* Nominee Name */}
        <h3 style={{
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.bold,
          color: colors.text.primary,
          marginBottom: spacing.xs,
        }}>
          {displayName}
        </h3>

        {/* Instagram Handle */}
        {instagramHandle && (
          <p style={{
            fontSize: typography.fontSize.md,
            color: colors.text.secondary,
            marginBottom: spacing.lg,
          }}>
            {instagramHandle}
          </p>
        )}

        {/* Competition Info */}
        <p style={{
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.primary,
          marginBottom: spacing.xs,
        }}>
          Most Eligible {city}
        </p>
        <p style={{
          fontSize: typography.fontSize.md,
          color: colors.text.secondary,
          marginBottom: spacing.lg,
        }}>
          Season 2026
        </p>

        <p style={{
          color: colors.text.muted,
          fontSize: typography.fontSize.sm,
          maxWidth: '300px',
          margin: '0 auto',
          marginBottom: spacing.lg,
          lineHeight: 1.5,
        }}>
          We'll reach out to let them know they've been nominated.
          {otherData.notifyMe && " You'll be notified when they enter!"}
        </p>

        {/* Primary actions - Nominate Another + Done */}
        <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.lg }}>
          <Button onClick={() => {
            setStep('other');
            setOtherData({
              nomineeName: '',
              nomineeEmail: '',
              instagram: '',
              reason: '',
              nominatorName: otherData.nominatorName,
              nominatorEmail: otherData.nominatorEmail,
              isAnonymous: otherData.isAnonymous,
              notifyMe: otherData.notifyMe,
            });
          }} variant="secondary" style={{ flex: 1 }}>
            Nominate Another
          </Button>
          <Button onClick={onClose} style={{ flex: 1 }}>
            Done
          </Button>
        </div>

        {/* Share with Nominee button */}
        <button
          onClick={handleShareWithNominee}
          style={{
            width: '100%',
            padding: `${spacing.md} ${spacing.lg}`,
            background: `linear-gradient(135deg, ${colors.gold.primary}, #f4d03f)`,
            border: 'none',
            borderRadius: borderRadius.lg,
            color: '#000',
            fontSize: typography.fontSize.md,
            fontWeight: typography.fontWeight.bold,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            marginBottom: spacing.lg,
          }}
        >
          <MessageCircle size={20} />
          Share with {otherData.nomineeName.trim().split(' ')[0]}
        </button>

        {/* Share section */}
        <div style={{
          background: colors.background.secondary,
          borderRadius: borderRadius.xl,
          padding: spacing.lg,
          marginBottom: spacing.lg,
        }}>
          <p style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.muted,
            marginBottom: spacing.md,
          }}>
            Know someone else who should enter?
          </p>

          <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'center' }}>
            <button
              onClick={handleShareInstagram}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: borderRadius.lg,
                background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Instagram size={22} style={{ color: '#fff' }} />
            </button>

            <button
              onClick={handleShareTwitter}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: borderRadius.lg,
                background: '#000',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Twitter size={22} style={{ color: '#fff' }} />
            </button>

            <button
              onClick={handleNativeShare}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: borderRadius.lg,
                background: colors.gold.primary,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Share2 size={22} style={{ color: '#000' }} />
            </button>
          </div>
        </div>

        {/* Copy link */}
        <button
          onClick={handleCopyLink}
          style={{
            width: '100%',
            padding: spacing.md,
            background: copied ? 'rgba(74,222,128,0.2)' : colors.background.secondary,
            border: `1px solid ${copied ? colors.status.success : colors.border.light}`,
            borderRadius: borderRadius.lg,
            color: copied ? colors.status.success : colors.text.secondary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            fontSize: typography.fontSize.sm,
            marginBottom: spacing.lg,
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Link Copied!' : 'Copy nomination link to share'}
        </button>

      </div>
    );
  }

  return null;
}
