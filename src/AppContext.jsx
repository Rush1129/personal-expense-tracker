import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getAllTransactions,
  getCachedTransactions,
  addTransaction as dbAdd,
  updateTransaction as dbUpdate,
  deleteTransaction as dbDelete,
  restoreTransaction as dbRestore,
  hasPendingChanges,
} from './db';
import { isSupabaseConfigured } from './supabaseClient';

const AppContext = createContext(null);

export function AppProvider({ children }) {
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

  // Changes saved without a connection upload when it comes back or the app is reopened
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const retry = async () => {
      if (document.visibilityState === 'hidden' || !(await hasPendingChanges())) return;
      try {
        setTransactions(await getAllTransactions());
      } catch (err) {
        console.warn('Could not upload offline changes:', err);
      }
    };
    window.addEventListener('online', retry);
    document.addEventListener('visibilitychange', retry);
    return () => {
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
