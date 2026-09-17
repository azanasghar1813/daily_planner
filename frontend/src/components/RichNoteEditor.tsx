import { useState, useRef, useEffect } from 'react';
import { List, ListOrdered, Link2, Mic, MicOff, Undo2, Redo2 } from 'lucide-react';
import { db, type Attachment } from '../db/db';

interface RichNoteEditorProps {
  initialValue: string;
  onChange: (val: string) => void;
  parentId: string;
}

export default function RichNoteEditor({ initialValue, onChange, parentId }: RichNoteEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [history, setHistory] = useState<string[]>([initialValue]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync to parent
  useEffect(() => {
    onChange(value);
  }, [value, onChange]);

  const updateValue = (newValue: string) => {
    setValue(newValue);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newValue);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setValue(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setValue(history[historyIndex + 1]);
    }
  };

  const insertAtCursor = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;
    
    const newVal = currentVal.substring(0, start) + textToInsert + currentVal.substring(end);
    updateValue(newVal);
    
    // reset cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 0);
  };

  const handleBullet = () => {
    insertAtCursor('\n• ');
  };

  const handleNumber = () => {
    insertAtCursor('\n1. ');
  };

  const handleLink = () => {
    const url = prompt('Enter link URL:');
    if (url) {
      insertAtCursor(`[Link](${url})`);
    }
  };

  // --- Voice Recording Logic ---
  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setIsUploading(true);
          
          try {
            const formData = new FormData();
            formData.append('file', audioBlob, 'voice_note.webm');
            formData.append('type', 'voice');

            const res = await fetch('/api/upload', {
              method: 'POST',
              body: formData
            });
            const data = await res.json();
            
            if (res.ok && data.secure_url) {
              const attachment: Attachment = {
                id: crypto.randomUUID(),
                parent_id: parentId,
                type: 'voice',
                name: `Voice Note ${new Date().toLocaleTimeString()}`,
                data: data.secure_url,
                mime_type: 'audio/webm',
                created_at: new Date().toISOString(),
                pending_sync: true
              };
              
              await db.attachments.add(attachment);
              insertAtCursor(`\n🎙️ [${attachment.name}](voice:${attachment.id})\n`);
            } else {
              alert(data.error || 'Upload failed');
            }
          } catch (err: any) {
            alert(`Network error during upload: ${err.message}`);
          } finally {
            setIsUploading(false);
            stream.getTracks().forEach(track => track.stop());
          }
        };
        
        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        alert('Microphone access denied or unavailable.');
        console.error(err);
      }
    }
  };

  return (
    <div className="flex flex-col bg-background border border-border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/20">
      
      {/* Action Toolbar */}
      <div className="flex items-center space-x-1 p-1 bg-secondary/30 border-b border-border/50 overflow-x-auto">
        <button onClick={handleUndo} disabled={historyIndex === 0} className="p-1.5 rounded hover:bg-secondary text-muted-foreground disabled:opacity-30" title="Undo">
          <Undo2 size={16} />
        </button>
        <button onClick={handleRedo} disabled={historyIndex === history.length - 1} className="p-1.5 rounded hover:bg-secondary text-muted-foreground disabled:opacity-30" title="Redo">
          <Redo2 size={16} />
        </button>
        
        <div className="w-px h-4 bg-border mx-1"></div>
        
        <button onClick={handleBullet} className="p-1.5 rounded hover:bg-secondary text-muted-foreground" title="Bullet List">
          <List size={16} />
        </button>
        <button onClick={handleNumber} className="p-1.5 rounded hover:bg-secondary text-muted-foreground" title="Numbered List">
          <ListOrdered size={16} />
        </button>
        <button onClick={handleLink} className="p-1.5 rounded hover:bg-secondary text-muted-foreground" title="Add Link">
          <Link2 size={16} />
        </button>
        
        <div className="w-px h-4 bg-border mx-1"></div>
        
        <button onClick={toggleRecording} disabled={isUploading} className={`p-1.5 rounded transition-colors disabled:opacity-30 ${isRecording ? 'bg-red-500/10 text-red-500 animate-pulse' : 'hover:bg-secondary text-muted-foreground'}`} title="Voice Note">
          {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        {isUploading && <span className="text-xs text-primary ml-2 animate-pulse">Uploading...</span>}
      </div>

      <textarea 
        ref={textareaRef}
        value={value}
        onChange={e => updateValue(e.target.value)}
        placeholder="Add details, notes, or bullet points here..."
        className="w-full bg-transparent text-sm text-foreground focus:outline-none p-3 resize-y min-h-[80px]"
      />
    </div>
  );
}


