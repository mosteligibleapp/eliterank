/**
 * Resolves which achievement cards a contestant has earned, based on
 * their position in the competition's voting rounds.
 *
 * Returned in the order the contestant earned them (round_order ascending).
 * Each entry is ready to feed into generateAchievementCard().
 */
export function getContestantCardTiers(contestant, votingRounds = []) {
  if (!contestant) return [];

  const status = contestant.status;
  const currentRound = contestant.currentRound ?? contestant.current_round ?? 1;
  const eliminatedIn = contestant.eliminatedInRound ?? contestant.eliminated_in_round;

  const sortedRounds = [...votingRounds]
    .filter(r => Number.isFinite(r?.round_order))
    .sort((a, b) => a.round_order - b.round_order);

  let maxReachedOrder;
  if (status === 'winner') {
    maxReachedOrder = sortedRounds.length
      ? sortedRounds[sortedRounds.length - 1].round_order
      : currentRound;
  } else if (status === 'eliminated') {
    maxReachedOrder = eliminatedIn ?? currentRound;
  } else {
    maxReachedOrder = currentRound;
  }

  const tiers = [];
  for (const round of sortedRounds) {
    if (round.round_order > maxReachedOrder) break;
    const rawLabel = (round.tier_label || round.title || '').trim();
    if (!rawLabel) continue;
    tiers.push({
      roundId: round.id,
      roundOrder: round.round_order,
      menuLabel: `${rawLabel} Card`,
      customTitle: rawLabel.toUpperCase(),
      filenameSuffix: rawLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    });
  }
  return tiers;
}
