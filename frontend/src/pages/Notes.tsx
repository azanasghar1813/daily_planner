import React, { useState, useEffect } from 'react';
import { db, type Note } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Trash2, Clock, FileText } from 'lucide-react';
import { format } from 'date-fns';
import RichNoteEditor from '../components/RichNoteEditor';
import AttachmentList from '../components/AttachmentList';
import { useAuth } from '../components/AuthProvider';

export default function Notes() {
  const { user } = useAuth();
  const notes = useLiveQuery(async () => {
    if (!user) return [];
    const allNotes = await db.notes.where({ user_id: user.id }).toArray();
    return allNotes.filter(n => !n.deleted).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [user?.id]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // If selected note is deleted or not set, select the first one if available
  useEffect(() => {
    if (notes && notes.length > 0 && !selectedNoteId) {
      setSelectedNoteId(notes[0].id);
    } else if (notes && notes.length === 0) {
      setSelectedNoteId(null);
    }
  }, [notes, selectedNoteId]);

  const selectedNote = notes?.find(n => n.id === selectedNoteId);

  const handleCreateNote = async () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      user_id: user?.id || 'local-user',
      title: 'Untitled Note',
      content: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pending_sync: 1
    };
    await db.notes.add(newNote);
    setSelectedNoteId(newNote.id);
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await db.notes.update(id, {
      deleted: true,
      pending_sync: 1,
      updated_at: new Date().toISOString()
    });
    await db.attachments.where({ task_detail_id: id }).modify({
      deleted: true,
      pending_sync: 1
    });
    if (selectedNoteId === id) setSelectedNoteId(null);
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    await db.notes.update(id, {
      ...updates,
      updated_at: new Date().toISOString(),
      pending_sync: 1
    });
  };

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      
      {/* Sidebar List */}
      <div className={`
        flex flex-col w-full md:w-80 border-r border-border bg-card/50
        ${selectedNoteId ? 'hidden md:flex' : 'flex'}
      `}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-semibold">Notes</h2>
          <button 
            onClick={handleCreateNote}
            className="p-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {!notes || notes.length === 0 ? (
            <div className="text-center text-muted-foreground p-8 flex flex-col items-center">
              <FileText className="mb-2 opacity-50" size={32} />
              <p className="text-sm">No notes yet.</p>
              <button onClick={handleCreateNote} className="text-primary text-sm mt-2 hover:underline">
                Create one
              </button>
            </div>
          ) : (
            notes.map(note => (
              <div 
                key={note.id}
                onClick={() => setSelectedNoteId(note.id)}
                className={`
                  p-3 rounded-lg cursor-pointer transition-colors group relative
                  ${selectedNoteId === note.id ? 'bg-secondary' : 'hover:bg-secondary/50'}
                `}
              >
                <h3 className="font-medium truncate pr-8">{note.title || 'Untitled Note'}</h3>
                <div className="flex items-center text-xs text-muted-foreground mt-1 space-x-2">
                  <span className="flex items-center"><Clock size={12} className="mr-1" /> {format(new Date(note.updated_at), 'MMM d, h:mm a')}</span>
                </div>
                
                <button 
                  onClick={(e) => handleDeleteNote(note.id, e)}
                  className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Editor Pane */}
      <div className={`
        flex-1 flex flex-col bg-background relative
        ${!selectedNoteId ? 'hidden md:flex' : 'flex'}
      `}>
        {selectedNote ? (
          <div className="flex flex-col h-full overflow-hidden p-4 md:p-8 max-w-4xl mx-auto w-full">
            {/* Mobile Back Button */}
            <button 
              className="md:hidden text-muted-foreground hover:text-foreground mb-4 self-start text-sm flex items-center"
              onClick={() => setSelectedNoteId(null)}
            >
              ← Back to notes
            </button>
            
            <div className="flex-1 overflow-y-auto space-y-6 pb-24 pr-2">
              <input 
                type="text"
                value={selectedNote.title}
                onChange={(e) => updateNote(selectedNote.id, { title: e.target.value })}
                placeholder="Note Title"
                className="w-full text-3xl md:text-4xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground/30"
              />
              
              <div className="text-xs text-muted-foreground border-b border-border pb-4">
                Last updated {format(new Date(selectedNote.updated_at), 'MMMM d, yyyy h:mm a')}
              </div>
              
              <div className="min-h-[400px]">
                <RichNoteEditor 
                  key={selectedNote.id}
                  initialValue={selectedNote.content}
                  onChange={(val) => {
                    if (val !== selectedNote.content) {
                      updateNote(selectedNote.id, { content: val });
                    }
                  }}
                  parentId={selectedNote.id}
                />
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Attachments & Voice Notes</h4>
                <AttachmentList parentId={selectedNote.id} />
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex h-full w-full items-center justify-center text-muted-foreground">
            <div className="text-center flex flex-col items-center">
              <FileText className="mb-4 opacity-30" size={64} />
              <p>Select a note or create a new one to start writing.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
