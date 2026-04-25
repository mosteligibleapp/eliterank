import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  readAnonVoted,
  writeAnonVoted,
  ANON_VOTED_WINDOW_MS,
} from './anonVoteLock';

const COMP = 'comp-123';

describe('anonVoteLock', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-25T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns false when no entry exists', () => {
    expect(readAnonVoted(COMP)).toBe(false);
  });

  it('returns true after writeAnonVoted', () => {
    writeAnonVoted(COMP);
    expect(readAnonVoted(COMP)).toBe(true);
  });

  it('returns false once the 24h window has elapsed and clears the stale key', () => {
    writeAnonVoted(COMP);
    expect(readAnonVoted(COMP)).toBe(true);

    vi.advanceTimersByTime(ANON_VOTED_WINDOW_MS);
    expect(readAnonVoted(COMP)).toBe(false);
    // Stale key should have been removed during the read.
    expect(window.localStorage.getItem(`eliterank-anon-voted-${COMP}`)).toBeNull();
  });

  it('still returns true just under the 24h window', () => {
    writeAnonVoted(COMP);
    vi.advanceTimersByTime(ANON_VOTED_WINDOW_MS - 1);
    expect(readAnonVoted(COMP)).toBe(true);
  });

  it('isolates locks per competition', () => {
    writeAnonVoted(COMP);
    expect(readAnonVoted('other-comp')).toBe(false);
  });

  it('treats a non-numeric stored value as no lock', () => {
    window.localStorage.setItem(`eliterank-anon-voted-${COMP}`, 'nonsense');
    expect(readAnonVoted(COMP)).toBe(false);
  });

  it('returns false and does not throw when competitionId is missing', () => {
    expect(readAnonVoted(null)).toBe(false);
    expect(readAnonVoted(undefined)).toBe(false);
    expect(() => writeAnonVoted(null)).not.toThrow();
    expect(() => writeAnonVoted(undefined)).not.toThrow();
  });

  it('does not throw if localStorage.setItem throws (e.g. quota)', () => {
    const spy = vi
      .spyOn(window.localStorage.__proto__, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceeded');
      });
    expect(() => writeAnonVoted(COMP)).not.toThrow();
    spy.mockRestore();
  });
});
