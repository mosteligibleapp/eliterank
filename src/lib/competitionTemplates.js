import { Crown, Music, Star, Heart, Users, Dumbbell, Briefcase, Camera, Dog, Pencil } from 'lucide-react';

/**
 * Category templates — Page 1 of the create wizard.
 *
 * Each template is a host-facing starting point that pre-fills sensible defaults
 * and maps to the fixed `categories` lookup when one fits (categorySlug). The
 * template label is always stored on the competition (category_template) so a
 * template with no matching category — or a free-text "Other" — still captures
 * intent. `relationshipRelevant` surfaces the relationship-status eligibility
 * field (dating/pageant-style competitions).
 */
export const COMPETITION_TEMPLATES = [
  { id: 'pageant', label: 'Pageant', icon: Crown, categorySlug: null, relationshipRelevant: true },
  { id: 'talent', label: 'Talent', icon: Music, categorySlug: 'talent' },
  { id: 'best_of', label: 'Best Of', icon: Star, categorySlug: null },
  { id: 'dating', label: 'Dating', icon: Heart, categorySlug: 'dating', relationshipRelevant: true },
  { id: 'couples', label: 'Couples', icon: Users, categorySlug: 'dating', relationshipRelevant: true },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell, categorySlug: 'fitness' },
  { id: 'industry_awards', label: 'Industry Awards', icon: Briefcase, categorySlug: 'business' },
  { id: 'modeling', label: 'Modeling', icon: Camera, categorySlug: null },
  { id: 'pets', label: 'Pets', icon: Dog, categorySlug: null },
];

// "Other" — host types their own category.
export const CUSTOM_TEMPLATE = { id: 'custom', label: 'Other', icon: Pencil };

// Planned launch window asked at onboarding — a planning signal, not the real
// nomination/voting dates (those come just before publish). We don't offer a
// "less than 4 weeks" option: launching in under a month isn't recommended.
export const LAUNCH_TIMEFRAMES = [
  { id: '6_plus_months', label: '6+ months out' },
  { id: '3_6_months', label: '3–6 months out' },
  { id: '1_2_months', label: '1–2 months out' },
];
export const LAUNCH_TIMEFRAME_LABELS = LAUNCH_TIMEFRAMES.reduce((m, t) => { m[t.id] = t.label; return m; }, {});

// What each entry type means — shown under the Entry selector everywhere.
export const ENTRY_TYPE_HELP = {
  nominations: 'Nomination — a casual entry form. Prospective contestants can submit themselves, or someone else can nominate them.',
  applications: 'Application — a longer, qualitative form that contestants must submit themselves.',
};

// US states + DC — shared by the create wizard and the dashboard recap editor.
export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME',
  'MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI',
  'SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

export function findTemplate(id) {
  if (id === CUSTOM_TEMPLATE.id) return CUSTOM_TEMPLATE;
  return COMPETITION_TEMPLATES.find((t) => t.id === id) || null;
}
