import { useState, useMemo } from 'react';
import { useApp } from './AppContext';
import SummaryCard from './components/SummaryCard';
import EntryList from './components/EntryList';
import EntryForm from './components/EntryForm';
import VoiceEntry from './components/VoiceEntry';
import Reports from './components/Reports';
import Settings from './components/Settings';
import { calculateTotals, getMonthName } from './utils';
import { isSupabaseConfigured } from './supabaseClient';
import { Home, BarChart3, Settings as SettingsIcon, Plus, Cloud, Mic } from 'lucide-react';

function greeting(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function App() {
  const { transactions, loading } = useApp();
  const [activeTab, setActiveTab] = useState('home');
  const [showForm, setShowForm] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [prefill, setPrefill] = useState(null);

  // Filter transactions for current month
  const now = new Date();
  const currentMonthTx = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
  }, [transactions]);

  const totals = calculateTotals(currentMonthTx);
  const todaySpend = currentMonthTx
    .filter((t) => t.type === 'expense' && new Date(t.date).toDateString() === now.toDateString())
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const period = `${getMonthName(now.getMonth())} ${now.getFullYear()}`;

  const handleEdit = (tx) => {
    setEditTx(tx);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditTx(null);
    setPrefill(null);
  };

  // Voice entry → full form, keeping what was parsed
  const handleVoiceDetails = (values) => {
    setShowVoice(false);
    setEditTx(null);
    setPrefill(values);
    setShowForm(true);
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
      <div className="max-w-lg mx-auto px-4 pt-5 pb-44 safe-top">
        {/* Header */}
        <header className="flex items-center justify-between mb-5 slide-up">
          {activeTab === 'home' ? (
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 gradient-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25">
                <span className="text-lg font-bold text-white">₹</span>
              </div>
              <div>
                <p className="text-xs font-medium text-text-muted dark:text-text-muted-dark">{greeting(now.getHours())}</p>
                <h1 className="text-xl font-bold text-text dark:text-text-dark tracking-tight leading-tight">SpendWise</h1>
              </div>
            </div>
          ) : (
            <h1 className="text-2xl font-bold text-text dark:text-text-dark tracking-tight">
              {activeTab === 'reports' ? 'Reports' : 'Settings'}
            </h1>
          )}

          {activeTab === 'home' && (
            <div className="flex flex-col items-end gap-1">
              <p className="text-xs font-semibold text-text dark:text-text-dark">
                {now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
              {isSupabaseConfigured && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-income/10 text-income border border-income/20">
                  <Cloud className="w-3 h-3" />
                  Synced
                </span>
              )}
            </div>
          )}
        </header>

        {/* Tab content */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            <SummaryCard totals={totals} period={period} todaySpend={todaySpend} />
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-base font-bold text-text dark:text-text-dark">Recent transactions</h2>
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

      {/* Floating actions: speak (primary) + manual add */}
      <div
        className="fixed inset-x-0 z-40 pointer-events-none"
        style={{ bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 12px) + 80px)' }}
      >
        <div className="max-w-lg mx-auto px-5 flex items-center justify-end gap-3">
          <button
            onClick={() => {
              setEditTx(null);
              setPrefill(null);
              setShowForm(true);
            }}
            className="pointer-events-auto w-12 h-12 rounded-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark flex items-center justify-center shadow-lg press-effect hover:border-primary/40 transition-colors"
            aria-label="Add entry manually"
          >
            <Plus className="w-5 h-5 text-primary" strokeWidth={2.5} />
          </button>
          <button
            onClick={() => setShowVoice(true)}
            className="pointer-events-auto h-14 pl-5 pr-6 rounded-full gradient-primary flex items-center gap-2 shadow-xl shadow-primary/30 press-effect hover:shadow-2xl hover:shadow-primary/40 transition-shadow"
            aria-label="Add entry by voice"
          >
            <Mic className="w-5 h-5 text-white" strokeWidth={2.5} />
            <span className="text-sm font-bold text-white">Speak</span>
          </button>
        </div>
      </div>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-30 px-4" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}>
        <div className="max-w-lg mx-auto bg-surface/90 dark:bg-surface-dark/90 backdrop-blur-xl border border-border/70 dark:border-border-dark/70 rounded-2xl shadow-lg shadow-black/5">
          <div className="flex items-center justify-around p-1.5">
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
      </nav>

      {/* Entry form modal */}
      {showForm && (
        <EntryForm editTransaction={editTx} prefill={prefill} onClose={handleCloseForm} />
      )}

      {/* Voice entry modal */}
      {showVoice && (
        <VoiceEntry onClose={() => setShowVoice(false)} onEditDetails={handleVoiceDetails} />
      )}
    </div>
  );
}

function NavButton({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all duration-200 press-effect ${
        active
          ? 'text-primary bg-primary/10'
          : 'text-text-muted dark:text-text-muted-dark hover:text-text dark:hover:text-text-dark'
      }`}
    >
      {icon}
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
}
