/**
 * Auto-generated competition rules.
 *
 * Rules used to be free-text sections a host typed in by hand. They're now
 * derived automatically from the competition's own configuration, so the public
 * page always states the *actual* mechanics (selection process, eligibility,
 * entry, voting, charity) and can never drift from how the competition is set
 * up. Pure function — safe to use on the host dashboard and the public site.
 *
 * Returns an array of `{ title, content }` sections. Sections with nothing
 * meaningful to say are omitted.
 */

const GENDER = {
  all: 'all genders',
  female: 'women',
  male: 'men',
  'LGBTQ+': 'LGBTQ+ individuals',
};

export function buildAutoRules(competition) {
  const c = competition;
  if (!c) return [];
  const sections = [];

  // ── How winners are chosen ──────────────────────────────────────────────
  const rounds = c.voting_rounds || [];
  const judgingRound = [...rounds]
    .filter((r) => (r.judge_weight || 0) > 0)
    .sort((a, b) => (a.round_order || 0) - (b.round_order || 0))[0];

  let selection;
  if (c.selectionCriteria === 'judges') {
    selection = 'Winners are selected by a panel of judges, who score each contestant against the published judging criteria.';
  } else if (c.selectionCriteria === 'hybrid') {
    selection = "Winners are determined through a hybrid process that combines public votes with judges' scores.";
    if (judgingRound) {
      const w = judgingRound.judge_weight || 0;
      const label = (judgingRound.title && judgingRound.title.trim())
        || (judgingRound.round_order ? `round ${judgingRound.round_order}` : 'the judging round');
      selection += ` Judging takes place in ${label}, where judges' scores count for ${w}% and public votes for ${100 - w}% of that round's result.`;
    }
  } else {
    selection = 'Winners are determined by public vote — the contestants with the most votes advance through each round and ultimately win.';
  }

  const winnerCount = c.numberOfWinners || 1;
  let winnersLine = ` This competition crowns ${winnerCount === 1 ? 'one winner' : `${winnerCount} winners`}.`;
  if (c.winnersSplitByGender) winnersLine += ' Winners are chosen separately for men and women.';
  sections.push({ title: 'How winners are chosen', content: selection + winnersLine });

  // ── Who can enter ───────────────────────────────────────────────────────
  const genderTxt = GENDER[c.eligibilityGender] || 'all genders';
  let where;
  if (c.territoryScope === 'us') {
    where = 'across the United States';
  } else if (c.territoryScope === 'state') {
    where = `in ${c.territoryState || 'the host state'}`;
  } else {
    where = `in and around ${c.city || 'the host city'}${c.eligibilityRadiusMiles ? ` (within ${c.eligibilityRadiusMiles} miles)` : ''}`;
  }
  const minAge = c.eligibilityAgeMin || 18;
  let eligibility = `Entry is open to ${genderTxt} ${where}. All entrants must be at least ${minAge} years old`;
  eligibility += c.eligibilityAgeMax ? ` and no older than ${c.eligibilityAgeMax}.` : '.';
  sections.push({ title: 'Who can enter', content: eligibility });

  // ── How to enter ────────────────────────────────────────────────────────
  let entry;
  if (c.entryType === 'applications') {
    entry = 'Entry is by application: eligible people apply directly to take part.';
  } else {
    entry = 'Entry is by nomination: anyone can nominate an eligible person, and prospective contestants can also nominate themselves. Nominees confirm and complete a profile to join the competition.';
  }
  entry += ' There is no cost to enter.';
  sections.push({ title: 'How to enter', content: entry });

  // ── Voting (only when the public actually votes) ────────────────────────
  if (c.selectionCriteria !== 'judges') {
    sections.push({
      title: 'Voting',
      content: 'Anyone can vote on the public competition page. Free votes are available to everyone, and additional votes may be purchased to support a contestant. Voting opens and closes on the dates shown on the competition timeline.',
    });
  }

  // ── Charity (optional) ──────────────────────────────────────────────────
  if (c.charityPercentage) {
    sections.push({
      title: 'Charity',
      content: `${c.charityPercentage}% of net proceeds will be donated to ${c.charityName || 'the designated charity partner'}.`,
    });
  }

  return sections;
}
