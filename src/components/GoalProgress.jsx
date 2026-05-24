import React from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useStore } from '../store/StoreContext.jsx';
import {
  currentNet,
  effectiveStartNet,
  goalStats,
  netPositionSeries,
} from '../store/selectors.js';
import { formatDate, formatMoney } from '../lib/format.js';

export default function GoalProgress() {
  const { state } = useStore();
  const g = goalStats(state);
  const net = currentNet(state);
  const startNet = effectiveStartNet(state);
  const { targetNet, targetDate } = state.settings;
  const series = netPositionSeries(state);

  // Progress bar geometry: 0% at start net, 100% at target net.
  const cur = pct(g.progressFraction);
  const ideal = pct(g.idealProgressFraction);

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-100">Goal Progress</h2>
        <div className="text-sm text-slate-400">
          {formatMoney(startNet)} <span className="text-slate-600">→</span>{' '}
          <span className="text-slate-200">{formatMoney(targetNet)}</span> by {formatDate(targetDate)}
        </div>
      </div>

      {/* Progress bar with current + "should be today" markers */}
      <div className="mb-2 mt-6">
        <div className="relative h-4 w-full rounded-full bg-ink-600">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent to-accent-soft"
            style={{ width: `${cur}%` }}
          />
          {/* "where I should be today" marker */}
          <Marker pos={ideal} color="#fbbf24" label="Target pace" labelClass="text-amber-300" above />
          {/* current marker */}
          <Marker pos={cur} color="#818cf8" label="You are here" labelClass="text-accent-soft" />
        </div>
        <div className="mt-6 flex justify-between text-xs text-slate-500">
          <span>{formatMoney(startNet)}</span>
          <span>{formatMoney(targetNet)}</span>
        </div>
      </div>

      {/* Pace facts */}
      <div className="mb-5 mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact label="Required / week" value={formatMoney(g.requiredPerWeek)} />
        <Fact label="Actual / week" value={formatMoney(g.actualPerWeek)} tone={g.actualPerWeek >= g.requiredPerWeek ? 'good' : 'bad'} />
        <Fact label="Projected end" value={formatMoney(g.projectedEnd)} tone={g.projectedEnd >= targetNet ? 'good' : 'bad'} />
        <Fact label="Days remaining" value={String(g.remainingDays)} />
      </div>

      {/* Net position over time vs ideal path */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 10, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#243049" />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => formatDate(d).replace(/, \d{4}/, '')}
              stroke="#64748b"
              fontSize={11}
              minTickGap={28}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
              width={48}
            />
            <Tooltip
              contentStyle={{ background: '#0f1525', border: '1px solid #2a3450', borderRadius: 12 }}
              labelStyle={{ color: '#cbd5e1' }}
              formatter={(v, name) => [v == null ? '—' : formatMoney(v), name]}
              labelFormatter={(d) => formatDate(d)}
            />
            <ReferenceLine y={targetNet} stroke="#fbbf24" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="ideal"
              name="Ideal path"
              stroke="#64748b"
              strokeDasharray="5 5"
              dot={false}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="Net position"
              stroke="#818cf8"
              dot={false}
              strokeWidth={2.5}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function pct(fraction) {
  return Math.min(Math.max((Number(fraction) || 0) * 100, 0), 100);
}

function Marker({ pos, color, label, labelClass, above }) {
  return (
    <div className="absolute -top-1 -bottom-1" style={{ left: `${pos}%` }}>
      <div className="absolute h-6 w-0.5 -translate-x-1/2" style={{ background: color }} />
      <div
        className="absolute h-3 w-3 -translate-x-1/2 rounded-full border-2 border-ink-900"
        style={{ background: color, top: above ? '-0.6rem' : '0.8rem' }}
      />
      <div
        className={`absolute whitespace-nowrap text-[10px] font-medium ${labelClass} -translate-x-1/2`}
        style={{ top: above ? '-1.7rem' : '1.6rem' }}
      >
        {label}
      </div>
    </div>
  );
}

function Fact({ label, value, tone }) {
  const toneCls = tone === 'good' ? 'text-emerald-400' : tone === 'bad' ? 'text-red-400' : 'text-slate-100';
  return (
    <div className="rounded-lg bg-ink-700/50 px-3 py-2">
      <div className="label">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold ${toneCls}`}>{value}</div>
    </div>
  );
}
