import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { Save, Loader2, Edit3, Eye, Trash2, Link as LinkIcon, Plus } from 'lucide-react';
import { db, auth } from '@/src/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Note } from '@/src/types';
import { cn, formatDate } from '@/src/lib/utils';

interface NoteEditorProps {
  paperId: string;
}

export default function NoteEditor({ paperId }: NoteEditorProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<string>("");
  const [isEditing, setIsEditing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  useEffect(() => {
    if (!paperId || !auth.currentUser) return;
    const q = query(collection(db, 'notes'), where('paperId', '==', paperId), where('userId', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note));
      setNotes(fetchedNotes);
      if (fetchedNotes.length > 0 && !editingNoteId) {
        setEditingNoteId(fetchedNotes[0].id);
        setCurrentNote(fetchedNotes[0].content);
        setIsEditing(false);
      }
    });
    return () => unsubscribe();
  }, [paperId]);

  const handleSave = async () => {
    if (!auth.currentUser || !currentNote.trim()) return;
    setIsSaving(true);
    try {
      if (editingNoteId) {
        await updateDoc(doc(db, 'notes', editingNoteId), {
          content: currentNote,
          updatedAt: new Date().toISOString()
        });
      } else {
        const docRef = await addDoc(collection(db, 'notes'), {
          paperId,
          userId: auth.currentUser.uid,
          content: currentNote,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        setEditingNoteId(docRef.id);
      }
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving note:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const createNewNote = () => {
    setEditingNoteId(null);
    setCurrentNote("");
    setIsEditing(true);
  };

  const deleteNote = async (id: string) => {
    if (window.confirm('确定要删除这条笔记吗？')) {
      try {
        await deleteDoc(doc(db, 'notes', id));
        if (editingNoteId === id) {
          setEditingNoteId(null);
          setCurrentNote("");
          setIsEditing(true);
        }
      } catch (error) {
        console.error("Error deleting note:", error);
      }
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsEditing(true)} 
            className={cn("p-2 rounded-lg transition-all", isEditing ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
            title="编辑"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsEditing(false)} 
            className={cn("p-2 rounded-lg transition-all", !isEditing ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
            title="预览"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={createNewNote} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200" title="新建笔记">
            <Plus className="w-4 h-4" />
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving || !currentNote.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm transition-all shadow-sm"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存笔记
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        {isEditing ? (
          <div className="flex flex-col h-full">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center gap-4 text-[10px] text-slate-500 font-mono uppercase tracking-wider">
              <span>支持 Markdown</span>
              <span>支持 LaTeX: $E=mc^2$</span>
              <span>支持化学公式: {'$\\ce{H2O}$'}</span>
            </div>
            <textarea
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              placeholder="在此输入精读笔记... 支持 Markdown 和 LaTeX 公式。"
              className="flex-1 p-6 outline-none resize-none text-slate-800 leading-relaxed font-sans text-sm custom-scrollbar"
            />
          </div>
        ) : (
          <div className="flex-1 p-6 overflow-auto custom-scrollbar prose prose-slate max-w-none">
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const content = String(children).replace(/\n$/, '');
                  if (match && match[1] === 'math') {
                    return <BlockMath math={content} />;
                  }
                  if (inline && content.startsWith('$') && content.endsWith('$')) {
                    return <InlineMath math={content.slice(1, -1)} />;
                  }
                  return <code className={className} {...props}>{children}</code>;
                },
                p({ children }: any) {
                  // Simple regex to find LaTeX in text
                  const parts = String(children).split(/(\$.*?\$)/g);
                  return (
                    <p>
                      {parts.map((part, i) => {
                        if (part.startsWith('$') && part.endsWith('$')) {
                          return <InlineMath key={i} math={part.slice(1, -1)} />;
                        }
                        return part;
                      })}
                    </p>
                  );
                }
              }}
            >
              {currentNote}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {notes.length > 1 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">其他笔记</h4>
          <div className="grid grid-cols-1 gap-2">
            {notes.filter(n => n.id !== editingNoteId).map(note => (
              <div key={note.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg group hover:border-blue-200 transition-all">
                <div className="flex-1 cursor-pointer" onClick={() => { setEditingNoteId(note.id); setCurrentNote(note.content); setIsEditing(false); }}>
                  <p className="text-xs font-medium text-slate-700 truncate">{note.content.substring(0, 50)}...</p>
                  <p className="text-[10px] text-slate-400 mt-1">{formatDate(note.updatedAt)}</p>
                </div>
                <button onClick={() => deleteNote(note.id)} className="p-1.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
