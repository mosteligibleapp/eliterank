import { describe, it, expect } from 'vitest';
import { buildRoundLabels, getRoundLabel, getReachedTierLabel } from './roundLabels';

// A realistic 6-round elimination bracket (no explicit tier_labels), mirroring
// a real competition: Entry Round → Top 50 → Top 25 → Top 15 → Top 10 → Finale.
const bracket = [
  { round_order: 1, round_type: 'voting', title: 'Entry Round', contestants_advance: 50 },
  { round_order: 2, round_type: 'voting', title: 'Top 50', contestants_advance: 25 },
  { round_order: 3, round_type: 'voting', title: 'Top 25', contestants_advance: 15 },
  { round_order: 4, round_type: 'voting', title: 'Top 15', contestants_advance: 10 },
  { round_order: 5, round_type: 'voting', title: 'Top 10', contestants_advance: 5 },
  { round_order: 6, round_type: 'finale', title: 'Final Round', contestants_advance: 5 },
];

describe('buildRoundLabels', () => {
  it('names the first round the Entry Round and later rounds by the field that entered them', () => {
    expect(buildRoundLabels(bracket)).toEqual([
      { order: 1, label: 'Entry Round' },
      { order: 2, label: 'Top 50' },
      { order: 3, label: 'Top 25' },
      { order: 4, label: 'Top 15' },
      { order: 5, label: 'Top 10' },
      { order: 6, label: 'Finale' },
    ]);
  });

  it('sorts by round_order regardless of input order', () => {
    const shuffled = [bracket[3], bracket[0], bracket[5], bracket[1], bracket[4], bracket[2]];
    expect(buildRoundLabels(shuffled).map((l) => l.order)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('honors an explicit, non-generic tier_label above the derived tier', () => {
    const rounds = [
      { round_order: 1, contestants_advance: 50 },
      { round_order: 2, tier_label: 'Quarterfinals', contestants_advance: 25 },
    ];
    expect(getRoundLabel(rounds, 2)).toBe('Quarterfinals');
  });

  it('ignores a generic "Round N" tier_label and derives the tier instead', () => {
    const rounds = [
      { round_order: 1, contestants_advance: 50 },
      { round_order: 2, tier_label: 'Round 2', contestants_advance: 25 },
    ];
    expect(getRoundLabel(rounds, 2)).toBe('Top 50');
  });

  it('falls back to a non-generic title, then to "Round N", when no tier can be derived', () => {
    const rounds = [
      { round_order: 1, contestants_advance: 0 },
      { round_order: 2, title: 'Showcase', contestants_advance: 0 },
      { round_order: 3, contestants_advance: 0 },
    ];
    expect(getRoundLabel(rounds, 2)).toBe('Showcase');
    expect(getRoundLabel(rounds, 3)).toBe('Round 3');
  });

  it('returns an empty array for missing/empty input', () => {
    expect(buildRoundLabels(null)).toEqual([]);
    expect(buildRoundLabels([])).toEqual([]);
  });
});

describe('getRoundLabel', () => {
  it('returns the tier of a specific round order', () => {
    expect(getRoundLabel(bracket, 4)).toBe('Top 15');
  });

  it('returns null for an unknown or missing order', () => {
    expect(getRoundLabel(bracket, 99)).toBeNull();
    expect(getRoundLabel(bracket, null)).toBeNull();
  });
});

describe('getReachedTierLabel', () => {
  it('labels a winner', () => {
    expect(getReachedTierLabel({ status: 'winner' }, bracket)).toBe('Winner');
  });

  it('labels an active contestant in the last round as a Finalist', () => {
    expect(getReachedTierLabel({ status: 'active', currentRound: 6 }, bracket)).toBe('Finalist');
  });

  it('labels an active contestant mid-competition by their current tier', () => {
    expect(getReachedTierLabel({ status: 'active', currentRound: 3 }, bracket)).toBe('Top 25');
  });

  it('labels an eliminated contestant by the tier they reached', () => {
    expect(getReachedTierLabel({ status: 'eliminated', eliminatedInRound: 5 }, bracket)).toBe('Top 10');
    expect(getReachedTierLabel({ status: 'eliminated', eliminatedInRound: 4 }, bracket)).toBe('Top 15');
    expect(getReachedTierLabel({ status: 'eliminated', eliminatedInRound: 1 }, bracket)).toBe('Entry Round');
  });

  it('accepts snake_case contestant fields too', () => {
    expect(getReachedTierLabel({ status: 'eliminated', eliminated_in_round: 4 }, bracket)).toBe('Top 15');
    expect(getReachedTierLabel({ status: 'active', current_round: 6 }, bracket)).toBe('Finalist');
  });

  it('returns null for no contestant or no rounds', () => {
    expect(getReachedTierLabel(null, bracket)).toBeNull();
    expect(getReachedTierLabel({ status: 'active', currentRound: 1 }, [])).toBeNull();
  });
});
