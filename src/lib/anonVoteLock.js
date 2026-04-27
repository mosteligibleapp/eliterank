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

// v2 — the v1 prefix was bumped to clear stale "already voted" entries
// written when the server's old fingerprint dedup falsely locked webview
// voters. Anyone with a v1 entry will see the form again on next visit;
// the server will still reject real duplicates via the email-based check.
const KEY_PREFIX = 'eliterank-anon-voted-v2';
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

/**
 * How many ms until the lock expires for this competition. Returns 0 when
 * there's no lock or when the stored timestamp is already past the window.
 */
export function getAnonVoteResetMs(competitionId) {
  if (!competitionId || typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(keyFor(competitionId));
    if (!raw) return 0;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return 0;
    const remaining = ts + ANON_VOTED_WINDOW_MS - Date.now();
    return remaining > 0 ? remaining : 0;
  } catch {
    return 0;
  }
}

/**
 * Format a ms duration as a short, human-readable countdown:
 *   ms ≥ 1h  → "23h" (drop minutes — at this scale they're noise)
 *   ms ≥ 1m  → "45m"
 *   ms > 0   → "<1m"
 *   ms ≤ 0   → ""    (caller should treat the lock as expired)
 *
 * Round up so the displayed value is always an upper bound on the wait —
 * better to overestimate by a minute than to show "0m" while the lock is
 * still active.
 */
const MS_PER_MIN = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MIN;
export function formatResetIn(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '';
  if (ms < MS_PER_MIN) return '<1m';
  if (ms < MS_PER_HOUR) return `${Math.ceil(ms / MS_PER_MIN)}m`;
  return `${Math.ceil(ms / MS_PER_HOUR)}h`;
}
