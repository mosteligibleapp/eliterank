import React from 'react';
import { Pencil } from 'lucide-react';
import { colors, spacing, borderRadius, typography, transitions } from '../../../styles/theme';
import StepShell from '../components/StepShell';
import {
  CATEGORY_OPTIONS,
  SCOPE_OPTIONS,
  START_TIMEFRAME_OPTIONS,
  STEP_KEYS,
} from '../constants';

const dash = (v) => (v == null || v === '' ? '—' : v);

const lookupLabel = (options, value) =>
  options.find((o) => o.value === value)?.label || value || '—';

function categoryLabel(form) {
  if (!form.category) return '—';
  if (form.category === 'other') return `Other: ${form.category_other || '—'}`;
  return CATEGORY_OPTIONS.find((c) => c.value === form.category)?.label || form.category;
}

function ageLabel(form) {
  if (form.no_age_restrictions) return 'No age restrictions';
  if (!form.age_min || !form.age_max) return '—';
  return `${form.age_min}-${form.age_max}`;
}

const sectionStyle = {
  padding: spacing.lg,
  background: colors.background.tertiary,
  border: `1px solid ${colors.border.primary}`,
  borderRadius: borderRadius.lg,
};

const headingStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: spacing.md,
};

const titleStyle = {
  fontSize: typography.fontSize.sm,
  fontWeight: typography.fontWeight.semibold,
  color: colors.text.tertiary,
  textTransform: 'uppercase',
  letterSpacing: typography.letterSpacing.wider,
  margin: 0,
};

const editStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: spacing.xs,
  padding: `${spacing.xs} ${spacing.sm}`,
  background: 'transparent',
  border: `1px solid ${colors.border.primary}`,
  borderRadius: borderRadius.sm,
  color: colors.gold.primary,
  fontSize: typography.fontSize.xs,
  fontWeight: typography.fontWeight.semibold,
  cursor: 'pointer',
  transition: `all ${transitions.fast}`,
};

const rowStyle = {
  display: 'grid',
  gridTemplateColumns: '160px 1fr',
  gap: spacing.md,
  padding: `${spacing.xs} 0`,
  fontSize: typography.fontSize.sm,
};

function Section({ title, stepKey, onEdit, children }) {
  return (
    <div style={sectionStyle}>
      <div style={headingStyle}>
        <h3 style={titleStyle}>{title}</h3>
        <button type="button" style={editStyle} onClick={() => onEdit(stepKey)}>
          <Pencil size={12} /> Edit
        </button>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={rowStyle}>
      <span style={{ color: colors.text.tertiary }}>{label}</span>
      <span style={{ color: colors.text.primary, wordBreak: 'break-word' }}>{children}</span>
    </div>
  );
}

export default function StepReview({ form, onJumpTo }) {
  const goTo = (key) => onJumpTo(STEP_KEYS.indexOf(key));

  return (
    <StepShell
      title="Review and submit"
      subtitle="Take one last look before sending to our team."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        <Section title="Organization" stepKey="org" onEdit={goTo}>
          <Row label="Org name">{dash(form.org_name)} {form.org_is_new ? '(new)' : '(existing)'}</Row>
          <Row label="Contact">{dash(form.contact_name)}</Row>
          <Row label="Email">{dash(form.contact_email)}</Row>
        </Section>

        <Section title="Category" stepKey="category" onEdit={goTo}>
          <Row label="Category">{categoryLabel(form)}</Row>
        </Section>

        <Section title="Name & scope" stepKey="name" onEdit={goTo}>
          <Row label="Competition">{dash(form.competition_name)}</Row>
          <Row label="Scope">{lookupLabel(SCOPE_OPTIONS, form.scope)}</Row>
        </Section>

        <Section title="Eligibility" stepKey="who" onEdit={goTo}>
          <Row label="Genders">{form.gender_eligibility.join(', ') || '—'}</Row>
          <Row label="Ages">{ageLabel(form)}</Row>
        </Section>

        <Section title="Presence" stepKey="presence" onEdit={goTo}>
          <Row label="Website">{dash(form.website_url)}</Row>
          <Row label="Social">{dash(form.social_url)}</Row>
        </Section>

        <Section title="Revenue" stepKey="revenue" onEdit={goTo}>
          <Row label="Models">{form.revenue_models.join(', ') || '—'}</Row>
        </Section>

        <Section title="Timing" stepKey="timing" onEdit={goTo}>
          <Row label="Get started">{lookupLabel(START_TIMEFRAME_OPTIONS, form.start_timeframe)}</Row>
        </Section>

        <Section title="Notes" stepKey="notes" onEdit={goTo}>
          <Row label="Notes">{dash(form.notes)}</Row>
        </Section>
      </div>
    </StepShell>
  );
}
