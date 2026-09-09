import { useState } from 'react';
import { useApp } from '../AppContext';
import { formatINR, formatTime, getCategoryInfo, groupByDate } from '../utils';
import { Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EntryList({ transactions, onEdit }) {
  const { deleteTransaction, restoreTransaction } = useApp();
  const [swipedId, setSwipedId] = useState(null);

  const groups = groupByDate(transactions);

  const handleDelete = async (tx) => {
    setSwipedId(null);
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
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '12px 16px',
          fontFamily: 'Inter, sans-serif',
        },
      }
    );
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-16 fade-in">
        <div className="text-5xl mb-4">📝</div>
        <p className="text-lg font-semibold text-text dark:text-text-dark mb-1">No entries yet</p>
        <p className="text-sm text-text-muted dark:text-text-muted-dark">
          Tap the + button to add your first entry
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group, gi) => (
        <div key={group.dateKey} className="slide-up" style={{ animationDelay: `${gi * 50}ms` }}>
          {/* Date header */}
          <div className="flex items-center gap-3 mb-3 px-1">
            <span className="text-xs font-bold text-text-muted dark:text-text-muted-dark uppercase tracking-wider">
              {group.label}
            </span>
            <div className="flex-1 h-px bg-border dark:bg-border-dark" />
            <span className="text-xs font-semibold text-text-muted dark:text-text-muted-dark">
              {group.transactions.length} {group.transactions.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          {/* Entries */}
          <div className="space-y-2">
            {group.transactions.map((tx) => {
              const catInfo = getCategoryInfo(tx.category);
              const isExpense = tx.type === 'expense';
              const isOpen = swipedId === tx.id;

              return (
                <div
                  key={tx.id}
                  className="relative overflow-hidden rounded-xl"
                >
                  {/* Action buttons behind */}
                  {isOpen && (
                    <div className="absolute inset-0 flex items-center justify-end gap-2 pr-3 bg-bg dark:bg-bg-dark rounded-xl scale-in">
                      <button
                        onClick={() => {
                          setSwipedId(null);
                          onEdit(tx);
                        }}
                        className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center press-effect hover:bg-primary/20 transition-colors"
                      >
                        <Pencil className="w-4 h-4 text-primary" />
                      </button>
                      <button
                        onClick={() => handleDelete(tx)}
                        className="w-10 h-10 rounded-full bg-expense/10 flex items-center justify-center press-effect hover:bg-expense/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-expense" />
                      </button>
                    </div>
                  )}

                  {/* Main card */}
                  <div
                    className={`glass-card rounded-xl p-4 flex items-center gap-3 cursor-pointer press-effect transition-all duration-200 ${
                      isOpen ? 'opacity-0' : ''
                    }`}
                    onClick={() => setSwipedId(isOpen ? null : tx.id)}
                  >
                    {/* Category icon */}
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: `${catInfo.color}15` }}
                    >
                      {catInfo.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text dark:text-text-dark truncate">
                        {tx.description || catInfo.label}
                      </p>
                      <p className="text-xs text-text-muted dark:text-text-muted-dark mt-0.5">
                        {catInfo.label} · {formatTime(tx.date)}
                      </p>
                    </div>

                    {/* Amount */}
                    <p
                      className={`text-base font-bold shrink-0 ${
                        isExpense ? 'text-expense' : 'text-income'
                      }`}
                    >
                      {isExpense ? '-' : '+'}{formatINR(tx.amount)}
                    </p>
                  </div>

                  {/* Revealed card when swiped (tap to show actions) */}
                  {isOpen && (
                    <div
                      className="absolute inset-0 glass-card rounded-xl p-4 flex items-center gap-3 scale-in"
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0"
                        style={{ backgroundColor: `${catInfo.color}15` }}
                      >
                        {catInfo.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text dark:text-text-dark truncate">
                          {tx.description || catInfo.label}
                        </p>
                        <p className="text-xs text-text-muted dark:text-text-muted-dark mt-0.5">
                          Tap action or click away
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSwipedId(null);
                            onEdit(tx);
                          }}
                          className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center press-effect hover:bg-primary/20 transition-colors"
                        >
                          <Pencil className="w-4 h-4 text-primary" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(tx);
                          }}
                          className="w-10 h-10 rounded-full bg-expense/10 flex items-center justify-center press-effect hover:bg-expense/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-expense" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSwipedId(null);
                          }}
                          className="w-10 h-10 rounded-full bg-bg dark:bg-bg-dark flex items-center justify-center press-effect hover:bg-border dark:hover:bg-border-dark transition-colors"
                        >
                          <span className="text-xs font-bold text-text-muted dark:text-text-muted-dark">✕</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
