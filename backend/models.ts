import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // using string for UUID compatibility
  user_id: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  title: { type: String, required: true },
  description: { type: String },
  start_time: { type: String },
  end_time: { type: String },
  completed: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const TaskDetailSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // using string for UUID compatibility
  task_id: { type: String, required: true },
  title: { type: String, required: true },
  start_time: { type: String },
  end_time: { type: String },
  completed: { type: Boolean, default: false },
  notes: { type: String },
  deleted: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const NoteSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // using string for UUID compatibility
  user_id: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String },
  deleted: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const AttachmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  task_detail_id: { type: String, required: true },
  type: { type: String, enum: ['image', 'file', 'voice'], required: true },
  name: { type: String, required: true },
  data: { type: String, required: true }, // base64
  mime_type: { type: String, required: true },
  deleted: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at' } });

export const Task = mongoose.model('Task', TaskSchema);
export const TaskDetail = mongoose.model('TaskDetail', TaskDetailSchema);
export const Note = mongoose.model('Note', NoteSchema);
export const Attachment = mongoose.model('Attachment', AttachmentSchema);
