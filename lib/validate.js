import { ACTIVITY_TYPES, MAX_QUANTITY, TYPE_KEYS } from './constants.js';
import { round2 } from './co2.js';
import { formatDate, isValidDateString, todayIST } from './week.js';

// Friendly pre-checks for the "Log an activity" form. The API validates the same rules
// again and stays the source of truth; these run first so people get a clear, specific
// message and invalid data never leaves the browser.

const EXAMPLE = 'Enter something like 12 or 2.5.';

// badInput: true when the browser reports typed text it could not turn into a number.
export function validateQuantity(raw, { type, badInput = false } = {}) {
  if (badInput) return `That doesn't look like a number. ${EXAMPLE}`;
  const text = String(raw ?? '').trim();
  if (text === '') return 'Please enter a quantity.';
  const n = Number(text);
  if (!Number.isFinite(n)) return `That doesn't look like a number. ${EXAMPLE}`;
  if (n < 0) return `Quantity can't be negative. ${EXAMPLE}`;
  if (n === 0) return 'Quantity must be greater than zero.';
  if (round2(n) <= 0) return 'That is too small to count. Use at least 0.01.';
  if (n > MAX_QUANTITY) {
    const unit = ACTIVITY_TYPES[type]?.unit;
    return `That is too large to be realistic (maximum ${MAX_QUANTITY}${unit ? ` ${unit}` : ''}).`;
  }
  return null;
}

export function validateDate(date, today = todayIST()) {
  if (!date) return 'Please choose a date.';
  if (!isValidDateString(date)) return "That date isn't valid. Please pick it from the calendar.";
  if (date > today) return `That date is in the future. Pick today (${formatDate(today)}) or an earlier date.`;
  return null;
}

// Returns the first problem as { field, message }, or null when the input is fine.
export function validateActivity({ type, quantity, date, badInput = false }, today = todayIST()) {
  if (!TYPE_KEYS.includes(type)) return { field: 'type', message: 'Please choose an activity type.' };
  const q = validateQuantity(quantity, { type, badInput });
  if (q) return { field: 'quantity', message: q };
  const d = validateDate(date, today);
  if (d) return { field: 'date', message: d };
  return null;
}

// Weekly target pre-checks. The API applies the same rules (maximum 100000 kg) and stays the
// source of truth.
const MAX_TARGET_KG = 100000;
const TARGET_EXAMPLE = 'Enter something like 50 or 42.5.';

export function validateTarget(raw, { badInput = false } = {}) {
  if (badInput) return `That doesn't look like a number. ${TARGET_EXAMPLE}`;
  const text = String(raw ?? '').trim();
  if (text === '') return 'Please enter a weekly target in kg.';
  const n = Number(text);
  if (!Number.isFinite(n)) return `That doesn't look like a number. ${TARGET_EXAMPLE}`;
  if (n < 0) return `A weekly target can't be negative. ${TARGET_EXAMPLE}`;
  if (n === 0) return 'A weekly target must be greater than zero.';
  if (round2(n) <= 0) return 'That is too small. Use at least 0.01 kg.';
  if (n > MAX_TARGET_KG) return `That is higher than the maximum of ${MAX_TARGET_KG} kg.`;
  return null;
}
