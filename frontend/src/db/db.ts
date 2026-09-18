import Dexie from 'dexie';
import { syncDataDebounced } from './sync';

export interface Task {
  id: string; // uuid
  user_id: string; // for sync purposes, to ensure local offline DB only stores current user data or tags it properly
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  start_time?: string; // HH:mm
  end_time?: string; // HH:mm
  completed: boolean;
  created_at: string;
  updated_at: string;
  pending_sync?: number;
  deleted?: boolean;
}

export interface TaskDetail {
  id: string; // uuid
  task_id: string; // uuid
  title: string;
  start_time?: string; // HH:mm
  end_time?: string; // HH:mm
  completed: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  pending_sync?: number;
  deleted?: boolean;
}

export interface Note {
  id: string; // uuid
  user_id: string; // uuid
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  pending_sync?: number;
  deleted?: boolean;
}

export interface Attachment {
  id: string; // uuid
  task_detail_id: string; // the sub-task or note this belongs to
  type: 'image' | 'file' | 'voice';
  name: string;
  data: string; // Base64 encoded string
  mime_type: string;
  created_at: string;
  pending_sync?: number;
  deleted?: boolean;
}

export class DailyPlannerDB extends Dexie {
  tasks!: Dexie.Table<Task, string>;
  taskDetails!: Dexie.Table<TaskDetail, string>;
  notes!: Dexie.Table<Note, string>;
  attachments!: Dexie.Table<Attachment, string>;

  constructor() {
    super('DailyPlannerDB');
    this.version(4).stores({
      tasks: 'id, user_id, date, [date+user_id], pending_sync',
      taskDetails: 'id, task_id, pending_sync',
      notes: 'id, user_id, pending_sync',
      attachments: 'id, task_detail_id, type, pending_sync'
    });
  }
}

export const db = new DailyPlannerDB();

const tables = ['tasks', 'taskDetails', 'notes', 'attachments'] as const;
tables.forEach(table => {
  db[table].hook('creating', (_primKey, obj: any) => {
    if (obj.pending_sync === 1) syncDataDebounced();
  });
  db[table].hook('updating', (mods: any, _primKey, obj: any) => {
    if (mods.pending_sync === 1 || obj.pending_sync === 1) syncDataDebounced();
  });
});
