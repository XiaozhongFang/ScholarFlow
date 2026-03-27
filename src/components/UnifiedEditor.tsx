import React, { useState, useEffect, useRef } from 'react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-latex';
import 'prismjs/themes/prism.css';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import 'katex/dist/katex.min.css';
import { 
  Save, X, Maximize2, Minimize2, 
  Image as ImageIcon, Link as LinkIcon, 
  Type, Code, FileText, Loader2, 
  ChevronLeft, ChevronRight, Split,
  Eye, Edit3, Wand2, Moon, Sun,
  Hash, List as ListIcon, Quote,
  Sigma, Calculator, Table as TableIcon,
  Printer, RefreshCw
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Paper } from '@/src/types';
import { db, auth } from '@/src/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface UnifiedEditorProps {
  paper: Paper;
  onClose: () => void;
}

export default function UnifiedEditor({ paper, onClose }: UnifiedEditorProps) {
  const [content, setContent] = useState(paper.unifiedContent || "");
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split');
  const [isConverting, setIsConverting] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [syncScroll, setSyncScroll] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const lineCount = content.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!syncScroll) return;
    const source = e.currentTarget;
    const target = source === editorRef.current ? previewRef.current : editorRef.current;
    
    if (target) {
      const percentage = source.scrollTop / (source.scrollHeight - source.clientHeight);
      target.scrollTop = percentage * (target.scrollHeight - target.clientHeight);
    }
  };

  useEffect(() => {
    if (paper.unifiedContent) {
      setContent(paper.unifiedContent);
    } else if (!paper.isUnified) {
      // If not unified yet, maybe suggest conversion
    }
  }, [paper.id, paper.unifiedContent]);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'papers', paper.id), {
        unifiedContent: content,
        isUnified: true,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error saving unified content:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const imageMarkdown = `\n![${file.name}](${base64})\n`;
        setContent(prev => prev + imageMarkdown);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConvert = async () => {
    if (!paper.pdfUrl) return;
    setIsConverting(true);
    try {
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [
              { text: `You are an expert academic document converter, similar to the "Marker" open-source tool. Your task is to perform a high-fidelity conversion of the following research paper into a "Unified Scholar Format" (Markdown + LaTeX).
              
              Paper Title: ${paper.title}
              Paper URL: ${paper.pdfUrl}
              
              STRICT CONVERSION REQUIREMENTS (Marker-Style):
              1. CLEANING: Remove all headers, footers, page numbers, and redundant metadata.
              2. STRUCTURE: Use standard Markdown for structure (# for headers, - for lists, etc.). Preserve the original academic hierarchy.
              3. MATHEMATICS: Use LaTeX for ALL mathematical and chemical formulas. 
                 - Inline: $formula$
                 - Block: $$formula$$ or \begin{equation}...\end{equation}
                 - Ensure complex multi-line equations are correctly formatted.
              4. TABLES: Convert all tables into clean Markdown table format.
              5. CITATIONS: Preserve in-text citations and the bibliography structure.
              6. INTERNAL LINKS: Create internal links for navigation (e.g., [See Methods](#methods)).
              7. FORMATTING: Use bold labels for Figures and Tables (e.g., **Figure 1**).
              8. FALLBACK: If the PDF content is not directly accessible via the URL, generate a high-quality, detailed template based on the title and common knowledge of this paper's field, and include placeholders like "[PASTE SECTION CONTENT HERE]".
              
              Output only the pure Markdown content.` }
            ]
          }
        ],
        config: {
          systemInstruction: "You are a professional research paper digitizer, inspired by tools like Marker. You convert PDFs into perfectly formatted Markdown with embedded LaTeX. You prioritize structural integrity, mathematical precision, and academic formatting."
        }
      });

      const response = await model;
      if (response.text) {
        setContent(response.text);
      }
    } catch (error) {
      console.error("Conversion Error:", error);
      alert("转换失败，请尝试手动编辑或稍后重试。");
    } finally {
      setIsConverting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={cn("flex flex-col h-screen bg-white overflow-hidden", isDarkMode && "dark")}>
      {/* Header */}
      <div className="h-14 bg-slate-900 text-white flex items-center justify-between px-4 shadow-md z-20 no-print">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-sm font-bold truncate max-w-[300px]">{paper.title}</h2>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase tracking-widest font-mono">
              <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[8px]">UNIFIED FORMAT</span>
              <span>{isSaving ? "正在保存..." : "已保存"}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-800 rounded-lg p-1 mr-4">
            <button 
              onClick={() => setViewMode('edit')} 
              className={cn("p-1.5 rounded transition-all flex items-center gap-1 text-xs px-3", viewMode === 'edit' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white")}
            >
              <Edit3 className="w-3.5 h-3.5" /> 编辑器
            </button>
            <button 
              onClick={() => setViewMode('split')} 
              className={cn("p-1.5 rounded transition-all flex items-center gap-1 text-xs px-3", viewMode === 'split' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white")}
            >
              <Split className="w-3.5 h-3.5" /> 分屏视图
            </button>
            <button 
              onClick={() => setViewMode('preview')} 
              className={cn("p-1.5 rounded transition-all flex items-center gap-1 text-xs px-3", viewMode === 'preview' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white")}
            >
              <Eye className="w-3.5 h-3.5" /> PDF 预览
            </button>
          </div>

          <button 
            onClick={handleConvert}
            disabled={isConverting}
            className="flex items-center gap-2 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50"
          >
            {isConverting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            Marker-Style AI 转换
          </button>

          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            保存
          </button>

          <button 
            onClick={handlePrint}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="打印为 PDF"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-1 overflow-x-auto custom-scrollbar no-print">
        <div className="flex items-center gap-1 pr-2 border-r border-slate-300">
          <ToolbarButton onClick={() => setContent(prev => prev + "**粗体**")} icon={<Type className="w-4 h-4" />} title="粗体" />
          <ToolbarButton onClick={() => setContent(prev => prev + "\n# 标题")} icon={<Hash className="w-4 h-4" />} title="标题" />
          <ToolbarButton onClick={() => setContent(prev => prev + "\n- 列表项目")} icon={<ListIcon className="w-4 h-4" />} title="无序列表" />
          <ToolbarButton onClick={() => setContent(prev => prev + "\n> 引用内容")} icon={<Quote className="w-4 h-4" />} title="引用" />
        </div>
        
        <div className="flex items-center gap-1 px-2 border-r border-slate-300">
          <ToolbarButton onClick={() => setContent(prev => prev + "\n```latex\n\\begin{equation}\n  E = mc^2\n\\end{equation}\n```")} icon={<Calculator className="w-4 h-4" />} title="LaTeX 环境" />
          <ToolbarButton onClick={() => setContent(prev => prev + " $E=mc^2$ ")} icon={<Sigma className="w-4 h-4" />} title="行内公式" />
          <ToolbarButton onClick={() => setContent(prev => prev + "\n$$\n\\int_a^b f(x)dx\n$$\n")} icon={<span className="font-serif font-bold italic text-xs">ΣΣ</span>} title="块级公式" />
        </div>

        <div className="flex items-center gap-1 px-2 border-r border-slate-300">
          <ToolbarButton onClick={() => fileInputRef.current?.click()} icon={<ImageIcon className="w-4 h-4" />} title="插入本地图片" />
          <ToolbarButton onClick={() => setContent(prev => prev + "[链接文字](#锚点)")} icon={<LinkIcon className="w-4 h-4" />} title="插入内部链接" />
          <ToolbarButton onClick={() => setContent(prev => prev + "\n| 标题1 | 标题2 |\n|---|---|\n| 内容1 | 内容2 |\n")} icon={<TableIcon className="w-4 h-4" />} title="插入表格" />
        </div>

        <div className="flex items-center gap-1 px-2">
          <ToolbarButton onClick={() => setContent(prev => prev + "\n```javascript\n// 代码\n```")} icon={<Code className="w-4 h-4" />} title="代码块" />
          <ToolbarButton onClick={() => setIsDarkMode(!isDarkMode)} icon={isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} title={isDarkMode ? "浅色模式" : "深色模式"} />
          <ToolbarButton onClick={() => setSyncScroll(!syncScroll)} icon={<RefreshCw className={cn("w-4 h-4", syncScroll ? "text-blue-500" : "text-slate-400")} />} title={syncScroll ? "禁用同步滚动" : "启用同步滚动"} />
        </div>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImageUpload} 
          accept="image/*" 
          className="hidden" 
        />
      </div>

      {/* Editor/Preview Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div 
            ref={editorRef}
            onScroll={handleScroll}
            className={cn(
              "h-full overflow-auto custom-scrollbar transition-colors duration-300 no-print",
              viewMode === 'split' ? "w-1/2 border-r border-slate-200" : "w-full",
              isDarkMode ? "bg-[#1e1e1e]" : "bg-slate-50"
            )}
          >
            <div className="editor-with-line-numbers">
              <div className="line-numbers-gutter">
                {lineNumbers}
              </div>
              <div className="flex-1">
                <Editor
                  value={content}
                  onValueChange={code => setContent(code)}
                  highlight={code => highlight(code, languages.markdown, 'markdown')}
                  padding={20}
                  className="min-h-full editor-textarea"
                  style={{
                    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                    fontSize: 14,
                    backgroundColor: 'transparent',
                    color: isDarkMode ? '#d4d4d4' : '#1e1e1e',
                    minHeight: '100%'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {(viewMode === 'preview' || viewMode === 'split') && (
          <div 
            ref={previewRef}
            onScroll={handleScroll}
            className={cn(
              "h-full overflow-auto bg-slate-100 custom-scrollbar paper-container relative",
              viewMode === 'split' ? "w-1/2" : "w-full"
            )}
          >
            {/* PDF Viewer Style Header */}
            <div className="sticky top-0 left-0 right-0 h-8 bg-slate-700/90 backdrop-blur text-white flex items-center justify-between px-4 text-[10px] font-medium z-10 no-print">
              <div className="flex items-center gap-4">
                <span>页面: 1 / 1</span>
                <span className="opacity-50">|</span>
                <span>缩放: 100%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-slate-600 px-2 py-0.5 rounded uppercase tracking-tighter">Constructed PDF View</span>
              </div>
            </div>

            <div className="paper-page prose prose-slate max-w-none shadow-2xl my-10">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex, rehypeSlug]}
                components={{
                  img: ({ node, ...props }) => (
                    <div className="flex flex-col items-center my-8">
                      <img 
                        {...props} 
                        className="rounded-xl shadow-lg max-w-full h-auto border border-slate-200" 
                        referrerPolicy="no-referrer"
                      />
                      {props.alt && <span className="text-xs text-slate-400 mt-2 italic">{props.alt}</span>}
                    </div>
                  ),
                  a: ({ node, ...props }) => {
                    const isInternal = props.href?.startsWith('#');
                    return (
                      <a 
                        {...props} 
                        className={cn(
                          "font-medium transition-colors",
                          isInternal ? "text-purple-600 hover:text-purple-800 border-b border-dashed border-purple-300" : "text-blue-600 hover:underline"
                        )} 
                      />
                    );
                  },
                  h1: ({ node, ...props }) => <h1 {...props} className="text-3xl font-bold text-slate-900 mb-6 border-b pb-4 scroll-mt-20" />,
                  h2: ({ node, ...props }) => <h2 {...props} className="text-2xl font-bold text-slate-800 mt-10 mb-4 border-l-4 border-blue-600 pl-4 scroll-mt-20" />,
                  h3: ({ node, ...props }) => <h3 {...props} className="text-xl font-bold text-slate-800 mt-8 mb-3 scroll-mt-20" />,
                  p: ({ node, ...props }) => <p {...props} className="text-slate-700 leading-relaxed mb-4 text-justify" />,
                }}
              >
                {content || "*暂无内容，请点击 'AI 转换 PDF' 或开始编辑...*"}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarButton({ onClick, icon, title }: { onClick: () => void, icon: React.ReactNode, title: string }) {
  return (
    <button 
      onClick={onClick} 
      className="p-1.5 hover:bg-white rounded text-slate-600 transition-all hover:shadow-sm flex items-center justify-center min-w-[32px]" 
      title={title}
    >
      {icon}
    </button>
  );
}
