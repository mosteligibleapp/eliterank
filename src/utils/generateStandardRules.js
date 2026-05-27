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

  // Residency / location requirement.
  // If the host provides a full custom residency string, use it verbatim
  // (lets them express richer rules — e.g. permanent-resident status,
  // temporary-resident exclusion, etc.). Otherwise auto-format from
  // radius + optional jurisdiction.
  const residencyText = competition?.eligibility_residency_text?.trim();
  if (residencyText) {
    parts.push(residencyText);
  } else {
    const radius = competition?.eligibility_radius_miles ?? 100;
    const jurisdiction = competition?.eligibility_jurisdiction;
    parts.push(
      jurisdiction
        ? `Must live within ${radius} miles of ${city}, ${jurisdiction}`
        : `Must live within ${radius} miles of ${city}`
    );
  }

  // Other requirements from about.requirement — supports multi-line (one bullet per line).
  // Lines are passed through verbatim except for a couple of short keyword shorthands
  // ("single" alone expands to the canonical sentence; "based" is treated as a duplicate
  // of the location bullet and dropped).
  if (about?.requirement) {
    const lines = about.requirement.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    for (const line of lines) {
      const normalized = line.toLowerCase();
      if (normalized === 'single') {
        parts.push('Must be single (not married or engaged to be married)');
      } else if (normalized === 'based') {
        // Generic location requirement — already covered above
      } else {
        parts.push(line);
      }
    }
  }

  // Format as bullet list
  return parts.map(p => `• ${p}`).join('\n');
}

/**
 * Generate voting rules content
 */
function generateVotingContent({ competition }) {
  const pricePerVote = competition?.price_per_vote || 1;
  const judgesPct = competition?.judges_score_weight_pct;

  const content = [];

  if (judgesPct != null) {
    const votesPct = 100 - judgesPct;
    content.push(`• Final winners are determined by ${judgesPct}% judges' scoring and ${votesPct}% public votes`);
  }

  content.push(
    '• One free vote per person, per 24 hrs',
    '• Additional votes can be purchased',
    "• Paid votes are applied immediately to contestants round vote count",
    '• Vote counts reset to zero at the start of each new round',
  );

  return content.join('\n');
}

/**
 * Generate rounds & advancement content
 */
function generateRoundsContent({ competition, votingRounds, numRounds }) {
  const numWinners = competition?.number_of_winners || 5;
  const sorted = [...votingRounds].sort((a, b) => (a.round_order || 0) - (b.round_order || 0));
  const cityName = competition?.city?.name || competition?.city || '';
  const competitionName = competition?.name || 'competition';
  const splitByGender = competition?.winners_split_by_gender;
  const judgesPct = competition?.judges_score_weight_pct;

  const content = [
    `• The ${competitionName} competition runs across ${sorted.length} rounds`,
    `• Rounds 1-${numRounds} are purely vote-based`,
    '• Votes reset to zero at the start of every round',
  ];

  // List each round with its advancement
  sorted.forEach((round, index) => {
    const isLast = index === sorted.length - 1;
    const title = round.title || `Round ${index + 1}`;

    if (isLast) {
      if (judgesPct != null) {
        const votesPct = 100 - judgesPct;
        content.push(`• ${title} — the vote count (${votesPct}%) and judge scores (${judgesPct}%) determines the ${numWinners} winners`);
      } else {
        content.push(`• ${title} — the final vote count determines the winners' rankings (1st–${numWinners}th)`);
      }
    } else {
      const nextRound = sorted[index + 1];
      const advance = round.contestants_advance;
      if (advance && nextRound) {
        content.push(`• ${title} — Top ${advance} advance to ${nextRound.title || 'next round'}`);
      } else if (advance) {
        content.push(`• ${title} — Top ${advance} advance`);
      } else {
        content.push(`• ${title}`);
      }
    }
  });

  // Optional finale event line — host-supplied text (date, attendance requirements, etc.)
  if (competition?.finale_event_text) {
    content.push(`• ${competition.finale_event_text}`);
  }

  // Crowning bullet — host can fully override, otherwise auto-generate
  if (competition?.crowning_text) {
    content.push(`• ${competition.crowning_text}`);
  } else if (splitByGender && numWinners === 2) {
    content.push(`• 2 winners (1 male and 1 female) will be crowned Most Eligible ${cityName} and hold the title for one year`);
  } else {
    content.push(`• ${numWinners} contestants will be crowned Most Eligible ${cityName} and hold the title for one year`);
  }

  return content.join('\n');
}

/**
 * Generate prize pool content
 */
function generatePrizePoolContent({ competition }) {
  const numWinners = competition?.number_of_winners || 5;
  const splitByGender = competition?.winners_split_by_gender;

  const content = ['• Total prize package value: $X'];

  if (splitByGender && numWinners === 2) {
    content.push('• Top 2 (1 male and 1 female) contestants with the most votes and highest judge earn the prize package + title');
  } else {
    content.push(`• Top ${numWinners} contestants with the most votes and highest judge earn the prize package + title`);
  }

  content.push(`• The ${numWinners} winners receive a prize package from competition sponsors`);

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

export default generateStandardRules;
