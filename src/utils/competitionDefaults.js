/**
 * Template-based default content for competition pages
 * Computed on-the-fly from competition context
 */

// Category-specific content
const CATEGORY_CONFIG = {
  dating: {
    tagline: (city, demo) => `Find ${city}'s Most Eligible ${demo}`,
    description: (city, demo, season) =>
      `The search is on for ${city}'s most desirable ${demo.toLowerCase()}. Vote for your favorites and help crown the winners of Season ${season}.`,
    traits: ['Charismatic', 'Ambitious', 'Genuine', 'Confident'],
    requirement: (city) => `Single & based in ${city}`,
  },
  fitness: {
    tagline: (city, demo) => `${city}'s Most Fit ${demo}`,
    description: (city, demo, season) =>
      `Celebrating ${city}'s fittest ${demo.toLowerCase()}. Vote for the athletes who inspire you and help crown the champions of Season ${season}.`,
    traits: ['Disciplined', 'Dedicated', 'Strong', 'Inspiring'],
    requirement: (city) => `Based in ${city}`,
  },
  talent: {
    tagline: (city, demo) => `${city}'s Most Talented ${demo}`,
    description: (city, demo, season) =>
      `Showcasing ${city}'s brightest ${demo.toLowerCase()}. Vote for the performers who move you and help crown the stars of Season ${season}.`,
    traits: ['Creative', 'Skilled', 'Passionate', 'Captivating'],
    requirement: (city) => `Based in ${city}`,
  },
  business: {
    tagline: (city, demo) => `${city}'s Top ${demo} in Business`,
    description: (city, demo, season) =>
      `Recognizing ${city}'s most accomplished ${demo.toLowerCase()} in business. Vote for the leaders who inspire you in Season ${season}.`,
    traits: ['Driven', 'Innovative', 'Strategic', 'Visionary'],
    requirement: (city) => `Based in ${city}`,
  },
  pageant: {
    tagline: (city, demo) => `${city}'s Most Glamorous ${demo}`,
    description: (city, demo, season) =>
      `Celebrating beauty, talent, and poise in ${city}. Vote for the ${demo.toLowerCase()} who captivate you in Season ${season}.`,
    traits: ['Elegant', 'Poised', 'Talented', 'Radiant'],
    requirement: (city) => `Based in ${city}`,
  },
  health: {
    tagline: (city, demo) => `${city}'s Healthiest ${demo}`,
    description: (city, demo, season) =>
      `Celebrating wellness and vitality in ${city}. Vote for the ${demo.toLowerCase()} who embody healthy living in Season ${season}.`,
    traits: ['Balanced', 'Energetic', 'Mindful', 'Vibrant'],
    requirement: (city) => `Based in ${city}`,
  },
  social: {
    tagline: (city, demo) => `${city}'s Most Influential ${demo}`,
    description: (city, demo, season) =>
      `Recognizing ${city}'s top social influencers. Vote for the ${demo.toLowerCase()} who inspire your feed in Season ${season}.`,
    traits: ['Engaging', 'Authentic', 'Creative', 'Influential'],
    requirement: (city) => `Based in ${city}`,
  },
  default: {
    tagline: (city, demo) => `${city}'s Elite ${demo}`,
    description: (city, demo, season) =>
      `Join the search for ${city}'s finest ${demo.toLowerCase()}. Vote for your favorites and help crown the winners of Season ${season}.`,
    traits: ['Charismatic', 'Driven', 'Authentic', 'Inspiring'],
    requirement: (city) => `Based in ${city}`,
  },
};

// Age range by demographic slug
const AGE_RANGE_BY_DEMOGRAPHIC = {
  'women-21-39': '21-39',
  'women-40-plus': '40+',
  'men-21-39': '21-39',
  'men-40-plus': '40+',
  'lgbtq-plus-21-39': '21-39',
  'lgbtq-plus-40-plus': '40+',
  'open': 'All Ages',
  default: '21+',
};

/**
 * Get default tagline for a competition
 */
export function getDefaultTagline(competition) {
  const city = competition?.city?.name || competition?.city || 'Your City';
  const demographic = competition?.demographic?.label || 'Contestants';
  const categorySlug = competition?.category?.slug || 'default';

  const config = CATEGORY_CONFIG[categorySlug] || CATEGORY_CONFIG.default;
  return config.tagline(city, demographic);
}

/**
 * Get default description for a competition
 */
export function getDefaultDescription(competition) {
  const city = competition?.city?.name || competition?.city || 'your city';
  const demographic = competition?.demographic?.label || 'contestants';
  const season = competition?.season || new Date().getFullYear();
  const categorySlug = competition?.category?.slug || 'default';

  const config = CATEGORY_CONFIG[categorySlug] || CATEGORY_CONFIG.default;
  return config.description(city, demographic, season);
}

/**
 * Get default traits for a competition
 */
export function getDefaultTraits(competition) {
  const categorySlug = competition?.category?.slug || 'default';
  const config = CATEGORY_CONFIG[categorySlug] || CATEGORY_CONFIG.default;
  return [...config.traits]; // Return copy to prevent mutation
}

/**
 * Get default age range for a competition
 */
export function getDefaultAgeRange(competition) {
  const demographicSlug = competition?.demographic?.slug || 'default';
  return AGE_RANGE_BY_DEMOGRAPHIC[demographicSlug] || AGE_RANGE_BY_DEMOGRAPHIC.default;
}

/**
 * Get default requirement for a competition
 */
export function getDefaultRequirement(competition) {
  const city = competition?.city?.name || competition?.city || 'the area';
  const categorySlug = competition?.category?.slug || 'default';

  const config = CATEGORY_CONFIG[categorySlug] || CATEGORY_CONFIG.default;
  return config.requirement(city);
}

/**
 * Get all defaults as an object
 */
export function getCompetitionDefaults(competition) {
  return {
    tagline: getDefaultTagline(competition),
    description: getDefaultDescription(competition),
    traits: getDefaultTraits(competition),
    ageRange: getDefaultAgeRange(competition),
    requirement: getDefaultRequirement(competition),
  };
}

export default getCompetitionDefaults;
