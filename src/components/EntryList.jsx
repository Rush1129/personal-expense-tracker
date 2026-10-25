import { useState } from 'react';
import { useApp } from '../AppContext';
import { formatINR, formatTime, getCategoryInfo, groupByDate } from '../utils';
import { Pencil, Trash2, Mic } from 'lucide-react';
import toast from 'react-hot-toast';
import CategoryIcon from './CategoryIcon';

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
            className="px-3 py-1.5 bg-ink text-ink-inverse text-xs font-semibold rounded-full"
          >
            Undo
          </button>
        </div>
      ),
      { duration: 5000 }
    );
  };

  if (transactions.length === 0) {
    return (
      <div className="card rounded-3xl text-center px-6 py-12 fade-in">
        <div className="w-14 h-14 rounded-full bg-accent text-on-accent flex items-center justify-center mx-auto mb-4">
          <Mic className="w-6 h-6" />
        </div>
        <p className="text-base font-semibold mb-1">No entries this month</p>
        <p className="text-sm text-muted leading-relaxed">
          Tap the <span className="font-semibold text-ink">mic</span> and say something like
          <br />
          “Spent 120 on chai today”, or tap Add.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
            <div className="flex items-center justify-between mb-2.5 px-1 text-xs font-semibold text-muted">
              <span className="uppercase tracking-[0.06em]">{group.label}</span>
              <span className="flex items-center gap-2 tabular-nums">
                {earned > 0 && <span className="text-income">+{formatINR(earned)}</span>}
                {spent > 0 && <span>−{formatINR(spent)}</span>}
              </span>
            </div>

            {/* Entries */}
            <div className="card rounded-[22px] overflow-hidden">
              {group.transactions.map((tx, i) => {
                const catInfo = getCategoryInfo(tx.category);
                const isExpense = tx.type === 'expense';
                const isOpen = openId === tx.id;

                return (
                  <div key={tx.id}>
                    {i > 0 && <div className="h-px bg-divider ml-[70px]" />}
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : tx.id)}
                      aria-expanded={isOpen}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors ${
                        isOpen ? 'bg-sunken' : 'hover:bg-sunken/60'
                      }`}
                    >
                      <CategoryIcon category={tx.category} />

                      {/* Info */}
                      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <span className="text-[15px] font-medium truncate">
                          {tx.description || catInfo.label}
                        </span>
                        <span className="text-[13px] text-muted truncate">
                          {catInfo.label} · {formatTime(tx.date)}
                        </span>
                      </span>

                      {/* Amount */}
                      <span
                        className={`text-[15px] font-semibold shrink-0 tabular-nums ${
                          isExpense ? '' : 'text-income'
                        }`}
                      >
                        {isExpense ? '−' : '+'}{formatINR(tx.amount)}
                      </span>
                    </button>

                    {/* Actions */}
                    {isOpen && (
                      <div className="flex gap-2 px-3.5 pb-3 pt-1 bg-sunken scale-in">
                        <button
                          onClick={() => {
                            setOpenId(null);
                            onEdit(tx);
                          }}
                          className="flex-1 h-11 flex items-center justify-center gap-1.5 rounded-xl bg-surface border border-line text-sm font-semibold press-effect"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(tx)}
                          className="flex-1 h-11 flex items-center justify-center gap-1.5 rounded-xl bg-danger/10 text-danger text-sm font-semibold press-effect"
                        >
                          <Trash2 className="w-4 h-4" />
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
