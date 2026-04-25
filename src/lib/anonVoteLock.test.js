import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  readAnonVoted,
  writeAnonVoted,
  getAnonVoteResetMs,
  formatResetIn,
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

describe('getAnonVoteResetMs', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-25T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 when there is no lock', () => {
    expect(getAnonVoteResetMs(COMP)).toBe(0);
  });

  it('returns ~24h immediately after writing the lock', () => {
    writeAnonVoted(COMP);
    expect(getAnonVoteResetMs(COMP)).toBe(ANON_VOTED_WINDOW_MS);
  });

  it('counts down as time passes', () => {
    writeAnonVoted(COMP);
    vi.advanceTimersByTime(60 * 60 * 1000); // 1h
    expect(getAnonVoteResetMs(COMP)).toBe(ANON_VOTED_WINDOW_MS - 60 * 60 * 1000);
  });

  it('returns 0 once the window has elapsed', () => {
    writeAnonVoted(COMP);
    vi.advanceTimersByTime(ANON_VOTED_WINDOW_MS);
    expect(getAnonVoteResetMs(COMP)).toBe(0);
  });

  it('returns 0 for a malformed value', () => {
    window.localStorage.setItem(`eliterank-anon-voted-${COMP}`, 'nonsense');
    expect(getAnonVoteResetMs(COMP)).toBe(0);
  });
});

describe('formatResetIn', () => {
  it('formats hours when ≥ 1h remains', () => {
    expect(formatResetIn(23 * 60 * 60 * 1000)).toBe('23h');
    expect(formatResetIn(60 * 60 * 1000)).toBe('1h');
  });

  it('formats minutes when < 1h remains', () => {
    expect(formatResetIn(45 * 60 * 1000)).toBe('45m');
    expect(formatResetIn(60 * 1000)).toBe('1m');
  });

  it('uses "<1m" for sub-minute remainders', () => {
    expect(formatResetIn(30 * 1000)).toBe('<1m');
  });

  it('returns "" when the duration is non-positive or invalid', () => {
    expect(formatResetIn(0)).toBe('');
    expect(formatResetIn(-1)).toBe('');
    expect(formatResetIn(NaN)).toBe('');
    expect(formatResetIn(undefined)).toBe('');
  });

  it('rounds up so we never display "0m" while still locked', () => {
    expect(formatResetIn(1)).toBe('<1m');
    expect(formatResetIn(59 * 1000)).toBe('<1m');
    expect(formatResetIn(61 * 1000)).toBe('2m');
  });
});
