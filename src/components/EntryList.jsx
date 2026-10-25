import { useState } from 'react';
import { useApp } from '../AppContext';
import { formatINR, formatTime, getCategoryInfo, groupByDate } from '../utils';
import { Pencil, Trash2, Mic, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import CategoryIcon from './CategoryIcon';

// Days start collapsed: a summary row (date, count, totals) that expands to its entries
export default function EntryList({ transactions, onEdit, emptyTitle = 'No entries this month', showHint = true }) {
  const { deleteTransaction, restoreTransaction } = useApp();
  const [openId, setOpenId] = useState(null);
  const [openDays, setOpenDays] = useState(() => new Set());

  const groups = groupByDate(transactions);

  const toggleDay = (key) =>
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

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
        <p className="text-base font-semibold mb-1">{emptyTitle}</p>
        {showHint && (
          <p className="text-sm text-muted leading-relaxed">
            Tap the <span className="font-semibold text-ink">mic</span> and say something like
            <br />
            “Spent 120 on chai today”, or tap Add.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {groups.map((group, gi) => {
        let spent = 0;
        let earned = 0;
        group.transactions.forEach((t) => {
          if (t.type === 'income') earned += Number(t.amount);
          else spent += Number(t.amount);
        });

        const day = new Date(group.dateKey);
        const isNamed = group.label === 'Today' || group.label === 'Yesterday';
        const title = isNamed ? group.label : day.toLocaleDateString('en-IN', { weekday: 'long' });
        const count = group.transactions.length;
        const expanded = openDays.has(group.dateKey);
        const panelId = `day-${day.getTime()}`;

        return (
          <div
            key={group.dateKey}
            className="card rounded-[22px] overflow-hidden slide-up"
            style={{ animationDelay: `${Math.min(gi, 8) * 40}ms` }}
          >
            {/* Day summary */}
            <button
              type="button"
              onClick={() => toggleDay(group.dateKey)}
              aria-expanded={expanded}
              aria-controls={panelId}
              className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-sunken/60 transition-colors"
            >
              <span className="w-11 h-11 shrink-0 rounded-[14px] bg-sunken flex flex-col items-center justify-center leading-none">
                <span className="text-[17px] font-semibold tabular-nums">{day.getDate()}</span>
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {day.toLocaleDateString('en-IN', { month: 'short' })}
                </span>
              </span>

              <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold truncate">{title}</span>
                <span className="text-[13px] text-muted">
                  {count} {count === 1 ? 'entry' : 'entries'}
                </span>
              </span>

              <span className="shrink-0 flex flex-col items-end gap-0.5 tabular-nums">
                {spent > 0 && <span className="text-[15px] font-semibold">−{formatINR(spent)}</span>}
                {earned > 0 && (
                  <span className={spent > 0 ? 'text-[13px] font-medium text-income' : 'text-[15px] font-semibold text-income'}>
                    +{formatINR(earned)}
                  </span>
                )}
              </span>

              <ChevronDown
                className={`w-[18px] h-[18px] shrink-0 text-muted transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                strokeWidth={2.2}
                aria-hidden="true"
              />
            </button>

            {/* Entries */}
            {expanded && (
              <div id={panelId} className="border-t border-divider fade-in">
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
            )}
          </div>
        );
      })}
    </div>
  );
}
