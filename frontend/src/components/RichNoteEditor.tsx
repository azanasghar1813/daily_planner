import { useState, useRef, useEffect } from 'react';
import { List, ListOrdered, Link2, Mic, MicOff, Undo2, Redo2, Paperclip } from 'lucide-react';
import { db, type Attachment } from '../db/db';
import { supabase } from '../supabase';

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

  // Sync to parent (Debounced)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (value !== initialValue) {
        onChange(value);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [value]);

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

  const insertText = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;
    const selectedText = currentVal.substring(start, end);
    
    const newVal = currentVal.substring(0, start) + prefix + (selectedText || (suffix ? 'text' : '')) + suffix + currentVal.substring(end);
    updateValue(newVal);
    
    setTimeout(() => {
      textarea.focus();
      if (!selectedText && suffix) {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + 4);
      } else {
        const newPos = start + prefix.length + selectedText.length + suffix.length;
        textarea.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const togglePrefixAtLine = (prefixMatch: RegExp, defaultPrefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const currentVal = textarea.value;
    
    const lastNewline = currentVal.lastIndexOf('\n', start - 1);
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
    const lineEnd = currentVal.indexOf('\n', start);
    const endOfLine = lineEnd === -1 ? currentVal.length : lineEnd;
    
    const currentLine = currentVal.substring(lineStart, endOfLine);
    
    if (prefixMatch.test(currentLine)) {
      // Remove prefix
      const newLine = currentLine.replace(prefixMatch, '');
      const newVal = currentVal.substring(0, lineStart) + newLine + currentVal.substring(endOfLine);
      updateValue(newVal);
      setTimeout(() => {
        textarea.focus();
        const diff = newLine.length - currentLine.length;
        textarea.setSelectionRange(Math.max(lineStart, start + diff), Math.max(lineStart, start + diff));
      }, 0);
    } else {
      // Add prefix
      const newVal = currentVal.substring(0, lineStart) + defaultPrefix + currentLine + currentVal.substring(endOfLine);
      updateValue(newVal);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + defaultPrefix.length, start + defaultPrefix.length);
      }, 0);
    }
  };

  const handleBullet = () => togglePrefixAtLine(/^(\s*)•\s+/, '• ');
  const handleNumber = () => togglePrefixAtLine(/^(\s*)\d+\.\s+/, '1. ');

  const handleBold = () => {
    insertText('**', '**');
  };

  const handleItalic = () => {
    insertText('*', '*');
  };

  const handleLink = () => {
    const url = prompt('Enter link URL:');
    if (url) {
      insertText('[', `](${url})`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const currentVal = textarea.value;
      const textBeforeCursor = currentVal.substring(0, start);
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];

      const bulletMatch = currentLine.match(/^(\s*)•\s+(.*)$/);
      if (bulletMatch) {
        e.preventDefault();
        if (!bulletMatch[2].trim()) {
          const newVal = currentVal.substring(0, start - currentLine.length) + currentVal.substring(start);
          updateValue(newVal);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start - currentLine.length, start - currentLine.length);
          }, 0);
        } else {
          const prefix = `\n${bulletMatch[1]}• `;
          const newVal = currentVal.substring(0, start) + prefix + currentVal.substring(start);
          updateValue(newVal);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, start + prefix.length);
          }, 0);
        }
        return;
      }

      const numberMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (numberMatch) {
        e.preventDefault();
        if (!numberMatch[3].trim()) {
           const newVal = currentVal.substring(0, start - currentLine.length) + currentVal.substring(start);
           updateValue(newVal);
           setTimeout(() => {
             textarea.focus();
             textarea.setSelectionRange(start - currentLine.length, start - currentLine.length);
           }, 0);
        } else {
           const nextNum = parseInt(numberMatch[2], 10) + 1;
           const prefix = `\n${numberMatch[1]}${nextNum}. `;
           const newVal = currentVal.substring(0, start) + prefix + currentVal.substring(start);
           updateValue(newVal);
           setTimeout(() => {
             textarea.focus();
             textarea.setSelectionRange(start + prefix.length, start + prefix.length);
           }, 0);
        }
        return;
      }
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
            if (!navigator.onLine) {
               // Offline Fallback
               const reader = new FileReader();
               reader.readAsDataURL(audioBlob);
               reader.onloadend = async () => {
                 const base64data = reader.result as string;
                 const attachment: Attachment = {
                   id: crypto.randomUUID(),
                   task_detail_id: parentId,
                   type: 'voice',
                   name: `Voice Note ${new Date().toLocaleTimeString()} (Offline)`,
                   data: base64data,
                   mime_type: 'audio/webm',
                   created_at: new Date().toISOString(),
                   updated_at: new Date().toISOString(),
                   pending_sync: 1,
                   pending_upload: 1
                 };
                 await db.attachments.add(attachment);
                 insertText(`\n🎙️ [${attachment.name}](voice:${attachment.id})\n`);
                 setIsUploading(false);
               };
               return;
            }

            const formData = new FormData();
            formData.append('file', audioBlob, 'voice_note.webm');
            formData.append('type', 'voice');

            const { data: { session } } = await supabase.auth.getSession();
            const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
            const res = await fetch(`${API_BASE}/api/upload`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${session?.access_token}` },
              body: formData
            });
            const data = await res.json();
            
            if (res.ok && data.secure_url) {
              const attachment: Attachment = {
                id: crypto.randomUUID(),
                task_detail_id: parentId,
                type: 'voice',
                name: `Voice Note ${new Date().toLocaleTimeString()}`,
                data: data.secure_url,
                mime_type: 'audio/webm',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                pending_sync: 1,
                pending_upload: 0
              };
              
              await db.attachments.add(attachment);
              insertText(`\n🎙️ [${attachment.name}](voice:${attachment.id})\n`);
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const isImage = file.type.startsWith('image/');
      
      if (!navigator.onLine) {
         const reader = new FileReader();
         reader.readAsDataURL(file);
         reader.onloadend = async () => {
           const base64data = reader.result as string;
           const attachment: Attachment = {
             id: crypto.randomUUID(),
             task_detail_id: parentId,
             type: isImage ? 'image' : 'file',
             name: `${file.name} (Offline)`,
             data: base64data,
             mime_type: file.type || 'application/octet-stream',
             created_at: new Date().toISOString(),
             updated_at: new Date().toISOString(),
             pending_sync: 1,
             pending_upload: 1
           };
           await db.attachments.add(attachment);
           setIsUploading(false);
           if (fileInputRef.current) fileInputRef.current.value = '';
         };
         return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', isImage ? 'image' : 'file');

      const { data: { session } } = await supabase.auth.getSession();
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData
      });
      const data = await res.json();

      if (res.ok && data.secure_url) {
        const attachment: Attachment = {
          id: crypto.randomUUID(),
          task_detail_id: parentId,
          type: isImage ? 'image' : 'file',
          name: file.name,
          data: data.secure_url,
          mime_type: file.type || 'application/octet-stream',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          pending_sync: 1,
          pending_upload: 0
        };
        await db.attachments.add(attachment);
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (err: any) {
      alert(`Network error during upload: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
        
        
        <button onClick={handleBold} className="p-1.5 rounded hover:bg-secondary text-muted-foreground font-bold" title="Bold">
          B
        </button>
        <button onClick={handleItalic} className="p-1.5 rounded hover:bg-secondary text-muted-foreground italic font-serif" title="Italic">
          I
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
        
        <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-1.5 rounded hover:bg-secondary text-muted-foreground disabled:opacity-30" title="Attach File/Image">
          <Paperclip size={16} />
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
        
        
        <button onClick={toggleRecording} disabled={isUploading} className={`p-1.5 rounded transition-colors disabled:opacity-30 ${isRecording ? 'bg-red-500/10 text-red-500 animate-pulse' : 'hover:bg-secondary text-muted-foreground'}`} title="Voice Note">
          {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        {isUploading && <span className="text-xs text-primary ml-2 animate-pulse">Uploading...</span>}
      </div>

      <textarea 
        ref={textareaRef}
        value={value}
        onChange={e => updateValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add details, notes, or bullet points here..."
        className="w-full bg-transparent text-sm text-foreground focus:outline-none p-3 resize-y min-h-[80px]"
      />
    </div>
  );
}


