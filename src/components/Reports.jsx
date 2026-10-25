import { useState, useMemo } from 'react';
import { useApp } from '../AppContext';
import { formatINR, formatDate, getMonthName, calculateTotals, getCategoryInfo } from '../utils';
import { exportToPDF, exportToExcel } from '../exportUtils';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { FileDown, FileSpreadsheet, ChevronLeft, ChevronRight, ChartColumn } from 'lucide-react';
import { Segmented } from './Controls';

// ₹850 → "₹850", ₹12,000 → "₹12k", ₹1,50,000 → "₹1.5L"
function formatAxis(v) {
  if (v >= 100000) return `₹${+(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${+(v / 1000).toFixed(1)}k`;
  return `₹${v}`;
}

const axisTick = { fontSize: 11, fill: 'var(--color-muted)' };

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card rounded-xl px-3 py-2 shadow-lg text-xs">
      {label && <p className="font-semibold mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5 font-medium tabular-nums">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.payload?.color || p.color || p.fill }} />
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
  const expenses = filtered.filter((t) => t.type === 'expense');
  const avgDaily =
    totals.totalExpense / Math.max(1, new Set(expenses.map((t) => new Date(t.date).toDateString())).size);

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

  // Category breakdown for the donut
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
        color: getCategoryInfo(key).color,
      }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Daily spending: every day of the month (up to today), or each day with spending in a custom range
  const dailyData = useMemo(() => {
    if (mode === 'month') {
      const today = new Date();
      const isCurrent = selectedYear === today.getFullYear() && selectedMonth === today.getMonth();
      const lastDay = isCurrent ? today.getDate() : new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const monthShort = getMonthName(selectedMonth).slice(0, 3);
      const days = Array.from({ length: lastDay }, (_, i) => ({
        name: `${i + 1} ${monthShort}`,
        expense: 0,
        isToday: isCurrent && i + 1 === today.getDate(),
      }));
      filtered.forEach((t) => {
        if (t.type !== 'expense') return;
        const day = days[new Date(t.date).getDate() - 1];
        if (day) day.expense += Number(t.amount);
      });
      return days;
    }
    const map = {};
    filtered.forEach((t) => {
      if (t.type !== 'expense') return;
      const d = new Date(t.date);
      const key = d.toDateString();
      if (!map[key]) {
        map[key] = { name: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), expense: 0, time: d.getTime() };
      }
      map[key].expense += Number(t.amount);
    });
    return Object.values(map).sort((a, b) => a.time - b.time);
  }, [filtered, mode, selectedMonth, selectedYear]);

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

  const biggest = expenses.length
    ? expenses.reduce((a, b) => (Number(a.amount) > Number(b.amount) ? a : b))
    : null;

  const dateInput =
    'w-full h-12 px-3 bg-sunken border border-line rounded-[14px] text-sm font-medium focus:outline-none focus:border-ink dark:[color-scheme:dark]';

  return (
    <div className="flex flex-col gap-3.5">
      {/* Period selector */}
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'month', label: 'Monthly' },
          { value: 'custom', label: 'Custom range' },
        ]}
      />

      {mode === 'month' ? (
        <div className="card rounded-[20px] p-2.5 flex items-center justify-between">
          <button
            onClick={prevMonth}
            aria-label="Previous month"
            className="w-11 h-11 rounded-[14px] bg-sunken flex items-center justify-center press-effect hover:bg-line transition-colors"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2.2} />
          </button>
          <div className="text-center">
            <p className="text-[17px] font-semibold">{getMonthName(selectedMonth)}</p>
            <p className="text-xs text-muted">{selectedYear}</p>
          </div>
          <button
            onClick={nextMonth}
            aria-label="Next month"
            className="w-11 h-11 rounded-[14px] bg-sunken flex items-center justify-center press-effect hover:bg-line transition-colors"
          >
            <ChevronRight className="w-5 h-5" strokeWidth={2.2} />
          </button>
        </div>
      ) : (
        <div className="card rounded-[20px] p-3 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="range-from" className="block text-[13px] font-medium text-muted mb-1.5">From</label>
            <input
              id="range-from"
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className={dateInput}
            />
          </div>
          <div>
            <label htmlFor="range-to" className="block text-[13px] font-medium text-muted mb-1.5">To</label>
            <input
              id="range-to"
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className={dateInput}
            />
          </div>
        </div>
      )}

      {/* Export buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => exportToPDF(filtered, dateRange).catch(() => {})}
          disabled={filtered.length === 0}
          className="h-12 rounded-full border border-ink bg-surface flex items-center justify-center gap-2 text-sm font-semibold press-effect hover:bg-sunken transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FileDown className="w-[18px] h-[18px]" />
          Download PDF
        </button>
        <button
          onClick={() => exportToExcel(filtered, dateRange)}
          disabled={filtered.length === 0}
          className="h-12 rounded-full border border-ink bg-surface flex items-center justify-center gap-2 text-sm font-semibold press-effect hover:bg-sunken transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FileSpreadsheet className="w-[18px] h-[18px]" />
          Download Excel
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="card rounded-[18px] p-3 flex flex-col gap-1.5 min-w-0">
          <p className="text-xs font-medium text-muted">Income</p>
          <p className="text-[17px] font-semibold tracking-tight text-income truncate tabular-nums">{formatINR(totals.totalIncome)}</p>
        </div>
        <div className="card rounded-[18px] p-3 flex flex-col gap-1.5 min-w-0">
          <p className="text-xs font-medium text-muted">Spent</p>
          <p className="text-[17px] font-semibold tracking-tight truncate tabular-nums">{formatINR(totals.totalExpense)}</p>
        </div>
        <div className="rounded-[18px] p-3 flex flex-col gap-1.5 min-w-0 bg-hero text-hero-ink">
          <p className="text-xs font-medium text-hero-muted">{totals.netBalance >= 0 ? 'Saved' : 'Overspent'}</p>
          <p className="text-[17px] font-semibold tracking-tight text-hero-fill truncate tabular-nums">
            {formatINR(Math.abs(totals.netBalance))}
          </p>
        </div>
      </div>

      {filtered.length > 0 && (
        <>
          {/* Category donut */}
          {categoryData.length > 0 && (
            <section className="card rounded-3xl p-[18px]">
              <h2 className="text-base font-semibold mb-2">Spending by category</h2>
              <div className="relative h-[210px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={64}
                      outerRadius={90}
                      paddingAngle={2}
                      cornerRadius={4}
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
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs font-medium text-muted">Total spent</span>
                  <span className="text-2xl font-semibold tracking-[-0.03em] tabular-nums">{formatINR(totals.totalExpense)}</span>
                </div>
              </div>
              {/* Breakdown */}
              <div className="mt-2">
                {categoryData.map((cat, i) => {
                  const pct = totals.totalExpense > 0 ? (cat.value / totals.totalExpense) * 100 : 0;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2.5 h-10 text-sm ${i > 0 ? 'border-t border-divider' : ''}`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="flex-1 min-w-0 truncate font-medium">{cat.name}</span>
                      <span className="font-semibold tabular-nums">{formatINR(cat.value)}</span>
                      <span className="w-10 text-right text-muted tabular-nums">{Math.round(pct)}%</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Daily spending */}
          {dailyData.some((d) => d.expense > 0) && (
            <section className="card rounded-3xl p-[18px]">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-base font-semibold">Daily spending</h2>
                <span className="text-xs font-medium text-muted tabular-nums">Avg {formatINR(Math.round(avgDaily))} a day</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dailyData} margin={{ top: 4, right: 0, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={axisTick}
                    tickFormatter={(v) => (mode === 'month' ? v.split(' ')[0] : v)}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={10}
                  />
                  <YAxis tick={axisTick} tickFormatter={formatAxis} axisLine={false} tickLine={false} width={44} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-sunken)' }} />
                  <Bar dataKey="expense" name="Spent" fill="var(--color-bar)" radius={[3, 3, 0, 0]} maxBarSize={14}>
                    {dailyData.map((d, i) => (
                      <Cell key={i} fill={d.isToday ? 'var(--color-ink)' : 'var(--color-bar)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </section>
          )}
        </>
      )}

      {/* Monthly trend (always visible) */}
      <section className="card rounded-3xl p-[18px]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">6-month trend</h2>
          <div className="flex gap-3 text-xs font-medium text-muted">
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-income" />Income</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-ink" />Spent</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={monthlyTrend} barGap={4} margin={{ top: 4, right: 0, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
            <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} tickFormatter={formatAxis} axisLine={false} tickLine={false} width={44} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-sunken)' }} />
            <Bar dataKey="income" name="Income" fill="var(--color-income)" radius={[4, 4, 0, 0]} maxBarSize={16} />
            <Bar dataKey="expense" name="Spent" fill="var(--color-ink)" radius={[4, 4, 0, 0]} maxBarSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Stats */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <StatTile label="Transactions" value={`${filtered.length}`} />
          <StatTile label="Avg. daily spend" value={formatINR(avgDaily)} />
          {categoryData.length > 0 && (
            <StatTile
              label="Top category"
              value={
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: categoryData[0].color }} />
                  <span className="truncate">{categoryData[0].name}</span>
                </span>
              }
            />
          )}
          {biggest && (
            <StatTile
              label="Biggest expense"
              value={`${formatINR(biggest.amount)} · ${biggest.description || getCategoryInfo(biggest.category).label}`}
            />
          )}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="card rounded-3xl text-center px-6 py-10 fade-in">
          <div className="w-14 h-14 rounded-full bg-sunken flex items-center justify-center mx-auto mb-3">
            <ChartColumn className="w-6 h-6 text-muted" />
          </div>
          <p className="text-sm text-muted">No transactions found for this period</p>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value }) {
  return (
    <div className="card rounded-[18px] p-3.5 flex flex-col gap-1.5 min-w-0">
      <span className="text-xs font-medium text-muted">{label}</span>
      <span className="text-base font-semibold truncate tabular-nums">{value}</span>
    </div>
  );
}
