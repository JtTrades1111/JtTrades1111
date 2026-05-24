import React, { useEffect } from 'react';
import { useStore } from '../store/StoreContext.jsx';

// Shows the result of the most recent import (added / deduped / errors).
export default function Toast() {
  const { state, dispatch } = useStore();
  const info = state.ui.lastImport;

  useEffect(() => {
    if (!info) return;
    const t = setTimeout(() => dispatch({ type: 'CLEAR_IMPORT_TOAST' }), 9000);
    return () => clearTimeout(t);
  }, [info, dispatch]);

  if (!info) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 w-80 animate-[fadeIn_0.2s_ease] card border-emerald-500/30 p-4">
      <div className="flex items-start justify-between">
        <h4 className="text-sm font-semibold text-slate-100">Imported {info.accountName}</h4>
        <button className="text-slate-500 hover:text-slate-300" onClick={() => dispatch({ type: 'CLEAR_IMPORT_TOAST' })}>
          ✕
        </button>
      </div>
      <ul className="mt-2 space-y-0.5 text-sm">
        <li className="text-emerald-400">{info.added} added</li>
        {info.skipped > 0 && <li className="text-slate-400">{info.skipped} duplicates skipped</li>}
        {info.errors?.length > 0 && (
          <li className="text-amber-400">{info.errors.length} rows skipped (bad data)</li>
        )}
      </ul>
      {info.errors?.length > 0 && (
        <details className="mt-2 text-xs text-slate-500">
          <summary className="cursor-pointer">Show issues</summary>
          <ul className="mt-1 max-h-32 space-y-0.5 overflow-auto">
            {info.errors.slice(0, 20).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
