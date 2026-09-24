import { round2 } from './co2';

// All week logic is done in IST (UTC+05:30) regardless of the server/browser timezone.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Today's date in IST as YYYY-MM-DD.
export function todayIST(now = Date.now()) {
  return new Date(now + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function isValidDateString(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// Current Monday-Sunday week in IST.
export function getWeekInfo(now = Date.now()) {
  const today = todayIST(now);
  const [y, m, d] = today.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  const dayNumber = dow === 0 ? 7 : dow; // Monday = 1 ... Sunday = 7
  const start = addDays(today, -(dayNumber - 1));
  return { today, dayName: DAY_NAMES[dow], dayNumber, start, end: addDays(start, 6) };
}

// Linear projection to Sunday: total so far / days elapsed (today counts as a full day) * 7.
export function projectWeekTotal(totalSoFar, dayNumber) {
  return round2((totalSoFar / dayNumber) * 7);
}

// "22 Sep 2026" - fixed locale + UTC so server and browser always agree.
export function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
