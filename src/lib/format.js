// Money + date formatting helpers. Money is always shown with 2 decimals and
// thousands separators; negatives are wrapped in parens by formatMoney() and
// rendered red by the components that use the `negative` flag from this module.

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Returns a string like "$1,234.56" or "($1,234.56)" for negatives.
export function formatMoney(value, { parens = true } = {}) {
  const n = Number(value) || 0;
  if (n < 0 && parens) {
    return `(${usd.format(Math.abs(n))})`;
  }
  return usd.format(n);
}

// Compact signed delta, e.g. "+$1,200.00" / "-$340.00"
export function formatDelta(value) {
  const n = Number(value) || 0;
  const sign = n >= 0 ? '+' : '-';
  return `${sign}${usd.format(Math.abs(n))}`;
}

export function isNegative(value) {
  return (Number(value) || 0) < 0;
}

// Parse a YYYY-MM-DD string into a local Date (midnight) without TZ drift.
export function parseISODate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function todayISO() {
  const d = new Date();
  return toISO(d);
}

export function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDate(iso) {
  const d = parseISODate(iso);
  if (!d) return iso || '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function daysBetween(fromISO, toISODate) {
  const a = parseISODate(fromISO);
  const b = parseISODate(toISODate);
  if (!a || !b) return 0;
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

// ISO week key like "2026-W21" used to bucket spending by week.
export function isoWeekKey(iso) {
  const d = parseISODate(iso);
  if (!d) return '';
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7; // Mon=0
  target.setDate(target.getDate() - dayNr + 3); // nearest Thursday
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstDayNr = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDayNr + 3);
  const week = 1 + Math.round((target - firstThursday) / (7 * 24 * 60 * 60 * 1000));
  return `${target.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function monthKey(iso) {
  return (iso || '').slice(0, 7); // YYYY-MM
}

export function formatMonth(key) {
  const [y, m] = (key || '').split('-').map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
