import { useState, useEffect, useRef } from 'react';
import { useApp } from '../AppContext';
import { formatDateGroup, formatTime, formatINR, getCategoriesByType, getCategoryInfo } from '../utils';
import { parseTransaction } from '../voice/parseTransaction';
import { matchCategoryByKeywords } from '../voice/categoryRules';
import { classifyCategory, onModelProgress, warmUpModel } from '../voice/aiClient';
import { useVoiceInput } from '../voice/useVoiceInput';
import {
  X, Mic, Square, Loader2, Keyboard, SendHorizontal, Check, SlidersHorizontal, CalendarClock,
  Sparkles, ArrowDownCircle, ArrowUpCircle, ShieldCheck, RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';

const EXAMPLES = [
  'Spent 250 on lunch yesterday at 2 pm',
  'Uber to office 180',
  'Received salary 50,000 on the 1st',
  'Paid 1,200 for electricity bill',
];

export default function VoiceEntry({ onClose, onEditDetails }) {
  const { addTransaction, voiceSettings } = useApp();
  const [result, setResult] = useState(null);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [downloads, setDownloads] = useState({});
  const [saving, setSaving] = useState(false);
  const requestRef = useRef(0);

  const voice = useVoiceInput({
    preferredEngine: voiceSettings.engine,
    onResult: (text) => handleText(text),
  });
  const listening = voice.status === 'listening';
  const transcribing = voice.status === 'transcribing';

  // Start listening as soon as the sheet opens; warm up the category model meanwhile
  useEffect(() => {
    voice.start();
    if (voiceSettings.smartCategories) warmUpModel('classify');
    const off = onModelProgress(({ task, loaded, total }) => {
      setDownloads((d) => ({ ...d, [task]: loaded >= total ? null : Math.round((loaded / total) * 100) }));
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleText(text) {
    const parsed = parseTransaction(text);
    const request = ++requestRef.current;
    setResult({ ...parsed, amount: parsed.amount ? String(parsed.amount) : '' });
    setTyping(false);

    if (parsed.categorySource === 'default' && parsed.description && voiceSettings.smartCategories) {
      setAiBusy(true);
      classifyCategory(parsed.description, parsed.type)
        .then(({ category }) => {
          if (request !== requestRef.current || category === 'other') return;
          setResult((prev) => (prev && prev.categorySource === 'default' ? { ...prev, category, categorySource: 'ai' } : prev));
        })
        .catch(() => {})
        .finally(() => request === requestRef.current && setAiBusy(false));
    } else {
      setAiBusy(false);
    }
  }

  const update = (patch) => setResult((prev) => ({ ...prev, ...patch }));

  const changeType = (type) => {
    if (type === result.type) return;
    let { category, categorySource } = result;
    if (categorySource !== 'manual') {
      const match = matchCategoryByKeywords(result.description || result.transcript, type);
      category = match?.category || 'other';
      categorySource = match ? 'keyword' : 'default';
    } else if (!getCategoriesByType(type).includes(category)) {
      category = 'other';
    }
    update({ type, category, categorySource });
  };

  const speakAgain = () => {
    requestRef.current++;
    setResult(null);
    setAiBusy(false);
    voice.start();
  };

  const submitTyped = (e) => {
    e.preventDefault();
    if (typed.trim()) handleText(typed.trim());
  };

  const close = () => {
    voice.cancel();
    onClose();
  };

  const amountValue = Number(result?.amount);
  const canSave = result && amountValue > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await addTransaction({
        type: result.type,
        amount: amountValue,
        description: result.description.trim(),
        category: result.category || 'other',
        date: result.date,
      });
      toast.success(`${result.type === 'income' ? 'Income' : 'Expense'} of ${formatINR(amountValue)} added`);
      onClose();
    } catch (err) {
      console.error('Failed to save voice entry:', err);
      toast.error('Could not save. Please try again.');
      setSaving(false);
    }
  };

  const openFullForm = () => {
    voice.cancel();
    onEditDetails({
      type: result.type,
      amount: result.amount,
      description: result.description,
      category: result.category,
      date: result.date,
      hasTime: result.hasTime,
    });
  };

  const sttDownload = downloads.transcribe;
  const aiDownload = downloads.classify;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-overlay fade-in" onClick={close} />

      <div className="relative bg-surface dark:bg-surface-dark w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[92dvh] overflow-y-auto slide-up safe-bottom shadow-2xl">
        <div className="flex justify-center py-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border dark:bg-border-dark" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-2 pt-1 sm:pt-5">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-text dark:text-text-dark">Voice entry</h2>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                voice.engine === 'on-device'
                  ? 'bg-income/10 text-income border-income/20'
                  : 'bg-primary/10 text-primary border-primary/20'
              }`}
              title={voice.engine === 'on-device' ? 'Audio never leaves your device' : "Uses your browser's speech service"}
            >
              {voice.engine === 'on-device' ? <ShieldCheck className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
              {voice.engine === 'on-device' ? 'On-device' : 'Browser'}
            </span>
          </div>
          <button
            onClick={close}
            aria-label="Close voice entry"
            className="w-9 h-9 rounded-full bg-bg dark:bg-bg-dark flex items-center justify-center press-effect hover:bg-border dark:hover:bg-border-dark transition-colors"
          >
            <X className="w-5 h-5 text-text-muted dark:text-text-muted-dark" />
          </button>
        </div>

        {!result ? (
          <div className="px-5 pb-6">
            {/* Mic orb */}
            <div className="flex flex-col items-center pt-6 pb-4">
              <button
                onClick={listening ? voice.stop : voice.start}
                disabled={transcribing}
                aria-label={listening ? 'Stop listening' : 'Start listening'}
                className="relative w-24 h-24 rounded-full flex items-center justify-center press-effect disabled:cursor-wait"
              >
                {listening && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-primary/30 mic-ripple" />
                    <span className="absolute inset-0 rounded-full bg-accent/25 mic-ripple mic-ripple-delay" />
                  </>
                )}
                <span
                  className="absolute -inset-2 rounded-full bg-primary/15 transition-transform duration-100"
                  style={{ transform: `scale(${1 + voice.level * 0.35})`, opacity: listening ? 1 : 0 }}
                />
                <span
                  className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-xl shadow-primary/30 ${
                    transcribing ? 'bg-text-muted/40 dark:bg-text-muted-dark/30' : 'gradient-primary'
                  }`}
                >
                  {transcribing ? (
                    <Loader2 className="w-9 h-9 text-white animate-spin" />
                  ) : listening ? (
                    <Square className="w-8 h-8 text-white fill-white" />
                  ) : (
                    <Mic className="w-10 h-10 text-white" />
                  )}
                </span>
              </button>

              <p className="mt-5 text-sm font-semibold text-text dark:text-text-dark" aria-live="polite">
                {transcribing
                  ? sttDownload != null
                    ? `Downloading speech model… ${sttDownload}%`
                    : 'Transcribing on your device…'
                  : listening
                    ? 'Listening… tap to finish'
                    : voice.error
                      ? 'Tap the mic to try again'
                      : 'Tap the mic and speak'}
              </p>

              {sttDownload != null && (
                <div className="w-48 h-1.5 mt-2 rounded-full bg-border dark:bg-border-dark overflow-hidden">
                  <div className="h-full gradient-primary transition-all" style={{ width: `${sttDownload}%` }} />
                </div>
              )}

              <div className="min-h-14 mt-3 px-2 text-center">
                {voice.interim && voice.engine === 'browser' ? (
                  <p className="text-lg font-medium text-text dark:text-text-dark leading-snug">“{voice.interim}”</p>
                ) : listening ? (
                  <span className="typing-dots text-2xl font-bold text-primary tracking-widest">
                    <span>•</span><span>•</span><span>•</span>
                  </span>
                ) : voice.error ? (
                  <p className="text-sm text-expense font-medium">{voice.error}</p>
                ) : null}
              </div>
            </div>

            {/* Examples */}
            <p className="text-[11px] font-bold text-text-muted dark:text-text-muted-dark uppercase tracking-wider mb-2">
              Try saying
            </p>
            <div className="flex flex-wrap gap-2 mb-5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => {
                    voice.cancel();
                    handleText(ex);
                  }}
                  className="text-xs font-medium px-3 py-2 rounded-xl bg-bg dark:bg-bg-dark border border-border dark:border-border-dark text-text-muted dark:text-text-muted-dark hover:text-text dark:hover:text-text-dark hover:border-primary/40 transition-colors text-left"
                >
                  “{ex}”
                </button>
              ))}
            </div>

            {/* Type instead */}
            {typing ? (
              <form onSubmit={submitTyped} className="flex gap-2">
                <input
                  autoFocus
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder="e.g. Chai 30 at 5 pm"
                  className="flex-1 min-w-0 px-4 py-3 bg-bg dark:bg-bg-dark border border-border dark:border-border-dark rounded-xl text-sm font-medium text-text dark:text-text-dark placeholder-text-muted dark:placeholder-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={!typed.trim()}
                  aria-label="Parse typed entry"
                  className="w-12 rounded-xl gradient-primary flex items-center justify-center press-effect disabled:opacity-40"
                >
                  <SendHorizontal className="w-5 h-5 text-white" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => {
                  voice.cancel();
                  setTyping(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-text-muted dark:text-text-muted-dark bg-bg dark:bg-bg-dark hover:text-text dark:hover:text-text-dark transition-colors press-effect"
              >
                <Keyboard className="w-4 h-4" />
                Type instead
              </button>
            )}
          </div>
        ) : (
          <ReviewPanel
            result={result}
            aiBusy={aiBusy}
            aiDownload={aiDownload}
            update={update}
            changeType={changeType}
            canSave={canSave}
            saving={saving}
            onSave={handleSave}
            onSpeakAgain={speakAgain}
            onMoreOptions={openFullForm}
          />
        )}
      </div>
    </div>
  );
}

function ReviewPanel({ result, aiBusy, aiDownload, update, changeType, canSave, saving, onSave, onSpeakAgain, onMoreOptions }) {
  const isExpense = result.type === 'expense';
  const categories = getCategoriesByType(result.type);
  const when = `${formatDateGroup(result.date)}${result.hasTime ? `, ${formatTime(result.date)}` : ''}`;

  const badge =
    aiBusy ? (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
        <Loader2 className="w-3 h-3 animate-spin" />
        {aiDownload != null ? `Loading AI ${aiDownload}%` : 'Detecting…'}
      </span>
    ) : result.categorySource === 'ai' ? (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
        <Sparkles className="w-3 h-3" /> AI suggested
      </span>
    ) : result.categorySource === 'keyword' ? (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-income/10 text-income">Auto-detected</span>
    ) : null;

  return (
    <div className="px-5 pb-5 pt-2 space-y-4 fade-in">
      {/* What was heard */}
      <div className="flex items-start gap-3 rounded-2xl bg-bg dark:bg-bg-dark p-3.5">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Mic className="w-4 h-4 text-primary" />
        </div>
        <p className="flex-1 text-sm text-text dark:text-text-dark leading-snug pt-1.5">“{result.transcript}”</p>
        <button
          onClick={onSpeakAgain}
          aria-label="Speak again"
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-border dark:hover:bg-border-dark transition-colors shrink-0"
        >
          <RotateCcw className="w-4 h-4 text-text-muted dark:text-text-muted-dark" />
        </button>
      </div>

      {/* Type */}
      <div className="flex bg-bg dark:bg-bg-dark rounded-xl p-1 gap-1">
        {[
          ['expense', 'Expense', ArrowDownCircle, 'bg-expense shadow-expense/20'],
          ['income', 'Income', ArrowUpCircle, 'bg-income shadow-income/20'],
        ].map(([key, label, Icon, active]) => (
          <button
            key={key}
            onClick={() => changeType(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              result.type === key
                ? `${active} text-white shadow-md`
                : 'text-text-muted dark:text-text-muted-dark hover:text-text dark:hover:text-text-dark'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Amount + description */}
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-text-muted dark:text-text-muted-dark">₹</span>
          <input
            type="number"
            inputMode="decimal"
            aria-label="Amount"
            placeholder="0"
            value={result.amount}
            onChange={(e) => update({ amount: e.target.value })}
            className={`w-full pl-8 pr-2 py-3 bg-bg dark:bg-bg-dark border rounded-xl text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all ${
              isExpense ? 'text-expense' : 'text-income'
            } ${Number(result.amount) > 0 ? 'border-border dark:border-border-dark' : 'border-expense/60'}`}
          />
        </div>
        <input
          type="text"
          aria-label="Description"
          placeholder="Description"
          value={result.description}
          onChange={(e) => update({ description: e.target.value })}
          className="w-full px-3 py-3 bg-bg dark:bg-bg-dark border border-border dark:border-border-dark rounded-xl text-sm font-medium text-text dark:text-text-dark placeholder-text-muted dark:placeholder-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>
      {!(Number(result.amount) > 0) && (
        <p className="-mt-2 text-xs font-medium text-expense">Couldn't hear an amount. Type it in above.</p>
      )}

      {/* Category */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <p className="text-[11px] font-bold text-text-muted dark:text-text-muted-dark uppercase tracking-wider">Category</p>
          {badge}
        </div>
        <div className="chip-scroller flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
          {categories.map((cat) => {
            const info = getCategoryInfo(cat);
            const active = result.category === cat;
            return (
              <button
                key={cat}
                onClick={() => update({ category: cat, categorySource: 'manual' })}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all press-effect border ${
                  active
                    ? 'bg-primary text-white border-primary shadow-md shadow-primary/25'
                    : 'bg-bg dark:bg-bg-dark text-text-muted dark:text-text-muted-dark border-border dark:border-border-dark'
                }`}
              >
                <span>{info.icon}</span>
                {info.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* When */}
      <button
        onClick={onMoreOptions}
        className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-bg dark:bg-bg-dark text-left press-effect"
      >
        <CalendarClock className="w-4 h-4 text-primary" />
        <span className="flex-1 text-sm font-semibold text-text dark:text-text-dark">{when}</span>
        <span className="text-xs font-semibold text-primary">Change</span>
      </button>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onMoreOptions}
          className="flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-xl text-sm font-semibold text-text dark:text-text-dark bg-bg dark:bg-bg-dark border border-border dark:border-border-dark press-effect"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={onSave}
          disabled={!canSave}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white press-effect disabled:opacity-50 shadow-lg ${
            isExpense ? 'bg-expense shadow-expense/20' : 'bg-income shadow-income/20'
          }`}
        >
          <Check className="w-5 h-5" />
          {saving ? 'Saving…' : `Save ${Number(result.amount) > 0 ? formatINR(result.amount) : ''}`}
        </button>
      </div>
    </div>
  );
}
