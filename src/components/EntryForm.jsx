import { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { getCategoriesByType, getCategoryInfo, formatDate } from '../utils';
import { matchCategoryByKeywords } from '../voice/categoryRules';
import { X, Check, ArrowUpRight, ArrowDownLeft, CalendarDays, ChevronDown, Sparkles } from 'lucide-react';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';
import CategoryIcon from './CategoryIcon';
import { Segmented } from './Controls';

const sameDay = (a, b) => a.toDateString() === b.toDateString();

// prefill: values from a voice entry (new transaction, not an edit)
export default function EntryForm({ editTransaction, prefill, onClose }) {
  const { addTransaction, updateTransaction } = useApp();
  const isEditing = !!editTransaction;
  const initial = editTransaction || prefill;

  const [type, setType] = useState(initial?.type || 'expense');
  const [amount, setAmount] = useState(initial?.amount?.toString() || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [category, setCategory] = useState(initial?.category || '');
  // Until the user picks a category themselves, we suggest one from the description
  const [categoryTouched, setCategoryTouched] = useState(!!initial?.category && initial.category !== 'other');
  const [dateValue, setDateValue] = useState(initial?.date || new Date().toISOString());
  const [timeEnabled, setTimeEnabled] = useState(isEditing || !!prefill?.hasTime);
  const [showCalendar, setShowCalendar] = useState(false);
  const [saving, setSaving] = useState(false);

  // Focus amount input on open
  useEffect(() => {
    if (initial?.amount) return;
    const timer = setTimeout(() => {
      document.getElementById('amount-input')?.focus();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const suggest = (text, forType) => matchCategoryByKeywords(text, forType)?.category || '';

  const handleDescriptionChange = (value) => {
    setDescription(value);
    if (!categoryTouched) setCategory(suggest(value, type));
  };

  const handleTypeChange = (next) => {
    setType(next);
    if (!categoryTouched) setCategory(suggest(description, next));
    else if (category && !getCategoriesByType(next).includes(category)) {
      setCategory('');
      setCategoryTouched(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    setSaving(true);
    try {
      // If time is not enabled, set time to current time
      let finalDate = dateValue;
      if (!timeEnabled) {
        const d = new Date(dateValue);
        const now = new Date();
        d.setHours(now.getHours(), now.getMinutes(), 0, 0);
        finalDate = d.toISOString();
      }

      const data = {
        type,
        amount: Number(amount),
        description: description.trim(),
        category: category || 'other',
        date: finalDate,
      };

      if (isEditing) {
        await updateTransaction(editTransaction.id, data);
      } else {
        await addTransaction(data);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const activeCategories = getCategoriesByType(type);
  const selectedDate = new Date(dateValue);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isTodaySel = sameDay(selectedDate, today);
  const isYesterdaySel = sameDay(selectedDate, yesterday);

  const pickDay = (day) => {
    const d = new Date(dateValue);
    d.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    setDateValue(d.toISOString());
    setShowCalendar(false);
  };

  const chip = (active) =>
    `flex-1 min-w-0 h-11 flex items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-all press-effect border ${
      active
        ? 'bg-ink text-ink-inverse border-ink'
        : 'bg-surface text-ink border-line hover:border-muted'
    }`;

  const labelText = 'text-[13px] font-medium text-muted';
  const label = `block mb-2 ${labelText}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-overlay fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative bg-surface w-full sm:max-w-md sm:rounded-[28px] rounded-t-[30px] max-h-[92dvh] overflow-y-auto slide-up shadow-2xl">
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-2.5 pb-3 sm:hidden">
          <div className="w-10 h-[5px] rounded-full bg-line" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 pt-1 sm:pt-5">
          <h2 className="text-[22px] font-bold tracking-tight">
            {isEditing ? 'Edit entry' : 'New entry'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 rounded-full bg-sunken flex items-center justify-center press-effect hover:bg-line transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={2.2} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-5 pb-5 space-y-5">
            {/* Type toggle */}
            <Segmented
              value={type}
              onChange={handleTypeChange}
              options={[
                { value: 'expense', label: 'Expense', icon: ArrowUpRight },
                { value: 'income', label: 'Income', icon: ArrowDownLeft },
              ]}
            />

            {/* Amount */}
            <div>
              <label htmlFor="amount-input" className={labelText}>
                Amount
              </label>
              <div className="flex items-baseline gap-1 border-b-2 border-ink pb-1.5">
                <span className="text-4xl font-medium text-muted">₹</span>
                <input
                  id="amount-input"
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`flex-1 min-w-0 bg-transparent text-[52px] leading-tight font-semibold tracking-[-0.04em] tabular-nums placeholder:text-line focus:outline-none ${
                    type === 'income' ? 'text-income' : 'text-ink'
                  }`}
                  required
                  min="0"
                  step="any"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description-input" className={label}>
                Description
              </label>
              <input
                id="description-input"
                type="text"
                placeholder={type === 'expense' ? 'e.g., Coffee at Starbucks' : 'e.g., Monthly Salary'}
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                className="w-full h-12 px-3.5 bg-sunken border border-line rounded-[14px] text-[15px] font-medium placeholder:text-muted focus:outline-none focus:border-ink transition-colors"
              />
            </div>

            {/* Category */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className={labelText}>Category</span>
                {!categoryTouched && category && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-income">
                    <Sparkles className="w-3.5 h-3.5" />
                    Auto-detected
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-x-2 gap-y-3">
                {activeCategories.map((cat) => {
                  const info = getCategoryInfo(cat);
                  const isActive = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setCategory(cat);
                        setCategoryTouched(true);
                      }}
                      aria-pressed={isActive}
                      className="flex flex-col items-center gap-1.5 press-effect"
                    >
                      <CategoryIcon
                        category={cat}
                        size={52}
                        className={`transition-shadow ${isActive ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : ''}`}
                      />
                      <span className={`text-xs leading-tight text-center ${isActive ? 'font-bold' : 'font-medium'}`}>
                        {info.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date */}
            <div>
              <span className={label}>Date</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => pickDay(today)} className={chip(isTodaySel)}>
                  Today
                </button>
                <button type="button" onClick={() => pickDay(yesterday)} className={chip(isYesterdaySel)}>
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => setShowCalendar((s) => !s)}
                  aria-expanded={showCalendar}
                  className={chip(!isTodaySel && !isYesterdaySel)}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  {!isTodaySel && !isYesterdaySel ? formatDate(dateValue).replace(/ \d{4}$/, '') : 'Pick'}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCalendar ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {showCalendar && (
                <div className="mt-3 bg-sunken rounded-2xl p-3 scale-in">
                  <DatePicker
                    value={dateValue}
                    onChange={(v) => {
                      setDateValue(v);
                      setShowCalendar(false);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Time (Optional, Scrollable) */}
            <div>
              <span className={label}>Time</span>
              <TimePicker
                value={dateValue}
                onChange={setDateValue}
                enabled={timeEnabled}
                onToggle={() => setTimeEnabled((e) => !e)}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="sticky bottom-0 px-5 pt-3 safe-bottom bg-surface/95 backdrop-blur border-t border-line">
            <button
              type="submit"
              disabled={saving || !amount || Number(amount) <= 0}
              className="w-full h-14 rounded-full bg-ink text-ink-inverse text-base font-semibold transition-opacity duration-200 press-effect disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5 text-accent dark:text-on-accent" strokeWidth={2.6} />
              {saving ? 'Saving...' : isEditing ? 'Update entry' : `Save ${type === 'income' ? 'income' : 'expense'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
