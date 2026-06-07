/**
 * Round / tier naming for a multi-round elimination competition.
 *
 * The tier a contestant reached is the round they were last in: the field that
 * advanced INTO a round is its tier size, so round 1 is the "Entry Round" and a
 * later round reads as "Top {N}" (N = the prior round's contestants_advance). A
 * round's own non-generic tier_label wins when present; a finale reads "Finale".
 *
 * Shared by the Performance dashboard (round chips) and the host dashboard
 * (per-contestant tier badge) so the labels never diverge.
 */

// "Round 2" / "Round  3" — a placeholder, not a real tier label.
const isGenericRoundLabel = (label) =>
  !label || /^round\s*\d+$/i.test(String(label).trim());

/**
 * @param {Array} rounds - voting_rounds rows ({ round_order, round_type, title,
 *   tier_label, contestants_advance }). Order doesn't matter; sorted here.
 * @returns {Array<{ order: number, label: string }>} one per round, in order.
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
 * The tier a contestant reached — for a "how far did they get" badge.
 *   - winner                         → "Winner"
 *   - still active in the last round → "Finalist"
 *   - still active otherwise         → the tier of their current round
 *   - eliminated                     → the tier of the round they went out in
 *
 * Handles both snake_case (eliminated_in_round / current_round) and camelCase
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
