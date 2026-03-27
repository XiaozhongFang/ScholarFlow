import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, 
  Highlighter, Type, Underline, Square, 
  Image as ImageIcon, Plus, Trash2, Save,
  Columns, MessageSquare, BookOpen, Search,
  X, Check, Loader2, Download, Share2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Annotation, Paper, Note } from '@/src/types';
import { db, auth } from '@/src/firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import AIAssistant from './AIAssistant';
import NoteEditor from './NoteEditor';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFReaderProps {
  paper: Paper;
  onClose: () => void;
}

export default function PDFReader({ paper, onClose }: PDFReaderProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [tool, setTool] = useState<'select' | 'highlight' | 'underline' | 'text' | 'drawing'>('select');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isSplitScreen, setIsSplitScreen] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selection, setSelection] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number, y: number }[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!paper.id) return;
    const q = query(collection(db, 'papers', paper.id, 'annotations'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const annos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Annotation));
      setAnnotations(annos);
    });
    return () => unsubscribe();
  }, [paper.id]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const handlePageChange = (offset: number) => {
    setPageNumber(prev => Math.min(Math.max(1, prev + offset), numPages));
  };

  const handleZoom = (delta: number) => {
    setScale(prev => Math.min(Math.max(0.5, prev + delta), 3.0));
  };

  const addAnnotation = async (type: Annotation['type'], pos: any, content?: string) => {
    if (!auth.currentUser) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'papers', paper.id, 'annotations'), {
        paperId: paper.id,
        userId: auth.currentUser.uid,
        pageNumber,
        type,
        content: content || '',
        position: pos,
        color: type === 'highlight' ? '#FFFF0080' : '#FF0000',
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error adding annotation:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAnnotation = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'papers', paper.id, 'annotations', id));
    } catch (error) {
      console.error("Error deleting annotation:", error);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool === 'select') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    if (tool === 'drawing') {
      setIsDrawing(true);
      setCurrentPoints([{ x, y }]);
    } else {
      setSelection({ x, y, width: 0, height: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selection && !isDrawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    if (isDrawing) {
      setCurrentPoints(prev => [...prev, { x, y }]);
    } else if (selection) {
      setSelection(prev => prev ? {
        ...prev,
        width: x - prev.x,
        height: y - prev.y
      } : null);
    }
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      addAnnotation('drawing', { points: currentPoints });
      setIsDrawing(false);
      setCurrentPoints([]);
    } else if (selection) {
      if (Math.abs(selection.width) > 5 && Math.abs(selection.height) > 5) {
        addAnnotation(tool as any, selection);
      }
      setSelection(null);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">
      {/* Toolbar */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold text-slate-800 truncate max-w-[300px]">{paper.title}</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Page {pageNumber} of {numPages}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
          <ToolButton active={tool === 'select'} onClick={() => setTool('select')} icon={<BookOpen className="w-4 h-4" />} label="阅读" />
          <ToolButton active={tool === 'highlight'} onClick={() => setTool('highlight')} icon={<Highlighter className="w-4 h-4" />} label="高亮" />
          <ToolButton active={tool === 'underline'} onClick={() => setTool('underline')} icon={<Underline className="w-4 h-4" />} label="下划线" />
          <ToolButton active={tool === 'text'} onClick={() => setTool('text')} icon={<Type className="w-4 h-4" />} label="文字" />
          <ToolButton active={tool === 'drawing'} onClick={() => setTool('drawing')} icon={<Plus className="w-4 h-4" />} label="绘图" />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1 border border-slate-200 mr-2">
            <button onClick={() => handleZoom(-0.1)} className="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all"><ZoomOut className="w-4 h-4 text-slate-600" /></button>
            <span className="text-xs font-medium w-12 text-center text-slate-600">{Math.round(scale * 100)}%</span>
            <button onClick={() => handleZoom(0.1)} className="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all"><ZoomIn className="w-4 h-4 text-slate-600" /></button>
          </div>
          
          <button 
            onClick={() => setIsSplitScreen(!isSplitScreen)} 
            className={cn("p-2 rounded-lg transition-all border", isSplitScreen ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}
            title="分屏阅读"
          >
            <Columns className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => setShowNotes(!showNotes)} 
            className={cn("p-2 rounded-lg transition-all border", showNotes ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}
            title="笔记"
          >
            <Save className="w-4 h-4" />
          </button>

          <button 
            onClick={() => setShowAI(!showAI)} 
            className={cn("p-2 rounded-lg transition-all border", showAI ? "bg-purple-50 border-purple-200 text-purple-600" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}
            title="AI 助手"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF Viewer Area */}
        <div className={cn(
          "flex-1 overflow-auto bg-slate-200 p-8 flex flex-col items-center custom-scrollbar transition-all duration-300",
          isSplitScreen ? "w-1/2" : "w-full"
        )}>
          <div className="relative shadow-2xl bg-white mb-8" 
               onMouseDown={handleMouseDown}
               onMouseMove={handleMouseMove}
               onMouseUp={handleMouseUp}>
            <Document
              file={paper.pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<div className="flex flex-col items-center justify-center p-20 gap-4"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /><p className="text-slate-500 font-medium">正在加载文献 PDF...</p></div>}
              error={<div className="p-20 text-red-500 bg-white rounded-lg shadow-sm border border-red-100 flex flex-col items-center gap-4"><X className="w-10 h-10" /><p>无法加载 PDF。请检查网络连接或文件链接。</p></div>}
            >
              <Page 
                pageNumber={pageNumber} 
                scale={scale} 
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="pdf-page"
              />
            </Document>

            {/* Selection Overlay */}
            {selection && !isNaN(selection.x) && !isNaN(selection.y) && (
              <div 
                className="absolute border-2 border-blue-500 bg-blue-200/30 pointer-events-none"
                style={{
                  left: (selection.x || 0) * scale,
                  top: (selection.y || 0) * scale,
                  width: (selection.width || 0) * scale,
                  height: (selection.height || 0) * scale
                }}
              />
            )}

            {/* Annotations Layer */}
            <div className="absolute inset-0 pointer-events-none">
              {annotations
                .filter(a => a.pageNumber === pageNumber)
                .map(a => {
                  const x = Number(a.position?.x) || 0;
                  const y = Number(a.position?.y) || 0;
                  const w = Number(a.position?.width) || 0;
                  const h = Number(a.position?.height) || 0;
                  
                  return (
                    <div 
                      key={a.id}
                      className="absolute group pointer-events-auto cursor-pointer"
                      style={{
                        left: x * scale,
                        top: y * scale,
                        width: w * scale,
                        height: h * scale,
                        backgroundColor: a.type === 'highlight' ? a.color : 'transparent',
                        borderBottom: a.type === 'underline' ? `2px solid ${a.color}` : 'none'
                      }}
                      onClick={() => {
                        if (window.confirm('确定要删除此标注吗？')) {
                          deleteAnnotation(a.id);
                        }
                      }}
                    >
                      <div className="hidden group-hover:flex absolute -top-8 left-0 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg items-center gap-2 whitespace-nowrap">
                        <Trash2 className="w-3 h-3" /> 点击删除
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Page Navigation */}
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md border border-slate-200 rounded-full shadow-xl px-4 py-2 flex items-center gap-4 z-20">
            <button onClick={() => handlePageChange(-1)} disabled={pageNumber <= 1} className="p-2 hover:bg-slate-100 rounded-full disabled:opacity-30"><ChevronLeft className="w-5 h-5" /></button>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                value={pageNumber} 
                onChange={(e) => setPageNumber(Math.min(Math.max(1, parseInt(e.target.value) || 1), numPages))}
                className="w-12 text-center border-b border-slate-300 focus:border-blue-500 outline-none font-semibold text-slate-700 bg-transparent"
              />
              <span className="text-slate-400 font-medium">/ {numPages}</span>
            </div>
            <button onClick={() => handlePageChange(1)} disabled={pageNumber >= numPages} className="p-2 hover:bg-slate-100 rounded-full disabled:opacity-30"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Side Panels */}
        {isSplitScreen && (
          <div className="w-1/2 border-l border-slate-200 bg-white overflow-auto p-8 custom-scrollbar">
            <div className="max-w-3xl mx-auto">
              <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" /> 分屏阅读模式
              </h3>
              <p className="text-slate-600 leading-relaxed mb-8">
                在此模式下，您可以同时查看文献的不同部分，或者在右侧进行深度笔记记录。
              </p>
              <NoteEditor paperId={paper.id} />
            </div>
          </div>
        )}

        {showNotes && !isSplitScreen && (
          <div className="w-[450px] border-l border-slate-200 bg-white flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Save className="w-4 h-4 text-blue-600" /> 精读笔记</h3>
              <button onClick={() => setShowNotes(false)} className="p-1 hover:bg-slate-200 rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              <NoteEditor paperId={paper.id} />
            </div>
          </div>
        )}

        {showAI && (
          <div className="animate-in slide-in-from-right duration-300 shadow-2xl">
            <AIAssistant context={paper.title + " " + paper.authors} />
          </div>
        )}
      </div>
    </div>
  );
}

function ToolButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
        active ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
