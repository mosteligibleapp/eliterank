/**
 * Calculate prize pool distribution based on host minimum and vote revenue
 *
 * Revenue split:
 * - 50% of vote purchases → Prize pool
 * - 30% of vote purchases → Host
 * - 20% of vote purchases → Platform
 *
 * Prize distribution (from the 50% prize portion + host minimum):
 * - 1st place: 25% of vote revenue + 50% of host minimum
 * - 2nd place: 15% of vote revenue + 30% of host minimum
 * - 3rd place: 10% of vote revenue + 20% of host minimum
 *
 * @param {number} prizePoolMinimum - Host's guaranteed minimum contribution
 * @param {number} voteRevenue - Total revenue from vote purchases (the 50% that goes to prizes)
 * @returns {object} Prize pool breakdown
 */
export function calculatePrizePool(prizePoolMinimum = 1000, voteRevenue = 0) {
  const hostMinimum = Number(prizePoolMinimum) || 1000;
  const revenue = Number(voteRevenue) || 0;

  const firstPrize = revenue * 0.25 + hostMinimum * 0.5;
  const secondPrize = revenue * 0.15 + hostMinimum * 0.3;
  const thirdPrize = revenue * 0.1 + hostMinimum * 0.2;
  const totalPrizePool = firstPrize + secondPrize + thirdPrize;

  return {
    hostMinimum,
    voteRevenue: revenue,
    firstPrize,
    secondPrize,
    thirdPrize,
    totalPrizePool,
    // Formatted versions for display
    formatted: {
      hostMinimum: formatPrizeCurrency(hostMinimum),
      voteRevenue: formatPrizeCurrency(revenue),
      firstPrize: formatPrizeCurrency(firstPrize),
      secondPrize: formatPrizeCurrency(secondPrize),
      thirdPrize: formatPrizeCurrency(thirdPrize),
      totalPrizePool: formatPrizeCurrency(totalPrizePool),
    },
  };
}

/**
 * Calculate vote revenue from votes array or sum
 * @param {Array|number} votes - Array of vote objects with amount_paid, or pre-calculated sum
 * @returns {number} Total vote revenue (the portion that goes to prizes)
 */
export function calculateVoteRevenue(votes) {
  if (typeof votes === 'number') {
    return votes;
  }

  if (Array.isArray(votes)) {
    const totalPaid = votes.reduce((sum, vote) => {
      return sum + (Number(vote.amount_paid) || 0);
    }, 0);
    // 50% of purchases go to prize pool
    return totalPaid * 0.5;
  }

  return 0;
}

/**
 * Get prize position info for a contestant rank
 * Uses CSS class names for styling - no emojis
 *
 * @param {number} rank - Contestant's current rank
 * @param {object} prizePool - Prize pool object from calculatePrizePool
 * @returns {object|null} Prize info or null if not in prize position
 */
export function getPrizePosition(rank, prizePool) {
  const positions = {
    1: {
      position: '1st',
      label: '1st Place',
      amount: prizePool.firstPrize,
      formatted: prizePool.formatted.firstPrize,
      colorClass: 'prize-gold', // Maps to CSS variable
      iconName: 'crown', // Lucide icon name
    },
    2: {
      position: '2nd',
      label: '2nd Place',
      amount: prizePool.secondPrize,
      formatted: prizePool.formatted.secondPrize,
      colorClass: 'prize-silver',
      iconName: 'award',
    },
    3: {
      position: '3rd',
      label: '3rd Place',
      amount: prizePool.thirdPrize,
      formatted: prizePool.formatted.thirdPrize,
      colorClass: 'prize-bronze',
      iconName: 'medal',
    },
  };

  return positions[rank] || null;
}

/**
 * Format number as currency for prize display
 * @param {number} amount
 * @returns {string}
 */
function formatPrizeCurrency(amount) {
  return '$' + Math.floor(amount).toLocaleString();
}

export default calculatePrizePool;
