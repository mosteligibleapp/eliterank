/**
 * Minimal structured logger for EliteRank.
 * Usage: import { log } from '../lib/logger';
 *        log.info('auth', 'Session loaded', { userId: '...' });
 *
 * Console filter: type "[auth]" or "[admin]" in browser DevTools filter.
 * In production, only warn/error are emitted.
 */

const IS_DEV = import.meta.env.DEV;

function fmt(level, scope, msg, data) {
  const tag = `[${scope}]`;
  if (data !== undefined) {
    return [tag, msg, data];
  }
  return [tag, msg];
}

export const log = {
  /** Debug-level: only in dev */
  debug(scope, msg, data) {
    if (IS_DEV) console.log(...fmt('debug', scope, msg, data));
  },

  /** Info-level: only in dev */
  info(scope, msg, data) {
    if (IS_DEV) console.info(...fmt('info', scope, msg, data));
  },

  /** Warning: always emitted */
  warn(scope, msg, data) {
    console.warn(...fmt('warn', scope, msg, data));
  },

  /** Error: always emitted */
  error(scope, msg, data) {
    console.error(...fmt('error', scope, msg, data));
  },
};
