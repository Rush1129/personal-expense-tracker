// Indian number formatting (e.g., 1,00,000)
export function formatINR(amount) {
  const num = Math.abs(Number(amount));
  if (isNaN(num)) return '₹0';

  const formatted = num.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return `₹${formatted}`;
}

// Format date for display
export function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Format time for display
export function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// Format date for grouping (e.g., "Today", "Yesterday", "7 Sep 2026")
export function formatDateGroup(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Format date for input[type="datetime-local"]
export function toDateTimeLocal(dateString) {
  const date = new Date(dateString);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

// Parse datetime-local input value to ISO string
export function fromDateTimeLocal(value) {
  return new Date(value).toISOString();
}

// Get month name
export function getMonthName(month) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month];
}

// Group transactions by date
export function groupByDate(transactions) {
  const groups = {};
  transactions.forEach((t) => {
    const key = new Date(t.date).toDateString();
    if (!groups[key]) {
      groups[key] = {
        label: formatDateGroup(t.date),
        dateKey: key,
        transactions: [],
      };
    }
    groups[key].transactions.push(t);
  });

  // Sort groups by date (most recent first)
  return Object.values(groups).sort(
    (a, b) => new Date(b.dateKey) - new Date(a.dateKey)
  );
}

// Calculate totals
export function calculateTotals(transactions) {
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach((t) => {
    if (t.type === 'income') {
      totalIncome += Number(t.amount);
    } else {
      totalExpense += Number(t.amount);
    }
  });

  return {
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
  };
}

// Category definitions with icons, colors, and type ('expense' | 'income' | 'both')
export const CATEGORIES = {
  // Expenses
  food: { label: 'Food', icon: '🍽️', color: '#f07a2a', type: 'expense' },
  transport: { label: 'Transport', icon: '🚗', color: '#3b82f6', type: 'expense' },
  groceries: { label: 'Groceries', icon: '🛒', color: '#6fae2e', type: 'expense' },
  bills: { label: 'Bills and Rent', icon: '📄', color: '#7c5ce0', type: 'expense' },
  shopping: { label: 'Shopping', icon: '🛍️', color: '#e0478a', type: 'expense' },
  entertainment: { label: 'Entertainment', icon: '🎬', color: '#e5a50a', type: 'expense' },

  // Income
  pocketmoney: { label: 'Pocket Money', icon: '💰', color: '#d4a017', type: 'income'},
  investment: { label: 'Investment', icon: '📈', color: '#a855f7', type: 'income' },
  freelance: { label: 'Freelance', icon: '💻', color: '#0ea5c4', type: 'income' },
  salary: { label: 'Salary', icon: '💰', color: '#22a35a', type: 'income' },
  gift: { label: 'Gift', icon: '🎁', color: '#e11d48', type: 'income' },

  // Common / General
  other: { label: 'Other', icon: '📌', color: '#8e9287', type: 'both' },
};

// Safe category lookup with robust fallback to prevent crashes
export function getCategoryInfo(category) {
  if (CATEGORIES[category]) {
    return CATEGORIES[category];
  }
  if (CATEGORIES.other) {
    return CATEGORIES.other;
  }
  return {
    label: category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Other',
    icon: '📌',
    color: '#64748b',
  };
}

// Get category keys by type ('expense' or 'income')
export function getCategoriesByType(type) {
  return Object.entries(CATEGORIES)
    .filter(([_, info]) => {
      if (type === 'income') {
        return info.type === 'income' || info.type === 'both';
      }
      return info.type === 'expense' || info.type === 'both' || !info.type;
    })
    .map(([key]) => key);
}

