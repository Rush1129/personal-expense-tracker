import { useState, useRef, useEffect, useCallback } from 'react';
import { Clock } from 'lucide-react';

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const HALF = Math.floor(VISIBLE_ITEMS / 2);

function ScrollWheel({ items, selectedIndex, onSelect, label }) {
  const containerRef = useRef(null);
  const scrollTimeout = useRef(null);
  const isUserScrolling = useRef(false);

  // Scroll to the selected index on mount
  useEffect(() => {
    if (containerRef.current && !isUserScrolling.current) {
      containerRef.current.scrollTop = selectedIndex * ITEM_HEIGHT;
    }
  }, [selectedIndex]);

  const handleScroll = useCallback(() => {
    isUserScrolling.current = true;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

    scrollTimeout.current = setTimeout(() => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index));

      // Snap to position
      containerRef.current.scrollTo({
        top: clampedIndex * ITEM_HEIGHT,
        behavior: 'smooth',
      });

      onSelect(clampedIndex);
      setTimeout(() => {
        isUserScrolling.current = false;
      }, 200);
    }, 80);
  }, [items.length, onSelect]);

  return (
    <div className="flex flex-col items-center">
      <p className="text-[11px] font-semibold text-muted mb-1.5">
        {label}
      </p>
      <div
        className="relative overflow-hidden rounded-2xl bg-sunken"
        style={{ height: VISIBLE_ITEMS * ITEM_HEIGHT }}
      >
        {/* Selection highlight */}
        <div
          className="absolute left-1 right-1 bg-raised rounded-xl z-0 pointer-events-none"
          style={{
            top: HALF * ITEM_HEIGHT,
            height: ITEM_HEIGHT,
          }}
        />

        {/* Scroll container */}
        <div
          ref={containerRef}
          className="relative overflow-y-auto h-full no-scrollbar z-10"
          onScroll={handleScroll}
          style={{
            scrollSnapType: 'y mandatory',
            paddingTop: HALF * ITEM_HEIGHT,
            paddingBottom: HALF * ITEM_HEIGHT,
          }}
        >
          {items.map((item, i) => {
            const isSelected = i === selectedIndex;
            return (
              <div
                key={i}
                className={`flex items-center justify-center cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'text-ink font-semibold text-lg tabular-nums'
                    : 'text-muted/60 text-sm tabular-nums'
                }`}
                style={{
                  height: ITEM_HEIGHT,
                  scrollSnapAlign: 'start',
                  minWidth: 56,
                }}
                onClick={() => {
                  onSelect(i);
                  if (containerRef.current) {
                    containerRef.current.scrollTo({
                      top: i * ITEM_HEIGHT,
                      behavior: 'smooth',
                    });
                  }
                }}
              >
                {item}
              </div>
            );
          })}
        </div>

        {/* Fade edges */}
        <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-sunken to-transparent pointer-events-none z-20" />
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-sunken to-transparent pointer-events-none z-20" />
      </div>
    </div>
  );
}

export default function TimePicker({ value, onChange, enabled, onToggle }) {
  // value is an ISO string; extract hours and minutes
  const date = value ? new Date(value) : new Date();
  const hours24 = date.getHours();
  const minutes = date.getMinutes();

  const isPM = hours24 >= 12;
  const hours12 = hours24 % 12 || 12;

  const hourItems = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minuteItems = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  const periodItems = ['AM', 'PM'];

  const handleHourChange = (index) => {
    const newHour12 = index + 1;
    let newHour24 = isPM ? (newHour12 % 12) + 12 : newHour12 % 12;
    const d = new Date(value || new Date());
    d.setHours(newHour24, minutes, 0, 0);
    onChange(d.toISOString());
  };

  const handleMinuteChange = (index) => {
    const d = new Date(value || new Date());
    d.setMinutes(index, 0, 0);
    onChange(d.toISOString());
  };

  const handlePeriodChange = (index) => {
    const newIsPM = index === 1;
    const d = new Date(value || new Date());
    let h = d.getHours();
    if (newIsPM && h < 12) h += 12;
    if (!newIsPM && h >= 12) h -= 12;
    d.setHours(h, minutes, 0, 0);
    onChange(d.toISOString());
  };

  return (
    <div>
      {/* Toggle */}
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-1.5 mb-3 h-10 px-3.5 rounded-full text-sm font-semibold transition-all press-effect border ${
          enabled
            ? 'bg-ink text-ink-inverse border-ink'
            : 'bg-surface text-muted border-dashed border-muted/60 hover:text-ink'
        }`}
      >
        <Clock className="w-4 h-4" />
        {enabled ? 'Time set' : 'Add time (optional)'}
      </button>

      {enabled && (
        <div className="flex items-center justify-center gap-3 scale-in">
          <ScrollWheel
            items={hourItems}
            selectedIndex={hours12 - 1}
            onSelect={handleHourChange}
            label="Hour"
          />
          <span className="text-2xl font-semibold text-muted mt-5">:</span>
          <ScrollWheel
            items={minuteItems}
            selectedIndex={minutes}
            onSelect={handleMinuteChange}
            label="Min"
          />
          <ScrollWheel
            items={periodItems}
            selectedIndex={isPM ? 1 : 0}
            onSelect={handlePeriodChange}
            label="  "
          />
        </div>
      )}
    </div>
  );
}
