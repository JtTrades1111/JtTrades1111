import React, { useRef } from 'react';
import { useStore } from '../store/StoreContext.jsx';
import { daysBetween, formatDate, todayISO } from '../lib/format.js';

export default function TopBar({ onImport, onSettings }) {
  const { state, dispatch } = useStore();
  const fileRef = useRef(null);

  const daysLeft = Math.max(daysBetween(todayISO(), state.settings.targetDate), 0);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `summer-budget-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      dispatch({ type: 'LOAD_STATE', payload: data });
    } catch {
      alert('That file is not a valid Summer Budget export.');
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-ink-600/60 bg-ink-900/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-lg font-bold text-white">
            ☀
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight text-slate-100">Summer Budget Dashboard</h1>
            <p className="text-xs text-slate-400">Tracking your end-of-summer net position</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden rounded-xl border border-ink-600/60 bg-ink-800 px-3.5 py-1.5 text-right sm:block">
            <div className="text-lg font-bold leading-none text-accent-soft">{daysLeft}</div>
            <div className="text-[10px] uppercase tracking-wide text-slate-400">
              days left · {formatDate(state.settings.targetDate)}
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              importData(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <button className="btn-ghost" onClick={() => fileRef.current?.click()} title="Load a saved JSON file">
            Import data
          </button>
          <button className="btn-ghost" onClick={exportData} title="Download all data as JSON">
            Export data
          </button>
          <button className="btn-ghost" onClick={onSettings} title="Goal settings">
            Settings
          </button>
          <button className="btn-primary" onClick={onImport}>
            Import CSV
          </button>
        </div>
      </div>
    </header>
  );
}
