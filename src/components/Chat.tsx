import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Scale, ShieldAlert, Gavel, Info, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { askLegalQuestion } from '../services/geminiService';
import { cn } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatProps {
  user: FirebaseUser;
}

export default function Chat({ user }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'questions'),
      where('user_id', '==', user.uid),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages: Message[] = [];
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        loadedMessages.push({
          id: doc.id + '_user',
          role: 'user',
          content: data.question_text,
          timestamp: new Date(data.timestamp)
        });
        loadedMessages.push({
          id: doc.id + '_ai',
          role: 'assistant',
          content: data.ai_response,
          timestamp: new Date(data.timestamp)
        });
      });
      setMessages(loadedMessages);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'questions');
    });

    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const questionText = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      const aiResponse = await askLegalQuestion(questionText);
      
      // Save to Firestore
      await addDoc(collection(db, 'questions'), {
        id: Date.now().toString(),
        user_id: user.uid,
        question_text: questionText,
        ai_response: aiResponse,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error asking legal question:', error);
      handleFirestoreError(error, OperationType.WRITE, 'questions');
    } finally {
      setIsLoading(false);
    }
  };

  const examplePrompts = [
    "Can police search my car without a warrant?",
    "I robbed a store and drove away, can they arrest me later?",
    "What's the penalty for reckless driving?",
    "How do I file a lawsuit against the LSPD?"
  ];

  const clearHistory = async () => {
    if (window.confirm('Are you sure you want to clear your entire question history?')) {
      try {
        // In a real app, we'd use a batch or cloud function, but for now we'll do it client side
        // Note: This is inefficient for large histories
        const q = query(collection(db, 'questions'), where('user_id', '==', user.uid));
        const snapshot = await onSnapshot(q, (s) => {
          s.docs.forEach(async (d) => {
            await deleteDoc(doc(db, 'questions', d.id));
          });
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'questions');
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white font-sans">
      {/* Header */}
      <div className="p-4 border-b border-blue-900/30 bg-[#121212] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="text-blue-500 w-6 h-6" />
          <h2 className="text-xl font-bold tracking-tight text-blue-400">NEXUS AI LAW</h2>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={clearHistory}
            className="text-xs text-red-400/40 hover:text-red-400 flex items-center gap-1 transition-colors uppercase tracking-widest font-mono"
          >
            <Trash2 size={12} />
            Clear History
          </button>
          <div className="flex items-center gap-2 text-xs text-blue-300/60 uppercase tracking-widest font-mono">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            SYSTEM ONLINE
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-blue-900/50" ref={scrollRef}>
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full space-y-8 max-w-2xl mx-auto text-center">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase italic">
                Know the Law. <span className="text-blue-500">Win the RP.</span>
              </h1>
              <p className="text-blue-300/70 text-lg">
                Instant answers to GTA RP legal questions. Ask anything about traffic, felonies, or police powers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
              {examplePrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  className="p-4 bg-[#1a1a1a] border border-blue-900/20 rounded-xl text-left text-sm hover:border-blue-500/50 hover:bg-[#222] transition-all group"
                >
                  <span className="text-blue-400 group-hover:text-blue-300 transition-colors">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex w-full gap-4",
              msg.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            <div className={cn(
              "flex max-w-[85%] gap-3",
              msg.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}>
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1",
                msg.role === 'user' ? "bg-blue-600" : "bg-red-600"
              )}>
                {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>
              <div className={cn(
                "p-4 rounded-2xl shadow-lg",
                msg.role === 'user' 
                  ? "bg-blue-900/20 border border-blue-500/30 text-blue-50" 
                  : "bg-[#1a1a1a] border border-red-900/30 text-gray-100"
              )}>
                <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-headings:text-blue-400 prose-headings:mt-4 prose-headings:mb-2 prose-strong:text-blue-300 prose-li:text-gray-300">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                <div className="mt-2 text-[10px] opacity-30 font-mono uppercase tracking-tighter">
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start gap-4">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shrink-0">
              <Bot size={18} />
            </div>
            <div className="bg-[#1a1a1a] border border-red-900/30 p-4 rounded-2xl flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-red-500" />
              <span className="text-sm text-gray-400 font-mono italic">CONSULTING CODEX...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-[#121212] border-t border-blue-900/30">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a law question... (e.g. 'Can I be arrested for speeding?')"
            className="w-full bg-[#1a1a1a] border border-blue-900/30 rounded-2xl py-4 pl-6 pr-16 text-white placeholder-blue-300/30 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-2xl"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 rounded-xl transition-all text-white shadow-lg"
          >
            <Send size={20} />
          </button>
        </form>
        <div className="mt-2 text-center">
          <p className="text-[10px] text-blue-300/40 uppercase tracking-widest font-mono">
            Nexus AI Law Assistant v1.0.4 | Powered by Gemini 3.1 Pro
          </p>
        </div>
      </div>
    </div>
  );
}
