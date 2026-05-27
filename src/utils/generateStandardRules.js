/**
 * Generate standard competition rules from competition configuration
 * Rules are auto-generated based on how the competition was set up
 */

/**
 * Generate all standard rule sections
 * @param {object} options
 * @param {object} options.competition - Competition data
 * @param {object} options.about - About/eligibility info (ageRange, requirement)
 * @param {array} options.votingRounds - Array of voting rounds
 * @param {array} options.events - Events (for double vote days)
 * @returns {array} Array of rule sections with section_title and section_content
 */
export function generateStandardRules({
  competition,
  about,
  votingRounds = [],
  events = [],
}) {
  const rules = [];
  // `competition.city` can be either the embedded cities row (from
  // `city:cities(*)`) or the denormalized TEXT column — accept either.
  const cityName = competition?.city?.name || competition?.city || 'your city';
  const votingOnly = votingRounds.filter(r => r.round_type === 'voting');
  // Fall back to all non-judging rounds if none are explicitly typed 'voting'
  const numRounds = votingOnly.length || votingRounds.filter(r => r.round_type !== 'judging').length;
  const doubleVoteDays = events.filter(e => e.is_double_vote_day);

  // 1. Eligibility Requirements
  rules.push({
    id: 'eligibility',
    section_title: 'Eligibility Requirements',
    section_content: generateEligibilityContent({ competition, about, cityName }),
    sort_order: 1,
  });

  // 2. Voting Rules
  rules.push({
    id: 'voting',
    section_title: 'Voting Rules',
    section_content: generateVotingContent({ competition, votingRounds }),
    sort_order: 2,
  });

  // 3. Rounds & Advancement
  if (numRounds > 0) {
    rules.push({
      id: 'rounds',
      section_title: 'Rounds & Advancement',
      section_content: generateRoundsContent({ competition, votingRounds, numRounds }),
      sort_order: 3,
    });
  }

  // 4. Prize Pool
  rules.push({
    id: 'prize-pool',
    section_title: 'Prize Pool',
    section_content: generatePrizePoolContent({ competition }),
    sort_order: 4,
  });

  // 5. Resurrection Round (if applicable)
  const hasResurrection = votingRounds.some(
    r => r.title?.toLowerCase().includes('resurrection') ||
         r.round_type === 'resurrection'
  );
  if (hasResurrection) {
    rules.push({
      id: 'resurrection',
      section_title: 'Resurrection Round',
      section_content: generateResurrectionContent(),
      sort_order: 5,
    });
  }

  // 6. Double Vote Days (if any scheduled)
  if (doubleVoteDays.length > 0) {
    rules.push({
      id: 'double-days',
      section_title: 'Double Vote Days',
      section_content: generateDoubleVoteDaysContent({ doubleVoteDays }),
      sort_order: 6,
    });
  }

  return rules;
}

/**
 * Generate eligibility section content
 */
function generateEligibilityContent({ competition, about, cityName }) {
  const parts = [];

  // Age requirement
  if (about?.ageRange) {
    const ageRange = about.ageRange;
    if (ageRange.toLowerCase().includes('all') || ageRange.toLowerCase() === 'open') {
      // "All Ages" or "Open" = minimum 18 years old
      parts.push('Must be at least 18 years old');
    } else if (ageRange.includes('-')) {
      const [min, max] = ageRange.split('-').map(s => s.trim());
      parts.push(`Must be between ${min} and ${max} years old`);
    } else if (ageRange.includes('+')) {
      parts.push(`Must be ${ageRange} years old`);
    } else {
      // Numeric value only - use as minimum
      parts.push(`Must be at least ${ageRange} years old`);
    }
  } else {
    // Default minimum age for competitions without specified range
    parts.push('Must be at least 18 years old');
  }

  // Gender requirement from demographic
  const gender = competition?.demographic?.gender;
  if (gender === 'female') {
    parts.push('Must be legally recognized as female');
  } else if (gender === 'male') {
    parts.push('Must be legally recognized as male');
  } else if (gender) {
    parts.push(`Must identify as ${gender}`);
  }

  // Location requirement — pulled from competitions.eligibility_radius_miles
  const radiusMiles = competition?.eligibility_radius_miles || 100;
  parts.push(`Must live within ${radiusMiles} miles of ${cityName}`);

  // Other requirements from about.requirement
  if (about?.requirement) {
    // Parse common requirement patterns
    const req = about.requirement.toLowerCase();
    if (req.includes('single')) {
      parts.push('Must be single (not married or engaged to be married)');
    } else if (req.includes('based')) {
      // Generic location requirement - already covered above, skip duplicating
    } else {
      // Include custom requirement as-is
      parts.push(about.requirement);
    }
  }
  // Note: No default "single" requirement - only applies when explicitly set

  // Format as bullet list
  return parts.map(p => `• ${p}`).join('\n');
}

/**
 * Generate voting rules content
 */
function generateVotingContent({ competition, votingRounds = [] }) {
  const content = [
    '• One free vote per person, per day',
    '• Free votes reset at midnight (local time)',
    '• Additional votes can be purchased',
    describeRoundCarryover(votingRounds),
    '• You can vote for any contestant - vote for your favorites!',
  ];

  return content.filter(Boolean).join('\n');
}

/**
 * Inspect each round's votes_reset_at_start flag and produce a single
 * accurate bullet describing how vote counts behave between rounds.
 *
 * The first round's flag is moot (the round opens with everyone at 0), so
 * we only look at rounds where round_order > 1 — i.e. transitions between
 * rounds. Returns null when there are no inter-round transitions to describe.
 */
function describeRoundCarryover(votingRounds) {
  const transitions = votingRounds
    .filter(r => (r.round_order || 0) > 1)
    .map(r => Boolean(r.votes_reset_at_start));

  if (transitions.length === 0) return null;

  const allReset = transitions.every(v => v === true);
  const allCarry = transitions.every(v => v === false);

  if (allReset) return '• Vote counts reset to zero at the start of each new round';
  if (allCarry) return '• Vote counts carry over from round to round';
  return '• Vote counts carry over between most rounds; specific rounds may reset (see round details)';
}

/**
 * Generate rounds & advancement content
 */
function generateRoundsContent({ competition, votingRounds, numRounds }) {
  const numWinners = competition?.number_of_winners || 5;
  const sorted = [...votingRounds].sort((a, b) => (a.round_order || 0) - (b.round_order || 0));
  // Competition title (e.g. "Most Eligible Toronto 2026"). Avoids the
  // previous hardcoded "Most Eligible {city}" string which only made sense
  // for Most Eligible-branded events.
  const competitionTitle = competition?.name?.trim();

  const content = [
    `• The competition runs across ${sorted.length} voting rounds`,
    '• A set number of contestants advances each round based on vote count',
  ];

  // List each round with its advancement (and per-round reset note when it
  // applies to an inter-round transition).
  sorted.forEach((round, index) => {
    const isLast = index === sorted.length - 1;
    const title = round.title || `Round ${index + 1}`;
    const resetsAtStart = Boolean(round.votes_reset_at_start) && (round.round_order || 0) > 1;
    const resetSuffix = resetsAtStart ? ' (votes reset to zero at the start of this round)' : '';

    if (isLast) {
      content.push(`• ${title}${resetSuffix} — the final vote count determines the winners' rankings (1st–${numWinners}th)`);
    } else {
      const advanceInfo = round.contestants_advance
        ? ` — Top ${round.contestants_advance} advance`
        : '';
      content.push(`• ${title}${advanceInfo}${resetSuffix}`);
    }
  });

  // Add judge scoring note between second-to-last and last round
  if (sorted.length >= 2) {
    const preFinalists = sorted[sorted.length - 2]?.contestants_advance;
    const finalists = sorted[sorted.length - 1]?.contestants_advance || numWinners;
    if (preFinalists && preFinalists > finalists) {
      content.push(`• After the Top ${preFinalists} are determined, a panel of judges will score the finalists — judge scores determine who advances to the Top ${finalists}`);
    }
  }

  if (competitionTitle) {
    content.push(`• ${numWinners} contestants will be crowned winners of ${competitionTitle} and hold the title for one year`);
  } else {
    content.push(`• ${numWinners} contestants will be crowned winners and hold the title for one year`);
  }
  content.push('• Keep an eye out for surprise Double Vote Days — when they hit, every vote counts twice');

  return content.join('\n');
}

/**
 * Generate prize pool content
 */
function generatePrizePoolContent({ competition }) {
  // A cash prize pool exists only when prize_pool_minimum is explicitly set
  // and positive. Without that, we shouldn't claim a cash prize at all —
  // some competitions use purely sponsored / in-kind prizes.
  const rawMinimum = competition?.prize_pool_minimum;
  const minimum = Number(rawMinimum) > 0 ? Number(rawMinimum) : null;
  const numWinners = competition?.number_of_winners || 5;

  const content = [
    `• Top ${numWinners} contestants with the most votes earn the year long title`,
    `• The ${numWinners} winners receive a prize package from competition sponsors`,
  ];

  if (minimum != null) {
    content.push(`• 1st place receives a cash prize (min $${minimum.toLocaleString()})`);
    content.push('• Cash prize grows from every paid vote purchased');
  }

  return content.join('\n');
}

/**
 * Generate resurrection round content
 */
function generateResurrectionContent() {
  const content = [
    '• Previously eliminated contestants get a second chance',
    '• Resurrection voting is separate from regular rounds',
    '• Top vote-getters in resurrection return to competition',
    '• Resurrected contestants start fresh in the next round',
    '• Only one resurrection opportunity per competition',
  ];

  return content.join('\n');
}

/**
 * Generate double vote days content
 */
function generateDoubleVoteDaysContent({ doubleVoteDays }) {
  const content = [
    '• On surprise Double Vote Days, every vote counts twice!',
    '• Both free and paid votes are doubled',
    '',
    'Upcoming Double Vote Days:',
  ];

  doubleVoteDays.forEach(event => {
    const safeDate = typeof event.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(event.date)
      ? event.date + 'T00:00:00' : event.date;
    const date = new Date(safeDate).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    content.push(`• ${date}${event.name ? ` - ${event.name}` : ''}`);
  });

  return content.join('\n');
}

export default generateStandardRules;
