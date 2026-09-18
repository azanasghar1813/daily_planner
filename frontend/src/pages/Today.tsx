import React, { useState, useEffect } from 'react';
import { format, addDays, subDays, isToday, parse } from 'date-fns';
import { Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightSmall, CheckSquare, Square, Trash2 } from 'lucide-react';
import { db, type Task, type TaskDetail } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import TaskModal from '../components/TaskModal';
import RichNoteEditor from '../components/RichNoteEditor';
import AttachmentList from '../components/AttachmentList';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';

export default function Today() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  
  // Derive current date from URL or fallback to today
  const urlDate = searchParams.get('date');
  let currentDate = new Date();
  if (urlDate) {
    const parsed = parse(urlDate, 'yyyy-MM-dd', new Date());
    if (!isNaN(parsed.getTime())) {
      currentDate = parsed;
    }
  }
  
  // Ensure URL always has a date parameter
  useEffect(() => {
    if (!urlDate) {
      setSearchParams({ date: format(new Date(), 'yyyy-MM-dd') }, { replace: true });
    }
  }, [urlDate, setSearchParams]);

  const dateStr = format(currentDate, 'yyyy-MM-dd');
  
  const tasks = useLiveQuery(async () => {
    if (!user) return [];
    const allTasks = await db.tasks.where('[date+user_id]').equals([dateStr, user.id]).toArray();
    return allTasks.filter(t => !t.deleted).sort((a, b) => {
      if (!a.start_time) return 1;
      if (!b.start_time) return -1;
      return a.start_time.localeCompare(b.start_time);
    });
  }, [dateStr]);


  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const toggleExpand = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(expandedTasks);
    if (newSet.has(taskId)) newSet.delete(taskId);
    else newSet.add(taskId);
    setExpandedTasks(newSet);
  };

  const handlePrevDay = () => setSearchParams({ date: format(subDays(currentDate, 1), 'yyyy-MM-dd') });
  const handleNextDay = () => setSearchParams({ date: format(addDays(currentDate, 1), 'yyyy-MM-dd') });
  const handleToday = () => setSearchParams({ date: format(new Date(), 'yyyy-MM-dd') });

  const openNewTaskModal = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (editingTask) {
      await db.tasks.update(editingTask.id, {
        ...taskData,
        updated_at: new Date().toISOString(),
        pending_sync: 1
      });
    } else {
      await db.tasks.add({
        id: crypto.randomUUID(),
        user_id: user?.id || 'local-user', 
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        pending_sync: 1,
        ...taskData
      } as Task);
    }
  };

  const handleDeleteTask = async (id: string) => {
    await db.tasks.update(id, { 
      deleted: true,
      pending_sync: 1, 
      updated_at: new Date().toISOString() 
    });
    await db.taskDetails.where({ task_id: id }).modify({ 
      deleted: true, 
      pending_sync: 1, 
      updated_at: new Date().toISOString() 
    });
  };

  return (
    <div className="flex flex-col h-full bg-background p-4 md:p-8 max-w-3xl mx-auto w-full">
      <header className="flex flex-col items-center mb-8">
        <div className="flex items-center justify-between w-full max-w-sm mb-2">
          <button onClick={handlePrevDay} className="p-2 hover:bg-secondary rounded-full transition-colors"><ChevronLeft /></button>
          <div className="text-center">
            <h2 className="text-xl font-medium tracking-tight">
              {format(currentDate, 'MMMM d')}
            </h2>
            <p className="text-muted-foreground text-sm">
              {format(currentDate, 'EEEE')}
            </p>
          </div>
          <button onClick={handleNextDay} className="p-2 hover:bg-secondary rounded-full transition-colors"><ChevronRight /></button>
        </div>
        {!isToday(currentDate) && (
          <button onClick={handleToday} className="text-xs text-primary hover:underline">
            Back to Today
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto space-y-6 pb-24">
        {!tasks || tasks.length === 0 ? (
          <div className="text-center text-muted-foreground mt-20">
            <p>No tasks for today.</p>
          </div>
        ) : (
          tasks.map(task => (
            <TaskItem 
              key={task.id} 
              task={task} 
              isExpanded={expandedTasks.has(task.id)} 
              onToggleExpand={(e) => toggleExpand(task.id, e)}
              onClick={() => openEditTaskModal(task)}
            />
          ))
        )}
      </div>

      <button 
        onClick={openNewTaskModal}
        className="fixed bottom-20 md:bottom-8 right-4 md:right-8 bg-foreground text-background hover:opacity-90 p-4 md:px-6 md:py-3 rounded-full shadow-lg shadow-black/20 flex items-center justify-center space-x-2 transition-transform active:scale-95 z-40"
      >
        <Plus size={24} className="md:w-5 md:h-5" />
        <span className="hidden md:inline font-medium">Add Task</span>
      </button>

      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        initialData={editingTask}
        selectedDate={dateStr}
      />
    </div>
  );
}

function TaskItem({ task, isExpanded, onToggleExpand, onClick }: { task: Task, isExpanded: boolean, onToggleExpand: (e: React.MouseEvent) => void, onClick: () => void }) {
  const details = useLiveQuery(async () => {
    const all = await db.taskDetails.where({ task_id: task.id }).toArray();
    return all.filter(d => !d.deleted).sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  }, [task.id]);

  const getTimeRange = () => {
    if (!task.start_time || !task.end_time) return '';
    try {
      const start = parse(task.start_time, 'HH:mm', new Date()).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'}).toLowerCase().replace(' ', '');
      const end = parse(task.end_time, 'HH:mm', new Date()).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'}).toLowerCase().replace(' ', '');
      return `${start} to ${end}`;
    } catch { return ''; }
  };

  const getDuration = () => {
    if (!task.start_time || !task.end_time) return '';
    try {
      const start = parse(task.start_time, 'HH:mm', new Date());
      const end = parse(task.end_time, 'HH:mm', new Date());
      const diffMs = end.getTime() - start.getTime();
      const diffMins = Math.round(diffMs / 60000);
      if (diffMins <= 0) return '';
      if (diffMins < 60) return `${diffMins} min`;
      const hrs = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hrs} hr${hrs > 1 ? 's' : ''}${mins > 0 ? ` ${mins}m` : ''}`;
    } catch { return ''; }
  };

  const toggleCompletion = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await db.tasks.update(task.id, { 
      completed: !task.completed,
      updated_at: new Date().toISOString(),
      pending_sync: 1
    });
  };

  const addDetail = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await db.taskDetails.add({
      id: crypto.randomUUID(),
      task_id: task.id,
      title: '',
      start_time: '',
      end_time: '',
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pending_sync: 1
    });
    // Ensure expanded
    if (!isExpanded) onToggleExpand(e);
  };

  return (
    <div className="flex flex-col">
      {task.start_time && (
        <span className="text-xs font-semibold text-muted-foreground mb-1 ml-2">
          {parse(task.start_time, 'HH:mm', new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </span>
      )}
      <div className={`border rounded-2xl bg-card shadow-sm transition-all overflow-hidden ${task.completed ? 'opacity-60' : ''}`}>
        
        {/* Task Header (Clickable for editing) */}
        <div 
          onClick={onClick}
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/30"
        >
          <div className="flex items-center space-x-3">
            <button onClick={toggleCompletion} className="text-muted-foreground hover:text-foreground transition-colors">
              {task.completed ? <CheckSquare size={20} className="text-foreground" /> : <Square size={20} />}
            </button>
            <div className="flex items-center space-x-2">
              <button 
                onClick={onToggleExpand} 
                className="p-1 hover:bg-border rounded text-muted-foreground transition-colors"
              >
                {isExpanded ? <ChevronDown size={18} /> : <ChevronRightSmall size={18} />}
              </button>
              <h3 className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                {task.title}
              </h3>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-3 text-right shrink-0">
            {getTimeRange() && (
              <span className="text-xs md:text-sm text-muted-foreground whitespace-nowrap">
                {getTimeRange()}
              </span>
            )}
            {getDuration() && (
              <span className="text-[10px] md:text-sm font-medium text-muted-foreground bg-secondary px-1.5 md:px-2 py-1 rounded-md whitespace-nowrap">
                {getDuration()}
              </span>
            )}
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="px-2 md:px-4 pb-4 border-t border-border/50 pt-4 bg-secondary/10">
            {details && details.length > 0 && (
              <div className="space-y-2 mb-4 md:pl-8">
                {details.map(detail => (
                  <InlineDetailEditor key={detail.id} detail={detail} />
                ))}
              </div>
            )}
            
            {task.description && (
              <div className="text-sm text-muted-foreground md:pl-8 mb-4">
                <span className="font-medium text-foreground">Notes: </span>
                {task.description}
              </div>
            )}
            
            <button 
              onClick={addDetail}
              className="md:ml-8 text-xs font-medium text-muted-foreground hover:text-foreground flex items-center transition-colors"
            >
              <Plus size={14} className="mr-1" /> Add detail
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InlineDetailEditor({ detail }: { detail: TaskDetail }) {
  const [title, setTitle] = useState(detail.title);
  const [startTime, setStartTime] = useState(detail.start_time || '');
  const [endTime, setEndTime] = useState(detail.end_time || '');
  const [notes, setNotes] = useState(detail.notes || '');
  const [isExpanded, setIsExpanded] = useState(false);

  const saveChanges = async () => {
    if (title === detail.title && startTime === (detail.start_time || '') && endTime === (detail.end_time || '') && notes === (detail.notes || '')) return;
    await db.taskDetails.update(detail.id, {
      title,
      start_time: startTime,
      end_time: endTime,
      notes,
      updated_at: new Date().toISOString(),
      pending_sync: 1
    });
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      saveChanges();
    }, 500);
    return () => clearTimeout(handler);
  }, [title, startTime, endTime, notes]);

  const toggleCompletion = async () => {
    await db.taskDetails.update(detail.id, {
      completed: !detail.completed,
      updated_at: new Date().toISOString(),
      pending_sync: 1
    });
  };

  const handleDelete = async () => {
    await db.taskDetails.update(detail.id, {
      deleted: true,
      pending_sync: 1,
      updated_at: new Date().toISOString()
    });
  };

  return (
    <div className="flex flex-col space-y-1 group">
      <div className="flex items-center space-x-3">
        <button onClick={toggleCompletion} className="text-muted-foreground hover:text-foreground">
          {detail.completed ? <CheckSquare size={16} className="text-foreground" /> : <Square size={16} />}
        </button>
        
        <div className="flex-1 bg-background border border-border rounded-lg p-2 focus-within:ring-2 focus-within:ring-primary/20 flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
          <div className="flex items-center space-x-2 w-full min-w-0">
            <button 
               onClick={() => setIsExpanded(!isExpanded)}
               className="p-1 hover:bg-secondary rounded text-muted-foreground flex-shrink-0"
            >
               {isExpanded ? <ChevronDown size={14} /> : <ChevronRightSmall size={14} />}
            </button>
            
            <input 
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Sub-task title..."
              className={`flex-1 bg-transparent text-sm focus:outline-none min-w-0 ${detail.completed ? 'line-through text-muted-foreground' : ''}`}
            />
          </div>
          
          <div className="flex items-center space-x-2 bg-secondary/30 border border-border/50 rounded-lg px-2 py-1.5 flex-shrink-0 self-start sm:self-auto ml-7 sm:ml-0 overflow-x-auto w-full sm:w-auto">
             <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/70">from</span>
             <input 
              type="time" 
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="text-xs font-medium bg-background border border-border/50 shadow-sm rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/50 w-[70px] text-center"
            />
            <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/70">to</span>
            <input 
              type="time" 
              value={endTime}
              onChange={e => {
                 const newEnd = e.target.value;
                 if (startTime && newEnd) {
                   const start = new Date(`2000-01-01T${startTime}`);
                   const end = new Date(`2000-01-01T${newEnd}`);
                   if (end < start) {
                     alert("End time cannot be before start time!");
                     return;
                   }
                 }
                 setEndTime(newEnd);
              }}
              className="text-xs font-medium bg-background border border-border/50 shadow-sm rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/50 w-[70px] text-center"
            />
          </div>
        </div>
        
        <button 
          onClick={handleDelete}
          className="opacity-100 md:opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive transition-opacity flex-shrink-0"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {isExpanded && (
        <div className="ml-2 sm:ml-8 pr-2 sm:pr-12">
           <RichNoteEditor 
              key={detail.id}
              initialValue={notes}
              onChange={setNotes}
              parentId={detail.id}
           />
           <AttachmentList parentId={detail.id} />
        </div>
      )}
    </div>
  );
}
