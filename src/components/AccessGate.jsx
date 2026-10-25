import { useState, useLayoutEffect } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { isDeviceUnlocked, tryAccessCode } from '../access';

// Shows the code screen until this device has entered a valid access code
export default function AccessGate({ children }) {
  const [unlocked, setUnlocked] = useState(isDeviceUnlocked);
  if (unlocked) return children;
  return <CodeScreen onUnlock={() => setUnlocked(true)} />;
}

function CodeScreen({ onUnlock }) {
  const [code, setCode] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [cooling, setCooling] = useState(false);

  // The app's provider (which applies dark mode) hasn't mounted yet; set it before paint
  useLayoutEffect(() => {
    let dark;
    try {
      const stored = localStorage.getItem('spendwise-dark-mode');
      dark = stored !== null ? JSON.parse(stored) : window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    document.documentElement.classList.toggle('dark', !!dark);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!code.trim() || cooling) return;
    if (tryAccessCode(code)) {
      onUnlock();
      return;
    }
    setError("That code didn't work. Check it and try again.");
    // Short pause between attempts
    setCooling(true);
    setTimeout(() => setCooling(false), 1000);
  };

  return (
    <div className="min-h-dvh bg-bg text-ink flex flex-col px-5 safe-top">
      <main className="flex-1 w-full max-w-sm mx-auto flex flex-col justify-center py-12 slide-up">
        <span className="w-16 h-16 rounded-[20px] bg-accent text-on-accent flex items-center justify-center text-[28px] font-bold">
          ₹
        </span>
        <h1 className="mt-6 text-[28px] font-bold tracking-[-0.03em]">SpendWise</h1>
        <p className="mt-1.5 text-[15px] text-muted">Enter your access code to continue.</p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-2" noValidate>
          <label htmlFor="access-code" className="text-[13px] font-medium text-muted">
            Access code
          </label>
          <div
            className={`flex items-center gap-2 h-14 pl-4 pr-1.5 rounded-2xl bg-surface border transition-colors ${
              error ? 'border-danger' : 'border-line focus-within:border-ink'
            }`}
          >
            <LockKeyhole className="w-5 h-5 shrink-0 text-muted" aria-hidden="true" />
            <input
              id="access-code"
              type={show ? 'text' : 'password'}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (error) setError('');
              }}
              autoFocus
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={!!error}
              aria-describedby={error ? 'access-error' : undefined}
              className="flex-1 min-w-0 bg-transparent text-[17px] font-medium tracking-wide placeholder:text-muted focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Hide code' : 'Show code'}
              className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-muted hover:text-ink transition-colors"
            >
              {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {error && (
            <p id="access-error" role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!code.trim() || cooling}
            className="mt-3 h-14 rounded-full bg-ink text-ink-inverse text-base font-semibold flex items-center justify-center gap-2 press-effect transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Unlock
            <ArrowRight className="w-5 h-5 text-accent dark:text-on-accent" strokeWidth={2.4} />
          </button>
        </form>

        <p className="mt-6 text-[13px] text-muted">You only need to enter it once on this device.</p>
      </main>
    </div>
  );
}
