// Timezone option groups for the SetupTab "Double Vote Days" selector.
// Uses Intl.supportedValuesOf when available so the list always matches
// what the runtime can format. Falls back to a hardcoded short list on
// very old browsers.

const COMMON = [
  'UTC',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
];

const FALLBACK = [
  'UTC',
  'America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York',
  'America/Anchorage', 'America/Phoenix', 'America/Toronto', 'America/Vancouver',
  'America/Mexico_City', 'America/Sao_Paulo', 'America/Buenos_Aires',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid',
  'Europe/Rome', 'Europe/Amsterdam', 'Europe/Stockholm', 'Europe/Athens',
  'Europe/Istanbul', 'Europe/Moscow',
  'Africa/Cairo', 'Africa/Lagos', 'Africa/Johannesburg',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Singapore',
  'Asia/Hong_Kong', 'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Seoul',
  'Australia/Sydney', 'Australia/Perth', 'Pacific/Auckland', 'Pacific/Honolulu',
];

function continentOf(zone) {
  const slash = zone.indexOf('/');
  return slash === -1 ? 'Other' : zone.slice(0, slash);
}

export function getTimezoneOptionGroups() {
  let zones;
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
      zones = Intl.supportedValuesOf('timeZone');
    }
  } catch {
    zones = null;
  }
  if (!zones || zones.length === 0) zones = FALLBACK;

  const groups = new Map();
  groups.set('Common', [...COMMON]);

  const commonSet = new Set(COMMON);
  for (const zone of zones) {
    if (commonSet.has(zone)) continue;
    const continent = continentOf(zone);
    if (!groups.has(continent)) groups.set(continent, []);
    groups.get(continent).push(zone);
  }

  // Stable order: Common first, then continent groups alphabetical.
  const result = [['Common', groups.get('Common')]];
  const continentNames = [...groups.keys()].filter((k) => k !== 'Common').sort();
  for (const name of continentNames) {
    const list = groups.get(name);
    list.sort();
    result.push([name, list]);
  }
  return result;
}

/**
 * Offset (in ms) between a timezone's wall clock and UTC at a given instant.
 * Positive when the zone is ahead of UTC, negative when behind.
 * DST-aware because it asks Intl for the wall clock at that specific instant.
 */
export function getTimeZoneOffsetMs(timeZone, date = new Date()) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone || 'UTC',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = {};
  for (const p of dtf.formatToParts(date)) parts[p.type] = p.value;
  const hour = parts.hour === '24' ? '00' : parts.hour;
  const asUTC = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(hour), Number(parts.minute), Number(parts.second),
  );
  return asUTC - date.getTime();
}

/**
 * Convert a stored UTC ISO timestamp into the `YYYY-MM-DDTHH:mm` value an
 * <input type="datetime-local"> expects, expressed as wall-clock time in
 * the given timezone.
 */
export function isoToZonedInputValue(iso, timeZone) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || 'UTC',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = {};
  for (const p of dtf.formatToParts(d)) parts[p.type] = p.value;
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}`;
}

/**
 * Convert a `YYYY-MM-DDTHH:mm` wall-clock value (interpreted in the given
 * timezone) into a UTC ISO timestamp for storage.
 */
export function zonedInputValueToIso(value, timeZone) {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  const wallAsUTC = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
  const offset = getTimeZoneOffsetMs(timeZone, new Date(wallAsUTC));
  return new Date(wallAsUTC - offset).toISOString();
}

/**
 * Re-interpret an instant so its wall-clock reading stays the same while the
 * timezone changes (e.g. host fixes the zone after typing dates). Returns a
 * new UTC ISO timestamp.
 */
export function reinterpretIsoInZone(iso, fromTimeZone, toTimeZone) {
  if (!iso) return iso;
  return zonedInputValueToIso(isoToZonedInputValue(iso, fromTimeZone), toTimeZone);
}

/**
 * Human-readable rendering of a UTC ISO timestamp in the given timezone,
 * e.g. "Aug 20, 2026, 12:00 AM".
 */
export function formatInTimeZone(iso, timeZone) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone || 'UTC',
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(d);
}

/**
 * Short timezone abbreviation for a given instant, e.g. "EDT" / "CST".
 */
export function getTimeZoneAbbreviation(timeZone, date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'UTC', timeZoneName: 'short',
    }).formatToParts(date);
    return parts.find((p) => p.type === 'timeZoneName')?.value || '';
  } catch {
    return '';
  }
}
