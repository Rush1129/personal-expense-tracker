import { useState, useMemo } from 'react';
import { useApp } from './AppContext';
import SummaryCard from './components/SummaryCard';
import EntryList from './components/EntryList';
import EntryForm from './components/EntryForm';
import Reports from './components/Reports';
import Settings from './components/Settings';
import { calculateTotals, getMonthName } from './utils';
import { isSupabaseConfigured } from './supabaseClient';
import { Home, BarChart3, Settings as SettingsIcon, Plus, Cloud } from 'lucide-react';

export default function App() {
  const { transactions, loading } = useApp();
  const [activeTab, setActiveTab] = useState('home');
  const [showForm, setShowForm] = useState(false);
  const [editTx, setEditTx] = useState(null);

  // Filter transactions for current month
  const now = new Date();
  const currentMonthTx = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
  }, [transactions]);

  const totals = calculateTotals(currentMonthTx);
  const period = `${getMonthName(now.getMonth())} ${now.getFullYear()}`;

  const handleEdit = (tx) => {
    setEditTx(tx);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditTx(null);
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-bg dark:bg-bg-dark">
        <div className="text-center fade-in">
          <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <span className="text-2xl font-bold text-white">₹</span>
          </div>
          <p className="text-sm font-semibold text-text-muted dark:text-text-muted-dark">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg dark:bg-bg-dark transition-colors duration-300">
      {/* Main content */}
      <div className="max-w-lg mx-auto px-4 pt-4 pb-24 safe-top">
        {/* Header */}
        <header className="flex items-center justify-between mb-5 slide-up">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-text dark:text-text-dark tracking-tight">
                {activeTab === 'home' && 'SpendWise'}
                {activeTab === 'reports' && 'Reports'}
                {activeTab === 'settings' && 'Settings'}
              </h1>
              {activeTab === 'home' && isSupabaseConfigured && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-income/10 text-income border border-income/20">
                  <Cloud className="w-3 h-3 text-income" />
                  Cloud
                </span>
              )}
            </div>
            {activeTab === 'home' && (
              <p className="text-xs text-text-muted dark:text-text-muted-dark mt-0.5 font-medium">
                Track your daily finances
              </p>
            )}
          </div>
          {activeTab === 'home' && (
            <div className="text-right">
              <p className="text-xs text-text-muted dark:text-text-muted-dark font-medium">
                {now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
            </div>
          )}
        </header>

        {/* Tab content */}
        {activeTab === 'home' && (
          <div className="space-y-5">
            <SummaryCard totals={totals} period={period} />
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-sm font-bold text-text dark:text-text-dark uppercase tracking-wider">
                  Recent Transactions
                </h2>
                <span className="text-xs text-text-muted dark:text-text-muted-dark font-medium">
                  {currentMonthTx.length} this month
                </span>
              </div>
              <EntryList transactions={currentMonthTx} onEdit={handleEdit} />
            </div>
          </div>
        )}

        {activeTab === 'reports' && <Reports />}
        {activeTab === 'settings' && <Settings />}
      </div>

      {/* FAB - Add button */}
      <button
        onClick={() => {
          setEditTx(null);
          setShowForm(true);
        }}
        className="fixed bottom-30 right-5 sm:right-auto sm:left-1/2 sm:translate-x-[calc(256px-28px)] w-13 h-13 gradient-primary rounded-full flex items-center justify-center shadow-xl shadow-primary/20 press-effect hover:shadow-2xl hover:shadow-primary/40 transition-all duration-200 z-40"
        aria-label="Add new entry"
      >
        <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
      </button>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30">
        <div className="max-w-lg mx-auto">
          <div className="bg-surface/90 dark:bg-surface-dark/90 backdrop-blur-xl border-t border-border/50 dark:border-border-dark/50 safe-bottom">
            <div className="flex items-center justify-around py-2">
              <NavButton
                icon={<Home className="w-5 h-5" />}
                label="Home"
                active={activeTab === 'home'}
                onClick={() => setActiveTab('home')}
              />
              <NavButton
                icon={<BarChart3 className="w-5 h-5" />}
                label="Reports"
                active={activeTab === 'reports'}
                onClick={() => setActiveTab('reports')}
              />
              <NavButton
                icon={<SettingsIcon className="w-5 h-5" />}
                label="Settings"
                active={activeTab === 'settings'}
                onClick={() => setActiveTab('settings')}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Entry form modal */}
      {showForm && (
        <EntryForm editTransaction={editTx} onClose={handleCloseForm} />
      )}
    </div>
  );
}

function NavButton({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 px-6 py-2 rounded-xl transition-all duration-200 press-effect ${
        active
          ? 'text-primary'
          : 'text-text-muted dark:text-text-muted-dark hover:text-text dark:hover:text-text-dark'
      }`}
    >
      {icon}
      <span className="text-[10px] font-semibold">{label}</span>
      {active && (
        <div className="w-4 h-0.5 rounded-full bg-primary mt-0.5" />
      )}
    </button>
  );
}
