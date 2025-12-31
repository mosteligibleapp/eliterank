/**
 * Parse a typed date string into an ISO date string
 * Supports formats like:
 * - "Jan 15, 2025 6:00 PM"
 * - "1/15/2025 6pm"
 * - "2025-01-15 18:00"
 * - "January 15 2025 6:00pm"
 */
export function parseTypedDate(input) {
  if (!input || !input.trim()) return null;

  const str = input.trim();

  // Try direct ISO parse first
  let date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }

  // Normalize common patterns
  let normalized = str
    .replace(/\s+/g, ' ')
    .replace(/,/g, '')
    .toLowerCase();

  // Month name mappings
  const months = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
  };

  // Pattern: "Jan 15 2025 6:00 PM" or "January 15 2025 6pm"
  const monthNamePattern = /^(\w+)\s+(\d{1,2})\s+(\d{4})\s*(.*)$/;
  let match = normalized.match(monthNamePattern);
  if (match) {
    const monthStr = match[1];
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    const timeStr = match[4];
    const month = months[monthStr];

    if (month !== undefined && day >= 1 && day <= 31) {
      const { hours, minutes } = parseTime(timeStr);
      date = new Date(year, month, day, hours, minutes);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }

  // Pattern: "1/15/2025 6:00 PM" or "01/15/2025 6pm"
  const slashPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(.*)$/;
  match = normalized.match(slashPattern);
  if (match) {
    const month = parseInt(match[1], 10) - 1;
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    const timeStr = match[4];

    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const { hours, minutes } = parseTime(timeStr);
      date = new Date(year, month, day, hours, minutes);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }

  // Pattern: "2025-01-15 6:00 PM"
  const dashPattern = /^(\d{4})-(\d{1,2})-(\d{1,2})\s*(.*)$/;
  match = normalized.match(dashPattern);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const timeStr = match[4];

    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const { hours, minutes } = parseTime(timeStr);
      date = new Date(year, month, day, hours, minutes);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }

  return null;
}

/**
 * Parse time string like "6pm", "6:00 PM", "18:00"
 */
export function parseTime(timeStr) {
  if (!timeStr || !timeStr.trim()) {
    return { hours: 0, minutes: 0 };
  }

  const str = timeStr.trim().toLowerCase();

  // Check for AM/PM
  const isPM = str.includes('pm');
  const isAM = str.includes('am');
  const cleanTime = str.replace(/[ap]m/g, '').trim();

  // Parse hours:minutes or just hours
  const timeParts = cleanTime.split(':');
  let hours = parseInt(timeParts[0], 10) || 0;
  const minutes = parseInt(timeParts[1], 10) || 0;

  // Convert to 24-hour format
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return { hours, minutes };
}

/**
 * Format an ISO date for display
 */
export function formatDateForDisplay(isoDate) {
  if (!isoDate) return '';

  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  const minuteStr = minutes.toString().padStart(2, '0');

  return `${month} ${day}, ${year} ${hours}:${minuteStr} ${ampm}`;
}

/**
 * Compute event status based on start and end dates
 * @param {string} startDate - ISO date string for start
 * @param {string} endDate - ISO date string for end (optional)
 * @returns {'upcoming' | 'active' | 'completed'}
 */
export function computeEventStatus(startDate, endDate) {
  if (!startDate) return 'upcoming';

  const now = new Date();
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;

  if (isNaN(start.getTime())) return 'upcoming';

  if (now > end) return 'completed';
  if (now >= start && now <= end) return 'active';
  return 'upcoming';
}
