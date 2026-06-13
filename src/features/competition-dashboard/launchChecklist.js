import {
  Sparkles,
  UserCircle,
  CalendarClock,
  ClipboardList,
  Scale,
  CalendarHeart,
  Users,
} from 'lucide-react';

/**
 * Launch checklist definitions.
 *
 * The host dashboard shows a guided, sequenced set of launch tasks so getting a
 * competition live feels like completing a checklist rather than staring at a
 * wall of always-editable settings. Each step computes its own status from the
 * real dashboard data and carries a deep-link target so its CTA can drop the
 * host on the exact tab/section that completes it.
 *
 * Checklists are template-driven. Most Eligible has a fixed framework; other
 * organizations get a leaner general default. `resolveLaunchChecklist` picks the
 * template for a competition. The resolver is the single extension point for
 * future org-level controls — once organizations can define their own launch
 * to-dos (e.g. a `launch_checklist` config on the org/competition row), wire
 * that lookup in here and fall back to these built-ins.
 */

// Status values a step can report.
export const STEP_STATUS = {
  COMPLETE: 'complete',
  PARTIAL: 'partial',
  INCOMPLETE: 'incomplete',
};

// Only completed self-nominations that have claimed a profile count as real
// nominees the host can review (mirrors OverviewTab's nominee accounting).
function reviewableNominees(nominees = []) {
  return (nominees || []).filter(
    (n) => !(n.nominatedBy === 'self' && !n.claimedAt)
  );
}

// ---------------------------------------------------------------------------
// Step definitions. `ctx` is the dashboard data bag:
//   { competition, host, nominees, contestants, judges, judgingCriteria,
//     prizes, events, sponsors, doubleDays }
// ---------------------------------------------------------------------------

const STEP_CREATE = {
  id: 'create',
  icon: Sparkles,
  title: 'Competition created',
  description: 'Category, city, season and economics are set by the admin.',
  managedBy: 'admin',
  // The dashboard only exists once the competition does, so this is always done.
  getStatus: () => STEP_STATUS.COMPLETE,
  target: null,
};

const STEP_PROFILE = {
  id: 'profile',
  icon: UserCircle,
  title: 'Set up your host profile',
  description: 'Add your photo and bio — this is what the public sees as the face of the competition.',
  getStatus: ({ host }) => {
    const hasAvatar = !!host?.avatar;
    const hasBio = !!(host?.bio && host.bio.trim());
    if (hasAvatar && hasBio) return STEP_STATUS.COMPLETE;
    if (hasAvatar || hasBio) return STEP_STATUS.PARTIAL;
    return STEP_STATUS.INCOMPLETE;
  },
  getDetail: ({ host }) => {
    const missing = [];
    if (!host?.avatar) missing.push('photo');
    if (!(host?.bio && host.bio.trim())) missing.push('bio');
    return missing.length ? `Add your ${missing.join(' and ')}` : null;
  },
  // Routed to the host's own profile page, where they can edit it.
  target: { type: 'profile' },
  ctaLabel: 'Edit profile',
};

const STEP_TIMELINE = {
  id: 'timeline',
  icon: CalendarClock,
  title: 'Build the timeline',
  description: 'Set nomination and voting round dates. Add double-vote days, reset votes each round, and turn on bonus vote tasks.',
  getStatus: ({ competition }) => {
    const rounds = competition?.voting_rounds || [];
    const hasDatedRound = rounds.some((r) => r.start_date && r.end_date);
    const hasNomination = (competition?.nomination_periods || []).some(
      (p) => p.start_date && p.end_date
    ) || !!competition?.nominationStart;
    if (hasDatedRound && hasNomination) return STEP_STATUS.COMPLETE;
    if (hasDatedRound || hasNomination) return STEP_STATUS.PARTIAL;
    return STEP_STATUS.INCOMPLETE;
  },
  target: { type: 'tab', tab: 'setup', section: 'timeline' },
  ctaLabel: 'Set timeline',
};

const STEP_NOMINATION_FORM = {
  id: 'nominationForm',
  icon: ClipboardList,
  title: 'Customize the nomination form',
  description: 'Add your own questions to the nomination form (optional).',
  optional: true,
  getStatus: ({ competition }) => {
    const questions = competition?.nominationFormConfig?.custom_questions || [];
    return questions.length > 0 ? STEP_STATUS.COMPLETE : STEP_STATUS.INCOMPLETE;
  },
  target: { type: 'tab', tab: 'setup', section: 'nominationForm' },
  ctaLabel: 'Add questions',
};

const STEP_JUDGING = {
  id: 'judging',
  icon: Scale,
  title: 'Set up judging, charity & prizes',
  description: 'Add judges, judging criteria and per-round details, a charity partner, and the prizes.',
  getStatus: ({ judges, judgingCriteria, prizes }) => {
    const checks = [
      (judges?.length || 0) > 0,
      (judgingCriteria?.length || 0) > 0,
      (prizes?.length || 0) > 0,
    ];
    const done = checks.filter(Boolean).length;
    if (done === checks.length) return STEP_STATUS.COMPLETE;
    if (done === 0) return STEP_STATUS.INCOMPLETE;
    return STEP_STATUS.PARTIAL;
  },
  getDetail: ({ judges, judgingCriteria, prizes }) => {
    const missing = [];
    if (!(judges?.length > 0)) missing.push('judges');
    if (!(judgingCriteria?.length > 0)) missing.push('criteria');
    if (!(prizes?.length > 0)) missing.push('prizes');
    return missing.length ? `Still need ${missing.join(', ')}` : null;
  },
  // Judging criteria, charity and prizes live in Setup; the judge roster
  // itself is on the People tab.
  target: { type: 'tab', tab: 'setup' },
  ctaLabel: 'Set up judging',
};

const STEP_EVENTS = {
  id: 'events',
  icon: CalendarHeart,
  title: 'Add your IRL events',
  description: 'Schedule the in-person events for the competition (optional).',
  optional: true,
  getStatus: ({ events }) =>
    (events?.length || 0) > 0 ? STEP_STATUS.COMPLETE : STEP_STATUS.INCOMPLETE,
  target: { type: 'tab', tab: 'engagement', section: 'events' },
  ctaLabel: 'Add events',
};

const STEP_NOMINEES = {
  id: 'nominees',
  icon: Users,
  title: 'Get your first nominees & review them',
  description: 'Share the nomination link, then approve or decline who comes in.',
  getStatus: ({ nominees }) => {
    const reviewable = reviewableNominees(nominees);
    if (reviewable.length === 0) return STEP_STATUS.INCOMPLETE;
    const pending = reviewable.filter((n) => n.status === 'pending').length;
    return pending > 0 ? STEP_STATUS.PARTIAL : STEP_STATUS.COMPLETE;
  },
  getDetail: ({ nominees }) => {
    const reviewable = reviewableNominees(nominees);
    const pending = reviewable.filter((n) => n.status === 'pending').length;
    if (reviewable.length === 0) return null;
    return pending > 0
      ? `${pending} awaiting your approval`
      : `${reviewable.length} reviewed`;
  },
  target: { type: 'tab', tab: 'people' },
  ctaLabel: 'Review nominees',
};

// ---------------------------------------------------------------------------
// Templates
//
// `steps` are the launch (setup) tasks. Once every required launch step is
// done, the dashboard flips the checklist into "run" mode and shows `runSteps`
// — the ongoing tasks of operating a live competition (e.g. reviewing
// nominees), which aren't part of getting set up.
// ---------------------------------------------------------------------------

// Most Eligible's full launch framework, in launch order.
export const MOST_ELIGIBLE_CHECKLIST = {
  id: 'most-eligible',
  title: 'Launch Checklist',
  steps: [
    STEP_CREATE,
    STEP_PROFILE,
    STEP_TIMELINE,
    STEP_NOMINATION_FORM,
    STEP_JUDGING,
    STEP_EVENTS,
  ],
  runTitle: 'Run your competition',
  runSteps: [STEP_NOMINEES],
};

// Leaner default for competitions outside the Most Eligible framework: just the
// core steps every competition needs, without the brand-specific extras.
export const GENERAL_CHECKLIST = {
  id: 'general',
  title: 'Launch Checklist',
  steps: [
    STEP_CREATE,
    STEP_PROFILE,
    STEP_TIMELINE,
    STEP_JUDGING,
  ],
  runTitle: 'Run your competition',
  runSteps: [STEP_NOMINEES],
};

// Built-in per-organization templates, keyed by a lowercased org name match.
const ORG_TEMPLATES = [
  { match: (name) => name.includes('most eligible'), checklist: MOST_ELIGIBLE_CHECKLIST },
];

/**
 * Resolve which launch checklist a competition should use.
 *
 * Resolution order (extend the first branch when org-level config lands):
 *   1. Org/competition-defined launch to-dos (future DB config) — not yet wired.
 *   2. Built-in per-organization template (e.g. Most Eligible).
 *   3. General default.
 */
export function resolveLaunchChecklist(competition) {
  const orgName = (competition?.organizationName || '').toLowerCase();
  const orgTemplate = ORG_TEMPLATES.find((t) => t.match(orgName));
  if (orgTemplate) return orgTemplate.checklist;
  return GENERAL_CHECKLIST;
}

/**
 * Compute per-step status plus an overall progress summary for a checklist.
 * Optional steps are tracked but excluded from the required-progress count so a
 * host can launch without them.
 */
export function computeChecklistProgress(checklist, ctx) {
  const steps = checklist.steps.map((step) => {
    const status = step.getStatus(ctx);
    return {
      ...step,
      status,
      detail: step.getDetail ? step.getDetail(ctx) : null,
    };
  });

  const required = steps.filter((s) => !s.optional);
  const requiredComplete = required.filter(
    (s) => s.status === STEP_STATUS.COMPLETE
  ).length;

  return {
    steps,
    requiredComplete,
    requiredTotal: required.length,
    allRequiredComplete: requiredComplete === required.length,
  };
}
