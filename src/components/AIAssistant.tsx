import { GoogleGenAI } from "@google/genai";
import { useState } from "react";
import { Send, Loader2, Languages, MessageSquare } from "lucide-react";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface AIAssistantProps {
  context?: string;
}

export default function AIAssistant({ context }: AIAssistantProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (text?: string) => {
    const messageToSend = text || input;
    if (!messageToSend.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: messageToSend }]);
    if (!text) setInput("");
    setIsLoading(true);

    try {
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [{ text: `Context from paper: ${context || "None"}\n\nUser Question: ${messageToSend}` }]
          }
        ],
        config: {
          systemInstruction: "You are an academic assistant specialized in intensive reading of research papers. Help users understand complex concepts, translate academic terms, and summarize key findings. Always provide accurate and helpful information based on the provided context."
        }
      });

      const response = await model;
      setMessages(prev => [...prev, { role: 'ai', content: response.text || "Sorry, I couldn't generate a response." }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'ai', content: "Error: Failed to connect to AI service." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const translateSelection = async () => {
    const selection = window.getSelection()?.toString();
    if (selection) {
      handleSend(`Please translate this academic text to Chinese and explain key terms: "${selection}"`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 border-l border-slate-200 w-80">
      <div className="p-4 border-bottom bg-white flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> AI 助手
        </h3>
        <button 
          onClick={translateSelection}
          className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 flex items-center gap-1"
          title="翻译选中的文字"
        >
          <Languages className="w-3 h-3" /> 选词翻译
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 mt-10 text-sm">
            <p>您可以询问关于文献的问题，</p>
            <p>或者选中文字进行翻译。</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn(
            "p-3 rounded-lg text-sm",
            m.role === 'user' ? "bg-blue-600 text-white ml-4" : "bg-white border border-slate-200 text-slate-800 mr-4 shadow-sm"
          )}>
            {m.content}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs italic">
            <Loader2 className="w-3 h-3 animate-spin" /> AI 正在思考...
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-200">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="询问 AI 关于这篇文献的问题..."
            className="w-full p-2 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 bottom-2 p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
