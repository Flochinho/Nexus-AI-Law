import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, Scale, ShieldAlert, Gavel, Info, TrafficCone, Zap, FileText, BookOpen, Filter, Terminal, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { GEORGIAN_LAWS, Law } from '../constants/laws';

export default function LawCodex() {
  const [laws, setLaws] = useState<Law[]>(GEORGIAN_LAWS);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'laws'), orderBy('title', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedLaws: Law[] = [];
      snapshot.docs.forEach((doc) => {
        loadedLaws.push({ id: doc.id, ...doc.data() } as Law);
      });
      if (loadedLaws.length > 0) {
        setLaws(loadedLaws);
      }
    }, (error) => {
      console.error('Nexus Laws Codex Sync Error:', error);
    });

    return () => unsubscribe();
  }, []);

  const categories = ['საპროცესო', 'სისხლის', 'იმუნიტეტი', 'სპეციალური'];

  const filteredLaws = useMemo(() => {
    return laws.filter(law => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        law.title.toLowerCase().includes(searchLower) || 
        law.description.toLowerCase().includes(searchLower) ||
        (law.id && law.id.toLowerCase().includes(searchLower));
      const matchesCategory = activeCategory ? law.category === activeCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, activeCategory, laws]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'საპროცესო': return <FileText size={24} />;
      case 'სისხლის': return <Gavel size={24} />;
      case 'იმუნიტეტი': return <ShieldAlert size={24} />;
      case 'სპეციალური': return <Zap size={24} />;
      default: return <FileText size={24} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white font-sans relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-nexus-accent/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="px-10 py-12 border-b border-white/5 bg-black/40 backdrop-blur-2xl z-10">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-nexus-accent/10 border border-nexus-accent/20 rounded-full">
                <BookOpen size={12} className="text-nexus-accent" />
                <p className="text-[10px] text-nexus-accent uppercase tracking-[0.4em] font-mono font-black italic">Judicial Database</p>
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white uppercase italic leading-none">
                საკანონმდებლო <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-nexus-accent to-blue-400">კოდექსი.</span>
              </h1>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActiveCategory(null)}
                className={cn(
                  "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] italic transition-all border",
                  !activeCategory
                    ? "bg-nexus-accent border-nexus-accent text-white shadow-[0_0_30px_rgba(59,130,246,0.4)]"
                    : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white"
                )}
              >
                ყველა
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] italic transition-all border",
                    activeCategory === cat
                      ? "bg-nexus-accent border-nexus-accent text-white shadow-[0_0_30px_rgba(59,130,246,0.4)]"
                      : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="relative group max-w-3xl">
            <div className="absolute -inset-1 bg-gradient-to-r from-nexus-accent/40 to-transparent rounded-[2rem] blur-xl opacity-0 group-focus-within:opacity-100 transition duration-700" />
            <div className="relative flex items-center">
              <Search className="absolute left-6 text-white/20 group-focus-within:text-nexus-accent transition-colors" size={20} />
              <input
                type="text"
                placeholder="მოძებნეთ მუხლი ან საკვანძო სიტყვა..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0f0f0f] border border-white/10 rounded-[2rem] py-6 pl-16 pr-8 text-white placeholder-white/10 focus:outline-none focus:border-nexus-accent/50 transition-all text-sm font-medium"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-10 scrollbar-hide">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredLaws.map((law, idx) => (
                <motion.div
                  key={law.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: idx * 0.01 }}
                  className={cn(
                    "group bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-nexus-accent/30 transition-all duration-500",
                    expandedId === law.id && "border-nexus-accent/40 bg-[#111] shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                  )}
                >
                  <button
                    onClick={() => setExpandedId(expandedId === law.id ? null : law.id)}
                    className="w-full p-8 text-left flex items-center justify-between gap-6"
                  >
                    <div className="flex items-center gap-6">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500",
                        expandedId === law.id 
                          ? "bg-nexus-accent border-nexus-accent text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                          : "bg-white/5 border-white/10 text-white/20 group-hover:text-nexus-accent group-hover:border-nexus-accent/30"
                      )}>
                        {getCategoryIcon(law.category)}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-[10px] font-mono font-bold text-nexus-accent uppercase tracking-[0.2em]">{law.category}</span>
                          <div className="w-1 h-1 rounded-full bg-white/10" />
                          <span className="text-[10px] font-mono font-bold text-white/20 uppercase tracking-[0.2em]">ID: {law.id}</span>
                        </div>
                        <h3 className="text-xl font-black text-white/90 tracking-tight group-hover:text-white transition-colors">{law.title}</h3>
                      </div>
                    </div>
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-white/20 transition-all duration-500",
                      expandedId === law.id && "rotate-180 bg-nexus-accent/10 border-nexus-accent/20 text-nexus-accent"
                    )}>
                      <ChevronDown size={20} />
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedId === law.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: "circOut" }}
                      >
                        <div className="px-8 pb-8 space-y-8">
                          <div className="h-px bg-white/5" />
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-nexus-accent uppercase tracking-[0.3em] italic">აღწერა / განმარტება</h4>
                            <p className="text-white/60 text-lg leading-relaxed font-medium">{law.description}</p>
                          </div>
                          {law.penalty && (
                            <div className="p-6 bg-nexus-accent/5 border border-nexus-accent/20 rounded-3xl flex items-center justify-between group/penalty">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-nexus-accent/20 flex items-center justify-center text-nexus-accent">
                                  <ShieldAlert size={20} />
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-nexus-accent uppercase tracking-[0.3em] italic">სანქცია / სასჯელი</p>
                                  <p className="text-white font-bold text-lg">{law.penalty}</p>
                                </div>
                              </div>
                              <div className="px-4 py-2 bg-nexus-accent/10 rounded-xl text-[10px] font-black text-nexus-accent uppercase tracking-[0.2em] opacity-0 group-hover/penalty:opacity-100 transition-opacity">
                                Enforced
                              </div>
                            </div>
                          )}

                          {law.examples && law.examples.length > 0 && (
                            <div className="space-y-4">
                              <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] italic">პრაქტიკული მაგალითები</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {law.examples.map((example, i) => (
                                  <div key={i} className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex gap-4 group/example hover:bg-white/[0.04] transition-colors">
                                    <div className="w-1.5 h-1.5 rounded-full bg-nexus-accent/40 mt-2 group-hover/example:scale-125 transition-transform" />
                                    <p className="text-white/40 text-sm leading-relaxed group-hover:text-white/60 transition-colors">{example}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredLaws.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-32 text-center space-y-6"
            >
              <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto border border-white/10">
                <Search size={32} className="text-white/10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white/40 uppercase italic tracking-tight">მონაცემები ვერ მოიძებნა</h3>
                <p className="text-white/20 text-sm font-medium">სცადეთ სხვა საკვანძო სიტყვა ან შეცვალეთ ფილტრი.</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <footer className="px-10 py-6 bg-black/60 backdrop-blur-3xl border-t border-white/5 flex items-center justify-center gap-12">
        <div className="flex items-center gap-3">
          <Terminal size={14} className="text-nexus-accent/30" />
          <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-mono font-bold">Nexus Law Engine v4.0</p>
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-white/5" />
        <div className="flex items-center gap-3">
          <Sparkles size={14} className="text-nexus-accent/30" />
          <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-mono font-bold">Neural Database Active</p>
        </div>
      </footer>
    </div>
  );
}
