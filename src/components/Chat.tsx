import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Scale, ShieldAlert, Gavel, Info, Trash2, Sparkles, Terminal, TrafficCone, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { askLegalQuestion } from '../services/geminiService';
import { cn } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, deleteDoc, doc, getDocs } from 'firebase/firestore';
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
  const [hasSentFirstMessage, setHasSentFirstMessage] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setErrorStatus(null);
    const q = query(
      collection(db, 'questions'),
      where('user_id', '==', user.uid),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const loadedMessages: Message[] = [];
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data && data.question_text && data.ai_response) {
            loadedMessages.push({
              id: doc.id + '_user',
              role: 'user',
              content: data.question_text,
              timestamp: new Date(data.timestamp || Date.now())
            });
            loadedMessages.push({
              id: doc.id + '_ai',
              role: 'assistant',
              content: data.ai_response,
              timestamp: new Date(data.timestamp || Date.now())
            });
          }
        });
        if (loadedMessages.length > 0) {
          setMessages(loadedMessages);
          setHasSentFirstMessage(true);
        }
      } catch (renderError) {
        console.error('Error processing snapshot data:', renderError);
      }
    }, (error) => {
      console.error('Firestore Snapshot Error:', error);
      // Don't throw here to avoid crashing the UI, just set local error state if needed
      // setErrorStatus("Kავშირი მონაცემთა ბაზასთან შეფერხებულია.");
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
    setHasSentFirstMessage(true);

    // Optimistic UI update
    const tempUserId = Date.now().toString();
    const optimisticUserMsg: Message = {
      id: tempUserId + '_user',
      role: 'user',
      content: questionText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, optimisticUserMsg]);

    try {
      // Prepare history for Gemini
      const history = messages.map(msg => ({
        role: (msg.role === 'user' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: msg.content }]
      }));

      const aiResponse = await askLegalQuestion(questionText, history);
      
      // Optimistic AI response
      const optimisticAiMsg: Message = {
        id: tempUserId + '_ai',
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, optimisticAiMsg]);

      try {
        await addDoc(collection(db, 'questions'), {
          user_id: user.uid,
          question_text: questionText,
          ai_response: aiResponse,
          timestamp: new Date().toISOString()
        });
      } catch (fsError) {
        console.error('Error saving to Firestore:', fsError);
        // We still have the response in state, so the user sees it
      }

    } catch (error) {
      console.error('Error asking legal question:', error);
      // Remove optimistic message if error occurred? Or just show error
      const errorMsg: Message = {
        id: 'error_' + Date.now(),
        role: 'assistant',
        content: "⚠️ **სისტემური ხარვეზი.** კავშირი გაწყდა. გთხოვთ სცადოთ მოგვიანებით ან შეამოწმოთ ინტერნეტი.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const examplePrompts = [
    { text: "ავტომობილის ჩხრეკის პროცედურა", icon: <TrafficCone size={14} /> },
    { text: "უფლებამოსილების გადაჭარბების მაგალითები", icon: <ShieldAlert size={14} /> },
    { text: "სასჯელი სახელმწიფო ქონების დაზიანებაზე", icon: <Gavel size={14} /> },
    { text: "მირანდას უფლებების გამოყენების წესი", icon: <Scale size={14} /> }
  ];

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const clearHistory = async () => {
    try {
      const q = query(collection(db, 'questions'), where('user_id', '==', user.uid));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'questions', d.id)));
      await Promise.all(deletePromises);
      setMessages([]);
      setShowClearConfirm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'questions');
    }
  };

  return (
    <div className="flex flex-col h-full bg-nexus-bg text-white font-sans relative overflow-hidden nexus-grid">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-nexus-accent/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[150px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03)_0%,transparent_70%)]" />
      </div>

      {/* Clear History Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-8"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111] border border-white/10 rounded-[2.5rem] p-10 max-w-md w-full space-y-8 shadow-[0_0_100px_rgba(0,0,0,1)]"
            >
              <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto border border-red-500/20">
                <Trash2 className="text-red-500 w-10 h-10" />
              </div>
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-black tracking-tight uppercase italic">მონაცემების გასუფთავება</h3>
                <p className="text-white/40 text-sm font-medium leading-relaxed">
                  დარწმუნებული ხართ, რომ გსურთ ჩატის ისტორიის სრული დეინსტალაცია? ეს პროცესი შეუქცევადია.
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] italic hover:bg-white/10 transition-all"
                >
                  გაუქმება
                </button>
                <button
                  onClick={clearHistory}
                  className="flex-1 px-6 py-4 rounded-2xl bg-red-500 text-white text-[10px] font-black uppercase tracking-[0.2em] italic hover:bg-red-600 transition-all shadow-[0_0_30px_rgba(239,68,68,0.3)]"
                >
                  დადასტურება
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Banner */}
      {errorStatus && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-10 py-3 flex items-center justify-between z-30">
          <div className="flex items-center gap-3">
            <ShieldAlert size={14} className="text-red-500" />
            <p className="text-[10px] text-red-500 uppercase tracking-widest font-black italic">{errorStatus}</p>
          </div>
          <button onClick={() => setErrorStatus(null)} className="text-red-500/40 hover:text-red-500">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="px-10 py-8 border-b border-white/5 bg-black/40 backdrop-blur-3xl flex items-center justify-between z-20 relative">
        <div className="flex items-center gap-6">
          <div className="relative group/logo">
            <div className="absolute -inset-2 bg-nexus-accent/30 blur-xl rounded-full opacity-50 group-hover/logo:opacity-100 transition-opacity duration-700" />
            <div className="w-14 h-14 bg-nexus-card border border-nexus-accent/30 rounded-2xl flex items-center justify-center relative z-10 shadow-[0_0_30px_rgba(59,130,246,0.2)] group-hover/logo:border-nexus-accent transition-colors duration-500">
              <Terminal className="text-nexus-accent w-7 h-7" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black tracking-tighter text-white uppercase italic leading-none nexus-gradient-text">NEXUS INTELLIGENCE</h2>
              <div className="px-2 py-0.5 bg-nexus-accent/10 border border-nexus-accent/20 rounded text-[9px] text-nexus-accent font-black uppercase tracking-widest">PROTOCOL 4.0</div>
            </div>
            <div className="flex items-center gap-2.5 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-mono font-bold">Neural Link: Established</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-10">
          <button 
            onClick={() => setShowClearConfirm(true)}
            className="text-[10px] text-white/20 hover:text-red-400 flex items-center gap-3 transition-all uppercase tracking-[0.3em] font-mono font-bold group"
          >
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-red-500/10 group-hover:border-red-500/20 transition-all">
              <Trash2 size={16} className="group-hover:rotate-12 transition-transform" />
            </div>
            <span className="hidden md:block">Clear Protocol</span>
          </button>
          <div className="h-8 w-px bg-white/5" />
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">System Status</p>
              <p className="text-[10px] text-nexus-accent font-mono font-bold uppercase tracking-widest">Optimized</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-nexus-accent/10 border border-nexus-accent/20 flex items-center justify-center text-nexus-accent">
              <Scale size={20} />
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-hide" ref={scrollRef}>
        {messages.length === 0 && !isLoading && !hasSentFirstMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full space-y-16 max-w-4xl mx-auto text-center py-12"
          >
            <div className="space-y-8">
              <div className="inline-flex items-center gap-3 px-5 py-2 bg-white/5 border border-white/10 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-nexus-accent animate-ping" />
                <p className="text-[10px] text-white/60 uppercase tracking-[0.5em] font-mono font-black italic">System Initialized</p>
              </div>
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white uppercase italic leading-[0.85]">
                იურიდიული <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-nexus-accent to-blue-400 drop-shadow-[0_0_30px_rgba(59,130,246,0.3)]">ინტელექტი.</span>
              </h1>
              <p className="text-white/40 text-xl font-medium max-w-2xl mx-auto leading-relaxed">
                San Andreas-ის შტატის უახლესი იურიდიული ბაზა. დასვით კითხვა და მიიღეთ პროფესიონალური ანალიზი, მაგალითები და RP რჩევები.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
              {examplePrompts.map((prompt, idx) => (
                <motion.button
                  key={prompt.text}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => setInput(prompt.text)}
                  className="p-8 bg-white/[0.02] border border-white/5 rounded-[2rem] text-left hover:border-nexus-accent/40 hover:bg-nexus-accent/[0.03] transition-all group relative overflow-hidden"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-nexus-accent group-hover:bg-nexus-accent/10 transition-all">
                      {prompt.icon}
                    </div>
                    <span className="text-sm font-bold text-white/50 group-hover:text-white transition-colors tracking-tight">{prompt.text}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {messages.map((msg, idx) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={cn(
              "flex w-full gap-8",
              msg.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            <div className={cn(
              "flex max-w-[85%] gap-5",
              msg.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}>
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 mt-1 border transition-all duration-500",
                msg.role === 'user' 
                  ? "bg-white/5 border-white/10 text-white/40" 
                  : "bg-nexus-accent/10 border-nexus-accent/30 text-nexus-accent shadow-[0_0_20px_rgba(59,130,246,0.2)]"
              )}>
                {msg.role === 'user' ? <User size={24} /> : <Bot size={24} />}
              </div>
              <div className={cn(
                "p-8 rounded-[2.5rem] shadow-2xl relative group transition-all duration-500",
                msg.role === 'user' 
                  ? "bg-nexus-accent text-white rounded-tr-none shadow-[0_20px_50px_rgba(59,130,246,0.2)]" 
                  : "bg-[#0f0f0f] border border-white/5 text-white/90 rounded-tl-none hover:border-nexus-accent/20"
              )}>
                <div className={cn(
                  "prose prose-invert max-w-none prose-p:leading-relaxed prose-headings:text-white prose-headings:font-black prose-headings:uppercase prose-headings:italic prose-headings:tracking-tight prose-strong:text-nexus-accent prose-li:marker:text-nexus-accent/50 prose-blockquote:border-nexus-accent prose-blockquote:bg-nexus-accent/5 prose-blockquote:py-1 prose-blockquote:rounded-r-xl",
                  msg.role === 'user' && "prose-strong:text-white prose-headings:text-white"
                )}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-500">
                  <div className="flex gap-2.5">
                    <div className={cn("w-1.5 h-1.5 rounded-full", msg.role === 'user' ? "bg-white/20" : "bg-nexus-accent/20")} />
                    <div className={cn("w-1.5 h-1.5 rounded-full", msg.role === 'user' ? "bg-white/20" : "bg-nexus-accent/20")} />
                    <div className={cn("w-1.5 h-1.5 rounded-full", msg.role === 'user' ? "bg-white/20" : "bg-nexus-accent/20")} />
                  </div>
                  <span className={cn("text-[10px] font-mono uppercase tracking-[0.3em] font-bold", msg.role === 'user' ? "text-white/40" : "text-white/10")}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start gap-8">
            <div className="w-14 h-14 rounded-2xl bg-nexus-accent/10 border border-nexus-accent/30 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
              <Bot size={24} className="text-nexus-accent animate-pulse" />
            </div>
            <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[2.5rem] rounded-tl-none flex items-center gap-6 shadow-2xl">
              <div className="flex gap-2">
                <motion.div 
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}
                  className="w-2 h-2 bg-nexus-accent rounded-full" 
                />
                <motion.div 
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
                  className="w-2 h-2 bg-nexus-accent rounded-full" 
                />
                <motion.div 
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}
                  className="w-2 h-2 bg-nexus-accent rounded-full" 
                />
              </div>
              <span className="text-[11px] text-nexus-accent uppercase tracking-[0.4em] font-mono font-black italic">მონაცემთა ანალიზი...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-10 bg-black/60 backdrop-blur-3xl border-t border-white/5 relative z-20">
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-nexus-accent/40 via-blue-500/20 to-transparent rounded-[2.5rem] blur-2xl opacity-0 group-focus-within:opacity-100 transition duration-1000" />
          <div className="relative flex items-center bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] focus-within:border-nexus-accent/50 transition-all overflow-hidden">
            <div className="pl-10 text-white/20">
              <Terminal size={20} />
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="დასვით იურიდიული შეკითხვა..."
              className="w-full bg-transparent py-8 pl-6 pr-24 text-white placeholder-white/10 focus:outline-none focus:ring-0 text-base font-medium"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-4 w-16 h-16 bg-nexus-accent text-white hover:scale-105 active:scale-95 disabled:opacity-20 disabled:scale-100 rounded-[1.8rem] transition-all duration-500 shadow-[0_0_30px_rgba(59,130,246,0.4)] flex items-center justify-center group/btn"
            >
              <Send size={24} className={cn("transition-transform duration-500", !isLoading && "group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1")} />
              {isLoading && <div className="absolute inset-0 border-4 border-white/20 border-t-white rounded-full animate-spin" />}
            </button>
          </div>
        </form>
        <div className="mt-8 flex items-center justify-center gap-12">
          <div className="flex items-center gap-3">
            <ShieldAlert size={14} className="text-nexus-accent/30" />
            <p className="text-[10px] text-white/10 uppercase tracking-[0.4em] font-mono font-bold">
              Nexus Neural Engine v4.0
            </p>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-white/5" />
          <div className="flex items-center gap-3">
            <Gavel size={14} className="text-nexus-accent/30" />
            <p className="text-[10px] text-white/10 uppercase tracking-[0.4em] font-mono font-bold">
              San Andreas Judicial Protocol
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
