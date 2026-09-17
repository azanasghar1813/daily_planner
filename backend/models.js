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
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
const TaskDetailSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // using string for UUID compatibility
    task_id: { type: String, required: true },
    title: { type: String, required: true },
    start_time: { type: String },
    end_time: { type: String },
    completed: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
const NoteSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // using string for UUID compatibility
    user_id: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
export const Task = mongoose.model('Task', TaskSchema);
export const TaskDetail = mongoose.model('TaskDetail', TaskDetailSchema);
export const Note = mongoose.model('Note', NoteSchema);
//# sourceMappingURL=models.js.map