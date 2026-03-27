import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { 
  BookOpen, Users, Settings, LogOut, 
  Menu, X, Search, Bell, User,
  LayoutDashboard, Library, Share2,
  MessageSquare, Loader2, ShieldAlert
} from 'lucide-react';
import { auth, loginWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import PaperManager from './components/PaperManager';
import PDFReader from './components/PDFReader';
import UnifiedEditor from './components/UnifiedEditor';
import Community from './components/Community';
import { Paper } from './types';
import { cn } from './lib/utils';

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, errorInfo: string | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message || String(error) };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-red-100 max-w-lg w-full text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8">
              <ShieldAlert className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mb-4 tracking-tight">出错了</h1>
            <p className="text-slate-600 mb-8 leading-relaxed font-medium">
              应用程序遇到了一个意外错误。这可能是由于网络连接或权限设置引起的。
            </p>
            <div className="bg-slate-50 p-4 rounded-2xl text-left mb-8 overflow-auto max-h-40 border border-slate-200">
              <code className="text-xs text-red-600 font-mono break-all">{this.state.errorInfo}</code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all font-bold shadow-xl shadow-slate-200"
            >
              重新加载应用
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'community' | 'settings'>('dashboard');
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 bg-white rounded-[32px] shadow-xl flex items-center justify-center animate-pulse">
            <BookOpen className="w-10 h-10 text-blue-600" />
          </div>
          <div className="flex items-center gap-3 text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">
            <Loader2 className="w-4 h-4 animate-spin" /> 正在初始化 ScholarFlow
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-[48px] shadow-2xl border border-slate-100 max-w-xl w-full text-center relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600" />
          <div className="w-24 h-24 bg-blue-50 rounded-[40px] flex items-center justify-center mx-auto mb-10 group-hover:scale-110 transition-transform duration-500">
            <BookOpen className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">ScholarFlow</h1>
          <p className="text-slate-500 mb-12 leading-relaxed font-medium text-lg">
            您的全能精读文献助手。管理、阅读、笔记、AI 问答，一站式解决学术研究需求。
          </p>
          <button 
            onClick={loginWithGoogle}
            className="w-full py-5 bg-slate-900 text-white rounded-[24px] hover:bg-slate-800 transition-all font-bold shadow-2xl shadow-slate-200 flex items-center justify-center gap-4 text-lg"
          >
            <img src="https://www.google.com/favicon.ico" className="w-6 h-6 rounded-full bg-white p-0.5" alt="Google" />
            使用 Google 账号登录
          </button>
          <p className="mt-8 text-slate-400 text-xs font-bold uppercase tracking-widest">
            开启您的深度学术阅读之旅
          </p>
        </div>
      </div>
    );
  }

  if (selectedPaper) {
    return (
      <ErrorBoundary>
        {selectedPaper.isUnified ? (
          <UnifiedEditor paper={selectedPaper} onClose={() => setSelectedPaper(null)} />
        ) : (
          <PDFReader paper={selectedPaper} onClose={() => setSelectedPaper(null)} />
        )}
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
        {/* Sidebar */}
        <aside className={cn(
          "bg-white border-r border-slate-200 flex flex-col transition-all duration-500 z-30 shadow-sm",
          isSidebarOpen ? "w-80" : "w-24"
        )}>
          <div className="p-8 flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            {isSidebarOpen && <h1 className="text-xl font-black text-slate-900 tracking-tight">ScholarFlow</h1>}
          </div>

          <nav className="flex-1 px-4 space-y-2">
            <NavItem 
              active={activeView === 'dashboard'} 
              onClick={() => setActiveView('dashboard')} 
              icon={<LayoutDashboard className="w-5 h-5" />} 
              label="文献库" 
              isOpen={isSidebarOpen} 
            />
            <NavItem 
              active={activeView === 'community'} 
              onClick={() => setActiveView('community')} 
              icon={<Users className="w-5 h-5" />} 
              label="精读社区" 
              isOpen={isSidebarOpen} 
            />
            <NavItem 
              active={activeView === 'settings'} 
              onClick={() => setActiveView('settings')} 
              icon={<Settings className="w-5 h-5" />} 
              label="设置" 
              isOpen={isSidebarOpen} 
            />
          </nav>

          <div className="p-6 border-t border-slate-100">
            <div className={cn("flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 mb-4", !isSidebarOpen && "justify-center")}>
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden">
                {user.photoURL ? <img src={user.photoURL} alt="User" /> : <User className="w-5 h-5 text-slate-400" />}
              </div>
              {isSidebarOpen && (
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-slate-800 truncate">{user.displayName || "学者"}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{user.email}</span>
                </div>
              )}
            </div>
            <button 
              onClick={logout}
              className={cn(
                "w-full flex items-center gap-3 p-3 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all font-bold text-sm",
                !isSidebarOpen && "justify-center"
              )}
            >
              <LogOut className="w-5 h-5" />
              {isSidebarOpen && <span>退出登录</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 relative">
          <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-20 shadow-sm">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2.5 hover:bg-slate-100 rounded-xl transition-all text-slate-500"
              >
                {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div className="h-8 w-[1px] bg-slate-200 mx-2" />
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                {activeView === 'dashboard' ? '我的文献库' : activeView === 'community' ? '精读社区' : '系统设置'}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <button className="p-2.5 hover:bg-slate-100 rounded-xl transition-all text-slate-500 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              </button>
              <div className="h-8 w-[1px] bg-slate-200 mx-2" />
              <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 font-bold text-xs uppercase tracking-widest">
                <ShieldAlert className="w-4 h-4" /> 开发者预览版
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-hidden">
            {activeView === 'dashboard' && <PaperManager onSelectPaper={setSelectedPaper} />}
            {activeView === 'community' && <Community />}
            {activeView === 'settings' && (
              <div className="p-12 max-w-2xl mx-auto text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-8">
                  <Settings className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">设置选项</h3>
                <p className="text-slate-500 leading-relaxed font-medium">
                  设置功能正在开发中。未来您将能够自定义阅读器主题、AI 偏好以及同步设置。
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}

function NavItem({ active, onClick, icon, label, isOpen }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, isOpen: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm group",
        active 
          ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
          : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
      )}
    >
      <div className={cn("transition-transform duration-300", active ? "scale-110" : "group-hover:scale-110")}>
        {icon}
      </div>
      {isOpen && <span>{label}</span>}
      {active && isOpen && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />}
    </button>
  );
}
