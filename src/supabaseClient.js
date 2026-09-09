import { createClient } from '@supabase/supabase-js';

// These will be set from environment variables.
// Create a .env file with:
//   VITE_SUPABASE_URL=https://your-project.supabase.co
//   VITE_SUPABASE_ANON_KEY=your-anon-key
//
// Or leave them unset to run in offline-only mode (IndexedDB only).

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/^["']|["']$/g, '');
// Strip trailing slashes and /rest/v1 if user accidentally copied the REST endpoint
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim().replace(/^["']|["']$/g, '');

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function checkSupabaseHealth() {
  if (!supabase) {
    return { ok: false, error: 'Supabase is not configured (missing URL or Anon Key)' };
  }
  try {
    const { error } = await supabase.from('transactions').select('id').limit(1);
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

