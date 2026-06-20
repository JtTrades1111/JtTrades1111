import React from 'react';
import { useStore } from '../store/StoreContext.jsx';
import { budgetRemaining, cardBalanceOwed, cashTotal, currentNet, goalStats } from '../store/selectors.js';
import { formatMoney } from '../lib/format.js';

export default function KpiCards() {
  const { state } = useStore();
  const net = currentNet(state);
  const owed = cardBalanceOwed(state);
  const g = goalStats(state);
  const b = budgetRemaining(state);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi label="Net Balance">
        <div className={`text-3xl font-bold ${net < 0 ? 'text-red-400' : 'text-slate-100'}`}>
          {formatMoney(net)}
        </div>
        <div className="mt-1 text-sm text-slate-500">
          {cashLabel(state)}
        </div>
      </Kpi>

      <Kpi label="Budget Remaining (this month)">
        <div className={`text-3xl font-bold ${b.remaining < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
          {formatMoney(b.remaining)}
        </div>
        <div className="mt-1 text-sm text-slate-500">
          {formatMoney(b.spent)} of {formatMoney(b.cap)} spent
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

// Subtitle for the Net Balance card. When cash is entered, show that it's
// folded in; otherwise hint at what makes up net balance.
function cashLabel(state) {
  const cash = cashTotal(state);
  if (cash > 0) return `incl. ${formatMoney(cash)} cash on hand`;
  return 'cash + investments − card owed';
}

function Kpi({ label, children }) {
  return (
    <div className="card p-5">
      <div className="label mb-2">{label}</div>
      {children}
    </div>
  );
}
