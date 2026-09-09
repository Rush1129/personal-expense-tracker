import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function DatePicker({ value, onChange }) {
  const selected = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days = [];

    // Previous month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        date: new Date(viewYear, viewMonth - 1, daysInPrevMonth - i),
      });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        day: d,
        isCurrentMonth: true,
        date: new Date(viewYear, viewMonth, d),
      });
    }

    // Next month leading days
    const remaining = 42 - days.length; // always show 6 rows
    for (let d = 1; d <= remaining; d++) {
      days.push({
        day: d,
        isCurrentMonth: false,
        date: new Date(viewYear, viewMonth + 1, d),
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isSelected = (date) => {
    if (!value) return false;
    const s = new Date(value);
    return (
      date.getFullYear() === s.getFullYear() &&
      date.getMonth() === s.getMonth() &&
      date.getDate() === s.getDate()
    );
  };

  const isToday = (date) => {
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const handleSelect = (date) => {
    // Preserve the time from the existing value, or use current time
    const existing = value ? new Date(value) : new Date();
    const newDate = new Date(date);
    newDate.setHours(existing.getHours(), existing.getMinutes(), 0, 0);
    onChange(newDate.toISOString());
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <div className="select-none">
      {/* Month/Year header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className="w-8 h-8 rounded-full bg-bg dark:bg-bg-dark flex items-center justify-center press-effect hover:bg-border dark:hover:bg-border-dark transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-text-muted dark:text-text-muted-dark" />
        </button>
        <p className="text-sm font-bold text-text dark:text-text-dark">
          {MONTHS[viewMonth]} {viewYear}
        </p>
        <button
          type="button"
          onClick={nextMonth}
          className="w-8 h-8 rounded-full bg-bg dark:bg-bg-dark flex items-center justify-center press-effect hover:bg-border dark:hover:bg-border-dark transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-text-muted dark:text-text-muted-dark" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0 mb-1">
        {DAYS.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] font-bold text-text-muted dark:text-text-muted-dark uppercase py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0">
        {calendarDays.map((item, i) => {
          const sel = isSelected(item.date);
          const tod = isToday(item.date);

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(item.date)}
              className={`
                relative w-full aspect-square flex items-center justify-center text-xs font-medium rounded-full transition-all duration-150
                ${!item.isCurrentMonth ? 'text-text-muted/30 dark:text-text-muted-dark/30' : ''}
                ${item.isCurrentMonth && !sel ? 'text-text dark:text-text-dark hover:bg-primary/10' : ''}
                ${sel ? 'bg-primary text-white font-bold shadow-md shadow-primary/20' : ''}
                ${tod && !sel ? 'ring-1 ring-primary/40' : ''}
                press-effect
              `}
            >
              {item.day}
            </button>
          );
        })}
      </div>

      {/* Quick select */}
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={() => {
            const now = new Date();
            setViewMonth(now.getMonth());
            setViewYear(now.getFullYear());
            handleSelect(now);
          }}
          className="flex-1 py-2 rounded-lg text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/15 transition-colors press-effect"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            setViewMonth(yesterday.getMonth());
            setViewYear(yesterday.getFullYear());
            handleSelect(yesterday);
          }}
          className="flex-1 py-2 rounded-lg text-[11px] font-semibold text-text-muted dark:text-text-muted-dark bg-bg dark:bg-bg-dark hover:bg-border dark:hover:bg-border-dark transition-colors press-effect"
        >
          Yesterday
        </button>
      </div>
    </div>
  );
}
