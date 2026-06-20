import { addMonthsISO, daysBetween, monthsBetween, todayISO } from './format.js';

// ---------------------------------------------------------------------------
// Long-term investment goal (compounding)
// ---------------------------------------------------------------------------
// Unlike the summer goal (a straight line), a multi-year wealth goal must
// account for COMPOUNDING — money already invested earns returns, and so do
// future monthly contributions. This is the standard future-value-of-an-
// annuity formula:
//
//   FV = P(1+i)^n + C * [ ((1+i)^n - 1) / i ]
//
//   P = current value (net worth today)
//   C = monthly contribution
//   i = monthly return = annualReturn / 12
//   n = number of months until the target date
//
// When i = 0 (no growth assumed) this degrades to FV = P + C*n.

// Future value of starting principal P plus monthly contribution C over n
// months at monthly rate i.
export function futureValue(P, C, i, n) {
  if (n <= 0) return P;
  if (i === 0) return P + C * n;
  const growth = Math.pow(1 + i, n);
  return P * growth + C * ((growth - 1) / i);
}

// Monthly contribution required to reach `target` in n months, starting from P
// at monthly rate i. Solves the FV formula for C.
export function requiredContribution(P, target, i, n) {
  if (n <= 0) return Math.max(target - P, 0);
  if (i === 0) return Math.max((target - P) / n, 0);
  const growth = Math.pow(1 + i, n);
  const needed = (target - P * growth) * i / (growth - 1);
  return Math.max(needed, 0);
}

// Full computation bundle for the investment-goal section.
export function computeInvestmentGoal({
  current,
  target,
  targetDate,
  annualReturnPct,
  monthlyContribution,
  today = todayISO(),
}) {
  const i = (Number(annualReturnPct) || 0) / 100 / 12;
  const monthsExact = Math.max(monthsBetween(today, targetDate), 0);
  const n = Math.round(monthsExact);
  const C = Number(monthlyContribution) || 0;
  const P = Number(current) || 0;
  const T = Number(target) || 0;

  const projected = futureValue(P, C, i, n);
  const required = requiredContribution(P, T, i, n);

  const totalContributions = C * n;
  const growthEarned = projected - P - totalContributions;

  const gap = projected - T; // >0 will overshoot target, <0 will fall short
  // Tolerance band so "basically on track" doesn't flicker red/green.
  const tolerance = T * 0.02;
  let status = 'on-track';
  if (gap < -tolerance) status = 'behind';
  else if (gap > tolerance) status = 'ahead';

  return {
    monthsRemaining: n,
    yearsRemaining: monthsExact / 12,
    daysRemaining: Math.max(daysBetween(today, targetDate), 0),
    projected,
    required,
    monthlyContribution: C,
    totalContributions,
    growthEarned,
    gap,
    status,
    progressFraction: T > 0 ? Math.min(Math.max(P / T, 0), 1) : 0,
  };
}

// Month-by-month projection series for the chart: the compounding balance vs a
// flat target line, plus a "contributions only" line (no growth) to visualize
// how much of the ending balance is investment growth. Capped to keep the chart
// light for very long horizons.
export function investmentProjectionSeries({
  current,
  target,
  targetDate,
  annualReturnPct,
  monthlyContribution,
  today = todayISO(),
}) {
  const i = (Number(annualReturnPct) || 0) / 100 / 12;
  const n = Math.max(Math.round(monthsBetween(today, targetDate)), 0);
  const C = Number(monthlyContribution) || 0;
  const P = Number(current) || 0;

  // Step so we plot at most ~120 points.
  const step = Math.max(1, Math.ceil(n / 120));
  const points = [];
  for (let m = 0; m <= n; m += step) {
    points.push({
      date: addMonthsISO(today, m),
      balance: round2(futureValue(P, C, i, m)),
      contributions: round2(P + C * m),
      target: round2(Number(target) || 0),
    });
  }
  // Ensure the final month is included.
  if (points.length && points[points.length - 1].date !== addMonthsISO(today, n)) {
    points.push({
      date: addMonthsISO(today, n),
      balance: round2(futureValue(P, C, i, n)),
      contributions: round2(P + C * n),
      target: round2(Number(target) || 0),
    });
  }
  return points;
}

function round2(x) {
  return Math.round((Number(x) || 0) * 100) / 100;
}
