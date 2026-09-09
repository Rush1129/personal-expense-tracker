import Dexie from 'dexie';
import { supabase, isSupabaseConfigured } from './supabaseClient';

// ==========================================
// IndexedDB (offline-first local storage)
// ==========================================

export const db = new Dexie('SpendWiseDB');

db.version(1).stores({
  transactions: '++id, type, amount, description, category, date, createdAt, updatedAt',
});

// ==========================================
// Dual-mode CRUD: Supabase + IndexedDB
// When Supabase is configured, it acts as the
// source of truth, with IndexedDB as the cache.
// When not configured, IndexedDB is the only store.
// ==========================================

export async function getAllTransactions() {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;

      // If Supabase is empty but IndexedDB has existing local data,
      // automatically sync local data to Supabase so it's not lost
      if (data.length === 0) {
        const localCount = await db.transactions.count();
        if (localCount > 0) {
          const localData = await db.transactions.toArray();
          const toInsert = localData.map(({ id, ...rest }) => rest);
          const { data: synced, error: syncErr } = await supabase
            .from('transactions')
            .insert(toInsert)
            .select()
            .order('date', { ascending: false });
          if (!syncErr && synced && synced.length > 0) {
            await db.transactions.clear();
            await db.transactions.bulkAdd(synced.map(t => ({ ...t })));
            return synced;
          }
        }
      }

      // Sync to IndexedDB cache
      await db.transactions.clear();
      if (data.length > 0) {
        await db.transactions.bulkAdd(data.map(t => ({ ...t })));
      }
      return data;
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to IndexedDB:', err.message);
      return db.transactions.orderBy('date').reverse().toArray();
    }
  }
  return db.transactions.orderBy('date').reverse().toArray();
}

export async function syncLocalToSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured in .env');
  }
  const local = await db.transactions.toArray();
  if (local.length === 0) return 0;

  const toInsert = local.map(({ id, ...rest }) => rest);
  const { data, error } = await supabase.from('transactions').insert(toInsert).select();
  if (error) throw error;

  if (data && data.length > 0) {
    await db.transactions.clear();
    await db.transactions.bulkAdd(data.map(t => ({ ...t })));
  }
  return data.length;
}


export async function addTransaction(data) {
  const now = new Date().toISOString();
  const transaction = {
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  if (isSupabaseConfigured) {
    try {
      const { data: inserted, error } = await supabase
        .from('transactions')
        .insert([transaction])
        .select()
        .single();
      if (error) throw error;

      // Also cache locally
      await db.transactions.add({ ...inserted });
      return inserted;
    } catch (err) {
      console.warn('Supabase insert failed, saving to IndexedDB only:', err.message);
    }
  }

  // Fallback / offline-only
  const id = await db.transactions.add(transaction);
  return { ...transaction, id };
}

export async function updateTransaction(id, data) {
  const now = new Date().toISOString();
  const updates = { ...data, updatedAt: now };

  if (isSupabaseConfigured) {
    try {
      const { data: updated, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // Update local cache
      await db.transactions.update(id, { ...updated });
      return updated;
    } catch (err) {
      console.warn('Supabase update failed, updating IndexedDB only:', err.message);
    }
  }

  await db.transactions.update(id, updates);
  return db.transactions.get(id);
}

export async function deleteTransaction(id) {
  const transaction = await db.transactions.get(id);

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase delete failed, deleting from IndexedDB only:', err.message);
    }
  }

  await db.transactions.delete(id);
  return transaction; // return deleted entry for undo
}

export async function restoreTransaction(transaction) {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('transactions')
        .insert([transaction]);
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase restore failed, restoring in IndexedDB only:', err.message);
    }
  }

  await db.transactions.add(transaction);
}

export async function getTransactionsByDateRange(startDate, endDate) {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('Supabase range query failed, falling back to IndexedDB:', err.message);
    }
  }

  return db.transactions
    .where('date')
    .between(startDate, endDate, true, true)
    .reverse()
    .sortBy('date');
}

export async function getTransactionsForMonth(year, month) {
  const start = new Date(year, month, 1).toISOString();
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();
  return getTransactionsByDateRange(start, end);
}

// ==========================================
// Data Backup / Restore (JSON export/import)
// ==========================================

export async function exportAllData() {
  let transactions;
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      transactions = data;
    } catch (err) {
      console.warn('Supabase export failed, exporting from IndexedDB:', err.message);
      transactions = await db.transactions.toArray();
    }
  } else {
    transactions = await db.transactions.toArray();
  }

  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions,
  }, null, 2);
}

export async function importAllData(jsonString) {
  const data = JSON.parse(jsonString);
  if (!data.transactions || !Array.isArray(data.transactions)) {
    throw new Error('Invalid backup file format');
  }

  // Clear and re-import
  if (isSupabaseConfigured) {
    try {
      // Delete all existing in Supabase
      const { data: existing } = await supabase.from('transactions').select('id');
      if (existing?.length > 0) {
        const ids = existing.map(t => t.id);
        for (let i = 0; i < ids.length; i += 100) {
          const batch = ids.slice(i, i + 100);
          await supabase.from('transactions').delete().in('id', batch);
        }
      }

      // Insert in batches of 100
      for (let i = 0; i < data.transactions.length; i += 100) {
        const batch = data.transactions.slice(i, i + 100);
        // Remove local IDs that are auto-increment integers
        const cleaned = batch.map(({ id, ...rest }) => rest);
        await supabase.from('transactions').insert(cleaned);
      }
    } catch (err) {
      console.warn('Supabase import failed, importing to IndexedDB only:', err.message);
    }
  }

  // Always update IndexedDB
  await db.transactions.clear();
  await db.transactions.bulkAdd(data.transactions);
  return data.transactions.length;
}
