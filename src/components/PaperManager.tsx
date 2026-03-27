import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Plus, Search, FileText, Trash2, ExternalLink, 
  BookOpen, Tag, Filter, Grid, List as ListIcon,
  MoreVertical, Share2, Download, Loader2, X,
  Check, Info, Link as LinkIcon, Edit3, Wand2,
  FileJson
} from 'lucide-react';
import { db, auth } from '@/src/firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Paper } from '@/src/types';
import { cn, formatDate } from '@/src/lib/utils';

interface PaperManagerProps {
  onSelectPaper: (paper: Paper) => void;
}

export default function PaperManager({ onSelectPaper }: PaperManagerProps) {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<'all' | 'pdf' | 'unified'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editingPaper, setEditingPaper] = useState<Paper | null>(null);
  const [paperToDelete, setPaperToDelete] = useState<Paper | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // New Paper Form
  const [newPaper, setNewPaper] = useState({
    title: "",
    authors: "",
    doi: "",
    pdfUrl: "",
    category: "未分类"
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'application/pdf') {
      setUploadFile(file);
      // Auto-fill title if empty
      if (!newPaper.title) {
        setNewPaper(prev => ({ ...prev, title: file.name.replace('.pdf', '') }));
      }
    }
  }, [newPaper.title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  });

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'papers'), where('ownerId', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPapers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Paper));
      setPapers(fetchedPapers);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newPaper.title) return;
    
    setIsLoading(true);
    try {
      let finalPdfUrl = newPaper.pdfUrl;

      if (uploadFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(uploadFile);
        });
        
        const base64 = await base64Promise;
        if (base64.length > 1000000) {
          setFormError("文件太大（超过 1MB），无法直接存储在数据库中。");
          setIsLoading(false);
          return;
        }
        finalPdfUrl = base64;
      }

      if (!finalPdfUrl && !editingPaper) {
        setFormError("请提供 PDF 链接或上传本地文件。");
        setIsLoading(false);
        return;
      }

      if (editingPaper) {
        await updateDoc(doc(db, 'papers', editingPaper.id), {
          title: newPaper.title,
          authors: newPaper.authors,
          doi: newPaper.doi,
          category: newPaper.category,
          updatedAt: new Date().toISOString()
        });
        setEditingPaper(null);
      } else {
        await addDoc(collection(db, 'papers'), {
          ...newPaper,
          pdfUrl: finalPdfUrl,
          ownerId: auth.currentUser.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      setIsAdding(false);
      setNewPaper({ title: "", authors: "", doi: "", pdfUrl: "", category: "未分类" });
      setUploadFile(null);
      setFormError(null);
    } catch (error) {
      console.error("Error saving paper:", error);
      setFormError("保存失败，请重试。");
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (paper: Paper, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPaper(paper);
    setFormError(null);
    setNewPaper({
      title: paper.title,
      authors: paper.authors || "",
      doi: paper.doi || "",
      pdfUrl: paper.pdfUrl || "",
      category: paper.category || "未分类"
    });
    setIsAdding(true);
  };

  const deletePaper = (paper: Paper, e: React.MouseEvent) => {
    e.stopPropagation();
    setPaperToDelete(paper);
  };

  const confirmDelete = async () => {
    if (!paperToDelete) return;
    setIsLoading(true);
    try {
      await deleteDoc(doc(db, 'papers', paperToDelete.id));
      setPaperToDelete(null);
    } catch (error) {
      console.error("Error deleting paper:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPapers = papers.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.authors?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || 
                         (filter === 'unified' && p.isUnified) || 
                         (filter === 'pdf' && !p.isUnified);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="p-6 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-blue-600" /> 文献管理
            </h1>
            <p className="text-slate-500 text-sm mt-1">管理您的学术文献，开启精读之旅。</p>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 font-semibold"
          >
            <Plus className="w-5 h-5" /> 添加文献
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="搜索标题、作者或关键词..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
            />
          </div>
          
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setFilter('all')} 
              className={cn("px-3 py-2 text-xs font-bold rounded-lg transition-all", filter === 'all' ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700")}
            >
              全部
            </button>
            <button 
              onClick={() => setFilter('pdf')} 
              className={cn("px-3 py-2 text-xs font-bold rounded-lg transition-all", filter === 'pdf' ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700")}
            >
              PDF
            </button>
            <button 
              onClick={() => setFilter('unified')} 
              className={cn("px-3 py-2 text-xs font-bold rounded-lg transition-all", filter === 'unified' ? "bg-white shadow-sm text-purple-600" : "text-slate-500 hover:text-slate-700")}
            >
              统一格式
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setViewMode('grid')} 
              className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700")}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700")}
            >
              <ListIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            <p className="text-slate-500 font-medium">正在加载您的文献库...</p>
          </div>
        ) : filteredPapers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">文献库空空如也</h3>
            <p className="text-slate-500 max-w-sm mb-8">
              点击右上角的“添加文献”按钮，上传您的第一篇 PDF 文献，开始深度阅读与笔记。
            </p>
            <button 
              onClick={() => setIsAdding(true)}
              className="px-8 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-all font-semibold"
            >
              立即添加
            </button>
          </div>
        ) : (
          <div className={cn(
            "grid gap-6",
            viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
          )}>
            {filteredPapers.map(paper => (
              <div 
                key={paper.id} 
                onClick={() => onSelectPaper(paper)}
                className={cn(
                  "group relative bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer",
                  viewMode === 'list' ? "flex items-center p-4 gap-6" : "flex flex-col"
                )}
              >
                {viewMode === 'grid' && (
                  <div className="h-40 bg-slate-100 flex items-center justify-center border-b border-slate-100 group-hover:bg-blue-50 transition-colors relative">
                    {paper.isUnified ? (
                      <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                        <FileJson className="w-10 h-10" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
                        <FileText className="w-10 h-10" />
                      </div>
                    )}
                    
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      {paper.isUnified ? (
                        <button onClick={(e) => { e.stopPropagation(); onSelectPaper(paper); }} className="p-2 bg-white/90 backdrop-blur text-purple-600 rounded-full hover:bg-purple-50 shadow-sm" title="打开统一格式"><FileJson className="w-4 h-4" /></button>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); onSelectPaper(paper); }} className="p-2 bg-white/90 backdrop-blur text-purple-500 rounded-full hover:bg-purple-50 shadow-sm animate-pulse" title="转换为统一格式"><Wand2 className="w-4 h-4" /></button>
                      )}
                      <button onClick={(e) => openEditModal(paper, e)} className="p-2 bg-white/90 backdrop-blur text-blue-500 rounded-full hover:bg-blue-50 shadow-sm"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={(e) => deletePaper(paper, e)} className="p-2 bg-white/90 backdrop-blur text-red-500 rounded-full hover:bg-red-50 shadow-sm"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
                
                <div className={cn("p-5", viewMode === 'list' ? "flex-1 p-0" : "")}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">{paper.title}</h3>
                    {viewMode === 'list' && (
                      <div className="flex items-center gap-1">
                        {paper.isUnified ? (
                          <button onClick={(e) => { e.stopPropagation(); onSelectPaper(paper); }} className="p-2 text-purple-600 hover:bg-purple-50 rounded-full transition-colors" title="打开统一格式"><FileJson className="w-4 h-4" /></button>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); onSelectPaper(paper); }} className="p-2 text-purple-400 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-colors" title="转换为统一格式"><Wand2 className="w-4 h-4" /></button>
                        )}
                        <button onClick={(e) => openEditModal(paper, e)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={(e) => deletePaper(paper, e)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-4 line-clamp-1 italic">{paper.authors || "未知作者"}</p>
                  
                  <div className="flex flex-wrap gap-2 mt-auto">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">{paper.category}</span>
                    {paper.isUnified ? (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-600 rounded text-[10px] font-bold flex items-center gap-1">
                        <FileJson className="w-3 h-3" /> 统一格式
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded text-[10px] font-bold flex items-center gap-1">
                        <FileText className="w-3 h-3" /> PDF 格式
                      </span>
                    )}
                    {paper.doi && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold flex items-center gap-1">
                        <LinkIcon className="w-3 h-3" /> DOI
                      </span>
                    )}
                  </div>
                </div>
                
                {viewMode === 'grid' && (
                  <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">{formatDate(paper.createdAt)}</span>
                    <div className="flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-slate-400 hover:text-blue-500 transition-colors" />
                      <Download className="w-4 h-4 text-slate-400 hover:text-blue-500 transition-colors" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Paper Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                {editingPaper ? <Edit3 className="w-6 h-6 text-blue-600" /> : <Plus className="w-6 h-6 text-blue-600" />}
                {editingPaper ? "编辑文献信息" : "添加新文献"}
              </h2>
              <button onClick={() => { setIsAdding(false); setEditingPaper(null); setFormError(null); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleAddPaper} className="p-8 space-y-6">
              {formError && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
                  <Info className="w-4 h-4" />
                  {formError}
                </div>
              )}
              <div className="space-y-4">
                {!editingPaper && (
                  <>
                    <label className="text-sm font-bold text-slate-700 ml-1">上传 PDF 文件 或 输入链接</label>
                    
                    <div 
                      {...getRootProps()} 
                      className={cn(
                        "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all",
                        isDragActive ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-slate-50 hover:border-blue-300"
                      )}
                    >
                      <input {...getInputProps()} />
                      {uploadFile ? (
                        <div className="flex items-center justify-center gap-2 text-blue-600 font-bold">
                          <FileText className="w-6 h-6" />
                          <span>{uploadFile.name}</span>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}
                            className="ml-2 p-1 hover:bg-blue-100 rounded-full"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mx-auto mb-2">
                            <Plus className="w-6 h-6 text-slate-400" />
                          </div>
                          <p className="text-sm text-slate-600 font-medium">点击或拖拽 PDF 文件到此处</p>
                          <p className="text-[10px] text-slate-400">支持 .pdf 格式 (最大 1MB)</p>
                        </div>
                      )}
                    </div>

                    <div className="relative flex items-center py-2">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink mx-4 text-xs font-bold text-slate-400 uppercase tracking-widest">或者使用链接</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    <div className="space-y-2">
                      <input 
                        type="url" 
                        value={newPaper.pdfUrl}
                        onChange={(e) => {
                          setNewPaper({...newPaper, pdfUrl: e.target.value});
                          if (e.target.value) setUploadFile(null);
                        }}
                        placeholder="https://example.com/paper.pdf"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">文献标题 *</label>
                <input 
                  required
                  type="text" 
                  value={newPaper.title}
                  onChange={(e) => setNewPaper({...newPaper, title: e.target.value})}
                  placeholder="例如: Attention Is All You Need"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">作者</label>
                  <input 
                    type="text" 
                    value={newPaper.authors}
                    onChange={(e) => setNewPaper({...newPaper, authors: e.target.value})}
                    placeholder="作者姓名"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">DOI</label>
                  <input 
                    type="text" 
                    value={newPaper.doi}
                    onChange={(e) => setNewPaper({...newPaper, doi: e.target.value})}
                    placeholder="10.1038/..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => { setIsAdding(false); setEditingPaper(null); setFormError(null); }}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all font-bold"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  disabled={isLoading || !newPaper.title}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 font-bold flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  {editingPaper ? "确认修改" : "确认添加"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {paperToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">确认删除文献？</h3>
              <p className="text-slate-500 mb-8">
                您确定要删除 <span className="font-bold text-slate-700">"{paperToDelete.title}"</span> 吗？此操作不可撤销。
              </p>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setPaperToDelete(null)}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all font-bold"
                >
                  取消
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-200 font-bold flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
