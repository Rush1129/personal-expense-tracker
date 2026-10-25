import { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { getCategoriesByType, getCategoryInfo, formatDate } from '../utils';
import { matchCategoryByKeywords } from '../voice/categoryRules';
import { X, Check, ArrowDownCircle, ArrowUpCircle, CalendarDays, ChevronDown } from 'lucide-react';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';

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
    `flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all press-effect border ${
      active
        ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
        : 'bg-bg dark:bg-bg-dark text-text-muted dark:text-text-muted-dark border-border dark:border-border-dark hover:text-text dark:hover:text-text-dark'
    }`;

  const labelText = 'text-[11px] font-bold text-text-muted dark:text-text-muted-dark uppercase tracking-wider';
  const label = `block mb-2 ${labelText}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-overlay fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative bg-surface dark:bg-surface-dark w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[92dvh] overflow-y-auto slide-up shadow-2xl">
        {/* Handle bar (mobile) */}
        <div className="flex justify-center py-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border dark:bg-border-dark" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 pt-1 sm:pt-5">
          <h2 className="text-xl font-bold text-text dark:text-text-dark">
            {isEditing ? 'Edit Entry' : 'New Entry'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-bg dark:bg-bg-dark flex items-center justify-center press-effect hover:bg-border dark:hover:bg-border-dark transition-colors"
          >
            <X className="w-5 h-5 text-text-muted dark:text-text-muted-dark" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-5 pb-4 space-y-5">
            {/* Type toggle */}
            <div className="flex bg-bg dark:bg-bg-dark rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  type === 'expense'
                    ? 'bg-expense text-white shadow-md shadow-expense/20'
                    : 'text-text-muted dark:text-text-muted-dark hover:text-text dark:hover:text-text-dark'
                }`}
              >
                <ArrowDownCircle className="w-4 h-4" />
                Expense
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  type === 'income'
                    ? 'bg-income text-white shadow-md shadow-income/20'
                    : 'text-text-muted dark:text-text-muted-dark hover:text-text dark:hover:text-text-dark'
                }`}
              >
                <ArrowUpCircle className="w-4 h-4" />
                Income
              </button>
            </div>

            {/* Amount */}
            <div>
              <label htmlFor="amount-input" className={label}>
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-text-muted dark:text-text-muted-dark">
                  ₹
                </span>
                <input
                  id="amount-input"
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`w-full pl-11 pr-4 py-4 bg-bg dark:bg-bg-dark border border-border dark:border-border-dark rounded-2xl text-3xl font-bold placeholder-border dark:placeholder-border-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${
                    type === 'expense' ? 'text-expense' : 'text-income'
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
                className="w-full px-4 py-3.5 bg-bg dark:bg-bg-dark border border-border dark:border-border-dark rounded-xl text-sm font-medium text-text dark:text-text-dark placeholder-text-muted dark:placeholder-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            {/* Category */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={labelText}>Category</span>
                {!categoryTouched && category && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-income/10 text-income">
                    Auto-detected
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2">
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
                      className={`flex flex-col items-center justify-center gap-1 px-1 py-2.5 rounded-xl border transition-all duration-200 press-effect ${
                        isActive
                          ? 'bg-primary/10 border-primary ring-1 ring-primary text-primary'
                          : 'bg-bg dark:bg-bg-dark border-border dark:border-border-dark text-text-muted dark:text-text-muted-dark hover:text-text dark:hover:text-text-dark'
                      }`}
                    >
                      <span className="text-xl leading-none">{info.icon}</span>
                      <span className="text-[10.5px] font-semibold leading-tight text-center">{info.label}</span>
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
                <div className="mt-3 bg-bg dark:bg-bg-dark border border-border dark:border-border-dark rounded-xl p-3 scale-in">
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
          <div className="sticky bottom-0 px-5 pt-3 safe-bottom bg-surface/95 dark:bg-surface-dark/95 backdrop-blur border-t border-border/60 dark:border-border-dark/60">
            <button
              type="submit"
              disabled={saving || !amount || Number(amount) <= 0}
              className={`w-full py-4 rounded-xl text-base font-bold text-white transition-all duration-200 press-effect disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                type === 'expense'
                  ? 'bg-expense hover:bg-expense-light shadow-lg shadow-expense/20'
                  : 'bg-income hover:bg-income-light shadow-lg shadow-income/20'
              }`}
            >
              <Check className="w-5 h-5" />
              {saving ? 'Saving...' : isEditing ? 'Update Entry' : `Add ${type === 'income' ? 'Income' : 'Expense'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
