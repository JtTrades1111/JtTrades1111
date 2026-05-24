import React from 'react';

export default function EmptyState({ onImport }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-5">
      <div className="card max-w-lg p-10 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-3xl">
          📈
        </div>
        <h2 className="text-xl font-semibold text-slate-100">Import your first CSV</h2>
        <p className="mt-2 text-sm text-slate-400">
          Download a transaction export from Discover or USAA and drop it in. The dashboard
          tracks your <span className="text-slate-200">net position</span> — cash plus investments
          minus card balance — against your end-of-summer goal.
        </p>
        <button className="btn-primary mt-6" onClick={onImport}>
          Import CSV
        </button>
        <p className="mt-4 text-xs text-slate-500">
          Already have a saved <code className="text-slate-400">.json</code>? Use “Import data” in the top bar.
        </p>
      </div>
    </div>
  );
}
