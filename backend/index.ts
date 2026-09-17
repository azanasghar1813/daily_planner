import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { createClient } from '@supabase/supabase-js';
import { Task, TaskDetail, Note, Attachment } from './models.js';

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

// Configure Supabase
const supabaseUrl = 'https://pdzigcfswhwylphiawvo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkemlnY2Zzd2h3eWxwaGlhd3ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NjkzMTMsImV4cCI6MjEwNTE0NTMxM30.C8bRz41DCko5bOye_xgcKxx4cKNLjguQthwm8Bz-ziE';
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

// Auth Middleware
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Auth error from supabase:', error?.message || 'No user found');
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // Attach user to request object
    (req as any).user = user;
    next();
  } catch (err: any) {
    console.error('Auth exception:', err);
    return res.status(401).json({ error: 'Unauthorized: Exception' });
  }
};

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || ''
});

// Configure Multer (memory storage for stream upload)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB overall limit (enforced here)
});

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Upload endpoint (protected)
app.post('/api/upload', requireAuth, upload.single('file'), async (req, res) => {
  console.log('Received upload request');
  if (!req.file) {
    console.error('No file in request');
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { type } = req.body; // 'image', 'voice', or 'file'
  console.log(`File type: ${type}, Size: ${req.file.size} bytes`);
  
  // Custom limits based on type
  if (type === 'image' && req.file.size > 2 * 1024 * 1024) {
    return res.status(400).json({ error: 'Image size must be less than 2MB' });
  }

  try {
    const resourceType = type === 'image' ? 'image' : (type === 'voice' ? 'video' : 'raw');
    
    // Upload stream to cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: resourceType as any, folder: 'daily_planner' },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return res.status(500).json({ error: 'Cloudinary upload failed: ' + error.message });
        }
        console.log('Cloudinary upload success:', result?.secure_url);
        res.json({ secure_url: result?.secure_url });
      }
    );

    // Pipe the buffer to the stream
    uploadStream.end(req.file.buffer);
  } catch (error: any) {
    console.error('Upload route error:', error);
    res.status(500).json({ error: error.message });
  }
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Sync endpoint to handle offline data batches (protected)
app.post('/api/sync', requireAuth, async (req, res) => {
    const { tasks, task_details, notes, attachments } = req.body;
    const userId = (req as any).user.id;
    
    try {
      if (tasks && tasks.length > 0) {
        for (const t of tasks) {
          // Verify task belongs to user
          if (t.user_id !== userId) continue;
          
          const { _id, pending_sync, ...taskData } = t; 
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
          if (n.user_id !== userId) continue;
          const { _id, pending_sync, ...noteData } = n;
          await Note.findOneAndUpdate({ id: n.id }, noteData, { upsert: true, new: true });
        }
      }
      if (attachments && attachments.length > 0) {
        for (const a of attachments) {
          const { _id, pending_sync, ...attData } = a;
          
          if (attData.deleted) {
            // Delete from Cloudinary to save cost
            try {
              const urlParts = attData.data.split('/');
              const fileName = urlParts.pop();
              const folder = urlParts.pop();
              if (fileName && folder) {
                const publicId = `${folder}/${fileName.split('.')[0]}`;
                const resourceType = attData.type === 'image' ? 'image' : (attData.type === 'voice' ? 'video' : 'raw');
                await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
                console.log(`Destroyed orphaned file on Cloudinary: ${publicId}`);
              }
            } catch (err) {
              console.error('Failed to destroy Cloudinary file:', err);
            }
          }
          
          await Attachment.findOneAndUpdate({ id: a.id }, attData, { upsert: true, new: true });
        }
      }
      
      console.log(`Successfully synced ${tasks?.length || 0} tasks, ${task_details?.length || 0} details, ${notes?.length || 0} notes, ${attachments?.length || 0} attachments.`);
      res.json({ status: 'synced', timestamp: new Date().toISOString() });
    } catch (error: any) {
      console.error('Sync failed:', error);
      res.status(500).json({ error: error.message });
    }
});

// Pull endpoint to sync data from cloud to local device (protected)
app.get('/api/sync/pull', requireAuth, async (req, res) => {
  const userId = (req as any).user.id;
  const lastSync = req.query.last_sync as string;

  try {
    const query: any = { user_id: userId };
    if (lastSync) {
      query.updated_at = { $gt: lastSync };
    }

    const tasks = await Task.find(query).lean();
    
    const taskDetailsQuery: any = { task_id: { $in: tasks.map(t => t.id) } };
    if (lastSync && tasks.length === 0) {
      // If we didn't fetch new tasks, we might still need new details. 
      // But actually, we just need details that belong to the user.
      // MongoDB TaskDetail doesn't have user_id. We need all details for all user's tasks.
      // For a true delta, we'd need user_id on task_details or a complex join.
      // Let's just fetch tasks for the user, then get their details that changed.
    }
    
    // Better way for delta sync when TaskDetail lacks user_id:
    // First find ALL tasks for the user (just IDs) to scope details, OR we just trust `updated_at` and a scoped task list.
    const allUserTasks = await Task.find({ user_id: userId }, { id: 1 }).lean();
    const taskIds = allUserTasks.map(t => t.id);

    const detailsQuery: any = { task_id: { $in: taskIds } };
    if (lastSync) detailsQuery.updated_at = { $gt: lastSync };
    const task_details = await TaskDetail.find(detailsQuery).lean();
    
    const notes = await Note.find(query).lean();
    
    const attQuery: any = { user_id: userId };
    if (lastSync) attQuery.created_at = { $gt: lastSync }; // Attachments only have created_at
    const attachments = await Attachment.find(attQuery).lean();

    res.json({
      tasks,
      task_details,
      notes,
      attachments
    });
  } catch (error: any) {
    console.error('Pull failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
