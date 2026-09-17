import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Task, TaskDetail, Note } from './models.js';
dotenv.config();
const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
// Initialize MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI in environment variables');
    process.exit(1);
}
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Successfully connected to MongoDB Atlas!'))
    .catch((err) => console.error('MongoDB connection error:', err));
// Basic health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Get tasks for a user on a specific date
app.get('/api/tasks', async (req, res) => {
    const { date, user_id } = req.query;
    if (!date || !user_id) {
        return res.status(400).json({ error: 'Missing date or user_id' });
    }
    try {
        const tasks = await Task.find({ user_id: String(user_id), date: String(date) }).sort({ start_time: 1 }).lean();
        // Fetch details for each task
        const tasksWithDetails = await Promise.all(tasks.map(async (task) => {
            const details = await TaskDetail.find({ task_id: task.id }).sort({ start_time: 1 }).lean();
            return { ...task, task_details: details };
        }));
        res.json(tasksWithDetails);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Sync endpoint to handle offline data batches
app.post('/api/sync', async (req, res) => {
    const { tasks, task_details, notes } = req.body;
    try {
        if (tasks && tasks.length > 0) {
            for (const t of tasks) {
                const { _id, pending_sync, ...taskData } = t; // omit internal/temporary fields
                await Task.findOneAndUpdate({ id: t.id }, taskData, { upsert: true, new: true });
            }
        }
        if (task_details && task_details.length > 0) {
            for (const td of task_details) {
                const { _id, pending_sync, ...detailData } = td;
                await TaskDetail.findOneAndUpdate({ id: td.id }, detailData, { upsert: true, new: true });
            }
        }
        if (notes && notes.length > 0) {
            for (const n of notes) {
                const { _id, pending_sync, ...noteData } = n;
                await Note.findOneAndUpdate({ id: n.id }, noteData, { upsert: true, new: true });
            }
        }
        console.log(`Successfully synced ${tasks?.length || 0} tasks, ${task_details?.length || 0} details, ${notes?.length || 0} notes.`);
        res.json({ status: 'synced', timestamp: new Date().toISOString() });
    }
    catch (error) {
        console.error('Sync failed:', error);
        res.status(500).json({ error: error.message });
    }
});
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
//# sourceMappingURL=index.js.map