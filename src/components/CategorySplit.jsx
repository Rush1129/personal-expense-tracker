import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { getCategoryInfo } from '../utils';

// "Where it went": this month's expenses as one segmented bar
export default function CategorySplit({ transactions, onOpenReports }) {
  const { total, parts } = useMemo(() => {
    const map = {};
    let sum = 0;
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const cat = t.category || 'other';
        map[cat] = (map[cat] || 0) + Number(t.amount);
        sum += Number(t.amount);
      });
    const list = Object.entries(map)
      .map(([key, value]) => ({ key, value, ...getCategoryInfo(key) }))
      .sort((a, b) => b.value - a.value);
    return { total: sum, parts: list };
  }, [transactions]);

  if (total <= 0) return null;

  const pct = (v) => Math.round((v / total) * 100);

  return (
    <section aria-label="Where it went" className="card rounded-3xl p-4 flex flex-col gap-3 slide-up">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">Where it went</h2>
        <button
          onClick={onOpenReports}
          className="inline-flex items-center gap-0.5 min-h-11 -my-3 pl-2 text-[13px] font-semibold text-muted hover:text-ink transition-colors"
        >
          Reports
          <ChevronRight className="w-4 h-4" strokeWidth={2.2} />
        </button>
      </div>

      <div
        role="img"
        aria-label={`Spending split: ${parts.map((p) => `${p.label} ${pct(p.value)}%`).join(', ')}`}
        className="flex gap-[3px] h-2.5"
      >
        {parts.map((p) => (
          <div
            key={p.key}
            className="rounded-full min-w-1.5"
            style={{ flexGrow: p.value, flexBasis: 0, backgroundColor: p.color }}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs font-medium text-muted">
        {parts.slice(0, 3).map((p) => (
          <span key={p.key} className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.label} {pct(p.value)}%
          </span>
        ))}
      </div>
    </section>
  );
}
