import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

// ---------------------------------------------------------------------------
// PDF statement import (Discover credit card)
// ---------------------------------------------------------------------------
// A PDF is positioned text, not structured data, so we reconstruct lines from
// pdf.js and parse the transaction rows. The output is shaped exactly like the
// Discover CSV format so it flows through the existing detectFormat/buildDrafts
// pipeline unchanged (see src/lib/csv.js). Validated against a real statement:
// purchase + payment totals reconcile to the statement summary to the cent.
//
// Layout notes that drive the parser:
//   - Transaction rows start with a MM/DD date (no year) and end with a
//     "$1,234.56" amount; payments/credits carry a leading minus.
//   - The merchant sometimes wraps across 2-3 lines, so a row is accumulated
//     until its amount appears.
//   - Noise lines ("APPLE PAY ENDING IN 7569", hex reference numbers) follow a
//     completed row and are dropped.
//   - The year is missing from each date and inferred from the statement's
//     "open to close" period (handles statements that span New Year's).

export function isPdfFile(file) {
  return !!file && (/\.pdf$/i.test(file.name || '') || file.type === 'application/pdf');
}

// Discover's merchant-category labels. Longest/most-specific first so we peel
// the right one off the end of a row.
const CATEGORIES = [
  'Travel/Entertainment',
  'Government Services',
  'Medical Services',
  'Department Stores',
  'Home Improvement',
  'Warehouse Clubs',
  'Wholesale Clubs',
  'Automotive Services',
  'Automotive',
  'Restaurants',
  'Supermarkets',
  'Gasoline',
  'Merchandise',
  'Services',
  'Education',
  'Personal',
  'Utilities',
];

const AMOUNT_RE = /-?\$[\d,]+\.\d{2}/g;
const ROW_START_RE = /^(\d{2})\/(\d{2})\s/; // MM/DD followed by space (not MM/DD/YYYY)
const NOISE_RE = /^(APPLE PAY ENDING|[0-9A-F]{10,}$)/;
const MAX_ROW_LINES = 6; // a wrapped row never exceeds this; guards against runaway

async function extractLines(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data, isEvalSupported: false }).promise;
  const lines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    let current = '';
    for (const item of content.items) {
      if (typeof item.str === 'string') current += item.str;
      if (item.hasEOL) {
        lines.push(current);
        current = '';
      }
    }
    if (current) lines.push(current);
  }
  return lines.map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function parsePeriod(text) {
  const m = text.match(/(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return {
    startMonth: +m[1],
    startYear: +m[3],
    endYear: +m[6],
    startISO: `${m[3]}-${m[1]}-${m[2]}`,
    endISO: `${m[6]}-${m[4]}-${m[5]}`,
  };
}

// Pull a labeled dollar figure ("Previous Balance $768.17") out of the text.
function matchAmount(text, re) {
  const m = text.match(re);
  return m ? parseFloat(m[1].replace(/,/g, '')) : null;
}

function pickYear(month, period) {
  if (!period) return new Date().getFullYear();
  if (period.startYear === period.endYear) return period.startYear;
  // Statement spans New Year's: months on/after the start month belong to the
  // start year, earlier months to the end year.
  return month >= period.startMonth ? period.startYear : period.endYear;
}

function hasAmount(parts) {
  AMOUNT_RE.lastIndex = 0;
  return AMOUNT_RE.test(parts.join(' '));
}

function finalizeRow(parts, period, rows) {
  const full = parts.join(' ').replace(/\s+/g, ' ').trim();
  const dateMatch = full.match(ROW_START_RE);
  if (!dateMatch) return;
  AMOUNT_RE.lastIndex = 0;
  const amounts = full.match(AMOUNT_RE);
  if (!amounts) return;

  const amountStr = amounts[amounts.length - 1];
  const negative = amountStr.startsWith('-');
  const num = parseFloat(amountStr.replace(/[-$,]/g, ''));
  if (Number.isNaN(num)) return;

  // Everything between the date and the amount is "merchant + category".
  const amountIdx = full.lastIndexOf(amountStr);
  let middle = full.slice(dateMatch[0].length, amountIdx).trim();

  let category = '';
  for (const c of CATEGORIES) {
    if (middle === c || middle.endsWith(' ' + c)) {
      category = c;
      middle = middle.slice(0, middle.length - c.length).trim();
      break;
    }
  }

  const month = +dateMatch[1];
  const day = +dateMatch[2];
  const year = pickYear(month, period);

  rows.push({
    'Trans. Date': `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`,
    Description: middle || full.slice(dateMatch[0].length, amountIdx).trim(),
    // Purchases positive, payments/credits negative — matches Discover's CSV.
    Amount: negative ? -num : num,
    Category: category,
  });
}

// Parse already-extracted lines into Discover-shaped rows. Exported for tests.
export function parseDiscoverLines(lines) {
  const text = lines.join('\n');
  const period = parsePeriod(text);
  const rows = [];
  let buffer = null;

  for (const line of lines) {
    if (ROW_START_RE.test(line)) {
      if (buffer && hasAmount(buffer)) finalizeRow(buffer, period, rows);
      buffer = [line];
      if (hasAmount(buffer)) {
        finalizeRow(buffer, period, rows);
        buffer = null;
      }
    } else if (buffer) {
      if (NOISE_RE.test(line)) continue;
      if (buffer.length >= MAX_ROW_LINES) {
        buffer = null;
        continue;
      }
      buffer.push(line);
      if (hasAmount(buffer)) {
        finalizeRow(buffer, period, rows);
        buffer = null;
      }
    }
  }
  if (buffer && hasAmount(buffer)) finalizeRow(buffer, period, rows);
  return rows;
}

// Read a Discover statement PDF and return { headers, rows } in the same shape
// parseCsvText produces, so the import pipeline treats it like a Discover CSV.
export async function parseStatementPdf(file) {
  const lines = await extractLines(file);
  const looksDiscover = lines.some((l) => /DISCOVER/i.test(l));
  const rows = parseDiscoverLines(lines);

  if (!rows.length) {
    throw new Error(
      looksDiscover
        ? "Couldn't find any transactions in this PDF. Try Discover's CSV download instead (Activity → Download Transactions → CSV)."
        : 'This PDF is not a recognized Discover statement. PDF import currently supports Discover statements; for other banks use their CSV export.'
    );
  }

  // Statement balances anchor the account so it shows the real amount owed:
  //   New Balance = Previous Balance + Purchases − Payments
  // We store the Previous Balance as the account's opening balance (as of the
  // statement's start date), so summing the imported flows on top reproduces
  // the New Balance.
  const text = lines.join('\n');
  const period = parsePeriod(text);
  const meta = {
    previousBalance: matchAmount(text, /Previous Balance\s+\$?([\d,]+\.\d{2})/i),
    newBalance: matchAmount(text, /New Balance:?\s*\$?([\d,]+\.\d{2})/i),
    periodStart: period ? period.startISO : null,
    periodEnd: period ? period.endISO : null,
  };

  return { headers: ['Trans. Date', 'Description', 'Amount', 'Category'], rows, meta };
}
