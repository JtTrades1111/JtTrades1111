import React, { useMemo, useState } from 'react';
import { useStore } from '../store/StoreContext.jsx';
import { CATEGORIES, CATEGORY_COLORS } from '../lib/categories.js';
import { formatDate, formatMoney } from '../lib/format.js';

export default function TransactionsTable() {
  const { state, dispatch } = useStore();
  const [search, setSearch] = useState('');
  const [accountId, setAccountId] = useState('all');
  const [category, setCategory] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' });
  const [ruleFor, setRuleFor] = useState(null); // transaction pending "add rule"

  const accountsById = useMemo(
    () => Object.fromEntries(state.accounts.map((a) => [a.id, a])),
    [state.accounts]
  );

  const rows = useMemo(() => {
    let list = state.transactions.filter((t) => {
      if (accountId !== 'all' && t.accountId !== accountId) return false;
      if (category !== 'all' && t.category !== category) return false;
      if (from && t.date < from) return false;
      if (to && t.date > to) return false;
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    const { key, dir } = sort;
    const mul = dir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      let av = a[key];
      let bv = b[key];
      if (key === 'amount') {
        av = a.amount;
        bv = b.amount;
      }
      if (av < bv) return -1 * mul;
      if (av > bv) return 1 * mul;
      return 0;
    });
    return list;
  }, [state.transactions, accountId, category, from, to, search, sort]);

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  const arrow = (key) => (sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '');

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-100">
          Transactions <span className="text-sm font-normal text-slate-500">({rows.length})</span>
        </h2>
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <input
          className="input col-span-2 lg:col-span-2"
          placeholder="Search description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="all">All accounts</option>
          {state.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} title="From date" />
        <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} title="To date" />
      </div>

      <div className="max-h-[28rem] overflow-auto rounded-lg border border-ink-600/60">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="sticky top-0 bg-ink-700 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <Th onClick={() => toggleSort('date')}>Date{arrow('date')}</Th>
              <Th onClick={() => toggleSort('description')}>Description{arrow('description')}</Th>
              <th className="hidden px-3 py-2 font-medium sm:table-cell">Account</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <Th onClick={() => toggleSort('amount')} className="text-right">
                Amount{arrow('amount')}
              </Th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const acct = accountsById[t.accountId];
              return (
                <tr key={t.id} className="border-t border-ink-600/40 hover:bg-ink-700/30">
                  <td className="whitespace-nowrap px-3 py-2 text-slate-400">{formatDate(t.date)}</td>
                  <td className="px-3 py-2 text-slate-200">
                    {t.description}
                    {t.categoryOverridden && (
                      <span className="ml-2 text-[10px] text-slate-500" title="Category manually set">
                        ✎
                      </span>
                    )}
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-2 text-slate-400 sm:table-cell">
                    {acct?.name || '—'}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="rounded-md border border-transparent bg-ink-700/0 px-1.5 py-1 text-xs hover:border-ink-500 focus:border-accent focus:outline-none"
                      style={{ color: CATEGORY_COLORS[t.category] || '#cbd5e1' }}
                      value={t.category}
                      onChange={(e) => dispatch({ type: 'SET_TX_CATEGORY', payload: { id: t.id, category: e.target.value } })}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c} className="bg-ink-700 text-slate-200">
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td
                    className={`whitespace-nowrap px-3 py-2 text-right font-medium ${
                      t.amount < 0 ? 'text-red-400' : 'text-slate-200'
                    }`}
                  >
                    {formatMoney(t.amount)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button
                      className="text-xs text-slate-500 hover:text-accent-soft"
                      title="Always categorize this merchant this way"
                      onClick={() => setRuleFor(t)}
                    >
                      + rule
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-slate-500">
                  No transactions match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {ruleFor && <AddRuleModal tx={ruleFor} onClose={() => setRuleFor(null)} />}
    </section>
  );
}

function Th({ children, onClick, className = '' }) {
  return (
    <th
      className={`cursor-pointer select-none px-3 py-2 font-medium hover:text-slate-200 ${className}`}
      onClick={onClick}
    >
      {children}
    </th>
  );
}

// Quick "always categorize merchant X as Y" rule builder.
function AddRuleModal({ tx, onClose }) {
  const { dispatch } = useStore();
  // Default pattern: the merchant's leading words, escaped for regex.
  const guessPattern = tx.description.split(/\s{2,}|#|\*/)[0].trim().slice(0, 24);
  const [pattern, setPattern] = useState(guessPattern);
  const [category, setCategory] = useState(tx.category);

  const save = () => {
    if (!pattern.trim()) return;
    dispatch({
      type: 'ADD_RULE',
      payload: { pattern: pattern.trim(), category, label: `${pattern.trim()} → ${category}` },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={onClose}>
      <div className="card w-full max-w-md p-5" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="mb-3 text-base font-semibold text-slate-100">Add categorization rule</h3>
        <p className="mb-4 text-xs text-slate-400">
          Any transaction whose description matches this text (case-insensitive, regex allowed) will
          be categorized automatically. Existing manual overrides are kept.
        </p>
        <label className="label">Match text</label>
        <input className="input mb-3 w-full" value={pattern} onChange={(e) => setPattern(e.target.value)} />
        <label className="label">Category</label>
        <select className="input mb-4 w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save}>
            Save rule
          </button>
        </div>
      </div>
    </div>
  );
}
