import { useState, useMemo } from 'react';
import { useApp } from '../AppContext';
import { formatINR, formatDate, getMonthName, calculateTotals, getCategoryInfo, CATEGORIES } from '../utils';
import { exportToPDF, exportToExcel } from '../exportUtils';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, LineChart, Line, Area, AreaChart
} from 'recharts';
import { FileDown, FileSpreadsheet, Calendar, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

const CHART_COLORS = ['#6366f1', '#f97316', '#ec4899', '#8b5cf6', '#3b82f6', '#14b8a6', '#f59e0b', '#10b981', '#22c55e', '#06b6d4', '#a855f7', '#e11d48', '#78716c', '#84cc16', '#7c3aed', '#64748b'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-text dark:text-text-dark mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {formatINR(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function Reports() {
  const { transactions } = useApp();
  const now = new Date();
  const [mode, setMode] = useState('month'); // 'month' | 'custom'
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Filter transactions based on selected period
  const filtered = useMemo(() => {
    if (mode === 'month') {
      const start = new Date(selectedYear, selectedMonth, 1);
      const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
      return transactions.filter((t) => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });
    } else {
      if (!customStart || !customEnd) return [];
      const start = new Date(customStart);
      const end = new Date(customEnd + 'T23:59:59.999');
      return transactions.filter((t) => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });
    }
  }, [transactions, mode, selectedMonth, selectedYear, customStart, customEnd]);

  const totals = calculateTotals(filtered);

  const dateRange = useMemo(() => {
    if (mode === 'month') {
      return {
        label: `${getMonthName(selectedMonth)} ${selectedYear}`,
      };
    }
    return {
      label: `${customStart ? formatDate(new Date(customStart).toISOString()) : '...'} — ${customEnd ? formatDate(new Date(customEnd).toISOString()) : '...'}`,
    };
  }, [mode, selectedMonth, selectedYear, customStart, customEnd]);

  // Category breakdown for pie chart
  const categoryData = useMemo(() => {
    const map = {};
    filtered
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const cat = t.category || 'other';
        if (!map[cat]) map[cat] = 0;
        map[cat] += Number(t.amount);
      });
    return Object.entries(map)
      .map(([key, value]) => ({
        name: getCategoryInfo(key).label,
        value,
        icon: getCategoryInfo(key).icon,
        color: getCategoryInfo(key).color,
      }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Daily breakdown for bar chart
  const dailyData = useMemo(() => {
    const map = {};
    filtered.forEach((t) => {
      const day = new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      if (!map[day]) map[day] = { name: day, income: 0, expense: 0 };
      if (t.type === 'income') map[day].income += Number(t.amount);
      else map[day].expense += Number(t.amount);
    });
    return Object.values(map).reverse();
  }, [filtered]);

  // Monthly trend (last 6 months)
  const monthlyTrend = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthTx = transactions.filter((t) => {
        const td = new Date(t.date);
        return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth();
      });
      const { totalIncome, totalExpense } = calculateTotals(monthTx);
      data.push({
        name: d.toLocaleDateString('en-IN', { month: 'short' }),
        income: totalIncome,
        expense: totalExpense,
      });
    }
    return data;
  }, [transactions]);

  const prevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  return (
    <div className="space-y-5 pb-28">
      {/* Period selector */}
      <div className="glass-card rounded-2xl p-4">
        {/* Mode toggle */}
        <div className="flex bg-bg dark:bg-bg-dark rounded-xl p-1 gap-1 mb-4">
          <button
            onClick={() => setMode('month')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              mode === 'month'
                ? 'bg-primary text-white shadow-md'
                : 'text-text-muted dark:text-text-muted-dark'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              mode === 'custom'
                ? 'bg-primary text-white shadow-md'
                : 'text-text-muted dark:text-text-muted-dark'
            }`}
          >
            Custom Range
          </button>
        </div>

        {mode === 'month' ? (
          <div className="flex items-center justify-between">
            <button
              onClick={prevMonth}
              className="w-9 h-9 rounded-full bg-bg dark:bg-bg-dark flex items-center justify-center press-effect hover:bg-border dark:hover:bg-border-dark transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-text-muted dark:text-text-muted-dark" />
            </button>
            <div className="text-center">
              <p className="text-lg font-bold text-text dark:text-text-dark">
                {getMonthName(selectedMonth)}
              </p>
              <p className="text-xs text-text-muted dark:text-text-muted-dark">{selectedYear}</p>
            </div>
            <button
              onClick={nextMonth}
              className="w-9 h-9 rounded-full bg-bg dark:bg-bg-dark flex items-center justify-center press-effect hover:bg-border dark:hover:bg-border-dark transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-text-muted dark:text-text-muted-dark" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-muted dark:text-text-muted-dark mb-1.5">From</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full px-3 py-2.5 bg-bg dark:bg-bg-dark border border-border dark:border-border-dark rounded-xl text-sm font-medium text-text dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted dark:text-text-muted-dark mb-1.5">To</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full px-3 py-2.5 bg-bg dark:bg-bg-dark border border-border dark:border-border-dark rounded-xl text-sm font-medium text-text dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-3 text-center">
          <p className="text-[10px] font-semibold text-text-muted dark:text-text-muted-dark uppercase tracking-wider mb-1">Income</p>
          <p className="text-sm font-bold text-income">{formatINR(totals.totalIncome)}</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <p className="text-[10px] font-semibold text-text-muted dark:text-text-muted-dark uppercase tracking-wider mb-1">Expenses</p>
          <p className="text-sm font-bold text-expense">{formatINR(totals.totalExpense)}</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <p className="text-[10px] font-semibold text-text-muted dark:text-text-muted-dark uppercase tracking-wider mb-1">Balance</p>
          <p className={`text-sm font-bold ${totals.netBalance >= 0 ? 'text-income' : 'text-expense'}`}>
            {formatINR(Math.abs(totals.netBalance))}
          </p>
        </div>
      </div>

      {/* Export buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => exportToPDF(filtered, dateRange)}
          disabled={filtered.length === 0}
          className="glass-card rounded-xl py-3.5 flex items-center justify-center gap-2 text-sm font-semibold text-expense press-effect hover:bg-expense/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FileDown className="w-4 h-4" />
          Export PDF
        </button>
        <button
          onClick={() => exportToExcel(filtered, dateRange)}
          disabled={filtered.length === 0}
          className="glass-card rounded-xl py-3.5 flex items-center justify-center gap-2 text-sm font-semibold text-income press-effect hover:bg-income/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export Excel
        </button>
      </div>

      {filtered.length > 0 && (
        <>
          {/* Category pie chart */}
          {categoryData.length > 0 && (
            <div className="glass-card rounded-2xl p-4">
              <h3 className="text-sm font-bold text-text dark:text-text-dark mb-4">Spending by Category</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex flex-wrap gap-2 mt-3">
                {categoryData.map((cat, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-text-muted dark:text-text-muted-dark">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span>{cat.icon} {cat.name}</span>
                    <span className="font-semibold">{formatINR(cat.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily income vs expense bar chart */}
          {dailyData.length > 0 && (
            <div className="glass-card rounded-2xl p-4">
              <h3 className="text-sm font-bold text-text dark:text-text-dark mb-4">Daily Breakdown</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* Monthly trend (always visible) */}
      <div className="glass-card rounded-2xl p-4">
        <h3 className="text-sm font-bold text-text dark:text-text-dark mb-4">6-Month Trend</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={monthlyTrend}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="income" name="Income" stroke="#22c55e" fill="url(#colorIncome)" strokeWidth={2} />
            <Area type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" fill="url(#colorExpense)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats */}
      {filtered.length > 0 && (
        <div className="glass-card rounded-2xl p-4">
          <h3 className="text-sm font-bold text-text dark:text-text-dark mb-3">Quick Stats</h3>
          <div className="space-y-3">
            <StatRow
              label="Transactions"
              value={`${filtered.length}`}
            />
            <StatRow
              label="Avg. Daily Spend"
              value={formatINR(
                totals.totalExpense /
                  Math.max(1, new Set(filtered.filter(t => t.type === 'expense').map((t) => new Date(t.date).toDateString())).size)
              )}
            />
            {categoryData.length > 0 && (
              <StatRow
                label="Top Category"
                value={`${categoryData[0].icon} ${categoryData[0].name}`}
              />
            )}
            {(() => {
              const expenses = filtered.filter(t => t.type === 'expense');
              if (expenses.length === 0) return null;
              const max = expenses.reduce((a, b) => Number(a.amount) > Number(b.amount) ? a : b);
              return (
                <StatRow
                  label="Biggest Expense"
                  value={`${formatINR(max.amount)} — ${max.description || getCategoryInfo(max.category).label}`}
                />
              );
            })()}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-10 fade-in">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-sm text-text-muted dark:text-text-muted-dark">
            No transactions found for this period
          </p>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-muted dark:text-text-muted-dark font-medium">{label}</span>
      <span className="text-xs font-bold text-text dark:text-text-dark">{value}</span>
    </div>
  );
}
