import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useApp } from '../AppContext';
import { formatINR, getCategoryInfo, getRepeatSuggestions } from '../utils';
import { CategoryGlyph } from './CategoryIcon';

// One-tap repeats on Home: entries you make often, saved for right now with a tap
export default function QuickAdd() {
  const { transactions, addTransaction, deleteTransaction } = useApp();
  const [savingKey, setSavingKey] = useState(null);
  const repeats = useMemo(() => getRepeatSuggestions(transactions), [transactions]);

  if (repeats.length === 0) return null;

  const save = async (repeat) => {
    setSavingKey(repeat.key);
    try {
      const tx = await addTransaction({
        type: repeat.type,
        amount: repeat.amount,
        description: repeat.description,
        category: repeat.category,
        date: new Date().toISOString(),
      });
      toast(
        (t) => (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {repeatLabel(repeat)} · {formatINR(repeat.amount)} added
            </span>
            <button
              onClick={() => {
                deleteTransaction(tx.id);
                toast.dismiss(t.id);
              }}
              className="px-3 py-1.5 bg-ink text-ink-inverse text-xs font-semibold rounded-full"
            >
              Undo
            </button>
          </div>
        ),
        { duration: 5000 }
      );
    } catch (err) {
      console.error('Failed to save repeat:', err);
      toast.error('Could not save. Please try again.');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <section aria-label="Quick add" className="slide-up">
      <div className="flex items-baseline justify-between gap-3 mb-2.5 px-1">
        <h2 className="text-[15px] font-semibold">Quick add</h2>
        <span className="text-xs font-medium text-muted">Tap to add again</span>
      </div>
      <div className="chip-scroller flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 scroll-px-5 pb-1">
        {repeats.map((repeat) => (
          <RepeatChip
            key={repeat.key}
            repeat={repeat}
            disabled={savingKey === repeat.key}
            onClick={() => save(repeat)}
          />
        ))}
      </div>
    </section>
  );
}

const repeatLabel = (repeat) => repeat.description || getCategoryInfo(repeat.category).label;

// Also used by the entry form, where a tap fills the fields instead of saving
export function RepeatChip({ repeat, onClick, active, disabled = false }) {
  const income = repeat.type === 'income';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`shrink-0 max-w-60 h-11 flex items-center gap-2 pl-3 pr-3.5 rounded-full text-sm border transition-all press-effect disabled:opacity-50 ${
        active ? 'bg-ink text-ink-inverse border-ink' : 'bg-surface border-line hover:border-muted'
      }`}
    >
      <CategoryGlyph category={repeat.category} className="w-4 h-4 shrink-0" />
      <span className="truncate font-medium">{repeatLabel(repeat)}</span>
      <span className={`shrink-0 font-semibold tabular-nums ${income && !active ? 'text-income' : ''}`}>
        {income ? '+' : ''}{formatINR(repeat.amount)}
      </span>
    </button>
  );
}
