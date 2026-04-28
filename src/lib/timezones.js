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
