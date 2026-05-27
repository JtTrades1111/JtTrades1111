import React from 'react';
import { useStore } from '../store/StoreContext.jsx';
import { cardBalanceOwed, currentNet, effectiveStartNet, goalStats } from '../store/selectors.js';
import { formatDelta, formatMoney } from '../lib/format.js';

const STATUS = {
  'on-track': { label: 'On track', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  ahead: { label: 'Ahead', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  behind: { label: 'Behind', cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
};

export default function KpiCards() {
  const { state } = useStore();
  const net = currentNet(state);
  const startNet = effectiveStartNet(state);
  const delta = net - startNet;
  const owed = cardBalanceOwed(state);
  const g = goalStats(state);
  const status = STATUS[g.status];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi label="Net Balance">
        <div className={`text-3xl font-bold ${net < 0 ? 'text-red-400' : 'text-slate-100'}`}>
          {formatMoney(net)}
        </div>
        <div className={`mt-1 text-sm font-medium ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {formatDelta(delta)} <span className="text-slate-500">vs start</span>
        </div>
      </Kpi>

      <Kpi label="Goal Status">
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${status.cls}`}>
            {status.label}
          </span>
        </div>
        <div className="mt-2 text-sm text-slate-400">
          {g.gap >= 0 ? 'Ahead of pace by ' : 'Behind pace by '}
          <span className={g.gap >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            {formatMoney(Math.abs(g.gap))}
          </span>
        </div>
      </Kpi>

      <Kpi label="Safe to Spend (this week)">
        <div className={`text-3xl font-bold ${g.safeToSpend > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
          {formatMoney(g.safeToSpend)}
        </div>
        <div className="mt-1 text-sm text-slate-500">
          and still hit pace next week
        </div>
      </Kpi>

      <Kpi label="Card Balance Owed">
        <div className={`text-3xl font-bold ${owed > 0 ? 'text-amber-400' : 'text-slate-100'}`}>
          {formatMoney(owed)}
        </div>
        <div className="mt-1 text-sm text-slate-500">Discover / liabilities</div>
      </Kpi>
    </div>
  );
}

function Kpi({ label, children }) {
  return (
    <div className="card p-5">
      <div className="label mb-2">{label}</div>
      {children}
    </div>
  );
}
