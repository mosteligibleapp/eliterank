import { describe, it, expect, beforeEach, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: { rpc: vi.fn() },
}));

vi.mock('./supabase', () => ({ supabase: supabaseMock }));

import { isDoubleVoteDayForCompetition } from './doubleVoteDay';

describe('isDoubleVoteDayForCompetition', () => {
  beforeEach(() => {
    supabaseMock.rpc.mockReset();
  });

  it('returns true when the is_double_vote_day RPC returns true', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: true, error: null });

    const result = await isDoubleVoteDayForCompetition('comp-1');

    expect(result).toBe(true);
    expect(supabaseMock.rpc).toHaveBeenCalledWith('is_double_vote_day', {
      p_competition_id: 'comp-1',
    });
  });

  it('returns false when the RPC returns false', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: false, error: null });

    const result = await isDoubleVoteDayForCompetition('comp-1');

    expect(result).toBe(false);
  });

  it('returns false when the RPC errors out', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'function does not exist' },
    });

    const result = await isDoubleVoteDayForCompetition('comp-1');

    expect(result).toBe(false);
  });

  it('returns false when called with a missing competitionId', async () => {
    const result = await isDoubleVoteDayForCompetition(null);
    expect(result).toBe(false);
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('coerces non-true RPC responses (null, undefined, "true") to false', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: null });
    expect(await isDoubleVoteDayForCompetition('comp-1')).toBe(false);

    supabaseMock.rpc.mockResolvedValueOnce({ data: 'true', error: null });
    expect(await isDoubleVoteDayForCompetition('comp-1')).toBe(false);
  });
});
