/**
 * Standing-based ordering for contestant leaderboards.
 *
 * Ranking by raw `votes` is wrong on a multi-round competition: votes are
 * round-scoped (they reset each round) and an eliminated contestant keeps the
 * vote total from the round they went out in. So a raw-votes sort floats
 * knocked-out contestants above the contestants who are actually still
 * competing (e.g. someone eliminated in a high-traffic earlier round can show
 * above an active finalist).
 *
 * "Standing" fixes that:
 *   1. Contestants still in the running (status !== 'eliminated') rank above
 *      eliminated ones. Whoever is active vs eliminated was already decided by
 *      each round's own scoring at finalization — including judge-weighted
 *      rounds — so this reflects judging without recomputing any scores.
 *   2. Among eliminated contestants, whoever reached a later round ranks
 *      higher (eliminated_in_round descending).
 *   3. Within a tier, higher current-round votes rank higher.
 *
 * Handles both the snake_case (`eliminated_in_round`) shape used by the public
 * leaderboard / Performance hook and the camelCase (`eliminatedInRound`) shape
 * produced by the host dashboard transform.
 */

const reachedRound = (c) => c?.eliminatedInRound ?? c?.eliminated_in_round ?? 0;

// Default tie-break: current-round votes. Host overview surfaces pass a
// lifetime-votes accessor instead, so their displayed totals stay monotonic
// with the order.
const roundVotes = (c) => c?.votes || 0;

export function compareContestantsByStanding(a, b, voteOf = roundVotes) {
  const aOut = a?.status === 'eliminated';
  const bOut = b?.status === 'eliminated';
  if (aOut !== bOut) return aOut ? 1 : -1; // active before eliminated

  if (aOut && bOut) {
    const diff = reachedRound(b) - reachedRound(a); // later round first
    if (diff !== 0) return diff;
  }

  return voteOf(b) - voteOf(a);
}

export function sortContestantsByStanding(contestants, voteOf = roundVotes) {
  return [...(contestants || [])].sort((a, b) => compareContestantsByStanding(a, b, voteOf));
}

export default sortContestantsByStanding;
