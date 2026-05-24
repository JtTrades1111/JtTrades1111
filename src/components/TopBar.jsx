import React, { useRef } from 'react';
import { useStore } from '../store/StoreContext.jsx';
import { daysBetween, todayISO } from '../lib/format.js';

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
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-lg font-bold text-white">
            ☀
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold leading-tight text-slate-100 sm:text-base">
              Summer Budget Dashboard
            </h1>
            <p className="hidden text-xs text-slate-400 sm:block">Tracking your end-of-summer net position</p>
          </div>

          {/* Compact countdown, always visible (incl. mobile) */}
          <div className="ml-1 shrink-0 rounded-xl border border-ink-600/60 bg-ink-800 px-3 py-1 text-center">
            <span className="text-base font-bold leading-none text-accent-soft">{daysLeft}</span>
            <span className="ml-1 text-[10px] uppercase tracking-wide text-slate-400">days left</span>
          </div>
        </div>

        <div className="ml-auto flex flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none">
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
          <button
            className="btn-ghost px-2.5 py-1.5 text-xs sm:px-3.5 sm:py-2 sm:text-sm"
            onClick={() => fileRef.current?.click()}
            title="Load a saved JSON file"
          >
            Import data
          </button>
          <button
            className="btn-ghost px-2.5 py-1.5 text-xs sm:px-3.5 sm:py-2 sm:text-sm"
            onClick={exportData}
            title="Download all data as JSON"
          >
            Export data
          </button>
          <button
            className="btn-ghost px-2.5 py-1.5 text-xs sm:px-3.5 sm:py-2 sm:text-sm"
            onClick={onSettings}
            title="Goal settings"
          >
            Settings
          </button>
          <button
            className="btn-primary px-2.5 py-1.5 text-xs sm:px-3.5 sm:py-2 sm:text-sm"
            onClick={onImport}
          >
            Import CSV
          </button>
        </div>
      </div>
    </header>
  );
}
