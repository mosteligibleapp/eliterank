/**
 * Round / tier naming — the single source of truth for how a multi-round
 * elimination competition's rounds are labelled across the app.
 *
 * THE MODEL
 * The cohort competing in round R is whoever advanced out of round R-1, so a
 * round's "tier" is the size of the field that entered it. That makes round 1
 * the "Entry Round" and a later round read as "Top {N}", where N is the prior
 * round's `contestants_advance`. The contestant a host eliminates in round R
 * therefore *reached* round R's tier.
 *
 * PRECEDENCE (one rule, applied everywhere)
 * A round's label is resolved in this order, most authoritative first:
 *   1. `tier_label`            — an explicit, non-generic host-defined tier name
 *   2. finale `round_type`     — "Finale"
 *   3. first round             — "Entry Round" (no prior tier exists)
 *   4. derived advancement     — "Top {prior round's contestants_advance}"
 *   5. `title`                 — an explicit, non-generic round title
 *   6. positional fallback     — "Round {order}"
 * A label of the form "Round 2" / "Round  3" is treated as generic (a
 * placeholder), never as a real tier name.
 *
 * Consumers: usePerformanceDashboard (round chips), the host dashboard People
 * list (per-contestant tier badge), and the profile competition history. They
 * all route through here so the labels can never drift apart.
 */

// "Round 2" / "Round  3" — a placeholder, not a real tier label.
const isGenericRoundLabel = (label) =>
  !label || /^round\s*\d+$/i.test(String(label).trim());

/**
 * Name every round in a competition, in round order.
 *
 * @param {Array} rounds - voting_rounds rows ({ round_order, round_type, title,
 *   tier_label, contestants_advance }). Input order is irrelevant; sorted here.
 * @returns {Array<{ order: number, label: string }>}
 */
export function buildRoundLabels(rounds) {
  const ordered = [...(rounds || [])]
    .filter((r) => r && r.round_order != null)
    .sort((a, b) => (a.round_order || 0) - (b.round_order || 0));

  return ordered.map((r, idx) => {
    let label;
    if (!isGenericRoundLabel(r.tier_label)) {
      label = r.tier_label;
    } else if (r.round_type === 'finale') {
      label = 'Finale';
    } else if (idx === 0) {
      label = 'Entry Round';
    } else {
      const advance = ordered[idx - 1]?.contestants_advance;
      if (Number.isFinite(advance) && advance > 0) {
        label = `Top ${advance}`;
      } else if (!isGenericRoundLabel(r.title)) {
        label = r.title;
      } else {
        label = `Round ${r.round_order}`;
      }
    }
    return { order: r.round_order, label };
  });
}

/**
 * The tier name of a single round by its `round_order`.
 *
 * @returns {string|null} null when the order isn't found.
 */
export function getRoundLabel(rounds, order) {
  if (order == null) return null;
  const match = buildRoundLabels(rounds).find((l) => l.order === order);
  return match ? match.label : null;
}

/**
 * The tier a contestant reached — for a "how far did they get" badge.
 *   - winner                         → "Winner"
 *   - still active in the last round → "Finalist"
 *   - still active otherwise         → the tier of their current round
 *   - eliminated                     → the tier of the round they went out in
 *
 * Accepts both snake_case (eliminated_in_round / current_round) and camelCase
 * (eliminatedInRound / currentRound) contestant shapes.
 *
 * @returns {string|null}
 */
export function getReachedTierLabel(contestant, rounds) {
  if (!contestant) return null;
  if (contestant.status === 'winner') return 'Winner';

  const labels = buildRoundLabels(rounds);
  if (labels.length === 0) return null;
  const lastOrder = labels[labels.length - 1].order;

  const isEliminated = contestant.status === 'eliminated';
  const reachedOrder = isEliminated
    ? (contestant.eliminatedInRound ?? contestant.eliminated_in_round)
    : (contestant.currentRound ?? contestant.current_round ?? lastOrder);

  if (!isEliminated && reachedOrder != null && reachedOrder >= lastOrder) {
    return 'Finalist';
  }

  const match = labels.find((l) => l.order === reachedOrder);
  return match ? match.label : null;
}

export default getReachedTierLabel;
