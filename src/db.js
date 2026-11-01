import Dexie from 'dexie';
import { v4 as uuidv4 } from 'uuid';
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
//
// A change that can't reach Supabase stays in IndexedDB
// marked `pending: 'add' | 'update' | 'delete'` and is
// uploaded by syncPending(), so refreshing the cache from
// the cloud never wipes it. Entries added that way get a
// 'local-…' id until Supabase gives them a real one.
// ==========================================

const isLocalId = (id) => typeof id === 'string' && id.startsWith('local-');

function withoutPending(row) {
  const copy = { ...row };
  delete copy.pending;
  return copy;
}

// A row to insert into Supabase, which assigns the id
function cloudFields(row) {
  const fields = withoutPending(row);
  delete fields.id;
  return fields;
}

// Cached rows for the UI: newest first, pending deletes hidden
function localTransactions() {
  return db.transactions
    .orderBy('date')
    .reverse()
    .filter((t) => t.pending !== 'delete')
    .toArray();
}

const pendingRows = () => db.transactions.filter((t) => !!t.pending);

// Ids changed on this device while a cloud download is in flight. That download
// may be older than the change, so the cache refresh keeps the local version.
let touchedDuringRefresh = null;
const touch = (...ids) => ids.forEach((id) => touchedDuringRefresh?.add(id));

async function pushPending(row) {
  if (row.pending === 'delete') {
    const { error } = await supabase.from('transactions').delete().eq('id', row.id);
    if (error) throw error;
    await db.transactions.delete(row.id);
    touch(row.id);
    return;
  }

  // An 'add' gets a new cloud id; an 'update' is written back under its own id
  // (re-created if it was deleted elsewhere, so the offline edit isn't lost)
  const query =
    row.pending === 'add'
      ? supabase.from('transactions').insert([cloudFields(row)])
      : supabase.from('transactions').upsert([withoutPending(row)]);
  const { data, error } = await query.select().single();
  if (error) throw error;

  await db.transaction('rw', db.transactions, async () => {
    await db.transactions.delete(row.id);
    await db.transactions.put(data);
  });
  touch(row.id, data.id);
}

let syncing = null;

// Uploads pending changes and returns how many went up. Ones that still fail
// stay pending for the next try. Concurrent calls share one run, so nothing is
// uploaded twice.
export function syncPending() {
  if (!isSupabaseConfigured) return Promise.resolve(0);
  syncing ??= (async () => {
    let synced = 0;
    for (const row of await pendingRows().toArray()) {
      try {
        await pushPending(row);
        synced++;
      } catch (err) {
        console.warn('Offline change not uploaded yet:', err.message);
      }
    }
    return synced;
  })().finally(() => {
    syncing = null;
  });
  return syncing;
}

export async function hasPendingChanges() {
  return (await pendingRows().count()) > 0;
}

// What's saved on this device, without waiting for the network
export function getCachedTransactions() {
  return localTransactions();
}

let refreshing = null;

// Uploads pending changes, then refreshes the cache from the cloud. Concurrent
// calls share one download.
export function getAllTransactions() {
  if (!isSupabaseConfigured) return localTransactions();
  refreshing ??= refreshFromCloud().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function refreshFromCloud() {
  const touched = new Set();
  touchedDuringRefresh = touched;
  try {
    await syncPending();

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;

    // If Supabase is empty but IndexedDB has existing local data,
    // automatically sync local data to Supabase so it's not lost
    if (data.length === 0) {
      const localData = await localTransactions();
      if (localData.length > 0) {
        const toInsert = localData.map(cloudFields);
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

    // Refresh the IndexedDB cache, keeping changes that haven't uploaded yet
    // and rows changed on this device while the download was running
    await db.transaction('rw', db.transactions, async () => {
      const keep = await db.transactions.filter((t) => !!t.pending || touched.has(t.id)).toArray();
      const keepIds = new Set(keep.map((t) => t.id));
      const fresh = data.filter((t) => !keepIds.has(t.id) && !touched.has(t.id));
      await db.transactions.clear();
      await db.transactions.bulkPut([...fresh, ...keep]);
    });
    return localTransactions();
  } catch (err) {
    console.warn('Supabase fetch failed, falling back to IndexedDB:', err.message);
    return localTransactions();
  } finally {
    touchedDuringRefresh = null;
  }
}

export async function syncLocalToSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured in .env');
  }
  const local = await localTransactions();
  if (local.length === 0) return 0;

  const toInsert = local.map(cloudFields);
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
      await db.transactions.put({ ...inserted });
      touch(inserted.id);
      return inserted;
    } catch (err) {
      console.warn('Supabase insert failed, keeping it on this device to upload later:', err.message);
    }

    const pendingTx = { ...transaction, id: `local-${uuidv4()}`, pending: 'add' };
    await db.transactions.add(pendingTx);
    return pendingTx;
  }

  // Offline-only
  const id = await db.transactions.add(transaction);
  return { ...transaction, id };
}

export async function updateTransaction(id, data) {
  const now = new Date().toISOString();
  const updates = { ...data, updatedAt: now };

  if (isSupabaseConfigured && !isLocalId(id)) {
    try {
      const { data: updated, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // Update local cache (replacing the row also clears a pending mark)
      await db.transactions.put({ ...updated });
      touch(id);
      return updated;
    } catch (err) {
      console.warn('Supabase update failed, keeping it on this device to upload later:', err.message);
    }
  }

  const existing = await db.transactions.get(id);
  if (!existing) throw new Error('Entry not found');
  // An entry that never reached the cloud is still an 'add'
  if (isSupabaseConfigured) updates.pending = existing.pending === 'add' ? 'add' : 'update';

  await db.transactions.update(id, updates);
  touch(id);
  return db.transactions.get(id);
}

export async function deleteTransaction(id) {
  const transaction = await db.transactions.get(id);

  if (isSupabaseConfigured && !isLocalId(id)) {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase delete failed, deleting it from the cloud later:', err.message);
      await db.transactions.update(id, { pending: 'delete' });
      return transaction;
    }
  }

  await db.transactions.delete(id);
  touch(id);
  return transaction; // return deleted entry for undo
}

export async function restoreTransaction(transaction) {
  if (isSupabaseConfigured && !isLocalId(transaction.id)) {
    try {
      const row = withoutPending(transaction);
      // Upsert: if the delete never reached the cloud, the row is still there
      const { error } = await supabase
        .from('transactions')
        .upsert([row]);
      if (error) throw error;

      await db.transactions.put(row);
      touch(row.id);
      return;
    } catch (err) {
      console.warn('Supabase restore failed, restoring it in the cloud later:', err.message);
    }
  }

  if (isSupabaseConfigured) {
    await db.transactions.put({ ...transaction, pending: isLocalId(transaction.id) ? 'add' : 'update' });
  } else {
    await db.transactions.put(transaction);
  }
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
    .filter((t) => t.pending !== 'delete')
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
      await syncPending();
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      transactions = data;
    } catch (err) {
      console.warn('Supabase export failed, exporting from IndexedDB:', err.message);
      transactions = (await localTransactions()).map(withoutPending);
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
        const cleaned = batch.map(cloudFields);
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
