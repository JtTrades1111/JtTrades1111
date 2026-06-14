import { NON_SPEND_CATEGORIES } from '../lib/categories.js';
import { computeGoal } from '../lib/goal.js';
import { computeInvestmentGoal, investmentProjectionSeries } from '../lib/investment.js';
import { daysBetween, isoWeekKey, monthKey, todayISO } from '../lib/format.js';

// ---------------------------------------------------------------------------
// Derived data. Net position is computed purely from imported flows + manual
// investments:
//     currentNet = sum(transaction.signedForNet) + sum(investment.value)
// `startNet` (the goal line's left endpoint) is auto-derived as the running
// net as of the start date, but the user can override it in Settings.
// ---------------------------------------------------------------------------

export function investmentsTotal(state) {
  return state.investments.reduce((s, i) => s + (Number(i.value) || 0), 0);
}

// Manually-entered cash/bank balances (assets), e.g. a USAA checking balance.
export function cashTotal(state) {
  return (state.cashBalances || []).reduce((s, c) => s + (Number(c.value) || 0), 0);
}

// Everything held as a flat baseline from the start: investments + manual cash.
function manualAssets(state) {
  return investmentsTotal(state) + cashTotal(state);
}

// Per-account current balance.
//   asset: positive number = cash on hand
//   liability: positive number = amount OWED
// For SimpleFIN-synced accounts we trust the authoritative `syncedBalance`
// directly. For statement-imported accounts we sum imported flows on top of
// the `openingBalance` (e.g. a credit card's Previous Balance), so the result
// reproduces the statement's New Balance.
export function accountBalance(state, accountId) {
  const acct = state.accounts.find((a) => a.id === accountId);
  if (!acct) return 0;
  if (acct.source === 'simplefin') {
    return Number(acct.syncedBalance) || 0;
  }
  const txs = state.transactions.filter((t) => t.accountId === accountId);
  const opening = Number(acct.openingBalance) || 0;
  if (acct.type === 'liability') {
    return opening - txs.reduce((s, t) => s + t.signedForNet, 0);
  }
  return opening + txs.reduce((s, t) => s + t.signedForNet, 0);
}

// Sum each account's contribution to net balance: cash for assets, negative
// for the amount owed on liabilities. Handles both synced and statement
// accounts via accountBalance().
export function accountsNet(state) {
  return state.accounts.reduce((s, a) => {
    const bal = accountBalance(state, a.id);
    return s + (a.type === 'liability' ? -bal : bal);
  }, 0);
}

// Constant baseline from statement accounts' opening balances (carried-in
// debt or cash before any imported transactions).
export function openingNet(state) {
  return state.accounts
    .filter((a) => a.source !== 'simplefin')
    .reduce((s, a) => {
      const ob = Number(a.openingBalance) || 0;
      return s + (a.type === 'liability' ? -ob : ob);
    }, 0);
}

// Constant baseline from SimpleFIN-synced accounts (we have today's balance,
// not historical snapshots, so it's treated as flat across the goal window).
export function syncedNet(state) {
  return state.accounts
    .filter((a) => a.source === 'simplefin')
    .reduce((s, a) => {
      const bal = Number(a.syncedBalance) || 0;
      return s + (a.type === 'liability' ? -bal : bal);
    }, 0);
}

function isSyncedTx(state, t) {
  const a = state.accounts.find((x) => x.id === t.accountId);
  return a && a.source === 'simplefin';
}

export function currentNet(state) {
  return accountsNet(state) + manualAssets(state);
}

// Total currently owed across all liability (credit card) accounts.
export function cardBalanceOwed(state) {
  return state.accounts
    .filter((a) => a.type === 'liability')
    .reduce((s, a) => s + accountBalance(state, a.id), 0);
}

export function earliestTxDate(state) {
  if (!state.transactions.length) return null;
  return state.transactions.reduce((min, t) => (t.date < min ? t.date : min), state.transactions[0].date);
}

export function latestTxDate(state) {
  if (!state.transactions.length) return null;
  return state.transactions.reduce((max, t) => (t.date > max ? t.date : max), state.transactions[0].date);
}

export function effectiveStartDate(state) {
  return state.settings.startDate || earliestTxDate(state) || todayISO();
}

// Auto start net = running net as of the start date (everything dated after it
// is excluded). Investments are treated as held from the start.
export function autoStartNet(state) {
  // Statement-account flows up to the start date sum on top of their opening
  // balances. SimpleFIN-synced accounts contribute their (constant) current
  // balance directly, since we don't have historical snapshots.
  const startDate = effectiveStartDate(state);
  const statementFlowToStart = state.transactions
    .filter((t) => t.date <= startDate && !isSyncedTx(state, t))
    .reduce((s, t) => s + t.signedForNet, 0);
  return statementFlowToStart + manualAssets(state) + openingNet(state) + syncedNet(state);
}

export function effectiveStartNet(state) {
  return state.settings.startNet != null ? state.settings.startNet : autoStartNet(state);
}

// Full goal computation bundle for the dashboard.
export function goalStats(state, today = todayISO()) {
  return computeGoal({
    startDate: effectiveStartDate(state),
    startNet: effectiveStartNet(state),
    targetDate: state.settings.targetDate,
    targetNet: state.settings.targetNet,
    currentNet: currentNet(state),
    today,
  });
}

// Long-term investment goal stats + projection, tracked against total net
// worth (currentNet, which already includes manual investments).
export function investmentGoalStats(state, today = todayISO()) {
  const s = state.settings;
  const args = {
    current: currentNet(state),
    target: s.investTarget,
    targetDate: s.investTargetDate,
    annualReturnPct: s.investReturn,
    monthlyContribution: s.investMonthly,
    today,
  };
  return { ...computeInvestmentGoal(args), series: investmentProjectionSeries(args) };
}

// A transaction is real spending when it reduced net position (signedForNet<0)
// and it isn't a transfer or income. Returns positive expense magnitude.
export function spendAmount(t) {
  if (NON_SPEND_CATEGORIES.has(t.category)) return 0;
  return t.signedForNet < 0 ? -t.signedForNet : 0;
}

// Asset-account transactions (USAA checking, savings, etc.) are excluded from
// spending analytics — those movements are mostly transfers, card payments,
// and Zelle that net out, not actual purchases. Only liability (credit card)
// transactions count as spending.
function isSpendableTx(state, t) {
  const acct = state.accounts.find((a) => a.id === t.accountId);
  return !acct || acct.type !== 'asset';
}

// Spending grouped by category for a given month (YYYY-MM). Excludes
// transfers/payments, income, and any asset-account activity.
export function spendingByCategory(state, month) {
  const totals = {};
  for (const t of state.transactions) {
    if (month && monthKey(t.date) !== month) continue;
    if (!isSpendableTx(state, t)) continue;
    const amt = spendAmount(t);
    if (amt <= 0) continue;
    totals[t.category] = (totals[t.category] || 0) + amt;
  }
  return Object.entries(totals)
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value);
}

// Spending grouped by ISO week, across all data (optionally a single month).
export function spendingByWeek(state, month) {
  const totals = {};
  for (const t of state.transactions) {
    if (month && monthKey(t.date) !== month) continue;
    if (!isSpendableTx(state, t)) continue;
    const amt = spendAmount(t);
    if (amt <= 0) continue;
    const wk = isoWeekKey(t.date);
    if (!totals[wk]) totals[wk] = { week: wk, value: 0, firstDate: t.date };
    totals[wk].value += amt;
    if (t.date < totals[wk].firstDate) totals[wk].firstDate = t.date;
  }
  return Object.values(totals).sort((a, b) => a.firstDate.localeCompare(b.firstDate));
}

export function totalSpending(state, month) {
  return state.transactions.reduce(
    (s, t) => (monthKey(t.date) === month && isSpendableTx(state, t) ? s + spendAmount(t) : s),
    0
  );
}

// List of available months present in the data, newest first.
export function availableMonths(state) {
  const set = new Set(state.transactions.map((t) => monthKey(t.date)).filter(Boolean));
  return Array.from(set).sort().reverse();
}

// Net position over time: a running cumulative line vs the ideal straight path.
// Returns [{ date, actual, ideal }] sorted by date, one point per day that has
// activity (plus the start and target endpoints).
export function netPositionSeries(state) {
  const startDate = effectiveStartDate(state);
  const startNet = effectiveStartNet(state);
  const { targetDate, targetNet } = state.settings;
  const totalDays = Math.max(daysBetween(startDate, targetDate), 1);
  const invest = manualAssets(state); // investments + manual cash, held from the start

  // Only statement-account flows evolve the line. SimpleFIN-synced accounts
  // contribute a constant baseline (we don't have historical snapshots).
  const sorted = state.transactions
    .filter((t) => !isSyncedTx(state, t))
    .sort((a, b) => a.date.localeCompare(b.date));

  const points = [];
  const idealFor = (dateISO) => {
    const elapsed = Math.min(Math.max(daysBetween(startDate, dateISO), 0), totalDays);
    return startNet + (targetNet - startNet) * (elapsed / totalDays);
  };

  // Seed at the start date.
  let running = invest + openingNet(state) + syncedNet(state);
  // Apply any flow dated on/before the start date into the seed.
  let idx = 0;
  while (idx < sorted.length && sorted[idx].date <= startDate) {
    running += sorted[idx].signedForNet;
    idx += 1;
  }
  points.push({ date: startDate, actual: round2(running), ideal: round2(idealFor(startDate)) });

  // One point per remaining transaction date.
  for (; idx < sorted.length; idx++) {
    running += sorted[idx].signedForNet;
    const date = sorted[idx].date;
    const last = points[points.length - 1];
    if (last.date === date) {
      last.actual = round2(running);
    } else {
      points.push({ date, actual: round2(running), ideal: round2(idealFor(date)) });
    }
  }

  // Always include the target endpoint for the ideal line.
  const lastDate = points[points.length - 1].date;
  if (lastDate < targetDate) {
    points.push({ date: targetDate, actual: null, ideal: round2(targetNet) });
  }
  return points;
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}
