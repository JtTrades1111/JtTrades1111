import React, { useState } from 'react';
import { useStore } from '../store/StoreContext.jsx';
import { accountBalance, investmentsTotal } from '../store/selectors.js';
import { formatDate, formatMoney } from '../lib/format.js';

export default function AccountsPanel() {
  const { state, dispatch } = useStore();

  return (
    <section className="card p-5">
      <h2 className="mb-4 text-base font-semibold text-slate-100">Accounts</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {state.accounts.map((a) => {
          const bal = accountBalance(state, a.id);
          const isLiab = a.type === 'liability';
          return (
            <div key={a.id} className="rounded-xl border border-ink-600/60 bg-ink-700/40 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-slate-100">{a.name}</div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    {isLiab ? 'Liability' : 'Asset'} · {a.source}
                  </div>
                </div>
                <button
                  className="text-xs text-slate-500 hover:text-red-400"
                  title="Remove account and its transactions"
                  onClick={() => {
                    if (confirm(`Remove "${a.name}" and all its transactions?`)) {
                      dispatch({ type: 'DELETE_ACCOUNT', payload: { id: a.id } });
                    }
                  }}
                >
                  Remove
                </button>
              </div>
              <div className={`mt-3 text-xl font-bold ${isLiab ? 'text-amber-400' : 'text-slate-100'}`}>
                {isLiab ? `${formatMoney(bal)} owed` : formatMoney(bal)}
              </div>
              {Number(a.openingBalance) ? (
                <div className="mt-1 text-xs text-slate-500">
                  Incl. {formatMoney(a.openingBalance)} balance carried in
                  {a.openingBalanceDate ? ` (as of ${formatDate(a.openingBalanceDate)})` : ''}
                </div>
              ) : null}
              <div className="mt-1 text-xs text-slate-500">
                Last import: {a.lastImport ? formatDate(a.lastImport) : '—'}
              </div>
            </div>
          );
        })}

        {state.accounts.length === 0 && (
          <p className="col-span-full py-6 text-center text-sm text-slate-500">
            No accounts yet. Import a CSV to get started.
          </p>
        )}
      </div>

      <Investments />
    </section>
  );
}

function Investments() {
  const { state, dispatch } = useStore();
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const total = investmentsTotal(state);

  const add = () => {
    if (!name.trim()) return;
    dispatch({ type: 'ADD_INVESTMENT', payload: { name: name.trim(), value: parseFloat(value) || 0 } });
    setName('');
    setValue('');
  };

  return (
    <div className="mt-5 border-t border-ink-600/60 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Investments (manual)</h3>
        <span className="text-sm font-semibold text-emerald-400">{formatMoney(total)}</span>
      </div>

      <div className="space-y-2">
        {state.investments.map((inv) => (
          <div key={inv.id} className="flex items-center gap-2">
            <input
              className="input flex-1"
              value={inv.name}
              onChange={(e) => dispatch({ type: 'UPDATE_INVESTMENT', payload: { id: inv.id, name: e.target.value } })}
            />
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                step="0.01"
                className="input w-32 pl-6 text-right"
                value={inv.value}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_INVESTMENT',
                    payload: { id: inv.id, value: parseFloat(e.target.value) || 0 },
                  })
                }
              />
            </div>
            <button
              className="px-2 text-slate-500 hover:text-red-400"
              onClick={() => dispatch({ type: 'DELETE_INVESTMENT', payload: { id: inv.id } })}
              aria-label="Delete investment"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          className="input flex-1"
          placeholder="e.g. Brokerage, Roth IRA"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <input
          type="number"
          step="0.01"
          className="input w-32 text-right"
          placeholder="0.00"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="btn-ghost" onClick={add}>
          Add
        </button>
      </div>
    </div>
  );
}
