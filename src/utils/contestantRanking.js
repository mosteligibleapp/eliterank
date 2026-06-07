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

export function compareContestantsByStanding(a, b) {
  const aOut = a?.status === 'eliminated';
  const bOut = b?.status === 'eliminated';
  if (aOut !== bOut) return aOut ? 1 : -1; // active before eliminated

  if (aOut && bOut) {
    const diff = reachedRound(b) - reachedRound(a); // later round first
    if (diff !== 0) return diff;
  }

  return (b?.votes || 0) - (a?.votes || 0);
}

export function sortContestantsByStanding(contestants) {
  return [...(contestants || [])].sort(compareContestantsByStanding);
}

export default sortContestantsByStanding;
