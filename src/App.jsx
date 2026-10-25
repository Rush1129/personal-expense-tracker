import { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from './AppContext';
import SummaryCard from './components/SummaryCard';
import CategorySplit from './components/CategorySplit';
import EntryList from './components/EntryList';
import EntryForm from './components/EntryForm';
import VoiceEntry from './components/VoiceEntry';
import Reports from './components/Reports';
import Settings from './components/Settings';
import { calculateTotals, getMonthName } from './utils';
import { isSupabaseConfigured } from './supabaseClient';
import { House, ChartColumn, SlidersHorizontal, SquarePlus, CloudCheck, Mic } from 'lucide-react';

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

  // Month shown on Home (defaults to the current one)
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const isThisMonth = view.year === now.getFullYear() && view.month === now.getMonth();

  const shiftMonth = (delta) =>
    setView(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  const goToThisMonth = () => setView({ year: now.getFullYear(), month: now.getMonth() });

  const monthTx = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === view.year && d.getMonth() === view.month;
    });
  }, [transactions, view.year, view.month]);

  const totals = calculateTotals(monthTx);
  const todaySpend = isThisMonth
    ? monthTx
        .filter((t) => t.type === 'expense' && new Date(t.date).toDateString() === now.toDateString())
        .reduce((sum, t) => sum + Number(t.amount), 0)
    : 0;
  const period = `${getMonthName(view.month)} ${view.year}`;

  const handleEdit = (tx) => {
    setEditTx(tx);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditTx(null);
    setPrefill(null);
  };

  const openNewEntry = () => {
    setEditTx(null);
    setPrefill(null);
    setShowForm(true);
  };

  // Voice entry → full form, keeping what was parsed
  const handleVoiceDetails = (values) => {
    setShowVoice(false);
    setEditTx(null);
    setPrefill(values);
    setShowForm(true);
  };

  // While a sheet is open it owns one history entry, so the phone/browser Back
  // button closes the sheet instead of leaving the app. Moving from voice to the
  // full form keeps the same entry.
  const sheetOpen = showForm || showVoice;
  const closeSheetsRef = useRef(null);
  useEffect(() => {
    closeSheetsRef.current = () => {
      setShowVoice(false);
      handleCloseForm();
    };
  });

  useEffect(() => {
    if (!sheetOpen) return;
    const id = `sheet-${Date.now()}`;
    window.history.pushState({ spendwiseSheet: id }, '');
    const onPop = () => closeSheetsRef.current();
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      // Closed from inside the app: drop the entry we added
      if (window.history.state?.spendwiseSheet === id) window.history.back();
    };
  }, [sheetOpen]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-bg">
        <div className="text-center fade-in">
          <div className="w-16 h-16 bg-accent rounded-[20px] flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-on-accent">₹</span>
          </div>
          <p className="text-sm font-semibold text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg text-ink transition-colors duration-300">
      {/* Main content */}
      <div className="max-w-lg mx-auto px-5 pt-5 pb-36 safe-top">
        {/* Header */}
        <header className="flex items-end justify-between gap-3 min-h-12 mb-4 slide-up">
          {activeTab === 'home' ? (
            <div className="flex flex-col gap-0.5 min-w-0">
              <p className="text-[13px] font-medium text-muted truncate">
                {greeting(now.getHours())} · {now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
              <h1 className="text-[22px] font-bold tracking-tight leading-7">SpendWise</h1>
            </div>
          ) : (
            <h1 className="text-[28px] font-bold tracking-[-0.03em]">
              {activeTab === 'reports' ? 'Reports' : 'Settings'}
            </h1>
          )}

          {activeTab === 'home' && isSupabaseConfigured && (
            <span className="card shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-semibold text-income">
              <CloudCheck className="w-3.5 h-3.5" strokeWidth={2.2} />
              Synced
            </span>
          )}
        </header>

        {/* Tab content */}
        {activeTab === 'home' && (
          <div className="flex flex-col gap-4">
            <SummaryCard
              totals={totals}
              period={period}
              todaySpend={todaySpend}
              isThisMonth={isThisMonth}
              entryCount={monthTx.length}
              onPrev={() => shiftMonth(-1)}
              onNext={() => shiftMonth(1)}
              onThisMonth={goToThisMonth}
            />
            <CategorySplit transactions={monthTx} onOpenReports={() => setActiveTab('reports')} />
            <section aria-label="Transactions" className="mt-1.5">
              <div className="flex items-baseline justify-between mb-3 px-1">
                <h2 className="text-[17px] font-semibold tracking-tight">Transactions</h2>
                <span className="text-xs font-medium text-muted">
                  {monthTx.length} in {getMonthName(view.month)}
                </span>
              </div>
              <EntryList
                transactions={monthTx}
                onEdit={handleEdit}
                emptyTitle={isThisMonth ? 'No entries this month' : `No entries in ${period}`}
                showHint={isThisMonth}
              />
            </section>
          </div>
        )}

        {activeTab === 'reports' && <Reports />}
        {activeTab === 'settings' && <Settings />}
      </div>

      {/* Bottom dock: tabs, voice (primary) and manual add */}
      <nav
        aria-label="Main"
        className="fixed bottom-0 inset-x-0 z-40 px-4"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}
      >
        <div className="max-w-lg mx-auto h-[72px] px-2 rounded-[36px] bg-dock dark:border dark:border-[#2e3029] flex items-center justify-between shadow-[0_16px_36px_-14px_rgb(14_15_12/0.55)] dark:shadow-[0_16px_36px_-14px_rgb(0_0_0/0.8)]">
          <NavButton
            icon={House}
            label="Home"
            active={activeTab === 'home'}
            onClick={() => setActiveTab('home')}
          />
          <NavButton
            icon={ChartColumn}
            label="Reports"
            active={activeTab === 'reports'}
            onClick={() => setActiveTab('reports')}
          />
          <button
            onClick={() => setShowVoice(true)}
            aria-label="Add entry by voice"
            className="w-[60px] h-[60px] shrink-0 rounded-full bg-accent text-on-accent flex items-center justify-center press-effect hover:brightness-105 transition-[filter]"
          >
            <Mic className="w-[26px] h-[26px]" strokeWidth={2.2} />
          </button>
          <NavButton icon={SquarePlus} label="Add" onClick={openNewEntry} />
          <NavButton
            icon={SlidersHorizontal}
            label="Settings"
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
          />
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

function NavButton({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex-1 max-w-[62px] min-w-0 h-14 flex flex-col items-center justify-center gap-1 rounded-[20px] text-[11px] transition-colors duration-200 press-effect ${
        active
          ? 'bg-dock-active text-[#f5f5f2] font-semibold'
          : 'text-dock-muted font-medium hover:text-[#f5f5f2]'
      }`}
    >
      <Icon className="w-[22px] h-[22px]" strokeWidth={2} />
      {label}
    </button>
  );
}
