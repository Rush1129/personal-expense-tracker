import { useState } from 'react';
import { useApp } from '../AppContext';
import { formatINR, formatTime, getCategoryInfo, groupByDate } from '../utils';
import { Pencil, Trash2, Mic } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EntryList({ transactions, onEdit }) {
  const { deleteTransaction, restoreTransaction } = useApp();
  const [openId, setOpenId] = useState(null);

  const groups = groupByDate(transactions);

  const handleDelete = async (tx) => {
    setOpenId(null);
    const deleted = await deleteTransaction(tx.id);
    toast(
      (t) => (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Entry deleted</span>
          <button
            onClick={() => {
              restoreTransaction(deleted);
              toast.dismiss(t.id);
            }}
            className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-dark transition-colors"
          >
            Undo
          </button>
        </div>
      ),
      {
        duration: 5000,
        style: {
          background: 'var(--surface)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '12px 16px',
          fontFamily: 'Inter, sans-serif',
        },
      }
    );
  };

  if (transactions.length === 0) {
    return (
      <div className="glass-card rounded-2xl text-center px-6 py-12 fade-in">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Mic className="w-6 h-6 text-primary" />
        </div>
        <p className="text-base font-semibold text-text dark:text-text-dark mb-1">No entries this month</p>
        <p className="text-sm text-text-muted dark:text-text-muted-dark leading-relaxed">
          Tap <span className="font-semibold text-primary">Speak</span> and say something like
          <br />
          “Spent 120 on chai today”, or use + to add manually.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group, gi) => {
        let spent = 0;
        let earned = 0;
        group.transactions.forEach((t) => {
          if (t.type === 'income') earned += Number(t.amount);
          else spent += Number(t.amount);
        });

        return (
          <div key={group.dateKey} className="slide-up" style={{ animationDelay: `${gi * 50}ms` }}>
            {/* Date header */}
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold text-text-muted dark:text-text-muted-dark uppercase tracking-wider">
                {group.label}
              </span>
              <span className="flex items-center gap-2 text-xs font-semibold">
                {earned > 0 && <span className="text-income">+{formatINR(earned)}</span>}
                {spent > 0 && <span className="text-text-muted dark:text-text-muted-dark">-{formatINR(spent)}</span>}
              </span>
            </div>

            {/* Entries */}
            <div className="glass-card rounded-2xl overflow-hidden divide-y divide-border/70 dark:divide-border-dark/70">
              {group.transactions.map((tx) => {
                const catInfo = getCategoryInfo(tx.category);
                const isExpense = tx.type === 'expense';
                const isOpen = openId === tx.id;

                return (
                  <div key={tx.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : tx.id)}
                      aria-expanded={isOpen}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                        isOpen ? 'bg-bg/70 dark:bg-bg-dark/50' : 'hover:bg-bg/60 dark:hover:bg-bg-dark/40'
                      }`}
                    >
                      {/* Category icon */}
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg shrink-0"
                        style={{ backgroundColor: `${catInfo.color}1f` }}
                      >
                        {catInfo.icon}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text dark:text-text-dark truncate">
                          {tx.description || catInfo.label}
                        </p>
                        <p className="text-xs text-text-muted dark:text-text-muted-dark mt-0.5 truncate">
                          {catInfo.label} · {formatTime(tx.date)}
                        </p>
                      </div>

                      {/* Amount */}
                      <p
                        className={`text-[15px] font-bold shrink-0 tabular-nums ${
                          isExpense ? 'text-text dark:text-text-dark' : 'text-income'
                        }`}
                      >
                        {isExpense ? '-' : '+'}{formatINR(tx.amount)}
                      </p>
                    </button>

                    {/* Actions */}
                    {isOpen && (
                      <div className="flex gap-2 px-4 pb-3 pt-1 bg-bg/70 dark:bg-bg-dark/50 scale-in">
                        <button
                          onClick={() => {
                            setOpenId(null);
                            onEdit(tx);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold press-effect hover:bg-primary/15 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(tx)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-expense/10 text-expense text-xs font-semibold press-effect hover:bg-expense/15 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
