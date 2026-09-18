import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Paperclip, Mic, Image as ImageIcon, Download, Trash2, X, FileText } from 'lucide-react';

interface AttachmentListProps {
  parentId: string;
}

export default function AttachmentList({ parentId }: AttachmentListProps) {
  const [preview, setPreview] = useState<{ url: string; type: 'image' | 'pdf' } | null>(null);

  const attachments = useLiveQuery(async () => {
    const all = await db.attachments.where({ task_detail_id: parentId }).toArray();
    return all.filter(a => !a.deleted).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [parentId]);

  if (!attachments || attachments.length === 0) return null;

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await db.attachments.update(id, {
      deleted: true,
      pending_sync: 1
    });
  };

  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
      {attachments.map(att => (
        <div key={att.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/20 border border-border/50 group min-w-0">
          <div className="flex items-center space-x-3 overflow-hidden min-w-0 flex-1">
            <div className="p-2 bg-secondary rounded text-primary flex-shrink-0">
              {att.type === 'image' ? <ImageIcon size={16} /> : 
               att.type === 'voice' ? <Mic size={16} /> : 
               <Paperclip size={16} />}
            </div>
            
            {att.type === 'voice' ? (
              <audio src={att.data} controls className="h-8 w-40 flex-shrink-0" />
            ) : att.type === 'image' ? (
              <button 
                onClick={() => setPreview({ url: att.data, type: 'image' })}
                className="flex items-center space-x-2 truncate hover:underline text-left min-w-0 flex-1"
              >
                 <span className="text-sm font-medium truncate inline-block w-full">{att.name}</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2 truncate min-w-0 flex-1">
                 <button 
                   onClick={() => att.mime_type === 'application/pdf' ? setPreview({ url: att.data, type: 'pdf' }) : window.open(att.data, '_blank')}
                   className="text-sm font-medium truncate hover:underline text-left min-w-0 flex-1"
                 >
                   {att.name}
                 </button>
                 <a href={att.data} download={att.name} title="Download File" className="flex-shrink-0">
                   <Download size={12} className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0" />
                 </a>
              </div>
            )}
          </div>
          
          <button 
            onClick={(e) => handleDelete(att.id, e)}
            className="p-1.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity flex-shrink-0"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      {/* Full Screen Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="relative bg-card border border-border shadow-xl rounded-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            
            <div className="flex items-center justify-between p-3 border-b border-border/50 bg-secondary/30">
              <div className="flex items-center space-x-2 text-muted-foreground">
                {preview.type === 'image' ? <ImageIcon size={18} /> : <FileText size={18} />}
                <span className="text-sm font-medium">Preview</span>
              </div>
              <div className="flex items-center space-x-2">
                <a 
                  href={preview.url} 
                  download 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-1.5 rounded hover:bg-secondary text-muted-foreground transition-colors"
                  title="Download / Open Original"
                >
                  <Download size={18} />
                </a>
                <button 
                  onClick={() => setPreview(null)}
                  className="p-1.5 rounded hover:bg-destructive hover:text-destructive-foreground text-muted-foreground transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto bg-muted/20 flex items-center justify-center p-4">
              {preview.type === 'image' ? (
                <img src={preview.url} alt="Preview" className="max-w-full max-h-full object-contain rounded drop-shadow-md" />
              ) : (
                <iframe src={preview.url} title="PDF Preview" className="w-full h-full rounded shadow-sm bg-white" />
              )}
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
