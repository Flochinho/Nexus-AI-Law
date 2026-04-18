import React, { useState, useEffect } from 'react';
import { Settings, Plus, Edit2, Trash2, Save, X, ShieldAlert, Gavel, FileText, TrafficCone, Zap, Scale } from 'lucide-react';
import { cn } from '../lib/utils';
import { db, handleFirestoreError, OperationType, seedLaws } from '../services/firebase';
import { collection, onSnapshot, query, orderBy, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { GEORGIAN_LAWS, Law } from '../constants/laws';

export default function AdminPanel() {
  const [laws, setLaws] = useState<Law[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [formData, setFormData] = useState<Partial<Law>>({
    category: 'საპროცესო',
    title: '',
    description: '',
    penalty: '',
    examples: []
  });

  const [exampleInput, setExampleInput] = useState('');

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
      console.error('Nexus Laws Sync Error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSeed = async () => {
    if (window.confirm('This will seed the database with initial Georgian laws. Continue?')) {
      setIsSeeding(true);
      try {
        await seedLaws(GEORGIAN_LAWS);
        alert('Laws seeded successfully!');
      } catch (error) {
        console.error('Seeding failed:', error);
        alert('Seeding failed. Check console for details.');
      } finally {
        setIsSeeding(false);
      }
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.description || !formData.penalty) {
      alert('Please fill in all fields.');
      return;
    }

    const id = editingId || Date.now().toString();
    const lawData = {
      ...formData,
      id,
      examples: formData.examples || []
    } as Law;

    try {
      await setDoc(doc(db, 'laws', id), lawData);
      setEditingId(null);
      setIsAdding(false);
      setFormData({ category: 'საპროცესო', title: '', description: '', penalty: '', examples: [] });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `laws/${id}`);
    }
  };

  const addExample = () => {
    if (!exampleInput.trim()) return;
    setFormData({
      ...formData,
      examples: [...(formData.examples || []), exampleInput.trim()]
    });
    setExampleInput('');
  };

  const removeExample = (index: number) => {
    setFormData({
      ...formData,
      examples: (formData.examples || []).filter((_, i) => i !== index)
    });
  };

  const handleEdit = (law: Law) => {
    setEditingId(law.id);
    setFormData(law);
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this law?')) {
      try {
        await deleteDoc(doc(db, 'laws', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `laws/${id}`);
      }
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'საპროცესო': return <FileText className="w-4 h-4 text-nexus-accent" />;
      case 'სისხლის': return <Gavel className="w-4 h-4 text-red-500" />;
      case 'იმუნიტეტი': return <ShieldAlert className="w-4 h-4 text-amber-500" />;
      case 'სპეციალური': return <Zap className="w-4 h-4 text-blue-400" />;
      default: return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-nexus-bg text-white font-sans p-10 overflow-y-auto nexus-grid">
      <div className="max-w-6xl mx-auto w-full space-y-12">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-nexus-accent/10 border border-nexus-accent/20 rounded-full">
              <Settings size={12} className="text-nexus-accent" />
              <span className="text-[10px] text-nexus-accent font-black uppercase tracking-widest">System Control</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic nexus-gradient-text">
              ADMIN <span className="text-nexus-accent">DASHBOARD</span>
            </h1>
            <p className="text-white/20 text-xs font-mono uppercase tracking-[0.3em] font-bold">
              Codex Management // Neural Core Access
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleSeed}
              disabled={isSeeding}
              className="flex items-center gap-3 px-8 py-4 bg-nexus-card border border-white/5 hover:border-nexus-accent/40 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all nexus-glow disabled:opacity-50 group"
            >
              <Zap size={16} className={cn("text-nexus-accent group-hover:scale-110 transition-transform", isSeeding && "animate-pulse")} />
              {isSeeding ? 'Seeding...' : 'Seed Database'}
            </button>
            <button
              onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ category: 'საპროცესო', title: '', description: '', penalty: '', examples: [] }); }}
              className="flex items-center gap-3 px-8 py-4 bg-nexus-accent text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:scale-105 active:scale-95"
            >
              <Plus size={16} />
              Protocol Alpha
            </button>
          </div>
        </div>

        {/* Edit/Add Form */}
        {(isAdding || editingId) && (
          <div className="bg-nexus-card border border-white/10 rounded-[2.5rem] p-10 space-y-10 shadow-2xl relative overflow-hidden group/form">
            <div className="absolute top-0 right-0 w-64 h-64 bg-nexus-accent/5 blur-[80px] -mr-32 -mt-32 rounded-full" />
            
            <div className="flex items-center justify-between relative z-10">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-white italic">
                {editingId ? 'Modify Protocol' : 'Initialize Protocol'}
              </h2>
              <button 
                onClick={() => { setIsAdding(false); setEditingId(null); }} 
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/20 hover:text-white hover:bg-white/10 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-nexus-accent uppercase tracking-widest ml-4">Article Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. მუხლი 4.1. განზრახი მკვლელობა"
                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm focus:outline-none focus:border-nexus-accent/50 transition-all placeholder:text-white/5"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-nexus-accent uppercase tracking-widest ml-4">Nexus Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm focus:outline-none focus:border-nexus-accent/50 transition-all appearance-none"
                >
                  <option value="საპროცესო">საპროცესო (Procedural)</option>
                  <option value="სისხლის">სისხლის (Criminal)</option>
                  <option value="იმუნიტეტი">იმუნიტეტი (Immunity)</option>
                  <option value="სპეციალური">სპეციალური (Special)</option>
                </select>
              </div>
              <div className="space-y-3 md:col-span-2">
                <label className="text-[10px] font-black text-nexus-accent uppercase tracking-widest ml-4">Neural Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed legal description of the offense..."
                  rows={4}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm focus:outline-none focus:border-nexus-accent/50 transition-all resize-none placeholder:text-white/5"
                />
              </div>
              <div className="space-y-3 md:col-span-2">
                <label className="text-[10px] font-black text-nexus-accent uppercase tracking-widest ml-4">Enforcement Penalty</label>
                <input
                  type="text"
                  value={formData.penalty}
                  onChange={(e) => setFormData({ ...formData, penalty: e.target.value })}
                  placeholder="e.g. 10 წელი პატიმრობა"
                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm focus:outline-none focus:border-nexus-accent/50 transition-all placeholder:text-white/5"
                />
              </div>

              {/* Examples Management */}
              <div className="space-y-4 md:col-span-2">
                <label className="text-[10px] font-black text-nexus-accent uppercase tracking-widest ml-4">Practical Case Studies</label>
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={exampleInput}
                    onChange={(e) => setExampleInput(e.target.value)}
                    placeholder="Add a practical example..."
                    className="flex-1 bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm focus:outline-none focus:border-nexus-accent/50 transition-all"
                  />
                  <button
                    onClick={addExample}
                    className="px-6 bg-nexus-accent/10 border border-nexus-accent/20 text-nexus-accent rounded-2xl font-bold text-xs uppercase hover:bg-nexus-accent hover:text-white transition-all"
                  >
                    Add Case
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {(formData.examples || []).map((ex, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl group/ex">
                      <span className="text-xs text-white/60 line-clamp-1">{ex}</span>
                      <button 
                        onClick={() => removeExample(i)}
                        className="text-white/10 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-6 relative z-10">
              <button
                onClick={() => { setIsAdding(false); setEditingId(null); }}
                className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
              >
                Abort
              </button>
              <button
                onClick={handleSave}
                className="px-10 py-4 bg-nexus-accent text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-[0_0_30px_rgba(59,130,246,0.3)] flex items-center gap-3 hover:scale-105 active:scale-95"
              >
                <Save size={18} />
                Confirm Sync
              </button>
            </div>
          </div>
        )}

        {/* Law Table */}
        <div className="bg-nexus-card border border-white/5 rounded-[2.5rem] overflow-hidden shadow-3xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
              <div className="relative">
                <div className="absolute -inset-4 bg-nexus-accent/20 blur-xl rounded-full animate-pulse" />
                <Scale className="w-12 h-12 text-nexus-accent relative z-10" />
              </div>
              <p className="text-white/20 font-mono uppercase tracking-[0.4em] text-[10px] font-bold">Synchronizing Database...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5">
                    <th className="p-8 text-[10px] font-black text-white/20 uppercase tracking-widest">Protocol Title</th>
                    <th className="p-8 text-[10px] font-black text-white/20 uppercase tracking-widest">Category</th>
                    <th className="p-8 text-[10px] font-black text-white/20 uppercase tracking-widest">Enforcement</th>
                    <th className="p-8 text-[10px] font-black text-white/20 uppercase tracking-widest text-right">Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {laws.map(law => (
                    <tr key={law.id} className="hover:bg-nexus-accent/[0.02] transition-colors group">
                      <td className="p-8">
                        <div className="font-black text-white/90 group-hover:text-nexus-accent transition-colors italic tracking-tight uppercase">{law.title}</div>
                        <div className="text-[11px] text-white/20 line-clamp-1 mt-1 font-medium">{law.description}</div>
                      </td>
                      <td className="p-8">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/5 rounded-lg group-hover:bg-nexus-accent/10 transition-colors">
                            {getCategoryIcon(law.category)}
                          </div>
                          <span className="text-[10px] font-mono font-bold text-white/30 uppercase tracking-widest">{law.category}</span>
                        </div>
                      </td>
                      <td className="p-8">
                        <div className="px-3 py-1 bg-nexus-accent/5 border border-nexus-accent/10 rounded-lg inline-block">
                          <span className="text-[10px] font-mono font-bold text-nexus-accent uppercase tracking-widest">{law.penalty}</span>
                        </div>
                      </td>
                      <td className="p-8 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => handleEdit(law)}
                            className="w-10 h-10 bg-white/5 hover:bg-nexus-accent/20 border border-white/5 rounded-xl transition-all text-white/20 hover:text-nexus-accent flex items-center justify-center"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(law.id)}
                            className="w-10 h-10 bg-white/5 hover:bg-red-500/20 border border-white/5 rounded-xl transition-all text-white/20 hover:text-red-500 flex items-center justify-center"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
