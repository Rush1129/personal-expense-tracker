// Accounts (Supabase Auth). They exist only with cloud sync; offline-only mode
// has no sign-in. Who may sign up is decided by the database's invite list
// (see supabase-setup.sql), not by the app.
import { supabase, isSupabaseConfigured, storedSession } from './supabaseClient';

export const authEnabled = isSupabaseConfigured;

// The account signed in on this device, read without the network, so the app
// opens offline even after the access token has expired
export function startupUser() {
  return storedSession()?.user ?? null;
}

// A failed Google sign-in comes back as ?error=…&error_description=… (or in the
// #hash). Read it once at startup and tidy the address bar.
function takeRedirectError() {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const description = params.get('error_description') || hash.get('error_description');
  if (!description && !params.get('error') && !hash.get('error')) return '';
  window.history.replaceState(window.history.state, '', window.location.pathname);
  return authMessage(description || 'Google sign-in failed');
}
let redirectError = authEnabled ? takeRedirectError() : '';
export const getRedirectError = () => redirectError;
export const clearRedirectError = () => {
  redirectError = '';
};

// Supabase's error messages, in plain words
export function authMessage(error) {
  const message = typeof error === 'string' ? error : error?.message || '';
  if (/not_invited|database error saving new user/i.test(message)) {
    return "This email isn't on the invite list yet. Ask the person who invited you to add it.";
  }
  if (!navigator.onLine || /failed to fetch|load failed|networkerror|network request failed/i.test(message)) {
    return "You're offline. Connect to the internet to sign in.";
  }
  if (/invalid login credentials/i.test(message)) return 'Wrong email or password.';
  if (/already (been )?registered|already exists/i.test(message)) {
    return 'There is already an account for this email. Sign in instead.';
  }
  if (/email not confirmed/i.test(message)) {
    return 'This email still needs confirming. Turn off "Confirm email" in Supabase or confirm it, then sign in.';
  }
  if (/rate limit|too many/i.test(message)) return 'Too many attempts. Wait a minute and try again.';
  return message || 'Something went wrong. Please try again.';
}

export async function signInWithEmail(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(authMessage(error));
}

export async function signUpWithEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
  if (error) throw new Error(authMessage(error));
  // With "Confirm email" on, Supabase makes the account but doesn't sign it in
  if (!data.session) throw new Error(authMessage('Email not confirmed'));
}

// Leaves for Google and comes back to the app signed in
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw new Error(authMessage(error));
}

// Signs this device out, also when Supabase can't be reached
export async function signOutDevice() {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error && storedSession()) {
    try {
      localStorage.removeItem(supabase.auth.storageKey);
    } catch {
      // Storage blocked: nothing saved to remove
    }
  }
}
