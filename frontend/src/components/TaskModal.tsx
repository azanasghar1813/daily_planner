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
    
    // Time validation
    if (startTime && endTime) {
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      if (end < start) {
        alert("End time cannot be before start time!");
        return;
      }
    }

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
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card w-full max-w-md rounded-t-3xl md:rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:shadow-lg border border-border flex flex-col max-h-[90vh] md:max-h-[85vh] mt-auto md:mt-0 overflow-hidden">
        <div className="w-12 h-1.5 bg-border rounded-full mx-auto mt-3 mb-1 md:hidden flex-shrink-0"></div>
        <div className="flex items-center justify-between p-4 pt-2 md:pt-4 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-semibold">{initialData ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:bg-secondary rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 overflow-y-auto space-y-4 flex-1">
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

          </div>

          <div className="p-4 border-t border-border flex items-center justify-between flex-shrink-0 bg-card pb-safe">
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
