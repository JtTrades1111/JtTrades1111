import Papa from 'papaparse';
import { toISO } from './format.js';

// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------
// Two known issuer formats are auto-detected by their headers. Anything else
// falls through to the manual column-mapping UI (see needsMapping below).

// Known formats. `match` decides whether a header set belongs to this format.
// `mapping` declares which header feeds each field and the sign convention.
export const KNOWN_FORMATS = {
  discover: {
    label: 'Discover (credit card)',
    type: 'liability',
    // 'standard' liability: positive Amount = purchase (you owe more), negative
    // = payment/credit (you owe less).
    amountSign: 'standard',
    match: (headers) =>
      hasAll(headers, ['Trans. Date', 'Description', 'Amount']) &&
      (hasAll(headers, ['Post Date']) || hasAll(headers, ['Category'])),
    mapping: {
      date: 'Trans. Date',
      description: 'Description',
      amount: 'Amount',
      category: 'Category',
    },
  },
  usaa: {
    label: 'USAA (checking/savings)',
    type: 'asset',
    // 'standard' asset: negative Amount = money out, positive = money in.
    amountSign: 'standard',
    match: (headers) =>
      hasAll(headers, ['Date', 'Description', 'Amount']) &&
      (hasAll(headers, ['Original Description']) || hasAll(headers, ['Status'])),
    mapping: {
      date: 'Date',
      description: 'Description',
      amount: 'Amount',
      category: 'Category',
    },
  },
};

function hasAll(headers, needed) {
  const set = new Set(headers.map((h) => h.trim()));
  return needed.every((n) => set.has(n));
}

// Parse the raw file text into { headers, rows } using PapaParse.
export function parseCsvText(text) {
  const result = Papa.parse(text.trim(), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });
  if (result.errors && result.errors.length) {
    // Only surface hard errors; PapaParse reports some recoverable ones.
    const fatal = result.errors.filter((e) => e.type === 'Delimiter' || e.code === 'UndetectableDelimiter');
    if (fatal.length) {
      throw new Error(`Could not parse CSV: ${fatal[0].message}`);
    }
  }
  const headers = result.meta.fields ? result.meta.fields.map((h) => h.trim()) : [];
  if (!headers.length) throw new Error('No columns detected in this file.');
  return { headers, rows: result.data };
}

// Detect a known format from headers, or return null to trigger mapping UI.
export function detectFormat(headers) {
  for (const [key, fmt] of Object.entries(KNOWN_FORMATS)) {
    if (fmt.match(headers)) return { key, ...fmt };
  }
  return null;
}

// Parse a USD-ish string ("$1,234.56", "(45.00)", "-12.3") into a Number.
export function parseAmount(value) {
  if (typeof value === 'number') return value;
  let s = String(value ?? '').trim();
  if (!s) return NaN;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true; // accounting-style parens
    s = s.slice(1, -1);
  }
  s = s.replace(/[$,\s]/g, '');
  if (s.startsWith('-')) {
    negative = true;
    s = s.slice(1);
  }
  const n = parseFloat(s);
  if (Number.isNaN(n)) return NaN;
  return negative ? -n : n;
}

// Normalize a date string into YYYY-MM-DD. Handles MM/DD/YYYY, M/D/YY, ISO.
export function parseDate(value) {
  const s = String(value ?? '').trim();
  if (!s) return '';
  // Already ISO?
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    let [, mm, dd, yy] = m;
    if (yy.length === 2) yy = String(2000 + Number(yy));
    const d = new Date(Number(yy), Number(mm) - 1, Number(dd));
    if (!Number.isNaN(d.valueOf())) return toISO(d);
  }
  const d = new Date(s);
  if (!Number.isNaN(d.valueOf())) return toISO(d);
  return s; // leave as-is; caller will treat as invalid if needed
}

// Given a mapping spec, convert raw rows into normalized transaction drafts.
// A mapping is: { date, description, amount, category, accountType, amountSign }
//   amountSign: 'standard' | 'flipped'  (see signForNet below)
// Returns { drafts, errors } where each draft has the normalized fields and a
// signedForNet value (effect on net position).
export function buildDrafts(rows, mapping) {
  const drafts = [];
  const errors = [];
  rows.forEach((row, i) => {
    const dateRaw = row[mapping.date];
    const desc = String(row[mapping.description] ?? '').trim();
    const amountRaw = row[mapping.amount];
    const rawCategory = mapping.category ? String(row[mapping.category] ?? '').trim() : '';

    const date = parseDate(dateRaw);
    const amount = parseAmount(amountRaw);

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push(`Row ${i + 2}: unrecognized date "${dateRaw ?? ''}"`);
      return;
    }
    if (Number.isNaN(amount)) {
      errors.push(`Row ${i + 2}: unrecognized amount "${amountRaw ?? ''}"`);
      return;
    }
    if (!desc) {
      errors.push(`Row ${i + 2}: empty description`);
      return;
    }

    drafts.push({
      date,
      description: desc,
      rawCategory,
      amount,
      signedForNet: signForNet(amount, mapping),
    });
  });
  return { drafts, errors };
}

// Effect of a transaction on NET POSITION (positive = net goes up).
//   'standard' convention:
//     Asset:     + deposit raises net, - spend lowers net   -> signed = amount
//     Liability: + charge lowers net, - payment raises net  -> signed = -amount
//   'flipped' just reverses the Amount sign before applying the above.
// A transaction is a real expense exactly when signedForNet < 0 (after the
// Transfers/Income categories are excluded by the spending selectors).
function signForNet(amount, mapping) {
  const a = mapping.amountSign === 'flipped' ? -amount : amount;
  return mapping.accountType === 'liability' ? -a : a;
}
