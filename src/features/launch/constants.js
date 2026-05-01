export const LAUNCH_DRAFT_KEY = 'eliterank-launch-draft-v1';

export const STEP_KEYS = [
  'org',
  'category',
  'name',
  'who',
  'social',
  'revenue',
  'winning',
  'city',
  'launch',
  'notes',
  'review',
];

export const STEP_LABELS = {
  org: 'Organization',
  category: 'Category',
  name: 'Name',
  who: 'Eligibility',
  social: 'Social',
  revenue: 'Revenue',
  winning: 'Winning',
  city: 'City',
  launch: 'Schedule',
  notes: 'Notes',
  review: 'Review',
};

export const SKIPPABLE_STEPS = new Set(['social', 'notes']);

export const CATEGORY_OPTIONS = [
  { value: 'dating', label: 'Dating & Relationships', description: "Most eligible singles, matchmaking events." },
  { value: 'fitness', label: 'Fitness & Wellness', description: 'Athletic, health, transformation contests.' },
  { value: 'talent', label: 'Talent & Performance', description: 'Music, dance, comedy, performing arts.' },
  { value: 'business', label: 'Business & Pitch', description: 'Founder pitches, professional awards.' },
  { value: 'beauty', label: 'Beauty & Style', description: 'Pageants, modeling, fashion.' },
  { value: 'other', label: 'Other', description: 'Tell us what you have in mind.' },
];

export const GENDER_CHIPS = [
  { value: 'Women', label: 'Women' },
  { value: 'Men', label: 'Men' },
  { value: 'All genders', label: 'All genders' },
  { value: 'Non-binary inclusive', label: 'Non-binary inclusive' },
];

export const SOCIAL_PLATFORMS = [
  { value: 'Instagram', label: 'Instagram' },
  { value: 'TikTok', label: 'TikTok' },
  { value: 'YouTube', label: 'YouTube' },
  { value: 'X', label: 'X' },
  { value: 'LinkedIn', label: 'LinkedIn' },
  { value: 'Facebook', label: 'Facebook' },
];

export const REVENUE_MODELS = [
  { value: 'Paid voting', label: 'Paid voting' },
  { value: 'Sponsorships', label: 'Sponsorships' },
  { value: 'Event tickets', label: 'Event tickets' },
  { value: 'Entry fees', label: 'Entry fees' },
  { value: 'Merchandise', label: 'Merchandise' },
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
  // Name
  competition_name: '',
  tagline: '',
  // Who
  gender_eligibility: [],
  age_min: '',
  age_max: '',
  no_age_restrictions: false,
  // Social
  social_platforms: [],
  campaign_hashtag: '',
  min_followers: '',
  // Revenue
  revenue_models: [],
  vote_price_usd: '',
  sponsor_tiers: '',
  // Winning
  num_winners: 1,
  cash_pool_usd: '',
  in_kind_prizes: [],
  // City
  city: '',
  venue: '',
  // Launch
  num_rounds: 6,
  start_date: '',
  end_date: '',
  // Notes
  notes: '',
};
