import { formatINR } from '../utils';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

// Balance card: ink in light mode, lime in dark mode (hero-* tokens in index.css)
export default function SummaryCard({ totals, period, todaySpend = 0 }) {
  const { totalIncome, totalExpense, netBalance } = totals;
  const spentPct = totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : null;
  const over = spentPct !== null && spentPct > 100;

  return (
    <section aria-label="This month" className="slide-up rounded-[28px] bg-hero text-hero-ink p-5 flex flex-col gap-[18px]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-hero-muted">{period}</span>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent text-on-accent dark:bg-on-accent dark:text-accent tabular-nums">
          {todaySpend > 0 ? `${formatINR(todaySpend)} spent today` : 'Nothing spent today'}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-hero-muted">Net balance</span>
        <span className="text-[44px] min-[380px]:text-5xl font-semibold tracking-[-0.04em] leading-none tabular-nums">
          {netBalance < 0 ? '−' : ''}{formatINR(Math.abs(netBalance))}
        </span>
      </div>

      {/* Spend vs income */}
      {spentPct !== null && (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between gap-3 text-xs font-medium text-hero-muted">
            <span>{over ? 'Over budget' : `${spentPct}% of income spent`}</span>
            <span className="tabular-nums">
              {formatINR(totalExpense)} of {formatINR(totalIncome)}
            </span>
          </div>
          <div className="h-2 rounded bg-hero-track overflow-hidden">
            <div
              className={`h-full rounded ${over ? 'bg-[#ff8a5c] dark:bg-[#b3261e]' : 'bg-hero-fill'}`}
              style={{ width: `${Math.min(100, spentPct)}%` }}
            />
          </div>
        </div>
      )}

      {/* Income / Expense */}
      <div className="grid grid-cols-2 gap-2.5">
        <Stat icon={ArrowDownLeft} iconClass="text-hero-fill" label="Income" value={formatINR(totalIncome)} />
        <Stat icon={ArrowUpRight} iconClass="text-hero-ink" label="Expenses" value={formatINR(totalExpense)} />
      </div>
    </section>
  );
}

function Stat({ icon: Icon, iconClass, label, value }) {
  return (
    <div className="rounded-[18px] bg-hero-tile px-3.5 py-3 flex flex-col gap-1.5 min-w-0">
      <span className="flex items-center gap-1.5 text-xs font-medium text-hero-muted">
        <Icon className={`w-4 h-4 ${iconClass}`} strokeWidth={2.4} aria-hidden="true" />
        {label}
      </span>
      <span className="text-[19px] font-semibold tracking-tight truncate tabular-nums">{value}</span>
    </div>
  );
}
