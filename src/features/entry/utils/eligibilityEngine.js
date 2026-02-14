/**
 * Eligibility Engine
 * Generates dynamic eligibility fields from competition + demographic + category data.
 * Nothing is hardcoded to a specific competition.
 */

/**
 * Safely resolve city name from competition data.
 * Handles both shapes: `city: "Austin"` (string) and `city: {name: "Austin"}` (join object).
 */
export function getCityName(competition) {
  if (!competition) return '';
  // cityData.name (entry flow shape)
  if (competition.cityData?.name) return competition.cityData.name;
  // city as join object: city:cities(name) → {name: "..."}
  if (competition.city && typeof competition.city === 'object') return competition.city.name || '';
  // city as plain string
  if (typeof competition.city === 'string') return competition.city;
  return '';
}

/**
 * Generate eligibility confirmation fields based on competition data
 * @param {Object} competition - Full competition object with joined category, demographic, city
 * @returns {Array<{id: string, getLabel: (isSelf: boolean) => string, required: boolean}>}
 */
export function generateEligibilityFields(competition) {
  const fields = [];
  if (!competition) return fields;

  const demographic = competition.demographic;
  const category = competition.category;
  const cityName = getCityName(competition);
  const radius = competition.eligibility_radius_miles;

  // 1. Location eligibility
  if (cityName) {
    if (radius && radius > 0) {
      fields.push({
        id: 'lives_in_area',
        getLabel: (isSelf) =>
          isSelf
            ? `I live within ${radius} miles of ${cityName}`
            : `They live within ${radius} miles of ${cityName}`,
        required: true,
      });
    } else {
      fields.push({
        id: 'lives_in_city',
        getLabel: (isSelf) =>
          isSelf
            ? `I live in ${cityName}`
            : `They live in ${cityName}`,
        required: true,
      });
    }
  }

  // 2. Gender eligibility (from demographic)
  if (demographic?.gender) {
    const genderLabel =
      demographic.gender === 'female'
        ? 'female'
        : demographic.gender === 'male'
          ? 'male'
          : demographic.gender;

    fields.push({
      id: 'gender_eligible',
      getLabel: (isSelf) =>
        isSelf
          ? `I identify as ${genderLabel}`
          : `They identify as ${genderLabel}`,
      required: true,
    });
  }

  // 3. Age eligibility (from demographic)
  if (demographic?.age_min != null || demographic?.age_max != null) {
    const min = demographic.age_min || 18;
    const ageRange = demographic.age_max
      ? `${min}–${demographic.age_max}`
      : `${min}+`;

    fields.push({
      id: 'age_eligible',
      getLabel: (isSelf) =>
        isSelf
          ? `I am between the ages of ${ageRange}`
          : `They are between the ages of ${ageRange}`,
      required: true,
    });
  }

  // 4. Category-specific requirements
  if (category?.slug === 'dating') {
    fields.push({
      id: 'is_single',
      getLabel: (isSelf) =>
        isSelf
          ? 'I am single (not married or engaged)'
          : 'They are single (not married or engaged)',
      required: true,
    });
  }

  return fields;
}

/**
 * Get optional/extra fields configured by the host
 * Currently returns empty array - extensible for future host configuration
 * @param {Object} competition
 * @returns {Array}
 */
export function getOptionalFields(competition) {
  return [];
}

/**
 * Build the competition display title from its data
 * @param {Object} competition
 * @returns {string}
 */
export function getCompetitionTitle(competition) {
  if (!competition) return '';

  // Use competition name if set
  if (competition.name) return competition.name;

  // Construct from category + city
  const cityName = getCityName(competition);
  const categoryName = competition.category?.name || '';

  if (categoryName && cityName) {
    return `${categoryName} ${cityName}`;
  }

  return cityName || 'Competition';
}

/**
 * Get the demographic label for display
 * @param {Object} demographic
 * @returns {string}
 */
export function getDemographicLabel(demographic) {
  if (!demographic) return '';
  return demographic.label || '';
}
