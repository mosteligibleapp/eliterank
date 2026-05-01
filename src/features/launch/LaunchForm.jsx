import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader, Send } from 'lucide-react';
import {
  colors,
  spacing,
  borderRadius,
  typography,
  transitions,
  shadows,
} from '../../styles/theme';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { LAUNCH_DRAFT_KEY, START_TIMEFRAME_OPTIONS } from './constants';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INITIAL = {
  contact_name: '',
  contact_email: '',
  org_name: '',
  website_url: '',
  pitch: '',
  start_timeframe: '',
  notes: '',
};

function loadDraft() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LAUNCH_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function saveDraft(form) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAUNCH_DRAFT_KEY, JSON.stringify(form));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearDraft() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LAUNCH_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

const styles = {
  page: {
    minHeight: '100vh',
    background: colors.background.primary,
    color: colors.text.primary,
    paddingBottom: spacing.xxxl,
  },
  topbar: {
    borderBottom: `1px solid ${colors.border.secondary}`,
  },
  topbarInner: {
    maxWidth: 720,
    margin: '0 auto',
    padding: `${spacing.md} ${spacing.lg}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  brand: {
    fontSize: typography.fontSize.xs,
    letterSpacing: typography.letterSpacing.widest,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
  },
  ghostBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.xs} ${spacing.md}`,
    background: 'transparent',
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.md,
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
    textDecoration: 'none',
  },
  shell: {
    maxWidth: 640,
    margin: '0 auto',
    padding: `${spacing.xxl} ${spacing.lg}`,
  },
  card: {
    background: colors.background.secondary,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.xl,
    boxShadow: shadows.card,
    padding: spacing.xxl,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    margin: 0,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    margin: 0,
    lineHeight: typography.lineHeight.relaxed,
  },
  label: {
    display: 'block',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  required: { color: colors.gold.primary, marginLeft: 4 },
  optional: {
    color: colors.text.tertiary,
    fontWeight: typography.fontWeight.normal,
    marginLeft: spacing.xs,
  },
  hint: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  input: {
    width: '100%',
    padding: spacing.md,
    background: colors.background.tertiary,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.md,
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    outline: 'none',
    transition: `border-color ${transitions.fast}`,
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  inputError: { borderColor: colors.status.error },
  textarea: {
    resize: 'vertical',
    minHeight: 96,
  },
  fieldError: {
    fontSize: typography.fontSize.xs,
    color: colors.status.error,
    marginTop: spacing.xs,
  },
  timingWrap: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  timingBtn: (active) => ({
    textAlign: 'left',
    padding: spacing.md,
    background: active ? colors.gold.muted : colors.background.tertiary,
    border: `1px solid ${active ? colors.gold.primary : colors.border.primary}`,
    borderRadius: borderRadius.md,
    color: active ? colors.gold.primary : colors.text.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
  }),
  errorBanner: {
    padding: spacing.md,
    background: colors.status.errorMuted,
    border: `1px solid ${colors.status.error}`,
    borderRadius: borderRadius.md,
    color: colors.status.error,
    fontSize: typography.fontSize.sm,
  },
  submitRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: `${spacing.md} ${spacing.xl}`,
    background: colors.gold.primary,
    color: colors.text.inverse,
    border: 'none',
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
  },
  disclaimer: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    textAlign: 'center',
    margin: 0,
  },
};

function validate(form) {
  const errors = {};
  if (!form.contact_name.trim()) errors.contact_name = 'Your name is required.';
  if (!form.contact_email.trim()) errors.contact_email = 'Email is required.';
  else if (!EMAIL_RE.test(form.contact_email.trim())) errors.contact_email = 'Enter a valid email.';
  if (!form.pitch.trim()) errors.pitch = 'Tell us what you\'re looking to launch.';
  if (!form.start_timeframe) errors.start_timeframe = 'Pick a timeframe.';
  return errors;
}

export default function LaunchForm({ onSubmitted }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({ ...INITIAL, ...(loadDraft() || {}) }));
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const errors = useMemo(() => validate(form), [form]);

  useEffect(() => {
    saveDraft(form);
  }, [form]);

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(errors).length) {
      setShowErrors(true);
      return;
    }
    setSubmitting(true);
    setSubmitError('');

    const payload = {
      // Reuse the interest_submissions inbox; launching leads are
      // unaffiliated (no competition_id) and identified by interest_type.
      competition_id: null,
      interest_type: 'launching',
      name: form.contact_name.trim(),
      email: form.contact_email.trim(),
      org_name: form.org_name.trim() || null,
      website_url: form.website_url.trim() || null,
      pitch: form.pitch.trim(),
      target_launch_timeframe: form.start_timeframe,
      message: form.notes.trim() || null,
      status: 'pending',
    };

    if (!isSupabaseConfigured()) {
      setTimeout(() => {
        clearDraft();
        setSubmitting(false);
        onSubmitted({ id: `demo-${Date.now()}`, ...payload });
      }, 600);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('interest_submissions')
        .insert(payload)
        .select('id')
        .single();
      if (error) throw error;

      supabase.functions
        .invoke('notify-competition-submission', { body: { submission_id: data.id } })
        .catch((err) => console.warn('notify-competition-submission failed:', err));

      clearDraft();
      onSubmitted({ id: data.id, ...payload, contact_email: payload.email });
    } catch (err) {
      console.error('Submit failed:', err);
      setSubmitError('Something went wrong submitting your interest. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldStyle = (key) => ({
    ...styles.input,
    ...(showErrors && errors[key] ? styles.inputError : null),
  });

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <div style={styles.topbarInner}>
          <button type="button" style={styles.ghostBtn} onClick={() => navigate('/')}>
            <ArrowLeft size={14} /> Home
          </button>
          <span style={styles.brand}>ELITERANK · LAUNCH</span>
          <span style={{ width: 60 }} />
        </div>
      </div>

      <form style={styles.shell} onSubmit={handleSubmit} noValidate>
        <div style={styles.card}>
          <div>
            <h1 style={styles.title}>Launch a competition</h1>
            <p style={{ ...styles.subtitle, marginTop: spacing.sm }}>
              Tell us what you have in mind and we'll be in touch within 1-2 business days
              to walk you through what's possible.
            </p>
          </div>

          <div>
            <label htmlFor="contact_name" style={styles.label}>
              Your full name<span style={styles.required}>*</span>
            </label>
            <input
              id="contact_name"
              autoFocus
              value={form.contact_name}
              onChange={(e) => setField('contact_name', e.target.value)}
              placeholder="Full name"
              style={fieldStyle('contact_name')}
            />
            {showErrors && errors.contact_name && (
              <div style={styles.fieldError}>{errors.contact_name}</div>
            )}
          </div>

          <div>
            <label htmlFor="contact_email" style={styles.label}>
              Email<span style={styles.required}>*</span>
            </label>
            <input
              id="contact_email"
              type="email"
              value={form.contact_email}
              onChange={(e) => setField('contact_email', e.target.value)}
              placeholder="you@example.com"
              style={fieldStyle('contact_email')}
            />
            {showErrors && errors.contact_email && (
              <div style={styles.fieldError}>{errors.contact_email}</div>
            )}
          </div>

          <div>
            <label htmlFor="org_name" style={styles.label}>
              Company / Organization name<span style={styles.optional}>(optional)</span>
            </label>
            <input
              id="org_name"
              value={form.org_name}
              onChange={(e) => setField('org_name', e.target.value)}
              placeholder="e.g. Most Eligible Co."
              style={styles.input}
            />
            <div style={styles.hint}>Some prospects don't have one yet — that's fine.</div>
          </div>

          <div>
            <label htmlFor="website_url" style={styles.label}>
              Your website or Instagram<span style={styles.optional}>(optional)</span>
            </label>
            <input
              id="website_url"
              value={form.website_url}
              onChange={(e) => setField('website_url', e.target.value)}
              placeholder="https://yoursite.com or @yourhandle"
              style={styles.input}
            />
          </div>

          <div>
            <label htmlFor="pitch" style={styles.label}>
              What are you looking to launch?<span style={styles.required}>*</span>
            </label>
            <textarea
              id="pitch"
              rows={3}
              value={form.pitch}
              onChange={(e) => setField('pitch', e.target.value)}
              placeholder="A few sentences about the competition you have in mind."
              style={{
                ...fieldStyle('pitch'),
                ...styles.textarea,
              }}
            />
            {showErrors && errors.pitch && (
              <div style={styles.fieldError}>{errors.pitch}</div>
            )}
          </div>

          <div>
            <label style={styles.label}>
              When do you want to start?<span style={styles.required}>*</span>
            </label>
            <div style={styles.timingWrap}>
              {START_TIMEFRAME_OPTIONS.map((opt) => {
                const active = form.start_timeframe === opt.value;
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setField('start_timeframe', opt.value)}
                    aria-pressed={active}
                    style={styles.timingBtn(active)}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {showErrors && errors.start_timeframe && (
              <div style={styles.fieldError}>{errors.start_timeframe}</div>
            )}
          </div>

          <div>
            <label htmlFor="notes" style={styles.label}>
              Anything else we should know?<span style={styles.optional}>(optional)</span>
            </label>
            <textarea
              id="notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder="Partners, past events, questions — whatever's on your mind."
              style={{ ...styles.input, ...styles.textarea }}
            />
          </div>

          {submitError && <div style={styles.errorBanner}>{submitError}</div>}

          <div style={styles.submitRow}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                ...styles.submitBtn,
                opacity: submitting ? 0.7 : 1,
                cursor: submitting ? 'wait' : 'pointer',
              }}
            >
              {submitting ? (
                <>
                  <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Sending…
                </>
              ) : (
                <>
                  <Send size={16} />
                  Send my info
                </>
              )}
            </button>
          </div>

          <p style={styles.disclaimer}>
            By submitting, you agree to be contacted about your competition concept.
          </p>
        </div>
      </form>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
