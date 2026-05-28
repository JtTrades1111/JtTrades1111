import React from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useStore } from '../store/StoreContext.jsx';
import { spendingByCategory, spendingByWeek, totalSpending } from '../store/selectors.js';
import { CATEGORY_COLORS } from '../lib/categories.js';
import { formatMoney } from '../lib/format.js';

export default function SpendingSection({ month, months, onMonthChange }) {
  const { state } = useStore();
  const byCat = spendingByCategory(state, month);
  const byWeek = spendingByWeek(state, month);
  const total = totalSpending(state, month);

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Spending</h2>
          <p className="text-xs text-slate-400">Transfers and card payments excluded</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="label">Month total</div>
            <div className="text-sm font-semibold text-slate-100">{formatMoney(total)}</div>
          </div>
          <select className="input" value={month} onChange={(e) => onMonthChange(e.target.value)}>
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {byCat.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">No spending recorded for this month.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Donut by category */}
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byCat}
                  dataKey="value"
                  nameKey="category"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                  stroke="none"
                >
                  {byCat.map((d) => (
                    <Cell key={d.category} fill={CATEGORY_COLORS[d.category] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0f1525', border: '1px solid #2a3450', borderRadius: 12, color: '#e2e8f0' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(v, n) => [formatMoney(v), n]}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, color: '#cbd5e1' }}
                  formatter={(v) => <span className="text-slate-300">{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar by week */}
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byWeek} margin={{ top: 10, right: 8, bottom: 0, left: 8 }}>
                <XAxis
                  dataKey="week"
                  tickFormatter={(w) => w.replace(/^\d{4}-/, '')}
                  stroke="#64748b"
                  fontSize={11}
                />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `$${Math.round(v)}`} width={52} />
                <Tooltip
                  cursor={{ fill: '#1e2740' }}
                  contentStyle={{ background: '#0f1525', border: '1px solid #2a3450', borderRadius: 12, color: '#e2e8f0' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(v) => [formatMoney(v), 'Spent']}
                />
                <Bar dataKey="value" fill="#818cf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
}
