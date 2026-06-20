import React, { useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import { useStore } from '../store/StoreContext.jsx';
import { buildDrafts, detectFormat, parseCsvText } from '../lib/csv.js';
import { isPdfFile, parseStatementPdf } from '../lib/pdf.js';

// Signature of a header set, used to remember mappings for unknown formats.
function headerSignature(headers) {
  return headers.map((h) => h.trim().toLowerCase()).join('|');
}

const REQUIRED_FIELDS = ['date', 'description', 'amount'];

export default function ImportModal({ open, onClose }) {
  const { state, dispatch } = useStore();
  const [stage, setStage] = useState('drop'); // 'drop' | 'mapping'
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState(null); // { headers, rows, fileName }

  // Mapping form state (used in the fallback flow).
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState('asset');
  const [amountSign, setAmountSign] = useState('standard');
  const [map, setMap] = useState({ date: '', description: '', amount: '', category: '' });

  const reset = () => {
    setStage('drop');
    setError('');
    setParsed(null);
    setAccountName('');
    setAccountType('asset');
    setAmountSign('standard');
    setMap({ date: '', description: '', amount: '', category: '' });
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleFile = async (file) => {
    setError('');
    if (!file) return;
    try {
      const pdf = isPdfFile(file);
      const { headers, rows, meta } = pdf
        ? await parseStatementPdf(file)
        : parseCsvText(await file.text());
      if (!rows.length) {
        setError(
          pdf ? 'No transactions found in that PDF.' : 'That file has headers but no data rows.'
        );
        return;
      }
      const fmt = detectFormat(headers);
      const signature = headerSignature(headers);

      if (fmt) {
        // Known issuer format — import directly.
        const mapping = {
          ...fmt.mapping,
          accountType: fmt.type,
          amountSign: fmt.amountSign,
        };
        const { drafts, errors } = buildDrafts(rows, mapping);
        if (!drafts.length) {
          setError(`No usable rows found. ${errors.slice(0, 3).join('; ')}`);
          return;
        }
        dispatch({
          type: 'IMPORT',
          payload: {
            accountName: fmt.label,
            accountType: fmt.type,
            source: fmt.key,
            amountSign: fmt.amountSign,
            drafts,
            errors,
            signature,
            mapping,
            // For statement PDFs, anchor the account to the real balance owed.
            openingBalance: meta?.previousBalance ?? null,
            openingBalanceDate: meta?.periodStart ?? null,
          },
        });
        close();
        return;
      }

      // Unknown format — check for a remembered mapping, else show mapping UI.
      const remembered = state.columnMappings[signature];
      if (remembered) {
        const { drafts, errors } = buildDrafts(rows, remembered);
        if (drafts.length) {
          dispatch({
            type: 'IMPORT',
            payload: {
              accountName: remembered.accountName || file.name.replace(/\.csv$/i, ''),
              accountType: remembered.accountType,
              source: 'manual',
              amountSign: remembered.amountSign,
              drafts,
              errors,
              signature,
              mapping: remembered,
            },
          });
          close();
          return;
        }
      }

      // Show mapping screen with smart guesses.
      setParsed({ headers, rows, fileName: file.name });
      setAccountName(file.name.replace(/\.csv$/i, ''));
      setMap({
        date: guess(headers, ['date', 'trans. date', 'transaction date', 'posted']),
        description: guess(headers, ['description', 'name', 'memo', 'payee']),
        amount: guess(headers, ['amount', 'value', 'debit']),
        category: guess(headers, ['category', 'type']),
      });
      setStage('mapping');
    } catch (e) {
      setError(e.message || 'Failed to read the file.');
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  const mappingValid = useMemo(
    () => REQUIRED_FIELDS.every((f) => map[f]) && accountName.trim(),
    [map, accountName]
  );

  const confirmMapping = () => {
    const mapping = {
      date: map.date,
      description: map.description,
      amount: map.amount,
      category: map.category || null,
      accountType,
      amountSign,
      accountName: accountName.trim(),
    };
    const { drafts, errors } = buildDrafts(parsed.rows, mapping);
    if (!drafts.length) {
      setError(`No usable rows with this mapping. ${errors.slice(0, 3).join('; ')}`);
      return;
    }
    dispatch({
      type: 'IMPORT',
      payload: {
        accountName: accountName.trim(),
        accountType,
        source: 'manual',
        amountSign,
        drafts,
        errors,
        signature: headerSignature(parsed.headers),
        mapping,
      },
    });
    close();
  };

  return (
    <Modal open={open} onClose={close} title="Import statement" wide={stage === 'mapping'}>
      {stage === 'drop' && (
        <div>
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-ink-500 bg-ink-700/40 px-6 py-12 text-center transition-colors hover:border-accent/70"
          >
            <div className="text-4xl">📄</div>
            <div className="text-sm font-medium text-slate-200">
              Drag a CSV or PDF here, or click to choose a file
            </div>
            <div className="text-xs text-slate-400">
              Discover statement PDFs and Discover/USAA CSV exports are detected
              automatically. Other CSVs get a column-mapping step.
            </div>
            <input
              type="file"
              accept=".csv,text/csv,.pdf,application/pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        </div>
      )}

      {stage === 'mapping' && parsed && (
        <div className="space-y-5">
          <p className="text-sm text-slate-400">
            We didn't recognize <span className="text-slate-200">{parsed.fileName}</span>. Map its
            columns to the required fields. This mapping is remembered for future
            imports of the same format.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Account name">
              <input className="input w-full" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
            </Field>
            <Field label="Account kind">
              <select className="input w-full" value={accountType} onChange={(e) => setAccountType(e.target.value)}>
                <option value="asset">Asset (checking / savings)</option>
                <option value="liability">Liability (credit card)</option>
              </select>
            </Field>

            {['date', 'description', 'amount', 'category'].map((field) => (
              <Field
                key={field}
                label={`${cap(field)}${field === 'category' ? ' (optional)' : ''} column`}
              >
                <select
                  className="input w-full"
                  value={map[field]}
                  onChange={(e) => setMap((m) => ({ ...m, [field]: e.target.value }))}
                >
                  <option value="">— none —</option>
                  {parsed.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </Field>
            ))}

            <Field label="Amount sign convention">
              <select className="input w-full" value={amountSign} onChange={(e) => setAmountSign(e.target.value)}>
                {accountType === 'asset' ? (
                  <>
                    <option value="standard">Negative = money out (typical)</option>
                    <option value="flipped">Positive = money out</option>
                  </>
                ) : (
                  <>
                    <option value="standard">Positive = charge / you owe more (typical)</option>
                    <option value="flipped">Negative = charge</option>
                  </>
                )}
              </select>
            </Field>
          </div>

          {/* Preview the first few rows so the mapping is obvious. */}
          <div className="overflow-x-auto rounded-lg border border-ink-600">
            <table className="w-full text-left text-xs">
              <thead className="bg-ink-700 text-slate-400">
                <tr>
                  {parsed.headers.map((h) => (
                    <th key={h} className="px-3 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 4).map((row, i) => (
                  <tr key={i} className="border-t border-ink-600/60">
                    {parsed.headers.map((h) => (
                      <td key={h} className="px-3 py-1.5 text-slate-300">
                        {String(row[h] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setStage('drop')}>
              Back
            </button>
            <button className="btn-primary" disabled={!mappingValid} onClick={confirmMapping}>
              Import
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <div className="label">{label}</div>
      {children}
    </div>
  );
}

function guess(headers, candidates) {
  const lower = headers.map((h) => h.trim().toLowerCase());
  for (const c of candidates) {
    const i = lower.indexOf(c);
    if (i >= 0) return headers[i];
  }
  // partial contains match
  for (const c of candidates) {
    const i = lower.findIndex((h) => h.includes(c));
    if (i >= 0) return headers[i];
  }
  return '';
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
