/**
 * Per-device "already voted today" cache for anonymous voters.
 *
 * The server (api/cast-anonymous-vote.js) is the source of truth — it
 * de-dupes anonymous votes by browser fingerprint over a 24h rolling
 * window. This module mirrors that lock client-side so a returning
 * visitor sees the disabled state immediately, instead of filling out
 * the form just to get a 429 on submit.
 *
 * Window matches RATE_LIMIT_WINDOW_MS in cast-anonymous-vote.js so the
 * client and server agree on when the lock expires.
 */

const KEY_PREFIX = 'eliterank-anon-voted';
export const ANON_VOTED_WINDOW_MS = 24 * 60 * 60 * 1000;

const keyFor = (competitionId) => `${KEY_PREFIX}-${competitionId}`;

export function readAnonVoted(competitionId) {
  if (!competitionId || typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(keyFor(competitionId));
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    if (Date.now() - ts >= ANON_VOTED_WINDOW_MS) {
      // Stale — clean up so entries don't leak across days.
      window.localStorage.removeItem(keyFor(competitionId));
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function writeAnonVoted(competitionId) {
  if (!competitionId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(keyFor(competitionId), String(Date.now()));
  } catch {
    // Storage may be disabled (private mode, quota). The server check is
    // still authoritative — this is just a UX optimization.
  }
}
