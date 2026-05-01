import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader, Send } from 'lucide-react';
import {
  colors,
  spacing,
  borderRadius,
  typography,
  transitions,
  shadows,
} from '../../styles/theme';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { STEP_KEYS, STEP_LABELS, SKIPPABLE_STEPS } from './constants';
import { clearDraft, useLaunchWizard } from './useLaunchWizard';

import StepOrg from './steps/StepOrg';
import StepCategory from './steps/StepCategory';
import StepName from './steps/StepName';
import StepWho from './steps/StepWho';
import StepSocial from './steps/StepSocial';
import StepRevenue from './steps/StepRevenue';
import StepWinning from './steps/StepWinning';
import StepCity from './steps/StepCity';
import StepLaunch from './steps/StepLaunch';
import StepNotes from './steps/StepNotes';
import StepReview from './steps/StepReview';

const stepComponents = {
  org: StepOrg,
  category: StepCategory,
  name: StepName,
  who: StepWho,
  social: StepSocial,
  revenue: StepRevenue,
  winning: StepWinning,
  city: StepCity,
  launch: StepLaunch,
  notes: StepNotes,
  review: StepReview,
};

const TOTAL = STEP_KEYS.length;

const styles = {
  page: {
    minHeight: '100vh',
    background: colors.background.primary,
    color: colors.text.primary,
    paddingBottom: spacing.xxxl,
  },
  topbar: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    background: 'rgba(10,10,12,0.85)',
    backdropFilter: 'blur(8px)',
    borderBottom: `1px solid ${colors.border.secondary}`,
  },
  topbarInner: {
    maxWidth: 720,
    margin: '0 auto',
    padding: `${spacing.md} ${spacing.lg}`,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  topbarRow: {
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
  stepCount: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  skipBtn: {
    background: 'transparent',
    border: 'none',
    color: colors.gold.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    background: colors.border.primary,
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: colors.gold.primary,
    transition: `width ${transitions.normal} ${transitions.ease}`,
  },
  card: {
    maxWidth: 720,
    margin: '0 auto',
    padding: `${spacing.xxl} ${spacing.lg}`,
  },
  cardInner: {
    background: colors.background.secondary,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.xl,
    boxShadow: shadows.card,
    padding: spacing.xxl,
  },
  errorBanner: {
    marginTop: spacing.lg,
    padding: spacing.md,
    background: colors.status.errorMuted,
    border: `1px solid ${colors.status.error}`,
    borderRadius: borderRadius.md,
    color: colors.status.error,
    fontSize: typography.fontSize.sm,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  primaryBtn: {
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
  ghostBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.sm} ${spacing.lg}`,
    background: 'transparent',
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.md,
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
  },
  stepDots: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  stepDot: (state) => ({
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    padding: `${spacing.xs} ${spacing.sm}`,
    background:
      state === 'active'
        ? colors.gold.muted
        : state === 'reached'
          ? colors.background.tertiary
          : 'transparent',
    border:
      state === 'active'
        ? `1px solid ${colors.gold.primary}`
        : `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.pill,
    color:
      state === 'active'
        ? colors.gold.primary
        : state === 'reached'
          ? colors.text.secondary
          : colors.text.muted,
    cursor: state === 'locked' ? 'not-allowed' : 'pointer',
    opacity: state === 'locked' ? 0.5 : 1,
  }),
};

function buildPayload(form) {
  const num = (v) => (v === '' || v == null ? null : Number(v));
  return {
    org_name: form.org_name.trim(),
    org_is_new: !!form.org_is_new,
    contact_name: form.contact_name.trim() || null,
    contact_email: form.contact_email.trim(),
    category: form.category,
    category_other: form.category === 'other' ? form.category_other.trim() || null : null,
    competition_name: form.competition_name.trim(),
    tagline: form.tagline.trim() || null,
    gender_eligibility: form.gender_eligibility,
    age_min: form.no_age_restrictions ? null : num(form.age_min),
    age_max: form.no_age_restrictions ? null : num(form.age_max),
    no_age_restrictions: !!form.no_age_restrictions,
    social_platforms: form.social_platforms,
    campaign_hashtag: form.campaign_hashtag.trim() || null,
    min_followers: num(form.min_followers),
    revenue_models: form.revenue_models,
    vote_price_usd: form.revenue_models.includes('Paid voting') ? num(form.vote_price_usd) : null,
    sponsor_tiers: form.revenue_models.includes('Sponsorships')
      ? form.sponsor_tiers.trim() || null
      : null,
    num_winners: Number(form.num_winners) || 1,
    cash_pool_usd: num(form.cash_pool_usd),
    in_kind_prizes: form.in_kind_prizes,
    city: form.city.trim(),
    venue: form.venue.trim() || null,
    num_rounds: Number(form.num_rounds) || 6,
    start_date: form.start_date,
    end_date: form.end_date,
    notes: form.notes.trim() || null,
    status: 'pending',
  };
}

export default function LaunchWizard({ onSubmitted }) {
  const wizard = useLaunchWizard();
  const navigate = useNavigate();
  const {
    stepKey,
    stepIndex,
    reachedIndex,
    form,
    errors,
    showErrors,
    submitting,
    submitError,
    setSubmitting,
    setSubmitError,
    setField,
    update,
    next,
    back,
    skip,
    goTo,
  } = wizard;
  const [hovered, setHovered] = useState(null);

  const StepView = stepComponents[stepKey];
  const isLast = stepKey === 'review';
  const canSkip = SKIPPABLE_STEPS.has(stepKey);
  const progressPct = Math.round(((stepIndex + 1) / TOTAL) * 100);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError('');

    const payload = buildPayload(form);

    if (!isSupabaseConfigured()) {
      // Demo mode — simulate success
      setTimeout(() => {
        const mockId = `demo-${Date.now()}`;
        clearDraft();
        setSubmitting(false);
        onSubmitted({ id: mockId, ...payload });
      }, 800);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('competition_submissions')
        .insert(payload)
        .select('id')
        .single();
      if (error) throw error;

      const submissionId = data.id;
      // Fire-and-forget email notification — don't block the success screen.
      supabase.functions
        .invoke('notify-competition-submission', { body: { submission_id: submissionId } })
        .catch((err) => console.warn('notify-competition-submission failed:', err));

      clearDraft();
      onSubmitted({ id: submissionId, ...payload });
    } catch (err) {
      console.error('Submit failed:', err);
      setSubmitError('Something went wrong submitting your concept. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [form, submitting, setSubmitting, setSubmitError, onSubmitted]);

  const handlePrimary = () => {
    if (isLast) handleSubmit();
    else next();
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <div style={styles.topbarInner}>
          <div style={styles.topbarRow}>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{ ...styles.ghostBtn, padding: `${spacing.xs} ${spacing.md}` }}
            >
              <ArrowLeft size={14} /> Home
            </button>
            <span style={styles.brand}>ELITERANK · LAUNCH</span>
            <span style={styles.stepCount}>
              Step {stepIndex + 1} of {TOTAL}
            </span>
          </div>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardInner}>
          <StepView
            form={form}
            errors={errors}
            showErrors={showErrors}
            setField={setField}
            update={update}
            onJumpTo={(targetIdx) => goTo(targetIdx)}
          />

          {submitError && <div style={styles.errorBanner}>{submitError}</div>}

          <div style={styles.actions}>
            <button
              type="button"
              onClick={back}
              disabled={stepIndex === 0 || submitting}
              style={{
                ...styles.ghostBtn,
                opacity: stepIndex === 0 || submitting ? 0.4 : 1,
                cursor: stepIndex === 0 || submitting ? 'not-allowed' : 'pointer',
              }}
            >
              <ArrowLeft size={14} /> Back
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              {canSkip && !isLast && (
                <button type="button" onClick={skip} style={styles.skipBtn}>
                  Skip
                </button>
              )}
              <button
                type="button"
                onClick={handlePrimary}
                disabled={submitting}
                style={{
                  ...styles.primaryBtn,
                  opacity: submitting ? 0.7 : 1,
                  cursor: submitting ? 'wait' : 'pointer',
                }}
              >
                {isLast ? (
                  submitting ? (
                    <>
                      <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Sending…
                    </>
                  ) : (
                    <>
                      <Send size={16} /> Submit for review
                    </>
                  )
                ) : (
                  <>
                    Continue <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>

          <div style={styles.stepDots} role="tablist" aria-label="Wizard steps">
            {STEP_KEYS.map((key, idx) => {
              const reachable = idx <= reachedIndex;
              const state = idx === stepIndex ? 'active' : reachable ? 'reached' : 'locked';
              return (
                <button
                  type="button"
                  key={key}
                  role="tab"
                  aria-selected={idx === stepIndex}
                  disabled={!reachable}
                  onClick={() => goTo(idx)}
                  onMouseEnter={() => setHovered(idx)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    ...styles.stepDot(state),
                    ...(hovered === idx && reachable && state !== 'active'
                      ? { borderColor: colors.gold.primary, color: colors.gold.primary }
                      : null),
                  }}
                >
                  {idx + 1}. {STEP_LABELS[key]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
