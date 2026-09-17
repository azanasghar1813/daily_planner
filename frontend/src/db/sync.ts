import { db } from './db';
import { supabase } from '../supabase';

let isSyncing = false;

// A simple mock function to represent the backend API call
async function pushToBackend(endpoint: string, payload: any) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Network response was not ok');
    return await res.json();
  } catch (err) {
    console.error(`Sync error to ${endpoint}:`, err);
    throw err;
  }
}

async function pullFromBackend() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    
    const lastSync = localStorage.getItem('last_synced_at') || '';
    const url = lastSync ? `/api/sync/pull?last_sync=${encodeURIComponent(lastSync)}` : `/api/sync/pull`;
    
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });
    if (!res.ok) throw new Error('Network response was not ok');
    return await res.json();
  } catch (err) {
    console.error(`Pull error:`, err);
    return null;
  }
}

export async function syncData() {
  if (!navigator.onLine) {
    console.log('Offline. Sync aborted.');
    return;
  }

  if (isSyncing) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.log('No user session, skipping sync.');
    return;
  }

  isSyncing = true;
  console.log('Starting sync...');

  try {
    // 1. Pull from Cloud
    const cloudData = await pullFromBackend();
    if (cloudData) {
      const { tasks, task_details, notes, attachments } = cloudData;
      await db.transaction('rw', db.tasks, db.taskDetails, db.notes, db.attachments, async () => {
        if (tasks) {
          for (const t of tasks) {
            const existing = await db.tasks.get(t.id);
            if (!existing || new Date(t.updated_at) > new Date(existing.updated_at)) {
              await db.tasks.put({ ...t, pending_sync: undefined });
            }
          }
        }
        if (task_details) {
          for (const td of task_details) {
            const existing = await db.taskDetails.get(td.id);
            if (!existing || new Date(td.updated_at) > new Date(existing.updated_at)) {
              await db.taskDetails.put({ ...td, pending_sync: undefined });
            }
          }
        }
        if (notes) {
          for (const n of notes) {
            const existing = await db.notes.get(n.id);
            if (!existing || new Date(n.updated_at) > new Date(existing.updated_at)) {
              await db.notes.put({ ...n, pending_sync: undefined });
            }
          }
        }
        if (attachments) {
          for (const a of attachments) {
            const existing = await db.attachments.get(a.id);
            if (!existing || new Date(a.created_at) > new Date(existing.created_at)) {
              await db.attachments.put({ ...a, pending_sync: undefined });
            }
          }
        }
      });
      // Save last sync time only if we successfully pulled
      localStorage.setItem('last_synced_at', new Date().toISOString());
    }

    // 2. Push to Cloud (Get all pending items)
    const pendingTasks = await db.tasks.where({ pending_sync: 1 }).toArray();
    const pendingTaskDetails = await db.taskDetails.where({ pending_sync: 1 }).toArray();
    const pendingNotes = await db.notes.where({ pending_sync: 1 }).toArray();
    const pendingAttachments = await db.attachments.where({ pending_sync: 1 }).toArray();

    if (pendingTasks.length === 0 && pendingTaskDetails.length === 0 && pendingNotes.length === 0 && pendingAttachments.length === 0) {
      console.log('Nothing to sync.');
      return;
    }

    // 2. Send to backend
    await pushToBackend('sync', {
      tasks: pendingTasks,
      task_details: pendingTaskDetails,
      notes: pendingNotes,
      attachments: pendingAttachments
    });

    // 3. Mark as synced
    await db.transaction('rw', db.tasks, db.taskDetails, db.notes, db.attachments, async () => {
      for (const t of pendingTasks) {
        await db.tasks.update(t.id, { pending_sync: undefined });
      }
      for (const td of pendingTaskDetails) {
        await db.taskDetails.update(td.id, { pending_sync: undefined });
      }
      for (const n of pendingNotes) {
        await db.notes.update(n.id, { pending_sync: undefined });
      }
      for (const a of pendingAttachments) {
        await db.attachments.update(a.id, { pending_sync: undefined });
      }
    });

    console.log('Sync complete.');
  } catch (error) {
    console.error('Sync failed', error);
  } finally {
    isSyncing = false;
  }
}

// Simple listener for going online
window.addEventListener('online', () => {
  console.log('Went online. Triggering sync...');
  syncData();
});
