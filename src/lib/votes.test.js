import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// votes.js imports `./supabase`; we don't actually hit it in submitAnonymousVote,
// but the import has to resolve.
vi.mock('./supabase', () => ({ supabase: {} }));

import { submitAnonymousVote } from './votes';

describe('submitAnonymousVote', () => {
  const baseInput = {
    email: 'voter@example.com',
    firstName: 'Kelly',
    lastName: 'Clark',
    competitionId: 'comp-1',
    contestantId: 'contestant-1',
    mountedAt: Date.now() - 5000,
    company: '',
    fingerprint: 'fp-abc',
  };

  beforeEach(() => {
    vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns success=true on a 200 response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, votesAdded: 1, visitorId: 'voter-1' }),
    });

    const result = await submitAnonymousVote(baseInput);

    expect(result).toEqual({
      success: true,
      votesAdded: 1,
      visitorId: 'voter-1',
    });
  });

  it("propagates code='ALREADY_VOTED' when the server rejects on fingerprint", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: "You've already cast your free daily vote from this device. Come back tomorrow!",
        code: 'ALREADY_VOTED',
      }),
    });

    const result = await submitAnonymousVote(baseInput);

    expect(result.success).toBe(false);
    expect(result.code).toBe('ALREADY_VOTED');
    expect(result.error).toMatch(/already cast/i);
  });

  it('returns code=null for errors without a code field', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Submitted too fast — please try again.' }),
    });

    const result = await submitAnonymousVote(baseInput);

    expect(result.success).toBe(false);
    expect(result.code).toBeNull();
  });

  it('returns a network error message when fetch rejects', async () => {
    global.fetch.mockRejectedValueOnce(new Error('offline'));

    const result = await submitAnonymousVote(baseInput);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/network/i);
  });
});
