import React, { useState } from 'react';
import { Crown, User, Users, Mail, Phone, Instagram, Check, Share2, Copy, Twitter, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { supabase } from '../../../lib/supabase';

/**
 * Simple Nomination Form
 * - No photos, no accounts, no emails
 * - Just collect info and save to database
 */
export default function NominationForm({ city, competitionId, onClose }) {
  const [step, setStep] = useState('choose'); // 'choose' | 'self' | 'other' | 'success-self' | 'success-other'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Self nomination form
  const [selfData, setSelfData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    instagram: '',
    livesInCity: null,
    isSingle: null,
    isAgeEligible: null,
  });

  // Nominate someone else form
  const [otherData, setOtherData] = useState({
    nomineeName: '',
    contactType: 'email',
    contactValue: '',
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
  const YesNoButtons = ({ value, onChange, label }) => (
    <div style={{ marginBottom: spacing.lg }}>
      <label style={labelStyle}>{label} *</label>
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
    if (selfData.livesInCity === null || selfData.isSingle === null || selfData.isAgeEligible === null) {
      setError('Please answer all eligibility questions');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { error: dbError } = await supabase
        .from('nominees')
        .insert({
          competition_id: competitionId,
          name: `${selfData.firstName} ${selfData.lastName}`.trim(),
          email: selfData.email.trim(),
          instagram: selfData.instagram.trim() || null,
          nominated_by: 'self',
          status: 'pending',
          eligibility_answers: {
            lives_in_city: selfData.livesInCity,
            is_single: selfData.isSingle,
            is_age_eligible: selfData.isAgeEligible,
          },
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
    if (!otherData.contactValue.trim()) {
      setError(otherData.contactType === 'email' ? 'Email is required' : 'Phone is required');
      return;
    }
    if (otherData.contactType === 'email' && !otherData.contactValue.includes('@')) {
      setError('Valid email is required');
      return;
    }
    if (!otherData.nominatorName.trim() || !otherData.nominatorEmail.trim()) {
      setError('Your name and email are required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { error: dbError } = await supabase
        .from('nominees')
        .insert({
          competition_id: competitionId,
          name: otherData.nomineeName.trim(),
          email: otherData.contactType === 'email' ? otherData.contactValue.trim() : null,
          phone: otherData.contactType === 'phone' ? otherData.contactValue.trim() : null,
          instagram: otherData.instagram.trim() || null,
          nominated_by: 'third_party',
          nomination_reason: otherData.reason.trim() || null,
          nominator_name: otherData.isAnonymous ? null : otherData.nominatorName.trim(),
          nominator_email: otherData.nominatorEmail.trim(),
          nominator_anonymous: otherData.isAnonymous,
          nominator_notify: otherData.notifyMe,
          status: 'pending',
        });

      if (dbError) {
        if (dbError.code === '23505') {
          throw new Error('This person has already been nominated.');
        }
        throw dbError;
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

  const handleShareTwitter = () => {
    const text = step === 'success-self'
      ? `I've been nominated for Most Eligible ${city} Season 2026! Think you have what it takes?`
      : `I just nominated someone for Most Eligible ${city} Season 2026! Know someone who deserves the spotlight?`;
    const url = getShareUrl();
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const handleShareInstagram = () => {
    // Instagram doesn't have a direct share URL, so we'll copy the message
    const text = step === 'success-self'
      ? `I've been nominated for Most Eligible ${city} Season 2026! Apply now: ${getShareUrl()}`
      : `I just nominated someone for Most Eligible ${city} Season 2026! Nominate someone: ${getShareUrl()}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    const shareData = {
      title: `Most Eligible ${city}`,
      text: step === 'success-self'
        ? `I've been nominated for Most Eligible ${city} Season 2026!`
        : `I just nominated someone for Most Eligible ${city}!`,
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

        {/* Eligibility Questions */}
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
            value={selfData.livesInCity}
            onChange={(val) => setSelfData(prev => ({ ...prev, livesInCity: val }))}
          />

          <YesNoButtons
            label="Are you single (not married or engaged)?"
            value={selfData.isSingle}
            onChange={(val) => setSelfData(prev => ({ ...prev, isSingle: val }))}
          />

          <YesNoButtons
            label="Are you between the ages of 21-39?"
            value={selfData.isAgeEligible}
            onChange={(val) => setSelfData(prev => ({ ...prev, isAgeEligible: val }))}
          />
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

        {/* Contact Type Toggle */}
        <div style={{ marginBottom: spacing.sm }}>
          <label style={labelStyle}>How can we reach them? *</label>
          <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.sm }}>
            <button
              type="button"
              onClick={() => setOtherData(prev => ({ ...prev, contactType: 'email', contactValue: '' }))}
              style={{
                flex: 1,
                padding: spacing.sm,
                background: otherData.contactType === 'email' ? colors.gold.primary : colors.background.secondary,
                color: otherData.contactType === 'email' ? '#000' : colors.text.primary,
                border: `1px solid ${otherData.contactType === 'email' ? colors.gold.primary : colors.border.light}`,
                borderRadius: borderRadius.lg,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xs,
              }}
            >
              <Mail size={16} /> Email
            </button>
            <button
              type="button"
              onClick={() => setOtherData(prev => ({ ...prev, contactType: 'phone', contactValue: '' }))}
              style={{
                flex: 1,
                padding: spacing.sm,
                background: otherData.contactType === 'phone' ? colors.gold.primary : colors.background.secondary,
                color: otherData.contactType === 'phone' ? '#000' : colors.text.primary,
                border: `1px solid ${otherData.contactType === 'phone' ? colors.gold.primary : colors.border.light}`,
                borderRadius: borderRadius.lg,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xs,
              }}
            >
              <Phone size={16} /> Phone
            </button>
          </div>
        </div>

        {/* Contact Value */}
        <div style={{ marginBottom: spacing.lg }}>
          <input
            type={otherData.contactType === 'email' ? 'email' : 'tel'}
            value={otherData.contactValue}
            onChange={(e) => setOtherData(prev => ({ ...prev, contactValue: e.target.value }))}
            style={inputStyle}
            placeholder={otherData.contactType === 'email' ? 'their@email.com' : '(555) 555-5555'}
          />
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
    return (
      <div style={{ textAlign: 'center', padding: spacing.xl }}>
        {/* Animated crown/sparkle header */}
        <div style={{
          position: 'relative',
          width: '100px',
          height: '100px',
          margin: '0 auto',
          marginBottom: spacing.xl,
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(212,175,55,0.4), rgba(212,175,55,0.1))',
            borderRadius: '50%',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute',
            inset: '10px',
            background: 'linear-gradient(135deg, rgba(212,175,55,0.6), rgba(212,175,55,0.2))',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Crown size={44} style={{ color: colors.gold.primary }} />
          </div>
          <Sparkles size={20} style={{ position: 'absolute', top: 0, right: 0, color: colors.gold.primary }} />
          <Sparkles size={16} style={{ position: 'absolute', bottom: 10, left: 0, color: colors.gold.primary }} />
        </div>

        <h2 style={{
          fontSize: typography.fontSize.xxl,
          fontWeight: typography.fontWeight.bold,
          marginBottom: spacing.sm,
          background: `linear-gradient(135deg, ${colors.gold.primary}, #f4d03f)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          You're In!
        </h2>

        <p style={{
          fontSize: typography.fontSize.lg,
          color: colors.text.primary,
          marginBottom: spacing.xs,
          fontWeight: typography.fontWeight.medium,
        }}>
          I've been nominated for
        </p>

        <p style={{
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.bold,
          color: colors.gold.primary,
          marginBottom: spacing.lg,
        }}>
          Most Eligible {city}
          <br />
          <span style={{ fontSize: typography.fontSize.md, color: colors.text.secondary }}>Season 2026</span>
        </p>

        <p style={{
          color: colors.text.secondary,
          fontSize: typography.fontSize.sm,
          marginBottom: spacing.xl,
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

        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
        `}</style>
      </div>
    );
  }

  // ========== THIRD-PARTY NOMINATION SUCCESS SCREEN ==========
  if (step === 'success-other') {
    return (
      <div style={{ textAlign: 'center', padding: spacing.xl }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          marginBottom: spacing.xl,
        }}>
          <Check size={40} style={{ color: colors.gold.primary }} />
        </div>

        <h2 style={{
          fontSize: typography.fontSize.xxl,
          fontWeight: typography.fontWeight.bold,
          marginBottom: spacing.md,
        }}>
          Nomination Sent!
        </h2>

        <p style={{
          fontSize: typography.fontSize.md,
          color: colors.text.primary,
          marginBottom: spacing.xs,
        }}>
          You nominated <strong>{otherData.nomineeName}</strong> for
        </p>

        <p style={{
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.bold,
          color: colors.gold.primary,
          marginBottom: spacing.lg,
        }}>
          Most Eligible {city}
        </p>

        <p style={{
          color: colors.text.secondary,
          fontSize: typography.fontSize.sm,
          marginBottom: spacing.xl,
          maxWidth: '300px',
          margin: '0 auto',
          marginBottom: spacing.xl,
          lineHeight: 1.5,
        }}>
          We'll reach out to let them know they've been nominated.
          {otherData.notifyMe && " You'll be notified when they enter!"}
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

        <div style={{ display: 'flex', gap: spacing.md }}>
          <Button onClick={() => {
            setStep('other');
            setOtherData({
              nomineeName: '',
              contactType: 'email',
              contactValue: '',
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
      </div>
    );
  }

  return null;
}
