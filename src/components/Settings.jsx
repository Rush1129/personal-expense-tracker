import { useState, useRef } from 'react';
import { useApp } from '../AppContext';
import { exportAllData, importAllData, syncLocalToSupabase } from '../db';
import { isSupabaseConfigured, checkSupabaseHealth } from '../supabaseClient';
import {
  Moon, Sun, Download, Upload, Shield, ChevronRight, Database, Smartphone, Cloud, RefreshCw, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const { darkMode, toggleDarkMode, refreshTransactions, transactions } = useApp();
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);

  const handleTestSupabase = async () => {
    setTestingSupabase(true);
    try {
      const res = await checkSupabaseHealth();
      if (res.ok) {
        toast.success('Connected to Supabase successfully!');
      } else {
        toast.error(`Supabase Error: ${res.error}`);
      }
    } catch (err) {
      toast.error(`Connection failed: ${err.message}`);
    } finally {
      setTestingSupabase(false);
    }
  };

  const handleSyncToSupabase = async () => {
    setSyncingCloud(true);
    try {
      const count = await syncLocalToSupabase();
      await refreshTransactions();
      toast.success(`Successfully synced ${count} transactions to Supabase!`);
    } catch (err) {
      toast.error(`Sync failed: ${err.message}`);
    } finally {
      setSyncingCloud(false);
    }
  };


  const handleExportData = async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SpendWise_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup exported successfully!');
    } catch (err) {
      toast.error('Failed to export data');
      console.error(err);
    }
  };

  const handleImportData = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const count = await importAllData(text);
      await refreshTransactions();
      toast.success(`Restored ${count} transactions!`);
    } catch (err) {
      toast.error('Failed to import: ' + err.message);
      console.error(err);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-5 pb-28">
      {/* App info */}
      <div className="glass-card rounded-2xl p-5 text-center">
        <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary/20">
          <span className="text-2xl font-bold text-white">₹</span>
        </div>
        <h2 className="text-lg font-bold text-text dark:text-text-dark">SpendWise</h2>
        <p className="text-xs text-text-muted dark:text-text-muted-dark mt-1">Personal Expense Tracker</p>
        <p className="text-[10px] text-text-muted dark:text-text-muted-dark mt-0.5">v1.0.0 · Offline-First PWA</p>
      </div>

      {/* Appearance */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border dark:border-border-dark">
          <p className="text-xs font-bold text-text-muted dark:text-text-muted-dark uppercase tracking-wider">Appearance</p>
        </div>
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center gap-4 px-5 py-4 press-effect hover:bg-bg/50 dark:hover:bg-bg-dark/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            {darkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-text dark:text-text-dark">Dark Mode</p>
            <p className="text-xs text-text-muted dark:text-text-muted-dark">{darkMode ? 'On' : 'Off'}</p>
          </div>
          <div className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ${darkMode ? 'bg-primary' : 'bg-border dark:bg-border-dark'}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
        </button>
      </div>

      {/* Cloud & Supabase */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border dark:border-border-dark flex items-center justify-between">
          <p className="text-xs font-bold text-text-muted dark:text-text-muted-dark uppercase tracking-wider">Cloud Database</p>
          {isSupabaseConfigured ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-income/10 text-income border border-income/20">
              <span className="w-1.5 h-1.5 rounded-full bg-income animate-pulse" />
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-text-muted/10 text-text-muted dark:text-text-muted-dark border border-border dark:border-border-dark">
              Offline Only
            </span>
          )}
        </div>

        <div className="px-5 py-4 border-b border-border/50 dark:border-border-dark/50 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Cloud className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-text dark:text-text-dark">
              {isSupabaseConfigured ? 'Supabase Cloud Sync' : 'Local Storage Only'}
            </p>
            <p className="text-xs text-text-muted dark:text-text-muted-dark">
              {isSupabaseConfigured
                ? 'Your transactions are synced in real-time with your Supabase database'
                : 'Configure VITE_SUPABASE_URL in .env to enable cloud sync'}
            </p>
          </div>
        </div>

        {isSupabaseConfigured && (
          <>
            <button
              onClick={handleTestSupabase}
              disabled={testingSupabase}
              className="w-full flex items-center gap-4 px-5 py-3.5 press-effect hover:bg-bg/50 dark:hover:bg-bg-dark/50 transition-colors border-b border-border/50 dark:border-border-dark/50"
            >
              <div className="w-10 h-10 rounded-xl bg-income/10 flex items-center justify-center">
                <CheckCircle2 className={`w-5 h-5 text-income ${testingSupabase ? 'animate-spin' : ''}`} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-text dark:text-text-dark">Test Connection</p>
                <p className="text-xs text-text-muted dark:text-text-muted-dark">
                  {testingSupabase ? 'Checking Supabase connection...' : 'Verify Supabase credentials and database table'}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted dark:text-text-muted-dark" />
            </button>

            <button
              onClick={handleSyncToSupabase}
              disabled={syncingCloud}
              className="w-full flex items-center gap-4 px-5 py-3.5 press-effect hover:bg-bg/50 dark:hover:bg-bg-dark/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <RefreshCw className={`w-5 h-5 text-primary ${syncingCloud ? 'animate-spin' : ''}`} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-text dark:text-text-dark">Sync Local Data to Cloud</p>
                <p className="text-xs text-text-muted dark:text-text-muted-dark">
                  {syncingCloud ? 'Uploading local transactions...' : 'Push local offline entries to Supabase table'}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted dark:text-text-muted-dark" />
            </button>
          </>
        )}
      </div>

      {/* Data management */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border dark:border-border-dark">
          <p className="text-xs font-bold text-text-muted dark:text-text-muted-dark uppercase tracking-wider">Data</p>
        </div>

        <div className="px-5 py-3 border-b border-border/50 dark:border-border-dark/50 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-income/10 flex items-center justify-center">
            <Database className="w-5 h-5 text-income" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-text dark:text-text-dark">Total Entries</p>
            <p className="text-xs text-text-muted dark:text-text-muted-dark">
              {transactions.length} transactions {isSupabaseConfigured ? '(Cloud synced)' : 'stored locally'}
            </p>
          </div>
        </div>


        <button
          onClick={handleExportData}
          className="w-full flex items-center gap-4 px-5 py-4 press-effect hover:bg-bg/50 dark:hover:bg-bg-dark/50 transition-colors border-b border-border/50 dark:border-border-dark/50"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Download className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-text dark:text-text-dark">Backup Data</p>
            <p className="text-xs text-text-muted dark:text-text-muted-dark">Export all data as JSON file</p>
          </div>
          <ChevronRight className="w-4 h-4 text-text-muted dark:text-text-muted-dark" />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="w-full flex items-center gap-4 px-5 py-4 press-effect hover:bg-bg/50 dark:hover:bg-bg-dark/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-expense/10 flex items-center justify-center">
            <Upload className="w-5 h-5 text-expense" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-text dark:text-text-dark">
              {importing ? 'Importing...' : 'Restore Data'}
            </p>
            <p className="text-xs text-text-muted dark:text-text-muted-dark">Import from a JSON backup file</p>
          </div>
          <ChevronRight className="w-4 h-4 text-text-muted dark:text-text-muted-dark" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportData}
          className="hidden"
        />
      </div>

      {/* About */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border dark:border-border-dark">
          <p className="text-xs font-bold text-text-muted dark:text-text-muted-dark uppercase tracking-wider">About</p>
        </div>
        <div className="px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-text dark:text-text-dark">Install as App</p>
            <p className="text-xs text-text-muted dark:text-text-muted-dark">
              Use "Add to Home Screen" in your browser menu for the best experience
            </p>
          </div>
        </div>
        <div className="px-5 py-4 flex items-center gap-4 border-t border-border/50 dark:border-border-dark/50">
          <div className="w-10 h-10 rounded-xl bg-income/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-income" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-text dark:text-text-dark">Privacy</p>
            <p className="text-xs text-text-muted dark:text-text-muted-dark">
              All data is stored locally on your device. Nothing is sent to any server.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
