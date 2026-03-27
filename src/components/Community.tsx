import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Heart, MessageSquare, Share2, 
  ExternalLink, BookOpen, Star, TrendingUp,
  Filter, MoreHorizontal, User, Calendar,
  CheckCircle2, Plus, Loader2
} from 'lucide-react';
import { db, auth } from '@/src/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { SharedReading, Comment } from '@/src/types';
import { cn, formatDate } from '@/src/lib/utils';

export default function Community() {
  const [sharedReadings, setSharedReadings] = useState<SharedReading[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'trending' | 'recent' | 'my'>('trending');

  useEffect(() => {
    const q = query(collection(db, 'sharedReadings'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SharedReading));
      setSharedReadings(fetched);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLike = async (id: string, currentLikes: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'sharedReadings', id), {
        likes: currentLikes + 1
      });
    } catch (error) {
      console.error("Error liking reading:", error);
    }
  };

  const filteredReadings = sharedReadings.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="p-8 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col">
            <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight">
              <Users className="w-10 h-10 text-blue-600" /> 精读社区
            </h1>
            <p className="text-slate-500 text-sm mt-2 font-medium">发现、分享并点评他人的精读文献，共同进步。</p>
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 font-bold">
            <Share2 className="w-5 h-5" /> 分享我的精读
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 w-full relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="搜索精读文献、主题或分享者..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm font-medium"
            />
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <TabButton active={activeTab === 'trending'} onClick={() => setActiveTab('trending')} icon={<TrendingUp className="w-4 h-4" />} label="热门" />
            <TabButton active={activeTab === 'recent'} onClick={() => setActiveTab('recent')} icon={<Calendar className="w-4 h-4" />} label="最新" />
            <TabButton active={activeTab === 'my'} onClick={() => setActiveTab('my')} icon={<User className="w-4 h-4" />} label="我的分享" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            <p className="text-slate-500 font-medium">正在探索社区内容...</p>
          </div>
        ) : filteredReadings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-200 p-12">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8">
              <Star className="w-12 h-12 text-slate-300" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">暂无分享内容</h3>
            <p className="text-slate-500 max-w-md mb-10 leading-relaxed">
              社区还在成长中。成为第一个分享精读文献的人，为学术社区贡献您的见解！
            </p>
            <button className="px-10 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-100">
              立即分享
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredReadings.map(reading => (
              <div 
                key={reading.id} 
                className="group bg-white border border-slate-200 rounded-[32px] overflow-hidden hover:shadow-2xl hover:border-blue-200 transition-all duration-500 flex flex-col"
              >
                <div className="p-8 flex-1">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800 flex items-center gap-1">
                        {reading.sharedBy.substring(0, 8)}... <CheckCircle2 className="w-3 h-3 text-blue-500" />
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{formatDate(reading.createdAt)}</span>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-extrabold text-slate-900 mb-4 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                    {reading.title}
                  </h3>
                  
                  <p className="text-slate-600 text-sm mb-8 line-clamp-3 leading-relaxed font-medium">
                    {reading.description || "分享者没有提供描述。这是一篇关于深度学习与自然语言处理的精读文献，包含了详细的公式推导与实验分析。"}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">深度学习</span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">NLP</span>
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">精读</span>
                  </div>
                </div>
                
                <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={(e) => handleLike(reading.id, reading.likes, e)}
                      className="flex items-center gap-2 text-slate-500 hover:text-red-500 transition-all group/btn"
                    >
                      <Heart className={cn("w-5 h-5 transition-transform group-hover/btn:scale-125", reading.likes > 0 && "fill-red-500 text-red-500")} />
                      <span className="text-sm font-bold">{reading.likes}</span>
                    </button>
                    <button className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-all group/btn">
                      <MessageSquare className="w-5 h-5 transition-transform group-hover/btn:scale-125" />
                      <span className="text-sm font-bold">12</span>
                    </button>
                  </div>
                  <button className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm">
                    <BookOpen className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
        active ? "bg-white shadow-md text-blue-600" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
