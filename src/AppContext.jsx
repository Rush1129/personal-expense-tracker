import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getAllTransactions,
  getCachedTransactions,
  addTransaction as dbAdd,
  updateTransaction as dbUpdate,
  deleteTransaction as dbDelete,
  restoreTransaction as dbRestore,
  hasPendingChanges,
  countPendingChanges,
  getSyncError,
} from './db';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const AppContext = createContext(null);

// Why entries are still waiting to upload, in plain words
function syncProblem(message) {
  if (!navigator.onLine) return "You're offline. Entries will upload when you're back online.";
  // The sign-in needs renewing and Supabase couldn't do it quickly
  if (/not signed in/i.test(message)) {
    return 'Reconnecting your account. Entries are saved on this device and will upload once it’s done.';
  }
  // A failed request, not an answer from the database: the project is paused,
  // deleted or blocked on this network
  if (!message || /fetch|load failed|network/i.test(message)) {
    return "Can't reach the cloud database. Entries are saved on this device and will upload once it's reachable.";
  }
  return `Cloud database error: ${message}`;
}

// `user` and `onSignOut` come from AuthGate; both are null in offline-only mode
export function AppProvider({ children, user = null, onSignOut = null }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('spendwise-dark-mode');
    if (stored !== null) return JSON.parse(stored);
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  // engine: 'auto' (browser speech, on-device fallback) | 'on-device' (Whisper only)
  // smartCategories: use the on-device model when keyword rules can't pick a category
  const [voiceSettings, setVoiceSettings] = useState(() => {
    const defaults = { engine: 'auto', smartCategories: true };
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem('spendwise-voice') || '{}') };
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    localStorage.setItem('spendwise-voice', JSON.stringify(voiceSettings));
  }, [voiceSettings]);

  const updateVoiceSettings = useCallback((patch) => {
    setVoiceSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  // Full reload, used after a backup restore or a manual sync
  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllTransactions();
      setTransactions(data);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Uploads changes saved on this device now. Resolves to why some are still
  // waiting, or null once everything is in the cloud.
  const syncNow = useCallback(async () => {
    setTransactions(await getAllTransactions());
    if (!(await hasPendingChanges())) return null;
    return syncProblem(getSyncError());
  }, []);

  // Startup: show what's saved on this device straight away, then swap in the
  // cloud copy when it arrives. Only a device with nothing saved waits for the cloud.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cached = await getCachedTransactions();
        if (cancelled) return;
        if (cached.length > 0 || !isSupabaseConfigured) {
          setTransactions(cached);
          setLoading(false);
          if (!isSupabaseConfigured) return;
        }
        const fresh = await getAllTransactions();
        if (!cancelled) setTransactions(fresh);
      } catch (err) {
        console.error('Failed to load transactions:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Changes saved without a connection (or a download that failed) are retried
  // when the connection comes back, the app is reopened, or the sign-in renews
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const retry = async () => {
      if (document.visibilityState === 'hidden') return;
      if (!getSyncError() && !(await hasPendingChanges())) return;
      try {
        setTransactions(await getAllTransactions());
      } catch (err) {
        console.warn('Could not upload offline changes:', err);
      }
    };
    // Supabase calls aren't allowed inside its auth callback, so retry just after
    const { data: auth } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') setTimeout(retry, 0);
    });
    window.addEventListener('online', retry);
    document.addEventListener('visibilitychange', retry);
    return () => {
      auth.subscription.unsubscribe();
      window.removeEventListener('online', retry);
      document.removeEventListener('visibilitychange', retry);
    };
  }, []);

  // Dark mode effect
  useEffect(() => {
    localStorage.setItem('spendwise-dark-mode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const addTransaction = useCallback(async (data) => {
    const newTx = await dbAdd(data);
    setTransactions((prev) => [newTx, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date)));
    return newTx;
  }, []);

  const updateTransaction = useCallback(async (id, data) => {
    const updated = await dbUpdate(id, data);
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? updated : t)).sort((a, b) => new Date(b.date) - new Date(a.date))
    );
    return updated;
  }, []);

  const deleteTransactionById = useCallback(async (id) => {
    const deleted = await dbDelete(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    return deleted;
  }, []);

  const restoreTransaction = useCallback(async (tx) => {
    await dbRestore(tx);
    setTransactions((prev) => [...prev, tx].sort((a, b) => new Date(b.date) - new Date(a.date)));
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  // Uploads what it can, then signs out and removes this account's entries from
  // the device. If some still haven't uploaded it stops and resolves to how many
  // (they'd be lost), unless `force` is set. Resolves to 0 once signed out.
  const signOut = useCallback(
    async ({ force = false } = {}) => {
      if (!onSignOut) return 0;
      if (!force) {
        await syncNow().catch(() => {});
        const left = await countPendingChanges();
        if (left > 0) return left;
      }
      await onSignOut();
      return 0;
    },
    [onSignOut, syncNow]
  );

  const value = {
    transactions,
    loading,
    darkMode,
    addTransaction,
    updateTransaction,
    deleteTransaction: deleteTransactionById,
    restoreTransaction,
    toggleDarkMode,
    refreshTransactions: loadTransactions,
    syncNow,
    user,
    signOut,
    voiceSettings,
    updateVoiceSettings,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
