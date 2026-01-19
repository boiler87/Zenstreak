import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  RotateCcw, 
  History as HistoryIcon, 
  Settings, 
  Zap, 
  Flame, 
  Calendar as CalendarIcon, 
  Edit2, 
  Trash2, 
  Target, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  RefreshCw, 
  LogIn,
  LogOut, 
  User as UserIcon,
  AlertCircle,
  Loader2,
  Shield,
  Clock,
  CheckCircle2,
  X,
  WifiOff
} from 'lucide-react';
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

import { UserData, StreakHistoryItem } from './types';
import { 
  getUserData, 
  saveUserData,
  subscribeToAuth,
  signInWithGoogle,
  logout,
} from './services/firebase';
import { getMotivation } from './services/geminiService';
import type { User } from 'firebase/auth';

// --- Constants ---
const APP_VERSION = "1.6.2";
const MILLIS_PER_DAY = 1000 * 60 * 60 * 24;

const calculateDays = (start: number): number => {
  const now = Date.now();
  const diff = now - start;
  return Math.floor(diff / MILLIS_PER_DAY);
};

const calculateExactDuration = (start: number) => {
  const diff = Date.now() - start;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { days, hours, minutes };
};

// Helper for HTML input datetime-local (requires YYYY-MM-DDTHH:mm format in local time)
const toLocalISOString = (timestamp: number): string => {
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset() * 60000; // offset in milliseconds
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-full text-primary animate-pulse">
    <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const StreakProgress = ({ start, goal }: { start: number; goal: number }) => {
  const { days, hours, minutes } = calculateExactDuration(start);
  const percentage = Math.min(100, Math.max(0, (days / goal) * 100));
  const radius = 90; 
  const stroke = 10; 
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center select-none my-6">
      <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg] transition-all duration-1000">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#2dd4bf" />
          </linearGradient>
        </defs>
        <circle stroke="#f1f5f9" strokeWidth={stroke} fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
        <circle 
          stroke="url(#gradient)" 
          strokeWidth={stroke} 
          strokeDasharray={circumference + ' ' + circumference} 
          style={{ strokeDashoffset }} 
          strokeLinecap="round" 
          fill="transparent" 
          r={normalizedRadius} 
          cx={radius} 
          cy={radius} 
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-6xl font-black text-text tracking-tighter">{days}</span>
        <span className="text-xs font-black text-secondary uppercase tracking-[0.3em] mt-1">Days</span>
        <div className="mt-2 flex gap-2 text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
            <span>{hours}h</span>
            <span className="text-slate-300">|</span>
            <span>{minutes}m</span>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UserData | null>(null);
  const [view, setView] = useState<'dashboard' | 'history' | 'settings'>('dashboard');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const [motivation, setMotivation] = useState<string>("");
  const [loadingMotivation, setLoadingMotivation] = useState(false);
  const [tempGoal, setTempGoal] = useState("30");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [tick, setTick] = useState(0); // Force re-render for timer

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        setIsRedirecting(false);
        setAuthError(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user && !loading) setLoading(false);
  }, [user, loading]);

  useEffect(() => {
    const loadData = async () => {
      const fetched = await getUserData(user);
      setData(fetched);
      setTempGoal(fetched.goal.toString());
    };
    if (user || !loading) loadData();
  }, [user, loading]);

  useEffect(() => {
    if (data && !motivation && (data.showMotivation ?? true)) {
        handleFetchMotivation();
    }
  }, [data]);

  const currentDays = useMemo(() => {
    return data && data.currentStreakStart ? calculateDays(data.currentStreakStart) : 0;
  }, [data, tick]);

  const handleFetchMotivation = async () => {
    if (!data) return;
    setLoadingMotivation(true);
    const msg = await getMotivation(currentDays, data.goal);
    setMotivation(msg);
    setLoadingMotivation(false);
  };

  const handleSignIn = async () => {
    setAuthError(null);
    setIsRedirecting(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      console.error("Login Error:", e);
      setIsRedirecting(false);
      
      let msg = e.message || "Failed to start Google Login.";
      const errorCode = e.code || "";

      // Handle specific Firebase Auth errors
      if (errorCode === 'auth/unauthorized-domain' || msg.includes("auth/unauthorized-domain")) {
         msg = `DOMAIN ERROR: The domain '${window.location.hostname}' is not authorized in Firebase.
         
ACTION REQUIRED:
1. Go to Firebase Console > Authentication > Settings > Authorized Domains.
2. Add: ${window.location.hostname}`;
      } else if (msg.includes("requests-to-this-api-identitytoolkit") || msg.includes("are-blocked")) {
        msg = "API CONFIG ERROR: Identity Toolkit API is disabled. Enable it in Google Cloud Console.";
      } else if (msg.includes("popup-closed-by-user") || errorCode === 'auth/popup-closed-by-user') {
        msg = "Sign-in cancelled by user.";
      } else if (msg.includes("invalid-continue-uri")) {
        msg = "CONFIG ERROR: Add 'gen-lang-client-0839635573.firebaseapp.com' to API Key restrictions.";
      } else if (errorCode === 'auth/popup-blocked') {
        msg = "Popup blocked. Please allow popups for this site.";
      } else if (errorCode === 'auth/operation-not-allowed') {
         msg = "Login provider not enabled. Enable Google Sign-In in Firebase Console.";
      }
      
      setAuthError(msg);
    }
  };

  const handleReset = async () => {
    if (!data) return;
    const now = Date.now();
    const currentDaysVal = calculateDays(data.currentStreakStart || now);
    
    const newHistoryItem: StreakHistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      startDate: data.currentStreakStart || now,
      endDate: now,
      days: currentDaysVal
    };

    const newData: UserData = {
      ...data,
      currentStreakStart: now,
      totalEvents: (data.totalEvents || 0) + 1, 
      history: [newHistoryItem, ...data.history]
    };

    setData(newData);
    await saveUserData(user, newData);
    setShowResetConfirm(false);
    
    // Refresh motivation for Day 0
    if (newData.showMotivation ?? true) {
        setLoadingMotivation(true);
        const msg = await getMotivation(0, data.goal);
        setMotivation(msg);
        setLoadingMotivation(false);
    }
  };

  const handleStartDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!data) return;
    const newDate = new Date(e.target.value).getTime();
    if (isNaN(newDate)) return;

    // Check if future date (optional prevention)
    if (newDate > Date.now()) {
        alert("Cannot start a streak in the future.");
        return;
    }

    const newData = { ...data, currentStreakStart: newDate };
    setData(newData);
    await saveUserData(user, newData);
  };

  const longestStreak = useMemo(() => {
    if (!data) return 0;
    return Math.max(data.history.reduce((max, h) => Math.max(max, h.days), 0), currentDays);
  }, [data, currentDays]);

  if (loading) return <div className="h-screen w-full bg-background flex items-center justify-center"><LoadingSpinner /></div>;

  return (
    <div className="min-h-screen bg-background text-text font-sans pb-32">
      <header className="p-6 flex justify-between items-center max-w-md mx-auto w-full">
        <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tight text-text flex items-center gap-2">
            <Shield className="text-primary" size={24} /> Streaker
            </h1>
            <span className="text-[9px] font-bold text-slate-300 tracking-widest uppercase ml-8">v{APP_VERSION}</span>
        </div>
        {user ? (
          <button onClick={logout} className="p-2 bg-slate-100 rounded-full text-secondary hover:text-primary transition-colors">
            <LogOut size={18} />
          </button>
        ) : (
          <button 
            onClick={handleSignIn} 
            disabled={isRedirecting}
            className="flex items-center gap-2 text-[10px] font-black bg-primary text-white px-4 py-2 rounded-full shadow-md shadow-primary/20 disabled:opacity-70 transition-all hover:bg-primary/90"
          >
            {isRedirecting ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
            {isRedirecting ? "Connecting..." : "Sync"}
          </button>
        )}
      </header>

      {authError && (
        <div className="max-w-md mx-auto px-6 mb-4 animate-fade-in">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3 text-xs shadow-sm">
             <AlertCircle size={14} className="mt-0.5 shrink-0" />
             <div className="flex-1">
                <p className="font-bold">Login Issue</p>
                <p className="mt-1 opacity-80 break-words leading-relaxed select-all whitespace-pre-wrap">{authError}</p>
             </div>
             <button onClick={() => setAuthError(null)} className="shrink-0 p-1 hover:bg-red-100 rounded-lg"><X size={14}/></button>
          </div>
        </div>
      )}

      <main className="max-w-md mx-auto w-full px-6 flex flex-col gap-6">
        {view === 'dashboard' && data && (
          <div className="animate-fade-in flex flex-col gap-6">
            
            {/* Timer Hero */}
            <div className="bg-surface rounded-[40px] p-6 flex flex-col items-center justify-center shadow-xl shadow-slate-200/50 border border-slate-100 relative">
               
               <StreakProgress start={data.currentStreakStart || Date.now()} goal={data.goal} />

               <div className="grid grid-cols-3 gap-2 mt-4 w-full">
                  {/* Goal Card */}
                  <button 
                    onClick={() => setView('settings')} 
                    className="bg-slate-50 rounded-2xl p-3 flex flex-col items-center justify-center border border-slate-100 active:scale-95 transition-transform"
                  >
                     <Target size={18} className="text-primary mb-1" />
                     <span className="text-lg font-black text-text">{data.goal}</span>
                     <span className="text-[8px] font-black text-secondary uppercase tracking-widest">Goal</span>
                  </button>

                  {/* Best Streak Card */}
                  <div className="bg-slate-50 rounded-2xl p-3 flex flex-col items-center justify-center border border-slate-100">
                     <Flame size={18} className="text-orange-500 mb-1" />
                     <span className="text-lg font-black text-text">{longestStreak}</span>
                     <span className="text-[8px] font-black text-secondary uppercase tracking-widest">Best</span>
                  </div>

                  {/* Reset Button */}
                  <button 
                    onClick={() => setShowResetConfirm(true)}
                    className="bg-slate-50 hover:bg-red-50 rounded-2xl p-3 flex flex-col items-center justify-center border border-slate-100 hover:border-red-100 transition-colors group active:scale-95"
                  >
                     <RotateCcw size={18} className="text-slate-400 group-hover:text-danger mb-1 transition-colors" />
                     <span className="text-lg font-black text-slate-300 group-hover:text-danger transition-colors">Reset</span>
                     <span className="text-[8px] font-black text-slate-300 group-hover:text-danger/60 uppercase tracking-widest transition-colors">Relapse</span>
                  </button>
               </div>
            </div>
            
            {/* Editable Start Date Info */}
            <div className="flex items-center justify-center gap-2 opacity-60 hover:opacity-100 transition-opacity p-2 bg-slate-50 rounded-xl border border-transparent hover:border-slate-200">
               <Clock size={12} className="text-secondary" />
               <span className="text-[10px] font-bold text-secondary uppercase tracking-widest mr-1">Started:</span>
               <input 
                  type="datetime-local" 
                  className="bg-transparent text-[10px] font-bold text-text uppercase tracking-widest text-center focus:outline-none focus:text-primary cursor-pointer"
                  value={toLocalISOString(data.currentStreakStart || Date.now())}
                  onChange={handleStartDateChange}
               />
               <Edit2 size={10} className="text-secondary ml-1" />
            </div>

            {/* Motivation Card */}
            {(data.showMotivation ?? true) && (
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100 rounded-3xl p-6 shadow-sm relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Sparkles size={80} className="text-primary" />
                 </div>
                 <div className="flex justify-between items-start mb-3 relative z-10">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2"><Zap size={14} fill="currentColor" /> Insight</span>
                    <button onClick={handleFetchMotivation} disabled={loadingMotivation} className="text-teal-400 hover:text-primary"><RefreshCw size={14} className={loadingMotivation ? "animate-spin" : ""} /></button>
                 </div>
                 <p className="text-sm text-teal-900 font-bold leading-relaxed italic relative z-10 min-h-[40px]">
                   {loadingMotivation ? "Consulting the oracle..." : `"${motivation}"`}
                 </p>
              </div>
            )}
            
          </div>
        )}

        {view === 'history' && data && (
          <div className="animate-fade-in flex flex-col gap-6">
            <h2 className="text-2xl font-black text-text">History</h2>
            <div className="flex flex-col gap-3 pb-12">
              {data.history.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">No history yet. Keep going!</div>
              ) : (
                data.history.map((streak) => (
                  <div key={streak.id} className="bg-surface p-4 rounded-2xl border border-slate-200 flex justify-between items-center group hover:shadow-md transition-all">
                    <div className="flex flex-col">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-text">{streak.days}</span>
                        <span className="text-[10px] font-black text-secondary uppercase">Days</span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                        {new Date(streak.startDate).toLocaleDateString()} - {new Date(streak.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <button onClick={() => {
                      const newData = { 
                        ...data, 
                        history: data.history.filter(item => item.id !== streak.id) 
                      };
                      setData(newData);
                      saveUserData(user, newData);
                    }} className="p-2 text-slate-200 hover:text-danger transition-colors"><Trash2 size={16} /></button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {view === 'settings' && data && (
          <div className="animate-fade-in flex flex-col gap-6">
            <h2 className="text-2xl font-black text-text">Settings</h2>
            
            <div className="bg-surface p-6 rounded-3xl border border-slate-200">
               <h3 className="text-[10px] font-black mb-4 text-secondary uppercase tracking-widest">Profile</h3>
               {user ? (
                 <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                    <div className="p-2 bg-primary/10 rounded-full text-primary"><UserIcon size={16} /></div>
                    <div className="flex flex-col overflow-hidden">
                       <span className="text-[10px] font-bold text-secondary uppercase">Signed In As</span>
                       <span className="text-xs font-bold truncate text-text">{user.email}</span>
                    </div>
                 </div>
               ) : (
                 <button onClick={handleSignIn} className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform">Connect Google Account</button>
               )}
               {!user && (
                 <div className="mt-4 flex items-start gap-2 text-[10px] text-slate-400 p-2 bg-slate-50 rounded-xl">
                   <WifiOff size={14} className="shrink-0 mt-0.5" />
                   <p>Offline Mode: Your data is saved locally on this device. Sign in to sync across devices.</p>
                 </div>
               )}
            </div>
            
            <div className="bg-surface p-6 rounded-3xl border border-slate-200">
               <h3 className="text-[10px] font-black mb-4 text-secondary uppercase tracking-widest">Target Streak</h3>
               <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <input 
                    type="number" 
                    value={tempGoal} 
                    onChange={(e) => setTempGoal(e.target.value)} 
                    className="bg-transparent text-2xl font-black w-20 focus:outline-none text-primary" 
                  />
                  <div className="flex-1 flex flex-col">
                     <span className="text-xs font-bold text-text">Days</span>
                     <span className="text-[10px] text-slate-400">Your goal</span>
                  </div>
                  <button onClick={() => {
                     const newData = { ...data, goal: parseInt(tempGoal) || 30 };
                     setData(newData);
                     saveUserData(user, newData);
                  }} className="bg-white p-2 rounded-xl shadow-sm text-primary hover:scale-105 transition-transform"><CheckCircle2 size={20} /></button>
               </div>
            </div>
            
            <div className="text-center opacity-30 mt-8">
               <p className="text-[10px] font-black uppercase tracking-widest">Streaker v{APP_VERSION}</p>
            </div>
          </div>
        )}
      </main>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl border-t-4 border-danger">
            <div className="flex justify-center mb-4 text-danger">
               <AlertCircle size={48} />
            </div>
            <h3 className="text-2xl font-black mb-2 text-center text-text">Reset Timer?</h3>
            <p className="text-slate-500 mb-8 text-sm leading-relaxed text-center">
               This will end your current streak of <span className="font-black text-text">{currentDays} days</span> and save it to history. Are you sure?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-4 rounded-2xl bg-slate-100 font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={handleReset} className="flex-1 py-4 rounded-2xl bg-danger text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-danger/30 hover:bg-red-600 transition-colors">Yes, Reset</button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-100 pb-safe z-50">
        <div className="max-w-md mx-auto flex justify-around p-3">
          <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={Shield} label="Streak" />
          <NavButton active={view === 'history'} onClick={() => setView('history')} icon={HistoryIcon} label="History" />
          <NavButton active={view === 'settings'} onClick={() => setView('settings')} icon={Settings} label="Settings" />
        </div>
      </nav>
    </div>
  );
}

const NavButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-full p-2 rounded-2xl transition-all ${active ? 'text-primary bg-primary/5' : 'text-slate-400'}`}>
    <Icon size={20} strokeWidth={active ? 3 : 2} />
    <span className="text-[8px] font-black mt-1 uppercase tracking-tighter">{label}</span>
  </button>
);