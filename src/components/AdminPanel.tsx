import React, { useState, useEffect } from 'react';
import { Settings, Plus, Edit2, Trash2, Save, X, ShieldAlert, Gavel, FileText, TrafficCone, Zap, Scale } from 'lucide-react';
import { cn } from '../lib/utils';
import { db, handleFirestoreError, OperationType, seedLaws } from '../services/firebase';
import { collection, onSnapshot, query, orderBy, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { GEORGIAN_LAWS } from '../constants/laws';

interface Law {
  id: string;
  category: 'Traffic' | 'Felony' | 'Misdemeanor' | 'Police Powers' | 'Weapons';
  title: string;
  description: string;
  penalty: string;
}

export default function AdminPanel() {
  const [laws, setLaws] = useState<Law[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [formData, setFormData] = useState<Partial<Law>>({
    category: 'Traffic',
    title: '',
    description: '',
    penalty: ''
  });

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
      id
    } as Law;

    try {
      await setDoc(doc(db, 'laws', id), lawData);
      setEditingId(null);
      setIsAdding(false);
      setFormData({ category: 'Traffic', title: '', description: '', penalty: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `laws/${id}`);
    }
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
      <div className="max-w-5xl mx-auto w-full space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic flex items-center gap-3">
              <Settings className="text-blue-500 w-8 h-8" />
              ADMIN <span className="text-blue-500">DASHBOARD</span>
            </h1>
            <p className="text-blue-300/60 text-sm font-mono uppercase tracking-widest">
              Manage Penal Code and System Context
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSeed}
              disabled={isSeeding}
              className="flex items-center gap-2 px-6 py-3 bg-blue-900/40 hover:bg-blue-900/60 border border-blue-500/30 rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg disabled:opacity-50"
            >
              <Zap size={18} className={isSeeding ? 'animate-pulse' : ''} />
              {isSeeding ? 'Seeding...' : 'Seed Laws'}
            </button>
            <button
              onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ category: 'Traffic', title: '', description: '', penalty: '' }); }}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg"
            >
              <Plus size={18} />
              Add New Law
            </button>
          </div>
        </div>

        {/* Edit/Add Form */}
        {(isAdding || editingId) && (
          <div className="bg-[#1a1a1a] border border-blue-500/30 rounded-3xl p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold uppercase tracking-tight text-blue-400">
                {editingId ? 'Edit Law Entry' : 'Create New Law Entry'}
              </h2>
              <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-blue-300/30 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Law Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Grand Theft Auto"
                  className="w-full bg-[#121212] border border-blue-900/30 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500/50 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full bg-[#121212] border border-blue-900/30 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500/50 transition-all"
                >
                  <option value="Traffic">Traffic</option>
                  <option value="Felony">Felony</option>
                  <option value="Misdemeanor">Misdemeanor</option>
                  <option value="Police Powers">Police Powers</option>
                  <option value="Weapons">Weapons</option>
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed legal description of the offense..."
                  rows={3}
                  className="w-full bg-[#121212] border border-blue-900/30 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500/50 transition-all resize-none"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Statutory Penalty</label>
                <input
                  type="text"
                  value={formData.penalty}
                  onChange={(e) => setFormData({ ...formData, penalty: e.target.value })}
                  placeholder="e.g. Fine: $1000 | Jail: 10 minutes"
                  className="w-full bg-[#121212] border border-blue-900/30 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500/50 transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => { setIsAdding(false); setEditingId(null); }}
                className="px-6 py-3 bg-[#222] hover:bg-[#333] border border-blue-900/20 rounded-xl font-bold uppercase tracking-widest text-xs transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg flex items-center gap-2"
              >
                <Save size={18} />
                Save Law
              </button>
            </div>
          </div>
        )}

        {/* Law Table */}
        <div className="bg-[#1a1a1a] border border-blue-900/20 rounded-3xl overflow-hidden shadow-2xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Scale className="w-10 h-10 text-blue-600 animate-pulse" />
              <p className="text-blue-300/30 font-mono uppercase tracking-widest text-xs">Loading Codex...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#121212] border-b border-blue-900/20">
                  <th className="p-5 text-[10px] font-black text-blue-400 uppercase tracking-widest">Law Title</th>
                  <th className="p-5 text-[10px] font-black text-blue-400 uppercase tracking-widest">Category</th>
                  <th className="p-5 text-[10px] font-black text-blue-400 uppercase tracking-widest">Penalty</th>
                  <th className="p-5 text-[10px] font-black text-blue-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-900/10">
                {laws.map(law => (
                  <tr key={law.id} className="hover:bg-blue-900/5 transition-colors group">
                    <td className="p-5">
                      <div className="font-bold text-white group-hover:text-blue-300 transition-colors">{law.title}</div>
                      <div className="text-xs text-blue-300/40 truncate max-w-xs">{law.description}</div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(law.category)}
                        <span className="text-xs font-mono text-blue-300/60">{law.category}</span>
                      </div>
                    </td>
                    <td className="p-5">
                      <span className="text-xs font-mono text-blue-100">{law.penalty}</span>
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(law)}
                          className="p-2 bg-[#222] hover:bg-blue-600/20 border border-blue-900/20 rounded-lg transition-all text-blue-400"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(law.id)}
                          className="p-2 bg-[#222] hover:bg-red-600/20 border border-blue-900/20 rounded-lg transition-all text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
