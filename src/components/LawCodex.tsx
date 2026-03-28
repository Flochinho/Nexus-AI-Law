import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, Scale, ShieldAlert, Gavel, Info, TrafficCone, Zap, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

interface Law {
  id: string;
  category: 'Traffic' | 'Felony' | 'Misdemeanor' | 'Police Powers' | 'Weapons';
  title: string;
  description: string;
  penalty: string;
}

export default function LawCodex() {
  const [laws, setLaws] = useState<Law[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'laws'), orderBy('title', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedLaws: Law[] = [];
      snapshot.docs.forEach((doc) => {
        loadedLaws.push({ id: doc.id, ...doc.data() } as Law);
      });
      setLaws(loadedLaws);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'laws');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const categories = ['Traffic', 'Felony', 'Misdemeanor', 'Police Powers', 'Weapons'];

  const filteredLaws = laws.filter(law => {
    const matchesSearch = law.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         law.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory ? law.category === activeCategory : true;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Traffic': return <TrafficCone className="w-4 h-4 text-orange-400" />;
      case 'Felony': return <ShieldAlert className="w-4 h-4 text-red-500" />;
      case 'Misdemeanor': return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'Police Powers': return <Scale className="w-4 h-4 text-blue-400" />;
      case 'Weapons': return <Gavel className="w-4 h-4 text-purple-400" />;
      default: return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white font-sans p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic flex items-center gap-3">
            <FileText className="text-blue-500 w-8 h-8" />
            LAW <span className="text-blue-500">CODEX</span>
          </h1>
          <p className="text-blue-300/60 text-sm font-mono uppercase tracking-widest">
            Official Penal Code of San Andreas
          </p>
        </div>

        {/* Search and Filter */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/30 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search laws, codes, or penalties..."
              className="w-full bg-[#1a1a1a] border border-blue-900/30 rounded-2xl py-4 pl-12 pr-6 text-white placeholder-blue-300/30 focus:outline-none focus:border-blue-500/50 transition-all shadow-xl"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border",
                !activeCategory 
                  ? "bg-blue-600 border-blue-500 text-white" 
                  : "bg-[#1a1a1a] border-blue-900/20 text-blue-300/50 hover:border-blue-500/30"
              )}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border flex items-center gap-2",
                  activeCategory === cat 
                    ? "bg-blue-600 border-blue-500 text-white" 
                    : "bg-[#1a1a1a] border-blue-900/20 text-blue-300/50 hover:border-blue-500/30"
                )}
              >
                {getCategoryIcon(cat)}
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Law List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Scale className="w-10 h-10 text-blue-600 animate-pulse" />
              <p className="text-blue-300/30 font-mono uppercase tracking-widest text-xs">Accessing Archives...</p>
            </div>
          ) : filteredLaws.length > 0 ? (
            filteredLaws.map(law => (
              <div
                key={law.id}
                className={cn(
                  "bg-[#1a1a1a] border border-blue-900/20 rounded-2xl overflow-hidden transition-all",
                  expandedId === law.id ? "border-blue-500/50 ring-1 ring-blue-500/20" : "hover:border-blue-500/30"
                )}
              >
                <button
                  onClick={() => setExpandedId(expandedId === law.id ? null : law.id)}
                  className="w-full p-5 flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center bg-[#222] border border-blue-900/20 group-hover:border-blue-500/30 transition-all",
                      expandedId === law.id && "bg-blue-900/20 border-blue-500/50"
                    )}>
                      {getCategoryIcon(law.category)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-white group-hover:text-blue-300 transition-colors">{law.title}</h3>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
                        law.category === 'Felony' ? "text-red-400 border-red-900/30 bg-red-900/10" :
                        law.category === 'Traffic' ? "text-orange-400 border-orange-900/30 bg-orange-900/10" :
                        law.category === 'Misdemeanor' ? "text-yellow-400 border-yellow-900/30 bg-yellow-900/10" :
                        "text-blue-400 border-blue-900/30 bg-blue-900/10"
                      )}>
                        {law.category}
                      </span>
                    </div>
                  </div>
                  {expandedId === law.id ? <ChevronUp className="text-blue-500" /> : <ChevronDown className="text-blue-300/30" />}
                </button>

                {expandedId === law.id && (
                  <div className="p-5 pt-0 border-t border-blue-900/10 bg-[#121212]/50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Description</h4>
                      <p className="text-gray-300 text-sm leading-relaxed">{law.description}</p>
                    </div>
                    <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center shrink-0">
                        <Gavel className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Statutory Penalty</h4>
                        <p className="text-blue-100 font-mono text-xs">{law.penalty}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-[#1a1a1a] border border-dashed border-blue-900/30 rounded-3xl">
              <Info className="w-12 h-12 text-blue-900/30 mx-auto mb-4" />
              <p className="text-blue-300/30 font-mono uppercase tracking-widest">No matching laws found in codex</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
