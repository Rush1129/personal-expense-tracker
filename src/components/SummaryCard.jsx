import { formatINR } from '../utils';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

export default function SummaryCard({ totals, period }) {
  const { totalIncome, totalExpense, netBalance } = totals;

  return (
    <div className="slide-up">
      {/* Main balance card */}
      <div className="gradient-primary rounded-2xl p-5 text-white shadow-lg shadow-primary/20 mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-white/70">{period}</span>
          <Wallet className="w-5 h-5 text-white/50" />
        </div>
        <p className="text-xs text-white/60 mb-1">Net Balance</p>
        <h2 className="text-3xl font-bold tracking-tight">
          {netBalance >= 0 ? '+' : '-'}{formatINR(Math.abs(netBalance))}
        </h2>
      </div>

      {/* Income / Expense pills */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-income-bg dark:bg-income-bg-dark flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-income" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-text-muted dark:text-text-muted-dark font-medium">Income</p>
            <p className="text-base font-bold text-income truncate">
              +{formatINR(totalIncome)}
            </p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-expense-bg dark:bg-expense-bg-dark flex items-center justify-center shrink-0">
            <TrendingDown className="w-5 h-5 text-expense" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-text-muted dark:text-text-muted-dark font-medium">Expenses</p>
            <p className="text-base font-bold text-expense truncate">
              -{formatINR(totalExpense)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
