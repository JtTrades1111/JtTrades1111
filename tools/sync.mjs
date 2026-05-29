#!/usr/bin/env node
// ---------------------------------------------------------------------------
// SimpleFIN sync
// ---------------------------------------------------------------------------
// Pulls the latest 90 days of transactions for every account linked in your
// SimpleFIN Bridge, and writes them to public/sync.json. The dashboard reads
// that file on startup and merges new transactions into its state.
//
// Setup (one-time):
//   1. Sign up at simplefin.org → Bridge, link your Discover / USAA / etc.
//   2. In the Bridge dashboard, generate a "Setup Token" — a long base64
//      string.
//   3. Create a .env file in this folder (see .env.example) and paste the
//      setup token as SIMPLEFIN_SETUP_TOKEN=<token>.
//   4. Run: npm run sync
//
// First run claims the setup token (one-time) and rewrites .env with a
// permanent SIMPLEFIN_ACCESS_URL. Every subsequent run just uses that URL.
//
// Nothing leaves your Mac: the .env is git-ignored, the sync.json is too,
// and the only outbound call is HTTPS to bridge.simplefin.org.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = path.join(ROOT, '.env');
const OUT_PATH = path.join(ROOT, 'public', 'sync.json');
const DAYS_BACK = 90;

// ---- tiny .env loader/writer (avoids adding a dep) ------------------------

function loadEnv() {
  if (!fs.existsSync(ENV_PATH)) return;
  for (const line of fs.readFileSync(ENV_PATH, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

function saveEnvVar(key, value) {
  let lines = fs.existsSync(ENV_PATH)
    ? fs.readFileSync(ENV_PATH, 'utf-8').split('\n').filter(Boolean)
    : [];
  const re = new RegExp(`^\\s*${key}\\s*=`);
  if (lines.some((l) => re.test(l))) {
    lines = lines.map((l) => (re.test(l) ? `${key}=${value}` : l));
  } else {
    lines.push(`${key}=${value}`);
  }
  fs.writeFileSync(ENV_PATH, lines.join('\n') + '\n', { mode: 0o600 });
}

// ---- SimpleFIN protocol ---------------------------------------------------

// A SimpleFIN setup token is a base64-encoded URL you POST to once. The
// response is the permanent Access URL (with basic-auth creds embedded).
async function claimSetupToken(token) {
  let url;
  try {
    url = Buffer.from(token, 'base64').toString('utf-8').trim();
  } catch {
    url = token;
  }
  if (!/^https?:\/\//.test(url)) {
    throw new Error('Setup token does not decode to a URL — paste it exactly as SimpleFIN gave it to you.');
  }
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error(`Claiming setup token failed: HTTP ${res.status}`);
  const accessUrl = (await res.text()).trim();
  if (!/^https?:\/\//.test(accessUrl)) {
    throw new Error('Claim did not return a valid access URL.');
  }
  return accessUrl;
}

async function fetchSimpleFIN(accessUrl) {
  const startDate = Math.floor((Date.now() - DAYS_BACK * 86400 * 1000) / 1000);
  const u = new URL(accessUrl);
  const auth = Buffer.from(
    `${decodeURIComponent(u.username)}:${decodeURIComponent(u.password)}`
  ).toString('base64');
  u.username = '';
  u.password = '';
  const base = u.toString().replace(/\/$/, '');
  const endpoint = `${base}/accounts?start-date=${startDate}&pending=1`;

  const res = await fetch(endpoint, { headers: { Authorization: `Basic ${auth}` } });
  if (!res.ok) throw new Error(`SimpleFIN fetch failed: HTTP ${res.status}`);
  const json = await res.json();
  if (Array.isArray(json.errors) && json.errors.length) {
    console.warn('SimpleFIN reported errors:', json.errors);
  }
  return json;
}

// ---- mapping into the dashboard's shape -----------------------------------

function detectAccountType(account) {
  const name = `${account.name || ''} ${account.org?.name || ''}`.toLowerCase();
  if (/credit|card|line of credit|loan|mortgage/.test(name)) return 'liability';
  return 'asset';
}

function toISODate(unix) {
  return new Date(unix * 1000).toISOString().slice(0, 10);
}

function mapAccount(a) {
  const type = detectAccountType(a);
  const orgName = a.org?.name || a.name || 'Bank';
  const bal = parseFloat(a.balance);
  return {
    id: `sf_${a.id}`,
    name: type === 'liability' ? `${orgName} (credit card)` : `${orgName} (${a.name || 'account'})`,
    type,
    source: 'simplefin',
    amountSign: 'standard',
    openingBalance: 0,
    openingBalanceDate: null,
    // Authoritative current balance from SimpleFIN. For synced accounts the
    // dashboard uses this directly instead of opening-balance + flows math.
    // SimpleFIN signs balance from the cardholder's POV, so a credit card with
    // $647.47 owed comes back as -647.47. We store it as positive "amount owed"
    // for liabilities and positive "cash" for assets.
    syncedBalance: type === 'liability' ? -bal : bal,
    syncedBalanceDate: a['balance-date'] ? toISODate(a['balance-date']) : null,
    lastImport: new Date().toISOString().slice(0, 10),
  };
}

function mapTransaction(t, account) {
  const type = detectAccountType(account);
  // SimpleFIN amount is signed from the cardholder's POV:
  //   asset:     − = money out, + = money in
  //   liability: − = charge,    + = payment
  // signedForNet uses that directly (correct net-balance effect). Display
  // `amount` matches the Discover-CSV convention: positive = charge on a
  // liability, positive = money-in on an asset (so we flip for liabilities).
  const sfAmount = parseFloat(t.amount);
  const displayAmount = type === 'liability' ? -sfAmount : sfAmount;
  return {
    id: `sf_${t.id}`,
    accountId: `sf_${account.id}`,
    date: toISODate(t.transacted_at || t.posted),
    description: (t.description || t.payee || '').trim() || '(no description)',
    rawCategory: '',
    amount: displayAmount,
    signedForNet: sfAmount,
    pending: t.pending === 1 || t.pending === true,
  };
}

// ---- main -----------------------------------------------------------------

async function main() {
  loadEnv();

  let accessUrl = process.env.SIMPLEFIN_ACCESS_URL;
  if (!accessUrl && process.env.SIMPLEFIN_SETUP_TOKEN) {
    console.log('Claiming SimpleFIN setup token (one-time)…');
    accessUrl = await claimSetupToken(process.env.SIMPLEFIN_SETUP_TOKEN);
    saveEnvVar('SIMPLEFIN_ACCESS_URL', accessUrl);
    // Remove the now-spent setup token from .env to avoid re-claim attempts.
    saveEnvVar('SIMPLEFIN_SETUP_TOKEN', '');
    console.log('Saved permanent SIMPLEFIN_ACCESS_URL to .env.');
  }
  if (!accessUrl) {
    console.error('No SIMPLEFIN_ACCESS_URL or SIMPLEFIN_SETUP_TOKEN found in .env');
    console.error('Copy .env.example to .env and paste your SimpleFIN setup token.');
    process.exit(1);
  }

  console.log(`Fetching last ${DAYS_BACK} days from SimpleFIN…`);
  const data = await fetchSimpleFIN(accessUrl);
  const accounts = data.accounts.map(mapAccount);
  const transactions = data.accounts.flatMap((a) => a.transactions.map((t) => mapTransaction(t, a)));

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(
    OUT_PATH,
    JSON.stringify({ lastSync: new Date().toISOString(), accounts, transactions }, null, 2)
  );

  console.log(`\nSynced ${transactions.length} transactions across ${accounts.length} accounts → ${path.relative(ROOT, OUT_PATH)}`);
  for (const a of accounts) {
    const sign = a.type === 'liability' ? 'owed' : 'cash';
    console.log(`  ${a.name}: $${a.syncedBalance.toFixed(2)} ${sign}`);
  }
}

main().catch((err) => {
  console.error('\nSync failed:', err.message);
  process.exit(1);
});
