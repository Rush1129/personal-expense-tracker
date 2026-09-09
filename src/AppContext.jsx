import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getAllTransactions,
  addTransaction as dbAdd,
  updateTransaction as dbUpdate,
  deleteTransaction as dbDelete,
  restoreTransaction as dbRestore,
} from './db';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('spendwise-dark-mode');
    if (stored !== null) return JSON.parse(stored);
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Load transactions from IndexedDB on mount
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

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

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
