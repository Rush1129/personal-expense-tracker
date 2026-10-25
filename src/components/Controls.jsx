// Small shared controls for the Ink & Lime look

// options: [{ value, label, icon? }]; tone 'raised' (white pill) or 'ink' (filled)
export function Segmented({ options, value, onChange, tone = 'raised', size = 'md' }) {
  const height = size === 'sm' ? 'h-10 text-[13px]' : 'h-11 text-sm';
  const active =
    tone === 'ink'
      ? 'bg-ink text-ink-inverse font-semibold'
      : 'bg-raised text-ink font-semibold shadow-[0_1px_2px_rgb(14_15_12/0.08)]';

  return (
    <div
      className="grid gap-1 bg-sunken rounded-2xl p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map(({ value: v, label, icon: Icon }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={`${height} rounded-xl flex items-center justify-center gap-1.5 transition-all duration-200 ${
            value === v ? active : 'text-muted font-medium hover:text-ink'
          }`}
        >
          {Icon && <Icon className="w-4 h-4" strokeWidth={2.4} />}
          {label}
        </button>
      ))}
    </div>
  );
}

// Visual switch; put it inside a button with role="switch"
export function Switch({ on }) {
  return (
    <span
      className={`w-[52px] h-8 shrink-0 rounded-full p-[3px] flex transition-colors duration-200 ${
        on ? 'bg-ink dark:bg-accent justify-end' : 'bg-[#dadad5] dark:bg-[#3a3d35] justify-start'
      }`}
    >
      <span
        className={`w-[26px] h-[26px] rounded-full transition-colors ${
          on ? 'bg-accent dark:bg-on-accent' : 'bg-white dark:bg-[#9a9e92] shadow-sm'
        }`}
      />
    </span>
  );
}
