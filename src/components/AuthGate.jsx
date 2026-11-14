import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { supabase } from '../supabaseClient';
import {
  authEnabled,
  startupUser,
  getRedirectError,
  clearRedirectError,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signOutDevice,
} from '../auth';
import { openAccountDb, closeAccountDb } from '../db';
import Logo from './Logo';

// Shows the sign-in screen until someone is signed in on this device, then opens
// that account's data. `children` is a function given { user, signOut }, or null
// in offline-only mode (no Supabase, no accounts).
export default function AuthGate({ children }) {
  const [user, setUser] = useState(startupUser);
  const [openFor, setOpenFor] = useState(null);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!authEnabled) return;
    // No Supabase calls in here: the callback runs inside Supabase's auth lock
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) setUser((prev) => (prev?.id === session.user.id ? prev : session.user));
      else if (event === 'SIGNED_OUT') setUser(null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Open the account's cache on this device before showing the app
  useEffect(() => {
    if (!authEnabled) return;
    let cancelled = false;
    if (userId) {
      openAccountDb(userId).finally(() => {
        if (!cancelled) setOpenFor(userId);
      });
    } else {
      closeAccountDb();
    }
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Signing out on purpose also removes the account's entries from this device
  const signOut = useCallback(async () => {
    const id = user?.id;
    await signOutDevice();
    setUser(null);
    await closeAccountDb(id, { erase: true });
  }, [user]);

  if (!authEnabled) return children(null);
  if (!user) return <SignInScreen />;
  if (openFor !== user.id) return null;
  return children({ user, signOut });
}

// The app's provider (which applies dark mode) hasn't mounted yet; set it before paint
function useDarkModeBeforePaint() {
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
}

const field = (error) =>
  `flex items-center gap-2 h-14 pl-4 pr-1.5 rounded-2xl bg-surface border transition-colors ${
    error ? 'border-danger' : 'border-line focus-within:border-ink'
  }`;
const input =
  'flex-1 min-w-0 h-full bg-transparent text-[17px] font-medium placeholder:text-muted focus:outline-none';

function SignInScreen() {
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState(getRedirectError);
  const [busy, setBusy] = useState(null); // 'email' | 'google'
  const [resetHelp, setResetHelp] = useState(false);
  useDarkModeBeforePaint();

  // A failed Google sign-in is shown once, not again after a later sign-out
  useEffect(() => clearRedirectError(), []);

  const ready = email.trim() && password && !busy;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ready) return;
    setBusy('email');
    setError('');
    try {
      await (creating ? signUpWithEmail : signInWithEmail)(email, password);
      // Signed in: AuthGate hears it from Supabase and opens the app
    } catch (err) {
      setError(err.message);
      setBusy(null);
    }
  };

  const handleGoogle = async () => {
    if (busy) return;
    setBusy('google');
    setError('');
    try {
      await signInWithGoogle(); // leaves the page for Google
    } catch (err) {
      setError(err.message);
      setBusy(null);
    }
  };

  const switchMode = () => {
    setCreating((c) => !c);
    setError('');
    setResetHelp(false);
  };

  const edit = (setter) => (e) => {
    setter(e.target.value);
    if (error) setError('');
  };

  return (
    <div className="min-h-dvh bg-bg text-ink flex flex-col px-5 safe-top">
      <main className="flex-1 w-full max-w-sm mx-auto flex flex-col justify-center py-12 slide-up">
        <Logo size={64} />
        <h1 className="mt-6 text-[28px] font-bold tracking-[-0.03em]">
          {creating ? 'Create your account' : 'Welcome to SpendWise'}
        </h1>
        <p className="mt-1.5 text-[15px] text-muted">
          {creating
            ? 'Use the email you were invited with. Only you can see your entries.'
            : 'Sign in to see your entries.'}
        </p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={!!busy}
          className="mt-8 h-14 rounded-full bg-surface border border-line text-base font-semibold flex items-center justify-center gap-3 press-effect transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <GoogleMark />
          {busy === 'google' ? 'Opening Google…' : 'Continue with Google'}
        </button>

        <div className="my-6 flex items-center gap-3 text-[13px] text-muted" aria-hidden="true">
          <span className="flex-1 h-px bg-line" />
          or with email
          <span className="flex-1 h-px bg-line" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2" noValidate>
          <label htmlFor="auth-email" className="text-[13px] font-medium text-muted">
            Email
          </label>
          <div className={field(error)}>
            <Mail className="w-5 h-5 shrink-0 text-muted" aria-hidden="true" />
            <input
              id="auth-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={email}
              onChange={edit(setEmail)}
              aria-invalid={!!error}
              className={input}
            />
          </div>

          <label htmlFor="auth-password" className="mt-2 text-[13px] font-medium text-muted">
            Password
          </label>
          <div className={field(error)}>
            <LockKeyhole className="w-5 h-5 shrink-0 text-muted" aria-hidden="true" />
            <input
              id="auth-password"
              type={show ? 'text' : 'password'}
              autoComplete={creating ? 'new-password' : 'current-password'}
              value={password}
              onChange={edit(setPassword)}
              aria-invalid={!!error}
              aria-describedby={error ? 'auth-error' : creating ? 'auth-password-hint' : undefined}
              className={input}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Hide password' : 'Show password'}
              className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-muted hover:text-ink transition-colors"
            >
              {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {creating && !error && (
            <p id="auth-password-hint" className="text-[13px] text-muted">
              At least 6 characters.
            </p>
          )}

          {error && (
            <p id="auth-error" role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!ready}
            className="mt-3 h-14 rounded-full bg-ink text-ink-inverse text-base font-semibold flex items-center justify-center gap-2 press-effect transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy === 'email' ? (creating ? 'Creating account…' : 'Signing in…') : creating ? 'Create account' : 'Sign in'}
            <ArrowRight className="w-5 h-5 text-accent dark:text-on-accent" strokeWidth={2.4} />
          </button>
        </form>

        <div className="mt-6 flex flex-col items-start gap-3 text-[14px]">
          <p className="text-muted">
            {creating ? 'Already have an account? ' : 'New here? '}
            <button type="button" onClick={switchMode} className="font-semibold text-ink underline underline-offset-4">
              {creating ? 'Sign in' : 'Create an account'}
            </button>
          </p>
          {!creating &&
            (resetHelp ? (
              <p className="text-muted">Ask the person who invited you to reset your password.</p>
            ) : (
              <button type="button" onClick={() => setResetHelp(true)} className="font-medium text-muted underline underline-offset-4">
                Forgot password?
              </button>
            ))}
        </div>
      </main>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
