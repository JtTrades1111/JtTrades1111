import React, { useState } from 'react';
import Modal from './Modal.jsx';
import { useStore } from '../store/StoreContext.jsx';
import { autoStartNet, effectiveStartDate } from '../store/selectors.js';
import { formatMoney } from '../lib/format.js';

export default function SettingsPanel({ open, onClose }) {
  const { state, dispatch } = useStore();
  const { settings } = state;
  const auto = autoStartNet(state);
  const startDateAuto = effectiveStartDate(state);

  const [targetNet, setTargetNet] = useState(settings.targetNet);
  const [monthlyBudget, setMonthlyBudget] = useState(settings.monthlyBudget);
  const [targetDate, setTargetDate] = useState(settings.targetDate);
  const [startDate, setStartDate] = useState(settings.startDate || '');
  const [overrideStart, setOverrideStart] = useState(settings.startNet != null);
  const [startNet, setStartNet] = useState(settings.startNet != null ? settings.startNet : auto);

  // Long-term investment goal fields.
  const [investTarget, setInvestTarget] = useState(settings.investTarget);
  const [investTargetDate, setInvestTargetDate] = useState(settings.investTargetDate);
  const [investReturn, setInvestReturn] = useState(settings.investReturn);
  const [investMonthly, setInvestMonthly] = useState(settings.investMonthly);

  const save = () => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: {
        targetNet: parseFloat(targetNet) || 0,
        monthlyBudget: parseFloat(monthlyBudget) || 0,
        targetDate,
        startDate: startDate || null,
        startNet: overrideStart ? parseFloat(startNet) || 0 : null,
        investTarget: parseFloat(investTarget) || 0,
        investTargetDate,
        investReturn: parseFloat(investReturn) || 0,
        investMonthly: parseFloat(investMonthly) || 0,
      },
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Goal Settings">
      <div className="space-y-4">
        <Row label="Target net balance">
          <Money value={targetNet} onChange={setTargetNet} />
        </Row>
        <Row label="Monthly spending budget" hint="Your cap per calendar month. Powers the Budget Remaining card.">
          <Money value={monthlyBudget} onChange={setMonthlyBudget} />
        </Row>
        <Row label="Target date (end of summer)">
          <input type="date" className="input w-full" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </Row>
        <Row label="Tracking start date" hint={`Auto: ${startDateAuto} (earliest transaction)`}>
          <input
            type="date"
            className="input w-full"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </Row>

        <div className="rounded-lg border border-ink-600/60 bg-ink-700/40 p-4">
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={overrideStart}
              onChange={(e) => setOverrideStart(e.target.checked)}
            />
            Manually set starting net balance
          </label>
          <p className="mt-1 text-xs text-slate-400">
            Auto-computed from imported data: <span className="text-slate-200">{formatMoney(auto)}</span>
          </p>
          {overrideStart && (
            <div className="mt-3">
              <Money value={startNet} onChange={setStartNet} />
            </div>
          )}
        </div>

        {/* Long-term investment goal */}
        <div className="space-y-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
          <h3 className="text-sm font-semibold text-emerald-300">Investment Goal (long-term)</h3>
          <Row label="Target amount">
            <Money value={investTarget} onChange={setInvestTarget} />
          </Row>
          <Row label="Target date">
            <input
              type="date"
              className="input w-full"
              value={investTargetDate}
              onChange={(e) => setInvestTargetDate(e.target.value)}
            />
          </Row>
          <Row label="Planned monthly contribution">
            <Money value={investMonthly} onChange={setInvestMonthly} />
          </Row>
          <Row label="Expected annual return (%)" hint="Long-run stock market avg is ~7%.">
            <input
              type="number"
              step="0.1"
              className="input w-full"
              value={investReturn}
              onChange={(e) => setInvestReturn(e.target.value)}
            />
          </Row>
        </div>

        <div className="flex justify-between pt-2">
          <button
            className="btn-ghost text-red-400"
            onClick={() => {
              if (confirm('Clear ALL data? This cannot be undone (export first if needed).')) {
                dispatch({ type: 'RESET' });
                onClose();
              }
            }}
          >
            Reset all data
          </button>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={save}>
              Save
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <div className="label">{label}</div>
      {children}
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

function Money({ value, onChange }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
      <input
        type="number"
        step="0.01"
        className="input w-full pl-7"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
