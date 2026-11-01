import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import {
  formatINR, formatDate, formatTime, getCategoryInfo, calculateTotals, groupByDate, getMonthName, CATEGORIES,
} from './utils';
import { CATEGORY_ICONS } from './components/categoryIcons';

// Load and register Noto Sans fonts with jsPDF for ₹ symbol support
async function registerNotoSansFont(doc) {
  const loadFont = async (url, filename, fontName, fontStyle) => {
    const response = await fetch(url);
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    doc.addFileToVFS(filename, btoa(binary));
    doc.addFont(filename, fontName, fontStyle);
  };

  await Promise.all([
    loadFont('/fonts/NotoSans-Regular.ttf', 'NotoSans-Regular.ttf', 'NotoSans', 'normal'),
    loadFont('/fonts/NotoSans-Bold.ttf', 'NotoSans-Bold.ttf', 'NotoSans', 'bold'),
  ]);

  doc.setFont('NotoSans', 'normal');
}

// ==========================================
// PDF report in the app's Ink & Lime look:
// balance card, "Where it went", stats, then
// the entries grouped by day like the Home list.
// ==========================================

// Light-mode tokens from index.css
const C = {
  bg: '#f5f5f2',
  surface: '#ffffff',
  sunken: '#f0f0ec',
  line: '#e6e6e1',
  divider: '#eeeeea',
  ink: '#0e0f0c',
  inkInverse: '#f5f5f2',
  muted: '#5e6259',
  accent: '#cdf24a',
  income: '#177245',
  heroMuted: '#a3a79c',
  heroTile: '#1c1e1a',
  heroTrack: '#2a2c27',
  over: '#ff8a5c',
};

// Category tiles: [tint, icon colour] (.cat-* in index.css)
const CAT_TINTS = {
  food: ['#ffe8d6', '#b4470b'],
  transport: ['#dcebff', '#1d5fc2'],
  groceries: ['#e3f4d2', '#3e7a12'],
  bills: ['#ece4ff', '#5b3cc4'],
  shopping: ['#ffe0ee', '#b8246a'],
  entertainment: ['#fff0c7', '#946200'],
  pocketmoney: ['#fff0c7', '#946200'],
  investment: ['#efe1fb', '#7a35b0'],
  freelance: ['#d5f1f6', '#0b6f82'],
  salary: ['#d9f2e4', '#177245'],
  gift: ['#ffe1e4', '#be1e3a'],
  other: ['#ecece8', '#5e6259'],
};

const PAGE_W = 210;
const PAGE_H = 297;
const LEFT = 14;
const RIGHT = PAGE_W - 14;
const WIDTH = RIGHT - LEFT;
const BOTTOM = 280; // content stops here; the footer sits below
const DAY_H = 14;
const CONTINUED_H = 9;
const ROW_H = 12;

// The category icons as PNGs (the same lucide icons the app draws), keyed by category
async function categoryIconImages() {
  const toPng = (key) =>
    new Promise((resolve, reject) => {
      const host = document.createElement('div');
      const root = createRoot(host);
      flushSync(() => root.render(createElement(CATEGORY_ICONS[key], { size: 96, color: CAT_TINTS[key][1], strokeWidth: 2 })));
      const markup = host.innerHTML;
      root.unmount();

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 96;
        canvas.getContext('2d').drawImage(img, 0, 0, 96, 96);
        resolve([key, canvas.toDataURL('image/png')]);
      };
      img.onerror = reject;
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
    });
  try {
    return Object.fromEntries(await Promise.all(Object.keys(CATEGORY_ICONS).map(toPng)));
  } catch (err) {
    console.warn('Category icons left out of the PDF:', err);
    return {};
  }
}

export async function exportToPDF(transactions, dateRange) {
  const doc = new jsPDF();
  const [icons] = await Promise.all([categoryIconImages(), registerNotoSansFont(doc)]);

  const list = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const { totalIncome, totalExpense, netBalance } = calculateTotals(list);
  const expenses = list.filter((t) => t.type === 'expense');

  // ---------- Drawing helpers ----------

  const setFont = (size, bold) => {
    doc.setFont('NotoSans', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
  };
  const text = (str, x, y, { size = 10, bold = false, color = C.ink, align } = {}) => {
    setFont(size, bold);
    doc.setTextColor(color);
    doc.text(String(str), x, y, align ? { align } : undefined);
  };
  // Shortens text with … to fit maxWidth
  const fit = (str, maxWidth, size, bold = false) => {
    setFont(size, bold);
    let out = String(str);
    if (doc.getTextWidth(out) <= maxWidth) return out;
    while (out.length > 1 && doc.getTextWidth(`${out}…`) > maxWidth) out = out.slice(0, -1);
    return `${out.trimEnd()}…`;
  };
  const card = (x, y, w, h, r) => {
    doc.setFillColor(C.surface);
    doc.setDrawColor(C.line);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y, w, h, r, r, 'FD');
  };
  const rule = (x1, x2, y) => {
    doc.setDrawColor(C.divider);
    doc.setLineWidth(0.25);
    doc.line(x1, y, x2, y);
  };
  // The ↙ (income) and ↗ (expense) arrows from the balance card
  const arrow = (cx, cy, incoming, color) => {
    const s = 1.3;
    doc.setDrawColor(color);
    doc.setLineWidth(0.45);
    doc.setLineCap('round');
    if (incoming) {
      doc.line(cx + s, cy - s, cx - s, cy + s);
      doc.line(cx - s, cy + s, cx - s, cy + s - 1.7);
      doc.line(cx - s, cy + s, cx - s + 1.7, cy + s);
    } else {
      doc.line(cx - s, cy + s, cx + s, cy - s);
      doc.line(cx + s, cy - s, cx + s - 1.7, cy - s);
      doc.line(cx + s, cy - s, cx + s, cy - s + 1.7);
    }
    doc.setLineCap('butt');
  };

  const paintPage = () => {
    doc.setFillColor(C.bg);
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
  };
  let y = 14;
  const newPage = () => {
    doc.addPage();
    paintPage();
    y = 16;
  };
  const ensure = (height) => {
    if (y + height > BOTTOM) newPage();
  };
  paintPage();

  // ---------- Header ----------

  doc.setFillColor(C.accent);
  doc.roundedRect(LEFT, y, 12, 12, 3.75, 3.75, 'F');
  text('₹', LEFT + 6, y + 9, { size: 23, bold: true, align: 'center' });
  text('SpendWise', LEFT + 16, y + 5.6, { size: 15, bold: true });
  text('Expense report', LEFT + 16, y + 10.6, { size: 8.5, color: C.muted });
  text(dateRange.label, RIGHT, y + 5.6, { size: 11, bold: true, align: 'right' });
  text(`Generated ${formatDate(new Date().toISOString())}`, RIGHT, y + 10.6, { size: 8, color: C.muted, align: 'right' });
  y += 19;

  // ---------- Balance card ----------

  const spentPct = totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : null;
  const heroH = spentPct !== null ? 61 : 52;
  doc.setFillColor(C.ink);
  doc.roundedRect(LEFT, y, WIDTH, heroH, 6, 6, 'F');

  let hy = y + 10;
  text('Net balance', LEFT + 7, hy, { size: 9, color: C.heroMuted });
  const pill = `${list.length} ${list.length === 1 ? 'entry' : 'entries'}`;
  setFont(8, true);
  const pillW = doc.getTextWidth(pill) + 7;
  doc.setFillColor(C.accent);
  doc.roundedRect(RIGHT - 7 - pillW, hy - 4.4, pillW, 6.2, 3.1, 3.1, 'F');
  text(pill, RIGHT - 7 - pillW / 2, hy - 0.2, { size: 8, bold: true, align: 'center' });
  hy += 12;
  text(`${netBalance < 0 ? '−' : ''}${formatINR(Math.abs(netBalance))}`, LEFT + 7, hy, { size: 28, bold: true, color: C.inkInverse });
  hy += 8;

  if (spentPct !== null) {
    const over = spentPct > 100;
    text(over ? 'Over budget' : `${spentPct}% of income spent`, LEFT + 7, hy, { size: 8, color: C.heroMuted });
    text(`${formatINR(totalExpense)} of ${formatINR(totalIncome)}`, RIGHT - 7, hy, { size: 8, color: C.heroMuted, align: 'right' });
    hy += 2.5;
    const trackW = WIDTH - 14;
    doc.setFillColor(C.heroTrack);
    doc.roundedRect(LEFT + 7, hy, trackW, 2, 1, 1, 'F');
    if (spentPct > 0) {
      doc.setFillColor(over ? C.over : C.accent);
      doc.roundedRect(LEFT + 7, hy, Math.max(2, (trackW * Math.min(100, spentPct)) / 100), 2, 1, 1, 'F');
    }
    hy += 6.5;
  }

  const tileW = (WIDTH - 14 - 4) / 2;
  [
    ['Income', totalIncome, true, C.accent],
    ['Expenses', totalExpense, false, C.inkInverse],
  ].forEach(([label, value, incoming, arrowColor], i) => {
    const tx = LEFT + 7 + i * (tileW + 4);
    doc.setFillColor(C.heroTile);
    doc.roundedRect(tx, hy, tileW, 16, 4, 4, 'F');
    arrow(tx + 5.2, hy + 5.4, incoming, arrowColor);
    text(label, tx + 8.8, hy + 6.4, { size: 8, color: C.heroMuted });
    text(formatINR(value), tx + 4, hy + 12.8, { size: 12, bold: true, color: C.inkInverse });
  });
  y += heroH + 5;

  // ---------- Where it went ----------

  const byCategory = {};
  expenses.forEach((t) => {
    const key = CATEGORIES[t.category] ? t.category : 'other';
    byCategory[key] = (byCategory[key] || 0) + Number(t.amount);
  });
  const cats = Object.entries(byCategory)
    .map(([key, value]) => ({ key, value, ...getCategoryInfo(key) }))
    .sort((a, b) => b.value - a.value);

  if (cats.length && totalExpense > 0) {
    const rowH = 7;
    const cardH = 25 + cats.length * rowH;
    ensure(cardH);
    card(LEFT, y, WIDTH, cardH, 5);
    text('Where it went', LEFT + 6, y + 9, { size: 11, bold: true });
    text(`${formatINR(totalExpense)} spent`, RIGHT - 6, y + 9, { size: 8.5, color: C.muted, align: 'right' });

    // One segmented bar, like the Home card
    const gap = 0.8;
    const barW = WIDTH - 12 - gap * (cats.length - 1);
    const widths = cats.map((c) => Math.max(1.6, (barW * c.value) / totalExpense));
    const scale = barW / widths.reduce((a, b) => a + b, 0);
    let bx = LEFT + 6;
    cats.forEach((c, i) => {
      const w = widths[i] * scale;
      doc.setFillColor(c.color);
      doc.roundedRect(bx, y + 13.5, w, 2.6, Math.min(1.3, w / 2), 1.3, 'F');
      bx += w + gap;
    });

    let ry = y + 20.5;
    cats.forEach((c, i) => {
      if (i > 0) rule(LEFT + 6, RIGHT - 6, ry);
      doc.setFillColor(c.color);
      doc.circle(LEFT + 7.3, ry + 3.5, 1.15, 'F');
      text(c.label, LEFT + 11, ry + 4.7, { size: 9.5 });
      text(formatINR(c.value), RIGHT - 19, ry + 4.7, { size: 9.5, bold: true, align: 'right' });
      text(`${Math.round((c.value / totalExpense) * 100)}%`, RIGHT - 6, ry + 4.7, { size: 9, color: C.muted, align: 'right' });
      ry += rowH;
    });
    y += cardH + 5;
  }

  // ---------- Stats ----------

  const spendDays = new Set(expenses.map((t) => new Date(t.date).toDateString())).size;
  const biggest = expenses.length ? expenses.reduce((a, b) => (Number(a.amount) >= Number(b.amount) ? a : b)) : null;
  const stats = [
    ['Transactions', String(list.length)],
    ['Avg. daily spend', formatINR(Math.round(totalExpense / Math.max(1, spendDays)))],
    biggest && ['Biggest expense', `${formatINR(biggest.amount)} · ${biggest.description || getCategoryInfo(biggest.category).label}`],
  ].filter(Boolean);
  ensure(16);
  const statW = (WIDTH - 4 * (stats.length - 1)) / stats.length;
  stats.forEach(([label, value], i) => {
    const sx = LEFT + i * (statW + 4);
    card(sx, y, statW, 16, 4);
    text(label, sx + 4, y + 6.2, { size: 8, color: C.muted });
    text(fit(value, statW - 8, 10.5, true), sx + 4, y + 12.2, { size: 10.5, bold: true });
  });
  y += 16 + 8;

  // ---------- Entries by day ----------

  ensure(8 + DAY_H + ROW_H);
  text('Transactions', LEFT + 1, y + 3, { size: 13, bold: true });
  text(`${list.length} ${list.length === 1 ? 'entry' : 'entries'}`, RIGHT - 1, y + 3, { size: 8.5, color: C.muted, align: 'right' });
  y += 8;

  const dayHeader = (group, top) => {
    const day = new Date(group.dateKey);
    let spent = 0;
    let earned = 0;
    group.transactions.forEach((t) => {
      if (t.type === 'income') earned += Number(t.amount);
      else spent += Number(t.amount);
    });

    doc.setFillColor(C.sunken);
    doc.roundedRect(LEFT + 4, top + 2.25, 9.5, 9.5, 3, 3, 'F');
    text(day.getDate(), LEFT + 8.75, top + 7, { size: 10.5, bold: true, align: 'center' });
    text(getMonthName(day.getMonth()).slice(0, 3).toUpperCase(), LEFT + 8.75, top + 10.2, { size: 5.5, bold: true, color: C.muted, align: 'center' });

    const count = group.transactions.length;
    text(day.toLocaleDateString('en-IN', { weekday: 'long' }), LEFT + 17, top + 6.4, { size: 10.5, bold: true });
    text(`${count} ${count === 1 ? 'entry' : 'entries'}`, LEFT + 17, top + 10.8, { size: 8, color: C.muted });

    if (spent > 0) text(`−${formatINR(spent)}`, RIGHT - 4.5, top + 6.4, { size: 10.5, bold: true, align: 'right' });
    if (earned > 0) {
      text(`+${formatINR(earned)}`, RIGHT - 4.5, spent > 0 ? top + 10.8 : top + 6.4, {
        size: spent > 0 ? 8.5 : 10.5,
        bold: spent === 0,
        color: C.income,
        align: 'right',
      });
    }
  };

  const continuedHeader = (group, top) => {
    const day = new Date(group.dateKey);
    const label = day.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
    text(`${label} · continued`, LEFT + 4.5, top + 5.9, { size: 8.5, color: C.muted });
  };

  const entryRow = (t, top) => {
    const key = CATEGORIES[t.category] ? t.category : 'other';
    const info = getCategoryInfo(key);
    doc.setFillColor(CAT_TINTS[key][0]);
    doc.roundedRect(LEFT + 4.5, top + 1.75, 8.5, 8.5, 2.7, 2.7, 'F');
    if (icons[key]) doc.addImage(icons[key], 'PNG', LEFT + 6.4, top + 3.65, 4.7, 4.7);

    const isExpense = t.type === 'expense';
    const amount = `${isExpense ? '−' : '+'}${formatINR(t.amount)}`;
    setFont(9.5, true);
    const amountW = doc.getTextWidth(amount);
    text(amount, RIGHT - 4.5, top + 7.1, { size: 9.5, bold: true, color: isExpense ? C.ink : C.income, align: 'right' });

    const textW = RIGHT - 4.5 - amountW - 6 - (LEFT + 17);
    text(fit(t.description || info.label, textW, 9.5), LEFT + 17, top + 5.4, { size: 9.5 });
    text(fit(`${info.label} · ${formatTime(t.date)}`, textW, 8), LEFT + 17, top + 9.5, { size: 8, color: C.muted });
  };

  for (const group of groupByDate(list)) {
    const rows = group.transactions;
    let i = 0;
    let first = true;
    // A day that doesn't fit carries on in a new card on the next page,
    // but starts with at least two of its entries rather than leave one behind
    while (i < rows.length) {
      const headH = first ? DAY_H : CONTINUED_H;
      const minRows = first ? Math.min(2, rows.length) : 1;
      if (y + headH + minRows * ROW_H > BOTTOM) newPage();
      const count = Math.max(1, Math.min(rows.length - i, Math.floor((BOTTOM - y - headH) / ROW_H)));
      const height = headH + count * ROW_H;
      card(LEFT, y, WIDTH, height, 4.5);
      if (first) dayHeader(group, y);
      else continuedHeader(group, y);
      let ry = y + headH;
      rule(LEFT, RIGHT, ry);
      for (let k = 0; k < count; k++, i++) {
        if (k > 0) rule(LEFT + 17, RIGHT, ry);
        entryRow(rows[i], ry);
        ry += ROW_H;
      }
      y += height + 3.5;
      first = false;
    }
  }

  // ---------- Footer ----------

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    text(`SpendWise · ${dateRange.label}`, LEFT, PAGE_H - 9, { size: 7.5, color: C.muted });
    text(`Page ${i} of ${pageCount}`, RIGHT, PAGE_H - 9, { size: 7.5, color: C.muted, align: 'right' });
  }

  doc.save(`SpendWise_Report_${dateRange.label.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

export function exportToExcel(transactions, dateRange) {
  const { totalIncome, totalExpense, netBalance } = calculateTotals(transactions);

  const data = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((t) => ({
      Date: formatDate(t.date),
      Time: formatTime(t.date),
      Type: t.type === 'income' ? 'Income' : 'Expense',
      Category: t.category ? getCategoryInfo(t.category).label : '-',
      Description: t.description || '-',
      Amount: t.type === 'expense' ? -Number(t.amount) : Number(t.amount),
    }));

  // Add summary rows
  data.push({});
  data.push({ Date: 'SUMMARY', Description: 'Total Income', Amount: totalIncome });
  data.push({ Description: 'Total Expenses', Amount: -totalExpense });
  data.push({ Description: 'Net Balance', Amount: netBalance });

  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths
  ws['!cols'] = [
    { wch: 14 },  // Date
    { wch: 10 },  // Time
    { wch: 10 },  // Type
    { wch: 18 },  // Category
    { wch: 30 },  // Description
    { wch: 16 },  // Amount
  ];

  // Format amount column as Indian currency
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r + 1; R <= range.e.r; R++) {
    const cell = ws[XLSX.utils.encode_cell({ r: R, c: 5 })];
    if (cell && typeof cell.v === 'number') {
      cell.z = '₹#,##0.00';
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Expense Report');

  // Add a summary sheet
  const summaryData = [
    { Metric: 'Report Period', Value: dateRange.label },
    { Metric: 'Generated On', Value: formatDate(new Date().toISOString()) },
    { Metric: 'Total Transactions', Value: transactions.length },
    { Metric: 'Total Income', Value: totalIncome },
    { Metric: 'Total Expenses', Value: totalExpense },
    { Metric: 'Net Balance', Value: netBalance },
  ];

  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  summaryWs['!cols'] = [{ wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  XLSX.writeFile(wb, `SpendWise_Report_${dateRange.label.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
}
