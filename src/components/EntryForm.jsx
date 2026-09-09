import { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { CATEGORIES, getCategoriesByType, getCategoryInfo } from '../utils';
import { X, Check, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';

export default function EntryForm({ editTransaction, onClose }) {
  const { addTransaction, updateTransaction } = useApp();
  const isEditing = !!editTransaction;

  const [type, setType] = useState(editTransaction?.type || 'expense');
  const [amount, setAmount] = useState(editTransaction?.amount?.toString() || '');
  const [description, setDescription] = useState(editTransaction?.description || '');
  const [category, setCategory] = useState(editTransaction?.category || '');
  const [dateValue, setDateValue] = useState(
    editTransaction?.date || new Date().toISOString()
  );
  const [timeEnabled, setTimeEnabled] = useState(!!editTransaction);
  const [saving, setSaving] = useState(false);

  // Focus amount input on open
  useEffect(() => {
    const timer = setTimeout(() => {
      document.getElementById('amount-input')?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-overlay fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative bg-surface dark:bg-surface-dark w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[92dvh] overflow-y-auto slide-up safe-bottom shadow-2xl">
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
            className="w-9 h-9 rounded-full bg-bg dark:bg-bg-dark flex items-center justify-center press-effect hover:bg-border dark:hover:bg-border-dark transition-colors"
          >
            <X className="w-5 h-5 text-text-muted dark:text-text-muted-dark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-6 space-y-5">
          {/* Type toggle */}
          <div className="flex bg-bg dark:bg-bg-dark rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setType('expense')}
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
              onClick={() => setType('income')}
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
            <label className="block text-xs font-semibold text-text-muted dark:text-text-muted-dark mb-2 uppercase tracking-wider">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-text-muted dark:text-text-muted-dark">
                ₹
              </span>
              <input
                id="amount-input"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-4 bg-bg dark:bg-bg-dark border border-border dark:border-border-dark rounded-xl text-2xl font-bold text-text dark:text-text-dark placeholder-border dark:placeholder-border-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                required
                min="0"
                step="any"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-text-muted dark:text-text-muted-dark mb-2 uppercase tracking-wider">
              Description
            </label>
            <input
              type="text"
              placeholder={type === 'expense' ? 'e.g., Coffee at Starbucks' : 'e.g., Monthly Salary'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3.5 bg-bg dark:bg-bg-dark border border-border dark:border-border-dark rounded-xl text-sm font-medium text-text dark:text-text-dark placeholder-text-muted dark:placeholder-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-text-muted dark:text-text-muted-dark mb-2 uppercase tracking-wider">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {activeCategories.map((cat) => {
                const info = getCategoryInfo(cat);
                const isActive = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 press-effect ${
                      isActive
                        ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105'
                        : 'bg-bg dark:bg-bg-dark text-text-muted dark:text-text-muted-dark hover:bg-border dark:hover:bg-border-dark border border-border dark:border-border-dark'
                    }`}
                  >
                    <span>{info.icon}</span>
                    <span>{info.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date (Calendar) */}
          <div>
            <label className="block text-xs font-semibold text-text-muted dark:text-text-muted-dark mb-2 uppercase tracking-wider">
              Date
            </label>
            <div className="bg-bg dark:bg-bg-dark border border-border dark:border-border-dark rounded-xl p-3">
              <DatePicker value={dateValue} onChange={setDateValue} />
            </div>
          </div>

          {/* Time (Optional, Scrollable) */}
          <div>
            <label className="block text-xs font-semibold text-text-muted dark:text-text-muted-dark mb-2 uppercase tracking-wider">
              Time
            </label>
            <TimePicker
              value={dateValue}
              onChange={setDateValue}
              enabled={timeEnabled}
              onToggle={() => setTimeEnabled((e) => !e)}
            />
          </div>

          {/* Submit */}
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
        </form>
      </div>
    </div>
  );
}
