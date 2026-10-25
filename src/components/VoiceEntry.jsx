import { useState, useEffect, useRef } from 'react';
import { useApp } from '../AppContext';
import { formatDateGroup, formatTime, formatINR, getCategoriesByType, getCategoryInfo } from '../utils';
import { parseTransaction } from '../voice/parseTransaction';
import { matchCategoryByKeywords } from '../voice/categoryRules';
import { classifyCategory, onModelProgress, warmUpModel } from '../voice/aiClient';
import { useVoiceInput } from '../voice/useVoiceInput';
import {
  X, Mic, Square, Loader2, Keyboard, SendHorizontal, Check, SlidersHorizontal, CalendarClock,
  Sparkles, ArrowUpRight, ArrowDownLeft, ShieldCheck, RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { CategoryGlyph } from './CategoryIcon';
import { Segmented } from './Controls';

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

  // Listening is an immersive dark sheet in both themes; review uses the normal surface
  const immersive = !result;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-overlay fade-in" onClick={close} />

      <div
        className={`relative w-full sm:max-w-md sm:rounded-[28px] rounded-t-[30px] max-h-[92dvh] overflow-y-auto slide-up safe-bottom shadow-2xl transition-colors duration-300 ${
          immersive ? 'bg-[#0e0f0c] text-[#f5f5f2] dark:border-t dark:border-[#24261f]' : 'bg-surface text-ink'
        }`}
      >
        <div className="flex justify-center pt-2.5 pb-3 sm:hidden">
          <div className={`w-10 h-[5px] rounded-full ${immersive ? 'bg-[#2a2c27]' : 'bg-line'}`} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-1 sm:pt-5">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-[22px] font-bold tracking-tight">{immersive ? 'Voice entry' : 'Check & save'}</h2>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                immersive ? 'bg-[#1c1e1a] border-[#2a2c27] text-[#d9dbd3]' : 'bg-sunken border-line text-muted'
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
            className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center press-effect transition-colors ${
              immersive ? 'bg-[#1c1e1a] hover:bg-[#2a2c27]' : 'bg-sunken hover:bg-line'
            }`}
          >
            <X className="w-5 h-5" strokeWidth={2.2} />
          </button>
        </div>

        {!result ? (
          <div className="px-5 pb-6">
            {/* Mic orb */}
            <div className="flex flex-col items-center pt-10 pb-4">
              <button
                onClick={listening ? voice.stop : voice.start}
                disabled={transcribing}
                aria-label={listening ? 'Stop listening' : 'Start listening'}
                className="relative w-[120px] h-[120px] rounded-full flex items-center justify-center press-effect disabled:cursor-wait"
              >
                {listening && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-accent/30 mic-ripple" />
                    <span className="absolute inset-0 rounded-full bg-accent/20 mic-ripple mic-ripple-delay" />
                  </>
                )}
                <span
                  className="absolute -inset-4 rounded-full bg-accent/15 transition-transform duration-100"
                  style={{ transform: `scale(${1 + voice.level * 0.35})`, opacity: listening ? 1 : 0 }}
                />
                <span
                  className={`relative w-[120px] h-[120px] rounded-full flex items-center justify-center ${
                    transcribing ? 'bg-[#2a2c27] text-[#f5f5f2]' : 'bg-accent text-on-accent'
                  }`}
                >
                  {transcribing ? (
                    <Loader2 className="w-10 h-10 animate-spin" />
                  ) : listening ? (
                    <Square className="w-9 h-9 fill-current" />
                  ) : (
                    <Mic className="w-11 h-11" strokeWidth={2} />
                  )}
                </span>
              </button>

              <p className="mt-8 inline-flex items-center gap-2 text-sm font-semibold" aria-live="polite">
                {listening && <span className="w-2 h-2 rounded-full bg-accent" />}
                <span className={listening ? 'text-accent' : ''}>
                  {transcribing
                    ? sttDownload != null
                      ? `Downloading speech model… ${sttDownload}%`
                      : 'Transcribing on your device…'
                    : listening
                      ? 'Listening… tap to finish'
                      : voice.error
                        ? 'Tap the mic to try again'
                        : 'Tap the mic and speak'}
                </span>
              </p>

              {sttDownload != null && (
                <div className="w-48 h-1.5 mt-2 rounded-full bg-[#2a2c27] overflow-hidden">
                  <div className="h-full bg-accent transition-all" style={{ width: `${sttDownload}%` }} />
                </div>
              )}

              <div className="min-h-16 mt-3 px-2 text-center">
                {voice.interim && voice.engine === 'browser' ? (
                  <p className="text-[26px] font-medium leading-tight tracking-tight">“{voice.interim}”</p>
                ) : listening ? (
                  <span className="typing-dots text-2xl font-bold text-accent tracking-widest">
                    <span>•</span><span>•</span><span>•</span>
                  </span>
                ) : voice.error ? (
                  <p className="text-sm text-[#ff8a5c] font-medium">{voice.error}</p>
                ) : null}
              </div>
            </div>

            {/* Examples */}
            <p className="text-xs font-semibold text-[#9a9e92] uppercase tracking-[0.06em] mb-2.5">
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
                  className="text-sm px-3.5 py-2 rounded-full bg-[#1c1e1a] border border-[#2a2c27] text-[#d9dbd3] hover:border-[#4a4d44] hover:text-white transition-colors text-left"
                >
                  {ex}
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
                  aria-label="Type an entry"
                  placeholder="e.g. Chai 30 at 5 pm"
                  className="flex-1 min-w-0 h-12 px-4 bg-[#1c1e1a] border border-[#2a2c27] rounded-full text-[15px] font-medium text-[#f5f5f2] placeholder:text-[#7a7e73] focus:outline-none focus:border-[#f5f5f2]"
                />
                <button
                  type="submit"
                  disabled={!typed.trim()}
                  aria-label="Parse typed entry"
                  className="w-12 h-12 shrink-0 rounded-full bg-accent text-on-accent flex items-center justify-center press-effect disabled:opacity-40"
                >
                  <SendHorizontal className="w-5 h-5" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => {
                  voice.cancel();
                  setTyping(true);
                }}
                className="w-full h-12 flex items-center justify-center gap-2 rounded-full text-sm font-semibold bg-[#1c1e1a] text-[#d9dbd3] hover:text-white transition-colors press-effect"
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
  const categories = getCategoriesByType(result.type);
  const when = `${formatDateGroup(result.date)}${result.hasTime ? `, ${formatTime(result.date)}` : ''}`;
  const hasAmount = Number(result.amount) > 0;

  const badge =
    aiBusy ? (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        {aiDownload != null ? `Loading AI ${aiDownload}%` : 'Detecting…'}
      </span>
    ) : result.categorySource === 'ai' ? (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-income">
        <Sparkles className="w-3.5 h-3.5" /> AI suggested
      </span>
    ) : result.categorySource === 'keyword' ? (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-income">
        <Sparkles className="w-3.5 h-3.5" /> Auto-detected
      </span>
    ) : null;

  return (
    <div className="px-5 pb-5 pt-2 space-y-[18px] fade-in">
      {/* What was heard */}
      <div className="flex items-center gap-3 rounded-[18px] bg-sunken py-2.5 pl-3 pr-2.5">
        <span className="w-9 h-9 rounded-full bg-accent text-on-accent flex items-center justify-center shrink-0">
          <Mic className="w-[18px] h-[18px]" strokeWidth={2.2} />
        </span>
        <p className="flex-1 text-[15px] leading-snug">“{result.transcript}”</p>
        <button
          onClick={onSpeakAgain}
          aria-label="Speak again"
          className="w-11 h-11 rounded-[14px] bg-surface border border-line flex items-center justify-center hover:border-muted transition-colors shrink-0"
        >
          <RotateCcw className="w-[18px] h-[18px]" strokeWidth={2.2} />
        </button>
      </div>

      {/* Type */}
      <Segmented
        value={result.type}
        onChange={changeType}
        options={[
          { value: 'expense', label: 'Expense', icon: ArrowUpRight },
          { value: 'income', label: 'Income', icon: ArrowDownLeft },
        ]}
      />

      {/* Amount */}
      <div>
        <label htmlFor="voice-amount" className="text-[13px] font-medium text-muted">Amount</label>
        <div className={`flex items-baseline gap-1 border-b-2 pb-1.5 ${hasAmount ? 'border-ink' : 'border-danger'}`}>
          <span className="text-4xl font-medium text-muted">₹</span>
          <input
            id="voice-amount"
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={result.amount}
            onChange={(e) => update({ amount: e.target.value })}
            className={`flex-1 min-w-0 bg-transparent text-[52px] leading-tight font-semibold tracking-[-0.04em] tabular-nums placeholder:text-line focus:outline-none ${
              result.type === 'income' ? 'text-income' : 'text-ink'
            }`}
          />
        </div>
        {!hasAmount && (
          <p className="mt-2 text-xs font-medium text-danger">Couldn't hear an amount. Type it in above.</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="voice-description" className="block mb-2 text-[13px] font-medium text-muted">Description</label>
        <input
          id="voice-description"
          type="text"
          placeholder="Description"
          value={result.description}
          onChange={(e) => update({ description: e.target.value })}
          className="w-full h-12 px-3.5 bg-sunken border border-line rounded-[14px] text-[15px] font-medium placeholder:text-muted focus:outline-none focus:border-ink transition-colors"
        />
      </div>

      {/* Category */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <p className="text-[13px] font-medium text-muted">Category</p>
          {badge}
        </div>
        <div className="chip-scroller flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 scroll-px-5 pb-1">
          {categories.map((cat) => {
            const info = getCategoryInfo(cat);
            const active = result.category === cat;
            return (
              <button
                key={cat}
                onClick={() => update({ category: cat, categorySource: 'manual' })}
                aria-pressed={active}
                className={`shrink-0 h-10 flex items-center gap-1.5 pl-3 pr-3.5 rounded-full text-sm transition-all press-effect border ${
                  active ? 'bg-ink text-ink-inverse border-ink font-semibold' : 'bg-surface border-line font-medium hover:border-muted'
                }`}
              >
                <CategoryGlyph category={cat} />
                {info.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* When */}
      <button
        onClick={onMoreOptions}
        className="w-full flex items-center gap-3 h-12 px-3.5 rounded-[14px] bg-sunken text-left press-effect"
      >
        <CalendarClock className="w-[18px] h-[18px] text-muted" />
        <span className="flex-1 text-[15px] font-medium">{when}</span>
        <span className="text-sm font-semibold text-muted">Change</span>
      </button>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onMoreOptions}
          className="h-14 flex items-center justify-center gap-1.5 px-5 rounded-full text-sm font-semibold bg-surface border border-line hover:border-muted transition-colors press-effect"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={onSave}
          disabled={!canSave}
          className="flex-1 h-14 flex items-center justify-center gap-2 rounded-full text-base font-semibold bg-ink text-ink-inverse press-effect disabled:opacity-40"
        >
          <Check className="w-5 h-5 text-accent dark:text-on-accent" strokeWidth={2.6} />
          {saving ? 'Saving…' : `Save ${hasAmount ? formatINR(result.amount) : ''}`}
        </button>
      </div>
    </div>
  );
}
