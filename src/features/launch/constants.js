export const LAUNCH_DRAFT_KEY = 'eliterank-launch-draft-v2';

export const STEP_KEYS = [
  'org',
  'category',
  'name',
  'who',
  'presence',
  'revenue',
  'timing',
  'notes',
  'review',
];

export const STEP_LABELS = {
  org: 'Organization',
  category: 'Category',
  name: 'Name',
  who: 'Eligibility',
  presence: 'Presence',
  revenue: 'Revenue',
  timing: 'Timing',
  notes: 'Notes',
  review: 'Review',
};

export const SKIPPABLE_STEPS = new Set(['presence', 'notes']);

export const CATEGORY_OPTIONS = [
  { value: 'dating', label: 'Dating & Relationships', description: "Most eligible singles, matchmaking events." },
  { value: 'fitness', label: 'Fitness & Wellness', description: 'Athletic, health, transformation contests.' },
  { value: 'talent', label: 'Talent & Performance', description: 'Music, dance, comedy, performing arts.' },
  { value: 'business', label: 'Business & Pitch', description: 'Founder pitches, professional awards.' },
  { value: 'beauty', label: 'Beauty & Style', description: 'Pageants, modeling, fashion.' },
  { value: 'other', label: 'Other', description: 'Tell us what you have in mind.' },
];

export const SCOPE_OPTIONS = [
  { value: 'local',         label: 'Local',         description: 'A single venue or neighborhood.' },
  { value: 'city-wide',     label: 'City-wide',     description: 'Across one city.' },
  { value: 'state-wide',    label: 'State-wide',    description: 'Across one state.' },
  { value: 'national',      label: 'National',      description: 'Across the country.' },
  { value: 'international', label: 'International', description: 'Across multiple countries.' },
];

export const GENDER_CHIPS = [
  { value: 'Women', label: 'Women' },
  { value: 'Men', label: 'Men' },
  { value: 'All genders', label: 'All genders' },
  { value: 'Non-binary inclusive', label: 'Non-binary inclusive' },
];

export const REVENUE_MODELS = [
  { value: 'Paid voting',    label: 'Paid voting' },
  { value: 'Sponsorships',   label: 'Sponsorships' },
  { value: 'Event tickets',  label: 'Event tickets' },
  { value: 'Entry fees',     label: 'Entry fees' },
  { value: 'Merchandise',    label: 'Merchandise' },
  { value: 'Charity-based',  label: 'Charity-based' },
  { value: 'Not sure yet',   label: 'Not sure yet' },
];

export const START_TIMEFRAME_OPTIONS = [
  { value: 'asap',           label: 'ASAP / within a month' },
  { value: '1-3-months',     label: '1-3 months' },
  { value: '3-6-months',     label: '3-6 months' },
  { value: '6-12-months',    label: '6-12 months' },
  { value: '12-plus-months', label: '12+ months / just exploring' },
];

export const INITIAL_FORM = {
  // Org
  org_name: '',
  org_is_new: true,
  contact_name: '',
  contact_email: '',
  // Category
  category: '',
  category_other: '',
  // Name + scope
  competition_name: '',
  scope: '',
  // Who
  gender_eligibility: [],
  age_min: '',
  age_max: '',
  no_age_restrictions: false,
  // Presence
  website_url: '',
  social_url: '',
  // Revenue
  revenue_models: [],
  // Timing
  start_timeframe: '',
  // Notes
  notes: '',
};
