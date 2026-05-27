import React, { createContext, useContext, useReducer } from 'react';
import { categorize, DEFAULT_RULES } from '../lib/categories.js';
import { todayISO } from '../lib/format.js';

// ---------------------------------------------------------------------------
// Data store — kept entirely in React state (useReducer).
// IMPORTANT: no localStorage / sessionStorage. Save/restore is done by the
// Export/Import JSON buttons in the UI.
// ---------------------------------------------------------------------------

const StoreContext = createContext(null);

let _seq = 0;
function genId(prefix) {
  _seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${_seq}`;
}

export const initialState = {
  accounts: [], // { id, name, type, source, amountSign, lastImport }
  transactions: [], // { id, accountId, date, description, rawCategory, category, amount, signedForNet, categoryOverridden }
  investments: [], // { id, name, value }
  rules: [], // user rules: { id, pattern, category, source:'user' }
  columnMappings: {}, // signature -> mapping (for re-imports of unknown formats)
  settings: {
    startNet: null, // null => auto-compute from data
    targetNet: 5000,
    targetDate: defaultTargetDate(),
    startDate: null, // null => earliest transaction date
    // Long-term investment goal (compounding). Tracked against total net worth.
    investTarget: 200000,
    investTargetDate: defaultInvestDate(),
    investReturn: 7, // expected annual return %, editable
    investMonthly: 2500, // planned monthly contribution
  },
  ui: { lastImport: null },
};

function defaultTargetDate() {
  // End of summer: Sept 1 of the current year (or next year if already past).
  const now = new Date();
  let year = now.getFullYear();
  const sept1 = new Date(year, 8, 1);
  if (now > sept1) year += 1;
  return `${year}-09-01`;
}

function defaultInvestDate() {
  // Default long-term horizon: 5 years out.
  const d = new Date();
  return `${d.getFullYear() + 5}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// Build the effective rule list: user rules first (highest priority), then
// the shipped defaults. User rules store `pattern` as a string treated as a
// case-insensitive regex; defaults already carry a RegExp in `test`.
export function effectiveRules(userRules) {
  const userAsRules = userRules.map((r) => ({
    id: r.id,
    label: r.label || r.pattern,
    test: safeRegex(r.pattern),
    category: r.category,
  }));
  return [...userAsRules, ...DEFAULT_RULES];
}

function safeRegex(pattern) {
  try {
    return new RegExp(pattern, 'i');
  } catch {
    // Fall back to a literal substring match if the pattern is invalid regex.
    return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }
}

function dedupeKey(t) {
  return `${t.accountId}|${t.date}|${t.description}|${t.amount}`;
}

function reducer(state, action) {
  switch (action.type) {
    case 'IMPORT': {
      const { accountName, accountType, source, amountSign, drafts, signature, mapping, errors } = action.payload;
      const { openingBalance = null, openingBalanceDate = null } = action.payload;

      // Find or create the account (matched by name + source).
      let account = state.accounts.find((a) => a.name === accountName && a.source === source);
      let accounts = state.accounts;
      if (!account) {
        account = {
          id: genId('acct'),
          name: accountName,
          type: accountType,
          source,
          amountSign,
          lastImport: todayISO(),
          // Balance carried into the earliest imported statement (e.g. a credit
          // card's Previous Balance). Imported flows sum on top of this.
          openingBalance: openingBalance ?? 0,
          openingBalanceDate: openingBalanceDate ?? null,
        };
        accounts = [...accounts, account];
      } else {
        accounts = accounts.map((a) => {
          if (a.id !== account.id) return a;
          const next = { ...a, lastImport: todayISO() };
          // Anchor to the EARLIEST statement's opening balance so multiple
          // imports don't double-count the carried balance.
          if (openingBalance != null && openingBalanceDate) {
            if (!a.openingBalanceDate || openingBalanceDate < a.openingBalanceDate) {
              next.openingBalance = openingBalance;
              next.openingBalanceDate = openingBalanceDate;
            }
          }
          return next;
        });
      }

      const rules = effectiveRules(state.rules);
      const existingKeys = new Set(state.transactions.map(dedupeKey));

      let added = 0;
      let skipped = 0;
      const newTx = [];
      for (const d of drafts) {
        const tx = {
          id: genId('tx'),
          accountId: account.id,
          date: d.date,
          description: d.description,
          rawCategory: d.rawCategory,
          amount: d.amount,
          signedForNet: d.signedForNet,
          category: categorize(d.description, d.rawCategory, rules),
          categoryOverridden: false,
        };
        const key = dedupeKey(tx);
        if (existingKeys.has(key)) {
          skipped += 1;
          continue;
        }
        existingKeys.add(key);
        newTx.push(tx);
        added += 1;
      }

      const columnMappings = signature ? { ...state.columnMappings, [signature]: mapping } : state.columnMappings;

      return {
        ...state,
        accounts,
        transactions: [...state.transactions, ...newTx],
        columnMappings,
        ui: { ...state.ui, lastImport: { accountName, added, skipped, errors: errors || [] } },
      };
    }

    case 'CLEAR_IMPORT_TOAST':
      return { ...state, ui: { ...state.ui, lastImport: null } };

    case 'SET_TX_CATEGORY':
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === action.payload.id
            ? { ...t, category: action.payload.category, categoryOverridden: true }
            : t
        ),
      };

    case 'ADD_RULE': {
      const rule = {
        id: genId('rule'),
        pattern: action.payload.pattern,
        category: action.payload.category,
        label: action.payload.label || action.payload.pattern,
        source: 'user',
      };
      const rules = [...state.rules, rule];
      // Re-categorize transactions that the user hasn't manually overridden.
      const eff = effectiveRules(rules);
      const transactions = state.transactions.map((t) =>
        t.categoryOverridden ? t : { ...t, category: categorize(t.description, t.rawCategory, eff) }
      );
      return { ...state, rules, transactions };
    }

    case 'DELETE_RULE': {
      const rules = state.rules.filter((r) => r.id !== action.payload.id);
      const eff = effectiveRules(rules);
      const transactions = state.transactions.map((t) =>
        t.categoryOverridden ? t : { ...t, category: categorize(t.description, t.rawCategory, eff) }
      );
      return { ...state, rules, transactions };
    }

    case 'ADD_INVESTMENT':
      return {
        ...state,
        investments: [
          ...state.investments,
          { id: genId('inv'), name: action.payload.name, value: Number(action.payload.value) || 0 },
        ],
      };

    case 'UPDATE_INVESTMENT':
      return {
        ...state,
        investments: state.investments.map((i) =>
          i.id === action.payload.id
            ? { ...i, name: action.payload.name ?? i.name, value: action.payload.value ?? i.value }
            : i
        ),
      };

    case 'DELETE_INVESTMENT':
      return { ...state, investments: state.investments.filter((i) => i.id !== action.payload.id) };

    case 'RENAME_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.map((a) =>
          a.id === action.payload.id ? { ...a, name: action.payload.name } : a
        ),
      };

    case 'DELETE_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.filter((a) => a.id !== action.payload.id),
        transactions: state.transactions.filter((t) => t.accountId !== action.payload.id),
      };

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };

    case 'LOAD_STATE': {
      // Merge defensively so an older/partial export still loads.
      const incoming = action.payload || {};
      return {
        ...initialState,
        ...incoming,
        settings: { ...initialState.settings, ...(incoming.settings || {}) },
        ui: { lastImport: null },
      };
    }

    case 'RESET':
      return { ...initialState, settings: { ...initialState.settings } };

    default:
      return state;
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
