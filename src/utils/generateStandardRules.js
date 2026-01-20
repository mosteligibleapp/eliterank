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
  const numRounds = votingRounds.filter(r => r.round_type === 'voting').length;
  const doubleVoteDays = events.filter(e => e.is_double_vote_day);

  // 1. Eligibility Requirements
  rules.push({
    id: 'eligibility',
    section_title: 'Eligibility Requirements',
    section_content: generateEligibilityContent({ about, city }),
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
      section_content: generateRoundsContent({ votingRounds, numRounds }),
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
function generateEligibilityContent({ about, city }) {
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

  // Location requirement
  parts.push(`Must live within 100 miles of ${city}`);

  // Other requirements from about.requirement
  if (about?.requirement) {
    // Parse common requirement patterns
    const req = about.requirement.toLowerCase();
    if (req.includes('single')) {
      parts.push('Must be single (not married or in a committed relationship)');
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
function generateRoundsContent({ votingRounds, numRounds }) {
  const votingOnly = votingRounds.filter(r => r.round_type === 'voting');

  const content = [
    `• This competition has ${numRounds} voting round${numRounds > 1 ? 's' : ''}`,
  ];

  // Add round-specific info if available
  votingOnly.forEach((round, index) => {
    const roundNum = index + 1;
    const advanceInfo = round.contestants_advance
      ? ` - Top ${round.contestants_advance} advance`
      : '';
    content.push(`• Round ${roundNum}: ${round.title || `Voting Round ${roundNum}`}${advanceInfo}`);
  });

  content.push('• Contestants in the bottom percentage each round are eliminated');
  content.push('• Final round determines the winners');

  return content.join('\n');
}

/**
 * Generate prize pool content
 */
function generatePrizePoolContent({ competition }) {
  const minimum = competition?.prize_pool_minimum || 1000;
  const numWinners = competition?.number_of_winners || 5;

  const content = [
    `• Guaranteed minimum prize pool: $${minimum.toLocaleString()}`,
    '• Prize pool grows with every paid vote purchased',
    '• 50% of all vote purchases go directly to the prize pool',
    `• Top ${numWinners} finishers win cash prizes`,
    '• 1st place receives the largest share of the prize pool',
    '• Prize distribution is announced before the final round',
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
    '• On special double vote days, all votes count 2x!',
    '• Both free and paid votes are doubled',
    '• Double days are announced in advance',
    '',
    'Scheduled double vote days:',
  ];

  doubleVoteDays.forEach(event => {
    const date = new Date(event.date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    content.push(`• ${date}${event.name ? ` - ${event.name}` : ''}`);
  });

  return content.join('\n');
}

export default generateStandardRules;
