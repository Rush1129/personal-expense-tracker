import { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { useApp } from './AppContext';
import SummaryCard from './components/SummaryCard';
import CategorySplit from './components/CategorySplit';
import EntryList from './components/EntryList';
import Logo from './components/Logo';
import { calculateTotals, getMonthName } from './utils';
import { isSupabaseConfigured } from './supabaseClient';
import QuickAdd from './components/QuickAdd';
import { House, ChartColumn, SlidersHorizontal, SquarePlus, CloudCheck, CloudOff, Mic, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

// Not needed for the first screen, so they load separately (charts, PDF and Excel
// export are the bulk of the code). prefetchScreens fetches them once the app is idle.
const loadEntryForm = () => import('./components/EntryForm');
const loadVoiceEntry = () => import('./components/VoiceEntry');
const loadReports = () => import('./components/Reports');
const loadSettings = () => import('./components/Settings');
const EntryForm = lazy(loadEntryForm);
const VoiceEntry = lazy(loadVoiceEntry);
const Reports = lazy(loadReports);
const Settings = lazy(loadSettings);

function prefetchScreens() {
  const run = () => [loadVoiceEntry, loadEntryForm, loadReports, loadSettings].forEach((load) => load().catch(() => {}));
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 1500);
}

// Text shared into the app from Android's Share menu (share_target in vite.config.js).
// Read once at startup; the query string is removed so a reload doesn't add it again.
function takeSharedText() {
  const params = new URLSearchParams(window.location.search);
  if (!['title', 'text', 'url'].some((key) => params.has(key))) return '';
  window.history.replaceState(window.history.state, '', window.location.pathname);
  const text = [params.get('text'), params.get('url')].filter(Boolean).join(' ').trim();
  return text || (params.get('title') || '').trim();
}
const sharedOnLaunch = takeSharedText();

function greeting(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function App() {
  const { transactions, loading, syncNow } = useApp();
  const [activeTab, setActiveTab] = useState('home');
  const [showForm, setShowForm] = useState(false);
  const [showVoice, setShowVoice] = useState(!!sharedOnLaunch);
  const [sharedText, setSharedText] = useState(sharedOnLaunch);
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
  const unsynced = transactions.filter((t) => t.pending).length;
  const [syncing, setSyncing] = useState(false);

  // Tapping "not synced" tries the upload now and says why if it still can't
  const retrySync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const problem = await syncNow();
      if (problem) toast.error(problem, { id: 'sync', duration: 5000 });
      else toast.success('All entries synced', { id: 'sync' });
    } finally {
      setSyncing(false);
    }
  };

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

  // Shared text is used once, by the voice sheet it opened
  const closeVoice = () => {
    setShowVoice(false);
    setSharedText('');
  };

  // Voice entry → full form, keeping what was parsed
  const handleVoiceDetails = (values) => {
    closeVoice();
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
      closeVoice();
      handleCloseForm();
    };
  });

  // Dropping the entry waits a tick: if React re-runs this effect straight away
  // (StrictMode does on mount, e.g. a sheet opened by a share), the entry is reused
  // instead of a late Back closing the new sheet
  const dropEntryRef = useRef(null);
  useEffect(() => {
    if (!sheetOpen) return;
    const id = `sheet-${Date.now()}`;
    if (dropEntryRef.current) {
      clearTimeout(dropEntryRef.current);
      dropEntryRef.current = null;
      window.history.replaceState({ spendwiseSheet: id }, '');
    } else {
      window.history.pushState({ spendwiseSheet: id }, '');
    }
    const onPop = () => closeSheetsRef.current();
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      // Closed from inside the app: drop the entry we added
      if (window.history.state?.spendwiseSheet === id) {
        dropEntryRef.current = setTimeout(() => {
          dropEntryRef.current = null;
          window.history.back();
        }, 0);
      }
    };
  }, [sheetOpen]);

  useEffect(() => {
    if (!loading) prefetchScreens();
  }, [loading]);

  // Same as the splash in index.html, so the hand-over doesn't flicker
  if (loading) {
    return (
      <div role="status" aria-label="Loading SpendWise" className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-bg text-[15px] leading-none font-semibold text-muted">
        <Logo size={64} />
        SpendWise
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
            unsynced > 0 ? (
              <button
                type="button"
                onClick={retrySync}
                disabled={syncing}
                className="card shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-semibold text-muted"
                title="Saved on this device. Tap to upload now."
              >
                {syncing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={2.2} />
                ) : (
                  <CloudOff className="w-3.5 h-3.5" strokeWidth={2.2} />
                )}
                {syncing ? 'Syncing…' : `${unsynced} not synced`}
              </button>
            ) : (
              <span className="card shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-semibold text-income">
                <CloudCheck className="w-3.5 h-3.5" strokeWidth={2.2} />
                Synced
              </span>
            )
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
            {isThisMonth && <QuickAdd />}
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

        <Suspense fallback={null}>
          {activeTab === 'reports' && <Reports />}
          {activeTab === 'settings' && <Settings />}
        </Suspense>
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
      <Suspense fallback={null}>
        {showForm && (
          <EntryForm editTransaction={editTx} prefill={prefill} onClose={handleCloseForm} />
        )}
      </Suspense>

      {/* Voice entry modal */}
      <Suspense fallback={null}>
        {showVoice && (
          <VoiceEntry onClose={closeVoice} onEditDetails={handleVoiceDetails} initialText={sharedText} />
        )}
      </Suspense>
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
