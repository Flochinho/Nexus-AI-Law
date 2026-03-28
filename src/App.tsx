import React, { useState, useEffect } from 'react';
import { MessageSquare, BookOpen, ShieldCheck, History, Menu, X, Scale, LogIn, LogOut, User as UserIcon, ShieldAlert } from 'lucide-react';
import Chat from './components/Chat';
import LawCodex from './components/LawCodex';
import AdminPanel from './components/AdminPanel';
import { cn } from './lib/utils';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from './services/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

type Page = 'chat' | 'codex' | 'admin' | 'history';

interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'user';
}

export default function App() {
  const [activePage, setActivePage] = useState<Page>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            // Create default profile
            const newProfile: UserProfile = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: 'user' // Default role
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navItems = [
    { id: 'chat', label: 'Ask AI Law', icon: MessageSquare },
    { id: 'codex', label: 'Law Codex', icon: BookOpen },
    { id: 'admin', label: 'Admin Panel', icon: ShieldCheck, adminOnly: true },
  ];

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Scale className="w-12 h-12 text-blue-600 animate-pulse" />
          <p className="text-blue-300/50 font-mono uppercase tracking-widest text-xs">Initializing Nexus AI...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="space-y-4">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-blue-600/20">
              <Scale className="text-white w-10 h-10" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">NEXUS <span className="text-blue-500">AI LAW</span></h1>
            <p className="text-blue-300/60 text-lg">Your GTA V RP Legal Assistant. Know the law, win the RP.</p>
          </div>
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-black hover:bg-gray-200 py-4 rounded-2xl font-bold uppercase tracking-widest transition-all shadow-xl"
          >
            <LogIn size={20} />
            Login with Google
          </button>
          <p className="text-[10px] text-blue-300/30 uppercase tracking-widest font-mono">
            Secure Authentication Required to Access Codex and AI
          </p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case 'chat': return <Chat user={user} />;
      case 'codex': return <LawCodex />;
      case 'admin': return profile?.role === 'admin' ? <AdminPanel /> : <Chat user={user} />;
      default: return <Chat user={user} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className={cn(
        "bg-[#121212] border-r border-blue-900/30 transition-all duration-300 flex flex-col shrink-0 z-50",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-6 flex items-center gap-3 border-b border-blue-900/10">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20">
            <Scale className="text-white w-6 h-6" />
          </div>
          {isSidebarOpen && (
            <div className="animate-in fade-in duration-300">
              <h1 className="text-lg font-black tracking-tighter text-white uppercase italic">NEXUS <span className="text-blue-500">AI</span></h1>
              <p className="text-[10px] text-blue-300/40 uppercase tracking-widest font-mono">Legal Assistant</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          {navItems.filter(item => !item.adminOnly || profile?.role === 'admin').map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id as Page)}
              className={cn(
                "w-full flex items-center gap-4 p-3 rounded-xl transition-all group relative",
                activePage === item.id 
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/30" 
                  : "text-blue-300/40 hover:bg-blue-900/10 hover:text-blue-300 border border-transparent"
              )}
            >
              <item.icon size={22} className={cn(
                "shrink-0 transition-colors",
                activePage === item.id ? "text-blue-400" : "group-hover:text-blue-300"
              )} />
              {isSidebarOpen && (
                <span className="font-bold uppercase tracking-widest text-xs animate-in fade-in slide-in-from-left-2 duration-300">
                  {item.label}
                </span>
              )}
              {activePage === item.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-blue-900/10 space-y-2">
          <div className="flex items-center gap-3 p-3">
            <div className="w-8 h-8 bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0">
              <UserIcon size={18} className="text-blue-400" />
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-white truncate">{user.displayName || user.email}</p>
                <p className="text-[8px] text-blue-300/40 uppercase tracking-widest font-mono">{profile?.role || 'user'}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 p-3 rounded-xl text-red-400/60 hover:bg-red-900/10 hover:text-red-400 transition-all"
          >
            <LogOut size={22} />
            {isSidebarOpen && <span className="font-bold uppercase tracking-widest text-xs">Logout</span>}
          </button>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center gap-4 p-3 rounded-xl text-blue-300/40 hover:bg-blue-900/10 hover:text-blue-300 transition-all"
          >
            {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
            {isSidebarOpen && <span className="font-bold uppercase tracking-widest text-xs">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {renderPage()}
      </main>
    </div>
  );
}
