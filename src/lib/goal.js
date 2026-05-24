import { daysBetween, parseISODate, toISO } from './format.js';

// ---------------------------------------------------------------------------
// Goal engine
// ---------------------------------------------------------------------------
// Everything here works on NET POSITION, never raw balances. Net position is
// computed elsewhere (selectors.js) as:
//     sum(transaction.signedForNet) + sum(investment.value)
//
// The "ideal path" is a straight line from (startDate, startNet) to
// (targetDate, targetNet). Drift is current net minus where that line says you
// should be today.

// Linear position on the ideal path at a given ISO date.
// Clamps to the [start, target] window so projections past the deadline are flat.
export function idealAt(dateISO, { startDate, startNet, targetDate, targetNet }) {
  const total = daysBetween(startDate, targetDate);
  if (total <= 0) return targetNet;
  const elapsed = Math.min(Math.max(daysBetween(startDate, dateISO), 0), total);
  return startNet + (targetNet - startNet) * (elapsed / total);
}

export function addDaysISO(dateISO, days) {
  const d = parseISODate(dateISO);
  if (!d) return dateISO;
  d.setDate(d.getDate() + days);
  return toISO(d);
}

// Core computation. `today` defaults to the real today (ISO).
export function computeGoal({ startDate, startNet, targetDate, targetNet, currentNet, today }) {
  const totalDays = Math.max(daysBetween(startDate, targetDate), 0);
  const elapsedDays = Math.max(daysBetween(startDate, today), 0);
  const remainingDays = Math.max(daysBetween(today, targetDate), 0);

  // How much net change is still required, and the pace needed to get there.
  const remainingNeed = targetNet - currentNet;
  const requiredPerDay = remainingDays > 0 ? remainingNeed / remainingDays : 0;
  const requiredPerWeek = requiredPerDay * 7;
  const requiredPerMonth = requiredPerDay * 30;

  // Actual pace achieved so far (net change / days elapsed).
  const achievedChange = currentNet - startNet;
  const actualPerDay = elapsedDays > 0 ? achievedChange / elapsedDays : 0;
  const actualPerWeek = actualPerDay * 7;
  const actualPerMonth = actualPerDay * 30;

  // Where the ideal straight-line path says we should be today, and the gap.
  const idealToday = idealAt(today, { startDate, startNet, targetDate, targetNet });
  const gap = currentNet - idealToday; // >0 ahead, <0 behind

  // Linear extrapolation of the end net position at the current pace.
  const projectedEnd = currentNet + actualPerDay * remainingDays;

  // Status: compare projected end to target, with a small tolerance band.
  const tolerance = Math.abs(targetNet - startNet) * 0.02; // 2% of the journey
  let status = 'on-track';
  if (projectedEnd < targetNet - tolerance) status = 'behind';
  else if (projectedEnd > targetNet + tolerance) status = 'ahead';

  // Safe to spend this week: how far current net sits ABOVE the ideal-path
  // position one week from now. If we're above that line we have slack we can
  // spend while still landing on the target line next week. Never negative.
  const idealNextWeek = idealAt(addDaysISO(today, 7), { startDate, startNet, targetDate, targetNet });
  const safeToSpend = Math.max(0, currentNet - idealNextWeek);

  return {
    totalDays,
    elapsedDays,
    remainingDays,
    requiredPerDay,
    requiredPerWeek,
    requiredPerMonth,
    actualPerDay,
    actualPerWeek,
    actualPerMonth,
    achievedChange,
    idealToday,
    gap,
    projectedEnd,
    status,
    safeToSpend,
    // Progress fraction along the ideal path (0..1), based on net achieved.
    progressFraction:
      targetNet - startNet === 0
        ? 1
        : clamp01((currentNet - startNet) / (targetNet - startNet)),
    idealProgressFraction: totalDays > 0 ? clamp01(elapsedDays / totalDays) : 1,
  };
}

function clamp01(x) {
  if (Number.isNaN(x)) return 0;
  return Math.min(Math.max(x, 0), 1);
}
