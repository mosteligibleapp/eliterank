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
  const city = competition?.city || 'your city';
  const votingOnly = votingRounds.filter(r => r.round_type === 'voting');
  // Fall back to all non-judging rounds if none are explicitly typed 'voting'
  const numRounds = votingOnly.length || votingRounds.filter(r => r.round_type !== 'judging').length;
  const doubleVoteDays = events.filter(e => e.is_double_vote_day);

  // 1. Eligibility Requirements
  rules.push({
    id: 'eligibility',
    section_title: 'Eligibility Requirements',
    section_content: generateEligibilityContent({ competition, about, city }),
    sort_order: 1,
  });

  // 2. Voting Rules
  rules.push({
    id: 'voting',
    section_title: 'Voting Rules',
    section_content: generateVotingContent({ competition }),
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
function generateEligibilityContent({ competition, about, city }) {
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

  // Location requirement
  parts.push(`Must live within 100 miles of ${city}`);

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
function generateVotingContent({ competition }) {
  const pricePerVote = competition?.price_per_vote || 1;

  const content = [
    '• One free vote per person, per day',
    '• Free votes reset at midnight (local time)',
    `• Additional votes can be purchased ($${pricePerVote.toFixed(2)} per vote)`,
    '• Paid votes are applied immediately and do not expire',
    '• Vote counts reset to zero at the start of each new round',
    '• You can vote for any contestant - vote for your favorites!',
  ];

  return content.join('\n');
}

/**
 * Generate rounds & advancement content
 */
function generateRoundsContent({ competition, votingRounds, numRounds }) {
  const totalRounds = votingRounds.length;
  const numWinners = competition?.number_of_winners || 5;
  const sorted = [...votingRounds].sort((a, b) => (a.round_order || 0) - (b.round_order || 0));
  const judgingRound = sorted.find(r => r.round_type === 'judging');
  const judgingIndex = sorted.indexOf(judgingRound);
  const finalVotingRound = judgingRound ? sorted.find((r, i) => i > judgingIndex && r.round_type !== 'judging') : null;

  const content = [
    `• The competition runs across ${totalRounds} rounds`,
    '• A set number of contestants advances each round based on vote count',
    '• Votes reset to zero at the start of every round',
  ];

  // Add round-specific info
  sorted.forEach((round, index) => {
    const roundNum = index + 1;
    const isJudging = round.round_type === 'judging';

    if (isJudging) {
      const advanceTo = round.contestants_advance || numWinners;
      content.push(`• Round ${roundNum}: A panel of judges scores the finalists — judge scores determine who advances to the Top ${advanceTo}`);
    } else if (finalVotingRound && round === finalVotingRound) {
      content.push(`• Round ${roundNum}: Final voting round — votes reset one last time, and the final vote count determines the winners' rankings (1st–${numWinners}th)`);
    } else {
      const advanceInfo = round.contestants_advance
        ? ` — Top ${round.contestants_advance} advance`
        : '';
      content.push(`• Round ${roundNum}: ${round.title || `Voting Round ${roundNum}`}${advanceInfo}`);
    }
  });

  content.push(`• ${numWinners} contestants will be crowned Most Eligible ${competition?.city?.name || competition?.city || ''} and hold the title for one year`);
  content.push('• Fans can vote once daily for free, or purchase additional votes');
  content.push('• Keep an eye out for surprise Double Vote Days — when they hit, every vote counts twice');

  return content.join('\n');
}

/**
 * Generate prize pool content
 */
function generatePrizePoolContent({ competition }) {
  const minimum = competition?.prize_pool_minimum || 1000;
  const numWinners = competition?.number_of_winners || 5;

  const content = [
    `• Top ${numWinners} contestants with the most votes earn the year long title`,
    `• The ${numWinners} winners receive a prize package from competition sponsors`,
    `• 1st place receives a cash prize (min $${minimum.toLocaleString()})`,
    '• Cash prize grows from every paid vote purchased',
  ];

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
