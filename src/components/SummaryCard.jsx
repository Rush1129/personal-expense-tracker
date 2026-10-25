import { formatINR } from '../utils';
import { TrendingUp, TrendingDown, Wallet, CalendarDays } from 'lucide-react';

export default function SummaryCard({ totals, period, todaySpend = 0 }) {
  const { totalIncome, totalExpense, netBalance } = totals;
  const spentPct = totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : null;

  return (
    <div className="slide-up relative overflow-hidden rounded-3xl gradient-hero p-5 text-white shadow-xl shadow-primary/25">
      {/* Decorative glow */}
      <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full bg-white/10 blur-2xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/85 bg-white/15 px-2.5 py-1 rounded-full">
            <CalendarDays className="w-3.5 h-3.5" />
            {period}
          </span>
          <Wallet className="w-5 h-5 text-white/60" />
        </div>

        <p className="mt-5 text-xs font-medium text-white/70">Net balance</p>
        <h2 className="text-4xl font-extrabold tracking-tight mt-0.5">
          {netBalance >= 0 ? '+' : '-'}{formatINR(Math.abs(netBalance))}
        </h2>
        <p className="text-xs text-white/75 mt-1 font-medium">
          {todaySpend > 0 ? `Spent ${formatINR(todaySpend)} today` : 'Nothing spent today'}
        </p>

        {/* Income / Expense */}
        <div className="grid grid-cols-2 gap-2.5 mt-5">
          <div className="rounded-2xl bg-white/12 border border-white/10 px-3 py-2.5 flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-emerald-200" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-white/70 font-medium">Income</p>
              <p className="text-sm font-bold truncate">+{formatINR(totalIncome)}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-white/12 border border-white/10 px-3 py-2.5 flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <TrendingDown className="w-4 h-4 text-rose-200" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-white/70 font-medium">Expenses</p>
              <p className="text-sm font-bold truncate">-{formatINR(totalExpense)}</p>
            </div>
          </div>
        </div>

        {/* Spend vs income */}
        {spentPct !== null && (
          <div className="mt-4">
            <div className="flex justify-between text-[11px] font-medium text-white/80 mb-1.5">
              <span>Spent {spentPct}% of income</span>
              <span>{netBalance >= 0 ? `${formatINR(netBalance)} left` : 'Over budget'}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div
                className={`h-full rounded-full ${spentPct > 100 ? 'bg-rose-300' : 'bg-white'}`}
                style={{ width: `${Math.min(100, spentPct)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
