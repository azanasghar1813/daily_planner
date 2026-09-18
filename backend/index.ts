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
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

// Auth Middleware
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  let token = '';
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1] || '';
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token || token === 'undefined' || token === 'null') {
    return res.status(401).json({ error: 'Missing or invalid authorization token' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      // Avoid spamming the console for stream retries, but log clearly
      if (req.path !== '/api/sync/stream') {
         console.error(`Auth error for token ${token.substring(0, 15)}... :`, error?.message || 'No user found');
      }
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

// SSE Clients mapping user_id -> response[]
const sseClients = new Map<string, express.Response[]>();

const notifyClients = (userId: string) => {
  const clients = sseClients.get(userId) || [];
  clients.forEach(client => {
    try {
      client.write('data: sync\n\n');
    } catch (e) {
      console.error('SSE Write Error:', e);
    }
  });
};

app.get('/api/sync/stream', requireAuth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); 

  const userId = (req as any).user.id;
  if (!sseClients.has(userId)) sseClients.set(userId, []);
  sseClients.get(userId)!.push(res);

  const heartbeat = setInterval(() => {
    try { res.write(':\n\n'); } catch (e) {}
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    const clients = sseClients.get(userId) || [];
    sseClients.set(userId, clients.filter(c => c !== res));
  });
});

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


// Sync endpoint to handle offline data batches (protected)
app.post('/api/sync', requireAuth, async (req, res) => {
    const { tasks, task_details, notes, attachments } = req.body;
    const userId = (req as any).user.id;
    
    try {
      // 1. Security: fetch owned IDs to verify ownership of incoming data
      const ownedTaskIds = new Set((await Task.find({ user_id: userId }, { id: 1 }).lean()).map(t => t.id));
      const ownedNoteIds = new Set((await Note.find({ user_id: userId }, { id: 1 }).lean()).map(n => n.id));

      // 2. Process top-level entities (Tasks, Notes) and incrementally update sets
      if (tasks && tasks.length > 0) {
        for (const t of tasks) {
          if (t.user_id !== userId) continue;
          ownedTaskIds.add(t.id);
          const { _id, pending_sync, ...taskData } = t; 
          await Task.findOneAndUpdate({ id: t.id }, taskData, { upsert: true, returnDocument: 'after' });
        }
      }
      if (notes && notes.length > 0) {
        for (const n of notes) {
          if (n.user_id !== userId) continue;
          ownedNoteIds.add(n.id);
          const { _id, pending_sync, ...noteData } = n;
          await Note.findOneAndUpdate({ id: n.id }, noteData, { upsert: true, returnDocument: 'after' });
        }
      }

      // 3. Fetch owned TaskDetail IDs for Attachments
      const ownedTaskDetailIds = new Set((await TaskDetail.find({ task_id: { $in: Array.from(ownedTaskIds) } }, { id: 1 }).lean()).map(d => d.id));

      // 4. Process TaskDetails and incrementally update sets
      if (task_details && task_details.length > 0) {
        for (const td of task_details) {
          if (!ownedTaskIds.has(td.task_id)) continue;
          ownedTaskDetailIds.add(td.id);
          const { _id, pending_sync, ...detailData } = td;
          await TaskDetail.findOneAndUpdate({ id: td.id }, detailData, { upsert: true, returnDocument: 'after' });
        }
      }

      // 5. Process Attachments (depend on TaskDetails or Notes)
      if (attachments && attachments.length > 0) {
        for (const a of attachments) {
          if (!ownedTaskDetailIds.has(a.task_detail_id) && !ownedNoteIds.has(a.task_detail_id)) continue;
          const { _id, pending_sync, ...attData } = a;
          
          if (attData.deleted) {
            // Delete from Cloudinary to save cost
            try {
              const urlParts = attData.data.split('/');
              const fileName = urlParts.pop();
              const folder = urlParts.pop();
              if (fileName && folder) {
                const dotIndex = fileName.lastIndexOf('.');
                const baseName = dotIndex > -1 ? fileName.slice(0, dotIndex) : fileName;
                const publicId = `${folder}/${baseName}`;
                const resourceType = attData.type === 'image' ? 'image' : (attData.type === 'voice' ? 'video' : 'raw');
                await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
                console.log(`Destroyed orphaned file on Cloudinary: ${publicId}`);
              }
            } catch (err) {
              console.error('Failed to destroy Cloudinary file:', err);
            }
          }
          
          await Attachment.findOneAndUpdate({ id: a.id }, attData, { upsert: true, returnDocument: 'after' });
        }
      }
      
      console.log(`Successfully synced ${tasks?.length || 0} tasks, ${task_details?.length || 0} details, ${notes?.length || 0} notes, ${attachments?.length || 0} attachments.`);
      notifyClients(userId);
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
    
    // Find ALL tasks for the user (just IDs) to scope details

    const allUserTasks = await Task.find({ user_id: userId }, { id: 1 }).lean();
    const taskIds = allUserTasks.map(t => t.id);

    const detailsQuery: any = { task_id: { $in: taskIds } };
    if (lastSync) detailsQuery.updated_at = { $gt: lastSync };
    const task_details = await TaskDetail.find(detailsQuery).lean();
    
    const notes = await Note.find(query).lean();
    
    const attTaskDetailIds = await TaskDetail.find({ task_id: { $in: taskIds } }, { id: 1 }).lean();
    const allUserNotes = await Note.find({ user_id: userId }, { id: 1 }).lean();
    
    const parentIds = [...attTaskDetailIds.map(d => d.id), ...allUserNotes.map(n => n.id)];
    const attQuery: any = { task_detail_id: { $in: parentIds } };
    if (lastSync) attQuery.updated_at = { $gt: lastSync };
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
