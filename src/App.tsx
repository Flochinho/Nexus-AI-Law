import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { MessageSquare, BookOpen, ShieldCheck, History, Menu, X, Scale, LogIn, LogOut, User as UserIcon, ShieldAlert, AlertTriangle, RefreshCcw } from 'lucide-react';
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

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "დაფიქსირდა გაუთვალისწინებელი შეცდომა.";
      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error) errorMessage = `სისტემური შეცდომა: ${parsed.error}`;
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="h-screen w-screen bg-nexus-bg flex items-center justify-center p-6 nexus-grid">
          <div className="max-w-md w-full space-y-8 text-center relative z-10 bg-nexus-card border border-red-500/20 p-10 rounded-[2rem] nexus-glow">
            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto border border-red-500/20">
              <AlertTriangle className="text-red-500 w-10 h-10" />
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-black tracking-tight uppercase italic text-white">შეცდომა სისტემაში</h2>
              <p className="text-white/40 text-sm font-medium leading-relaxed font-mono">
                {errorMessage}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-4 bg-white text-black hover:bg-nexus-accent hover:text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all group"
            >
              <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
              სისტემის გადატვირთვა
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
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
      <div className="h-screen w-screen bg-nexus-bg flex items-center justify-center p-6 nexus-grid overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-nexus-accent/5 to-transparent pointer-events-none" />
        <div className="max-w-md w-full space-y-12 text-center relative z-10">
          <div className="space-y-6">
            <div className="w-24 h-24 bg-nexus-accent rounded-[2rem] flex items-center justify-center mx-auto nexus-glow rotate-3 hover:rotate-0 transition-transform duration-500">
              <Scale className="text-white w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h1 className="text-6xl font-black tracking-tighter text-white uppercase italic leading-none">
                NEXUS <span className="text-nexus-accent">AI LAW</span>
              </h1>
              <p className="text-nexus-accent/60 text-sm uppercase tracking-[0.3em] font-mono font-bold">
                San Andreas Judicial System
              </p>
            </div>
            <p className="text-white/40 text-lg font-medium leading-relaxed">
              Advanced GTA V RP Legal Intelligence. <br/>
              <span className="text-white/20 italic text-sm">Authorized Personnel Only.</span>
            </p>
          </div>
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-4 bg-white text-black hover:bg-nexus-accent hover:text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all duration-300 shadow-2xl hover:shadow-nexus-accent/20 group"
          >
            <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
            Authenticate with Google
          </button>
          <div className="pt-8 flex flex-col items-center gap-4">
            <div className="h-px w-12 bg-white/10" />
            <p className="text-[10px] text-white/20 uppercase tracking-[0.4em] font-mono leading-loose">
              Encryption Protocol: AES-256-GCM<br/>
              Neural Engine: Gemini 3.1 Pro
            </p>
          </div>
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
    <div className="flex h-screen bg-nexus-bg text-white overflow-hidden font-sans nexus-grid">
      {/* Sidebar */}
      <aside className={cn(
        "nexus-glass transition-all duration-500 flex flex-col shrink-0 z-50 relative",
        isSidebarOpen ? "w-72" : "w-20"
      )}>
        <div className="p-8 flex items-center gap-4 border-b border-white/5">
          <div className="w-12 h-12 bg-nexus-accent rounded-2xl flex items-center justify-center shrink-0 nexus-glow">
            <Scale className="text-white w-7 h-7" />
          </div>
          {isSidebarOpen && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
              <h1 className="text-xl font-black tracking-tighter text-white uppercase italic leading-none">NEXUS <span className="text-nexus-accent">AI</span></h1>
              <p className="text-[10px] text-nexus-accent/60 uppercase tracking-[0.2em] font-mono mt-1">Legal Assistant</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-6 space-y-3 mt-6">
          {navItems.filter(item => !item.adminOnly || profile?.role === 'admin').map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id as Page)}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl transition-all group relative overflow-hidden",
                activePage === item.id 
                  ? "bg-nexus-accent/10 text-nexus-accent border border-nexus-accent/20" 
                  : "text-white/30 hover:bg-white/5 hover:text-white border border-transparent"
              )}
            >
              <item.icon size={24} className={cn(
                "shrink-0 transition-all duration-300",
                activePage === item.id ? "text-nexus-accent scale-110" : "group-hover:text-white"
              )} />
              {isSidebarOpen && (
                <span className="font-bold uppercase tracking-[0.15em] text-[11px] animate-in fade-in slide-in-from-left-4 duration-500">
                  {item.label}
                </span>
              )}
              {activePage === item.id && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-nexus-accent shadow-[0_0_10px_var(--color-nexus-accent)]" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
            <div className="w-10 h-10 bg-nexus-accent/20 rounded-xl flex items-center justify-center shrink-0 border border-nexus-accent/20">
              <UserIcon size={20} className="text-nexus-accent" />
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-white truncate uppercase tracking-wider">{user.displayName || user.email}</p>
                <p className="text-[9px] text-nexus-accent/50 uppercase tracking-widest font-mono font-bold">{profile?.role || 'user'}</p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleLogout}
              className={cn(
                "flex items-center justify-center p-4 rounded-2xl text-red-400/40 hover:bg-red-500/10 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20",
                !isSidebarOpen && "col-span-2"
              )}
              title="Logout"
            >
              <LogOut size={22} />
              {isSidebarOpen && <span className="ml-3 font-bold uppercase tracking-widest text-[10px]">Logout</span>}
            </button>
            {isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="flex items-center justify-center p-4 rounded-2xl text-white/20 hover:bg-white/5 hover:text-white transition-all border border-transparent hover:border-white/10"
                title="Collapse"
              >
                <X size={22} />
              </button>
            )}
          </div>
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="w-full flex items-center justify-center p-4 rounded-2xl text-white/20 hover:bg-white/5 hover:text-white transition-all border border-transparent hover:border-white/10"
            >
              <Menu size={22} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden flex flex-col bg-nexus-bg/50">
        <ErrorBoundary>
          {renderPage()}
        </ErrorBoundary>
      </main>
    </div>
  );
}
