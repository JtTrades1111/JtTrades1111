import React from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useStore } from '../store/StoreContext.jsx';
import { currentNet, investmentGoalStats, investmentsTotal } from '../store/selectors.js';
import { formatDate, formatMoney } from '../lib/format.js';

const STATUS = {
  'on-track': { label: 'On track', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  ahead: { label: 'Ahead', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  behind: { label: 'Behind', cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
};

export default function InvestmentGoal() {
  const { state } = useStore();
  const g = investmentGoalStats(state);
  const net = currentNet(state);
  const invest = investmentsTotal(state);
  const { investTarget, investTargetDate, investReturn } = state.settings;
  const status = STATUS[g.status];
  const pct = Math.min(Math.max(g.progressFraction * 100, 0), 100);

  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Investment Goal</h2>
          <p className="text-xs text-slate-400">
            Long-term net worth · {investReturn}% assumed annual return (compounding)
          </p>
        </div>
        <div className="text-sm text-slate-400">
          {formatMoney(net)} <span className="text-slate-600">→</span>{' '}
          <span className="text-slate-200">{formatMoney(investTarget)}</span> by {formatDate(investTargetDate)}
        </div>
      </div>

      {/* Current state: net worth (tracked) + investments broken out */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact label="Net worth now" value={formatMoney(net)} big />
        <Fact label="Of which invested" value={formatMoney(invest)} tone="good" />
        <Fact
          label="Time to target"
          value={`${g.yearsRemaining.toFixed(1)} yrs`}
        />
        <div className="flex flex-col justify-center">
          <span className="label mb-1">Status</span>
          <span className={`w-fit rounded-full border px-3 py-1 text-sm font-semibold ${status.cls}`}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Progress bar 0 -> target (current net worth) */}
      <div className="mb-6 mt-2">
        <div className="relative h-3 w-full rounded-full bg-ink-600">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-slate-500">
          <span>{formatMoney(0)}</span>
          <span>{pct.toFixed(0)}% there</span>
          <span>{formatMoney(investTarget)}</span>
        </div>
      </div>

      {/* Pace facts */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact
          label="Projected at target date"
          value={formatMoney(g.projected)}
          tone={g.projected >= investTarget ? 'good' : 'bad'}
        />
        <Fact label="Your monthly" value={formatMoney(g.monthlyContribution)} />
        <Fact
          label="Needed monthly to hit it"
          value={formatMoney(g.required)}
          tone={g.required <= g.monthlyContribution ? 'good' : 'bad'}
        />
        <Fact label="Growth earned (projected)" value={formatMoney(g.growthEarned)} tone="good" />
      </div>

      {/* Status sentence */}
      <p className="mb-4 text-sm text-slate-400">
        {g.status === 'behind' ? (
          <>
            At {formatMoney(g.monthlyContribution)}/mo you'll reach{' '}
            <span className="text-slate-200">{formatMoney(g.projected)}</span> — about{' '}
            <span className="text-red-400">{formatMoney(Math.abs(g.gap))} short</span>. Bump it to{' '}
            <span className="text-slate-200">{formatMoney(g.required)}/mo</span> to land on target.
          </>
        ) : (
          <>
            At {formatMoney(g.monthlyContribution)}/mo you're projected to reach{' '}
            <span className="text-slate-200">{formatMoney(g.projected)}</span> —{' '}
            <span className="text-emerald-400">{formatMoney(Math.abs(g.gap))} past</span> your{' '}
            {formatMoney(investTarget)} target.
          </>
        )}
      </p>

      {/* Projection chart: compounding balance vs contributions-only vs target */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={g.series} margin={{ top: 10, right: 16, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#243049" />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => (d || '').slice(0, 4)}
              stroke="#64748b"
              fontSize={11}
              minTickGap={40}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
              width={48}
            />
            <Tooltip
              contentStyle={{ background: '#0f1525', border: '1px solid #2a3450', borderRadius: 12 }}
              labelFormatter={(d) => formatDate(d)}
              formatter={(v, name) => [formatMoney(v), name]}
            />
            <ReferenceLine y={investTarget} stroke="#fbbf24" strokeDasharray="4 4" />
            <Area
              type="monotone"
              dataKey="balance"
              name="Projected balance"
              stroke="#34d399"
              fill="url(#balFill)"
              strokeWidth={2.5}
            />
            <Line
              type="monotone"
              dataKey="contributions"
              name="Contributions only"
              stroke="#cbd5e1"
              strokeDasharray="6 4"
              dot={false}
              strokeWidth={2}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-center text-xs text-slate-500">
        Green = projected value with growth · Gray dashed = what you put in · Amber = target
      </p>
    </section>
  );
}

function Fact({ label, value, tone, big }) {
  const toneCls = tone === 'good' ? 'text-emerald-400' : tone === 'bad' ? 'text-red-400' : 'text-slate-100';
  return (
    <div className="rounded-lg bg-ink-700/50 px-3 py-2">
      <div className="label">{label}</div>
      <div className={`mt-0.5 font-semibold ${big ? 'text-lg' : 'text-sm'} ${toneCls}`}>{value}</div>
    </div>
  );
}
