import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { format, addHours } from 'date-fns';
import { type Task } from '../db/db';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Partial<Task>) => void;
  onDelete?: (id: string) => void;
  initialData?: Task | null;
  selectedDate: string; // YYYY-MM-DD
}

export default function TaskModal({ isOpen, onClose, onSave, onDelete, initialData, selectedDate }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title);
        setStartTime(initialData.start_time || '');
        setEndTime(initialData.end_time || '');
        setDescription(initialData.description || '');
      } else {
        setTitle('');
        setStartTime(format(new Date(), 'HH:mm'));
        setEndTime(format(addHours(new Date(), 1), 'HH:mm'));
        setDescription('');
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title,
      start_time: startTime,
      end_time: endTime,
      description,
      date: initialData ? initialData.date : selectedDate
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-lg border border-border flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">{initialData ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:bg-secondary rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Title</label>
            <input 
              type="text" 
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g., Study Database"
              required
            />
          </div>
          
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-muted-foreground mb-1">Start Time</label>
              <input 
                type="time" 
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-muted-foreground mb-1">End Time</label>
              <input 
                type="time" 
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Notes / Description</label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px] resize-y"
              placeholder="Add any notes here..."
            />
          </div>

          <div className="pt-4 flex items-center justify-between">
            {initialData && onDelete ? (
              <button 
                type="button" 
                onClick={() => { onDelete(initialData.id); onClose(); }}
                className="text-sm font-medium text-destructive hover:bg-destructive/10 px-3 py-2 rounded-lg transition-colors"
              >
                Delete
              </button>
            ) : <div></div>}
            
            <div className="flex space-x-3">
              <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 rounded-lg font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-4 py-2 rounded-lg font-medium bg-foreground text-background hover:opacity-90 transition-opacity"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
