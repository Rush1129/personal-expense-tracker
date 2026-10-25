import { useState, useRef } from 'react';
import { useApp } from '../AppContext';
import { exportAllData, importAllData, syncLocalToSupabase } from '../db';
import { isSupabaseConfigured, checkSupabaseHealth } from '../supabaseClient';
import { browserSpeechSupported } from '../voice/useVoiceInput';
import {
  Moon, Sun, Download, Upload, Shield, ChevronRight, Database, Smartphone, Cloud, RefreshCw, CheckCircle2,
  Mic, Sparkles, CloudCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Segmented, Switch } from './Controls';

export default function Settings() {
  const { darkMode, toggleDarkMode, refreshTransactions, transactions, voiceSettings, updateVoiceSettings } = useApp();
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
    <div className="flex flex-col gap-5">
      {/* App info */}
      <div className="bg-hero text-hero-ink rounded-3xl p-4 flex items-center gap-3.5">
        <span className="w-14 h-14 shrink-0 rounded-[18px] bg-accent text-on-accent dark:bg-on-accent dark:text-accent flex items-center justify-center text-[26px] font-bold">
          ₹
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-[17px] font-semibold">SpendWise</h2>
          <p className="text-[13px] text-hero-muted">Personal expense tracker · Offline-first</p>
        </div>
        <span className="shrink-0 text-[11px] font-semibold rounded-full px-2 py-1 border border-current/25">v1.0.0</span>
      </div>

      {/* Appearance */}
      <Group title="Appearance">
        <button
          onClick={toggleDarkMode}
          role="switch"
          aria-checked={darkMode}
          className={rowButton}
        >
          <RowIcon icon={darkMode ? Moon : Sun} />
          <RowText title="Dark mode" sub={darkMode ? 'On' : 'Off'} />
          <Switch on={darkMode} />
        </button>
      </Group>

      {/* Voice input */}
      <Group title="Voice input">
        <div className="p-3.5 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <RowIcon icon={Mic} />
            <RowText
              title="Speech recognition"
              sub={
                voiceSettings.engine === 'on-device'
                  ? 'Private: audio stays on this device. One-time ~41 MB model download.'
                  : browserSpeechSupported
                    ? "Fast, using your browser's speech service. Falls back to on-device if it fails."
                    : 'Your browser has no built-in speech service, so the on-device model is used.'
              }
            />
          </div>
          <Segmented
            tone="ink"
            size="sm"
            value={voiceSettings.engine}
            onChange={(engine) => updateVoiceSettings({ engine })}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: 'on-device', label: 'On-device only' },
            ]}
          />
        </div>
        <Divider />
        <button
          onClick={() => updateVoiceSettings({ smartCategories: !voiceSettings.smartCategories })}
          role="switch"
          aria-checked={voiceSettings.smartCategories}
          className={rowButton}
        >
          <RowIcon icon={Sparkles} />
          <RowText
            title="AI category detection"
            sub="On-device model picks a category when keywords don't match (~23 MB, one-time)"
          />
          <Switch on={voiceSettings.smartCategories} />
        </button>
      </Group>

      {/* Cloud & Supabase */}
      <Group title="Cloud database">
        <div className={row}>
          <RowIcon icon={isSupabaseConfigured ? CloudCheck : Cloud} tone={isSupabaseConfigured ? 'income' : undefined} />
          <RowText
            title={isSupabaseConfigured ? 'Supabase cloud sync' : 'Local storage only'}
            sub={
              isSupabaseConfigured
                ? 'Your transactions are synced in real-time with your Supabase database'
                : 'Configure VITE_SUPABASE_URL in .env to enable cloud sync'
            }
          />
          {isSupabaseConfigured ? (
            <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-income">
              <span className="w-2 h-2 rounded-full bg-income animate-pulse" />
              Live
            </span>
          ) : (
            <span className="shrink-0 text-xs font-semibold text-muted">Offline only</span>
          )}
        </div>

        {isSupabaseConfigured && (
          <>
            <Divider />
            <button onClick={handleTestSupabase} disabled={testingSupabase} className={rowButton}>
              <RowIcon icon={CheckCircle2} spin={testingSupabase} />
              <RowText
                title="Test connection"
                sub={testingSupabase ? 'Checking Supabase connection...' : 'Verify Supabase credentials and database table'}
              />
              <Chevron />
            </button>
            <Divider />
            <button onClick={handleSyncToSupabase} disabled={syncingCloud} className={rowButton}>
              <RowIcon icon={RefreshCw} spin={syncingCloud} />
              <RowText
                title="Sync local data to cloud"
                sub={syncingCloud ? 'Uploading local transactions...' : 'Push local offline entries to Supabase table'}
              />
              <Chevron />
            </button>
          </>
        )}
      </Group>

      {/* Data management */}
      <Group title="Data">
        <div className={row}>
          <RowIcon icon={Database} />
          <RowText title="Total entries" sub={isSupabaseConfigured ? 'Cloud synced' : 'Stored locally'} />
          <span className="shrink-0 text-[17px] font-semibold tabular-nums">{transactions.length}</span>
        </div>
        <Divider />
        <button onClick={handleExportData} className={rowButton}>
          <RowIcon icon={Download} />
          <RowText title="Back up data" sub="Export all data as a JSON file" />
          <Chevron />
        </button>
        <Divider />
        <button onClick={() => fileInputRef.current?.click()} disabled={importing} className={rowButton}>
          <RowIcon icon={Upload} />
          <RowText title={importing ? 'Importing...' : 'Restore backup'} sub="Import from a JSON backup file" />
          <Chevron />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportData}
          className="hidden"
        />
      </Group>

      {/* About */}
      <Group title="About">
        <div className={row}>
          <RowIcon icon={Smartphone} />
          <RowText title="Install as app" sub='Use "Add to Home Screen" in your browser menu for the best experience' />
        </div>
        <Divider />
        <div className={row}>
          <RowIcon icon={Shield} />
          <RowText
            title="Privacy"
            sub={`${
              isSupabaseConfigured
                ? 'Entries are stored on this device and in your own Supabase project.'
                : 'All data is stored locally on your device. Nothing is sent to any server.'
            } Voice in on-device mode never leaves your phone.`}
          />
        </div>
      </Group>
    </div>
  );
}

const row = 'flex items-center gap-3 p-3.5';
const rowButton = `w-full text-left ${row} hover:bg-sunken/60 transition-colors disabled:opacity-60 disabled:cursor-wait`;

function Group({ title, children }) {
  return (
    <section>
      <h2 className="mx-1 mb-2.5 text-xs font-semibold uppercase tracking-[0.06em] text-muted">{title}</h2>
      <div className="card rounded-[22px] overflow-hidden">{children}</div>
    </section>
  );
}

function RowIcon({ icon: Icon, tone, spin }) {
  return (
    <span
      className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${
        tone === 'income' ? 'bg-income-soft text-income' : 'bg-sunken'
      }`}
    >
      <Icon className={`w-5 h-5 ${spin ? 'animate-spin' : ''}`} />
    </span>
  );
}

function RowText({ title, sub }) {
  return (
    <span className="flex-1 min-w-0 flex flex-col gap-0.5">
      <span className="text-[15px] font-medium">{title}</span>
      {sub && <span className="text-[13px] leading-snug text-muted">{sub}</span>}
    </span>
  );
}

function Divider() {
  return <div className="h-px bg-divider ml-[66px]" />;
}

function Chevron() {
  return <ChevronRight className="w-[18px] h-[18px] shrink-0 text-muted" strokeWidth={2.2} />;
}
