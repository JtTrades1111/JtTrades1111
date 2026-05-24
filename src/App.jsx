import React, { useEffect, useState } from 'react';
import TopBar from './components/TopBar.jsx';
import KpiCards from './components/KpiCards.jsx';
import GoalProgress from './components/GoalProgress.jsx';
import SpendingSection from './components/SpendingSection.jsx';
import AccountsPanel from './components/AccountsPanel.jsx';
import TransactionsTable from './components/TransactionsTable.jsx';
import ImportModal from './components/ImportModal.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import Toast from './components/Toast.jsx';
import EmptyState from './components/EmptyState.jsx';
import { useStore } from './store/StoreContext.jsx';
import { availableMonths } from './store/selectors.js';

export default function App() {
  const { state } = useStore();
  const [showImport, setShowImport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const months = availableMonths(state);
  const [month, setMonth] = useState(months[0] || '');

  // Keep the selected month valid as data changes.
  useEffect(() => {
    if (months.length && !months.includes(month)) setMonth(months[0]);
  }, [months, month]);

  const hasData = state.transactions.length > 0 || state.investments.length > 0;

  return (
    <div className="min-h-screen">
      <TopBar onImport={() => setShowImport(true)} onSettings={() => setShowSettings(true)} />

      {!hasData ? (
        <EmptyState onImport={() => setShowImport(true)} />
      ) : (
        <main className="mx-auto max-w-7xl space-y-4 px-3 py-4 sm:space-y-5 sm:px-5 sm:py-6">
          <KpiCards />
          <GoalProgress />
          <SpendingSection month={month} months={months} onMonthChange={setMonth} />
          <AccountsPanel />
          <TransactionsTable />
        </main>
      )}

      <ImportModal open={showImport} onClose={() => setShowImport(false)} />
      <SettingsPanel open={showSettings} onClose={() => setShowSettings(false)} />
      <Toast />
    </div>
  );
}
