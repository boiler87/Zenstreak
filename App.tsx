
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Trophy, 
  RotateCcw, 
  History as HistoryIcon, 
  Settings, 
  Plus, 
  Flame, 
  PenLine, 
  Check, 
  X, 
  Calendar as CalendarIcon, 
  ArrowRight, 
  Calculator, 
  AlertTriangle, 
  Edit2, 
  Trash2, 
  Save, 
  Target, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  RefreshCw, 
  ListFilter, 
  ArrowUp, 
  ArrowDown,
  LogIn,
  LogOut,
  User as UserIcon,
  AlertCircle
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
  isFirebaseInitialized
} from './services/firebase';
import { getMotivation } from './services/geminiService';
import type { User } from 'firebase/auth';

// --- Constants ---
const APP_VERSION = "1.6.4";
const MILLIS_PER_DAY = 1000 * 60 * 60 * 24;

const calculateDays = (start: number): number => {
  const now = Date.now();
  const diff = now - start;
  return Math.floor(diff / MILLIS_PER_DAY);
};

const parseLocalDate = (dateStr: string): number => {
  if (!dateStr) return Date.now();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
};

const toLocalDateString = (timestamp: number): string => {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- Components ---

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-full text-primary animate-pulse">
    <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const StreakCalendar = ({ activeDates, overlapDates }: { activeDates: Set<string>, overlapDates: Set<string> }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="h-10 w-full" />);
  }

  const todayStr = toLocalDateString(Date.now());

  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const isActive = activeDates.has(dateStr);
    const isOverlap = overlapDates.has(dateStr);
    const isToday = dateStr === todayStr;

    days.push(
      <div 
        key={dateStr} 
        className={`
          h-10 w-full flex items-center justify-center rounded-xl text-base font-bold transition-all relative select-none
          ${isOverlap 
             ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)] z-10 scale-110' 
             : isActive 
                 ? 'bg-primary text-white shadow-[0_0_10px_rgba(13,148,136,0.3)]' 
                 : 'text-slate-400 hover:bg-slate-100 hover:text-text'
          }
          ${isToday && !isActive && !isOverlap ? 'border-2 border-primary text-primary' : ''}
          ${isToday && (isActive || isOverlap) ? 'ring-2 ring-white' : ''}
        `}
      >
        {i}
      </div>
    );
  }

  return (
    <div className="bg-surface p-6 rounded-3xl border border-slate-200 w-full shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-text font-black text-xl capitalize flex items-center gap-3">
           <CalendarIcon size={24} className="text-primary"/>
           {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-xl text-secondary hover:text-primary transition-colors">
            <ChevronLeft size={24} />
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-xl text-secondary hover:text-primary transition-colors">
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-2 mb-3">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-xs font-black text-secondary uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days}
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, colorClass = "text-text", onClick, active = false }: any) => (
  <div 
    onClick={onClick}
    className={`bg-surface rounded-3xl p-6 flex flex-col items-center justify-center shadow-sm border transition-all cursor-pointer h-full relative overflow-hidden group w-full
      ${active ? 'border-primary ring-4 ring-primary/20' : 'border-slate-200 hover:border-slate-300 active:scale-[0.98] hover:shadow-lg hover:-translate-y-1'}
    `}
  >
    <div className={`mb-4 p-4 rounded-full bg-slate-50 ${colorClass} shadow-sm ring-1 ring-black/5`}>
      <Icon size={32} strokeWidth={2.5} />
    </div>
    <span className="text-secondary text-sm uppercase tracking-[0.2em] font-black opacity-80">{label}</span>
    <span className="text-5xl sm:text-6xl font-black mt-2 tracking-tighter text-text drop-shadow-sm">{value}</span>
  </div>
);

const ProgressBar = ({ current, max, children }: { current: number; max: number; children?: React.ReactNode }) => {
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));
  const radius = 155; 
  const stroke = 22; 
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const digitCount = current.toString().length;
  // Responsive font sizes: smaller on mobile (default), larger on sm screens
  const fontSizeClass = digitCount > 3 
    ? "text-5xl sm:text-6xl" 
    : digitCount > 2 
      ? "text-6xl sm:text-7xl" 
      : "text-7xl sm:text-8xl";

  return (
    <div className="relative flex items-center justify-center group my-4 select-none w-full max-w-[310px] aspect-square mx-auto">
      <div className="absolute inset-0 rounded-full animate-pulse-slow bg-primary/5 scale-95 blur-xl z-0"></div>
      <svg
        height={radius * 2}
        width={radius * 2}
        viewBox={`0 0 ${radius * 2} ${radius * 2}`}
        className="rotate-[-90deg] transition-all duration-500 ease-out relative z-10 w-full h-full"
      >
         <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0d9488" />
            <stop offset="50%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#2dd4bf" />
          </linearGradient>
          <filter id="glow">
             <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
             <feMerge>
                 <feMergeNode in="coloredBlur"/>
                 <feMergeNode in="SourceGraphic"/>
             </feMerge>
          </filter>
        </defs>
        <circle stroke="#e2e8f0" strokeWidth={stroke} fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
        <circle
          stroke="url(#progressGradient)"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          filter="url(#glow)"
          className="transition-all duration-1000 ease-in-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center z-20 w-full h-full pb-4">
        <span className={`${fontSizeClass} leading-none font-black text-text tracking-tighter drop-shadow-sm`}>{current}</span>
        <span className="text-base sm:text-lg text-secondary font-black uppercase tracking-[0.25em] -mt-2 mb-4">DAYS</span>
        <div className="mb-4 z-30 relative">{children}</div>
        <div className="flex items-center gap-1.5 bg-white/80 border border-slate-200 px-3 py-1 rounded-full shadow-sm backdrop-blur-md">
            <Target size={12} className="text-primary" />
            <span className="text-xs font-mono font-bold text-primary">{percentage.toFixed(0)}%</span>
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

  const [motivation, setMotivation] = useState<string>("");
  const [loadingMotivation, setLoadingMotivation] = useState(false);

  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalMode, setGoalMode] = useState<'days' | 'date'>('days');
  const [tempGoal, setTempGoal] = useState("30");
  const [tempGoalDate, setTempGoalDate] = useState("");

  const [isEditingStart, setIsEditingStart] = useState(false);
  const [tempStartDate, setTempStartDate] = useState("");
  
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [manualStartDate, setManualStartDate] = useState("");
  const [manualEndDate, setManualEndDate] = useState("");

  // Auth Listener
  useEffect(() => {
    const unsubscribe = subscribeToAuth((currentUser) => {
      setUser(currentUser);
      // Clear error on successful auth state change
      if (currentUser) setAuthError(null);
    });
    return () => unsubscribe();
  }, []);

  // Data Loading
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const fetched = await getUserData(user);
      setData(fetched);
      setTempGoal(fetched.goal.toString());
      setLoading(false);
    };
    loadData();
  }, [user]);

  useEffect(() => {
    if (data && !motivation && (data.showMotivation ?? true)) {
        handleFetchMotivation();
    }
  }, [data]);

  const currentDays = useMemo(() => {
    return data && data.currentStreakStart ? calculateDays(data.currentStreakStart) : 0;
  }, [data]);

  const goalReachDate = useMemo(() => {
    if (!data || !data.currentStreakStart) return null;
    const targetDate = new Date(data.currentStreakStart + (data.goal * MILLIS_PER_DAY));
    return targetDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }, [data]);

  const handleFetchMotivation = async () => {
    if (!data) return;
    setLoadingMotivation(true);
    const msg = await getMotivation(currentDays, data.goal);
    setMotivation(msg);
    setLoadingMotivation(false);
  };

  const toggleMotivation = async () => {
    if (!data) return;
    const newData = { ...data, showMotivation: !(data.showMotivation ?? true) };
    setData(newData);
    await saveUserData(user, newData);
  };

  const { activeStreakDays, overlapDates } = useMemo(() => {
    if (!data) return { activeStreakDays: new Set<string>(), overlapDates: new Set<string>() };
    const active = new Set<string>();
    const startDates = new Set<string>();
    const endDates = new Set<string>();
    
    const markDays = (start: number, end: number) => {
        const current = new Date(start);
        const stop = new Date(end);
        current.setHours(0,0,0,0);
        stop.setHours(0,0,0,0);
        let safety = 0;
        while(current <= stop && safety < 10000) {
           active.add(toLocalDateString(current.getTime()));
           current.setDate(current.getDate() + 1);
           safety++;
        }
    }

    data.history.forEach(h => {
        markDays(h.startDate, h.endDate);
        startDates.add(toLocalDateString(h.startDate));
        endDates.add(toLocalDateString(h.endDate));
    });

    if (data.currentStreakStart) {
        markDays(data.currentStreakStart, Date.now());
    }
    
    const overlaps = new Set<string>();
    for (const d of startDates) {
        if (endDates.has(d)) overlaps.add(d);
    }
    return { activeStreakDays: active, overlapDates: overlaps };
  }, [data]);

  const confirmReset = async () => {
    if (!data) return;
    const currentDaysVal = calculateDays(data.currentStreakStart || Date.now());
    const now = Date.now();
    const newHistoryItem: StreakHistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      startDate: data.currentStreakStart || now,
      endDate: now,
      days: currentDaysVal
    };
    const newData: UserData = {
      ...data,
      currentStreakStart: now,
      history: [newHistoryItem, ...data.history]
    };
    setData(newData);
    await saveUserData(user, newData);
    setShowResetConfirm(false);
    if (newData.showMotivation ?? true) handleFetchMotivation();
  };

  const handleManualAdd = async () => {
    if (!manualStartDate || !manualEndDate || !data) return;
    const start = parseLocalDate(manualStartDate);
    const end = parseLocalDate(manualEndDate);
    if (isNaN(start) || isNaN(end) || end <= start) return;
    const days = Math.floor((end - start) / MILLIS_PER_DAY);
    const newItem: StreakHistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      startDate: start,
      endDate: end,
      days: days > 0 ? days : 0
    };
    const newData = { ...data, history: [newItem, ...data.history].sort((a, b) => b.endDate - a.endDate) };
    setData(newData);
    await saveUserData(user, newData);
    setManualStartDate("");
    setManualEndDate("");
  };

  const saveGoal = async () => {
    if (!data) return;
    let newGoal = 0;
    if (goalMode === 'days') {
      newGoal = parseInt(tempGoal);
    } else {
      const target = parseLocalDate(tempGoalDate);
      const start = data.currentStreakStart || Date.now();
      if (isNaN(target) || target <= start) return;
      newGoal = Math.floor((target - start) / MILLIS_PER_DAY);
    }
    if (isNaN(newGoal) || newGoal < 1) return;
    const newData = { ...data, goal: newGoal };
    setData(newData);
    await saveUserData(user, newData);
    setIsEditingGoal(false);
  };

  const saveStartDate = async () => {
    if (!data || !tempStartDate) return;
    const newStart = parseLocalDate(tempStartDate);
    if (isNaN(newStart) || newStart > Date.now()) return;
    const newData = { ...data, currentStreakStart: newStart };
    setData(newData);
    await saveUserData(user, newData);
    setIsEditingStart(false);
  };

  const longestStreak = useMemo(() => {
    if (!data) return 0;
    return Math.max(data.history.reduce((max, item) => Math.max(max, item.days), 0), currentDays);
  }, [data, currentDays]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return [...data.history].sort((a, b) => a.endDate - b.endDate).slice(-15).map((item, index) => ({
        ...item,
        index: index + 1,
        dateLabel: new Date(item.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }));
  }, [data]);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      console.error(e);
      let msg = "Login failed. Please try again.";
      if (e.code === 'auth/unauthorized-domain') {
        msg = "Domain not authorized. Check Firebase Console.";
      } else if (e.code === 'auth/popup-blocked') {
        msg = "Popup blocked. Please allow popups for this site.";
      } else if (e.message) {
        msg = e.message;
      }
      setAuthError(msg);
    }
  };

  if (loading) return <div className="h-screen w-full bg-background flex items-center justify-center"><LoadingSpinner /></div>;

  return (
    <div className="min-h-screen bg-background text-text font-sans pb-32">
      <header className="p-6 flex justify-between items-center max-w-md mx-auto w-full">
        <h1 className="text-xl font-black tracking-tight text-text flex items-center gap-2">
          <Flame className="text-primary" size={28} fill="currentColor" /> Streaker
        </h1>
        {user ? (
          <button onClick={logout} className="p-2 bg-slate-100 rounded-full text-secondary hover:text-primary transition-colors">
            <LogOut size={20} />
          </button>
        ) : (
          <button onClick={handleSignIn} className="flex items-center gap-2 text-xs font-black bg-primary text-white px-4 py-2 rounded-full shadow-md shadow-primary/20">
            <LogIn size={16} /> Sign In
          </button>
        )}
      </header>
      
      {authError && (
        <div className="max-w-md mx-auto px-6 animate-fade-in">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3">
             <AlertCircle className="shrink-0 mt-0.5" size={18} />
             <div className="flex-1">
               <p className="text-sm font-bold">Authentication Error</p>
               <p className="text-xs mt-1">{authError}</p>
             </div>
             <button onClick={() => setAuthError(null)} className="text-red-400 hover:text-red-700"><X size={16}/></button>
          </div>
        </div>
      )}

      <main className="max-w-md mx-auto w-full px-6 flex flex-col gap-6">
        {view === 'dashboard' && data && (
          <div className="animate-fade-in flex flex-col gap-6">
            <div className="flex flex-col items-center justify-center pt-4">
              
              <ProgressBar current={currentDays} max={data.goal}>
                  {!isEditingStart ? (
                    <button 
                      onClick={() => { setIsEditingStart(true); setTempStartDate(toLocalDateString(data.currentStreakStart || Date.now())); }}
                      className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-primary transition-colors px-3 py-1 rounded-full hover:bg-slate-50"
                    >
                      <span>Started {new Date(data.currentStreakStart || Date.now()).toLocaleDateString()}</span>
                      <PenLine size={10} />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 bg-white p-1.5 rounded-xl border border-primary/30 shadow-lg">
                      <input type="date" value={tempStartDate} onChange={(e) => setTempStartDate(e.target.value)} className="bg-slate-50 border border-slate-300 rounded-md p-1 text-[10px] focus:border-primary" />
                      <button onClick={saveStartDate} className="p-1.5 bg-primary text-white rounded-md"><Check size={12}/></button>
                      <button onClick={() => setIsEditingStart(false)} className="p-1.5 bg-slate-100 text-text rounded-md"><X size={12}/></button>
                    </div>
                  )}
              </ProgressBar>

              <div className="w-full flex justify-center mb-6">
                <button 
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full max-w-[280px] py-4 rounded-2xl bg-white border border-red-200 text-danger font-black uppercase tracking-[0.2em] hover:bg-red-50 transition-all flex items-center justify-center gap-3 text-xs"
                >
                  <RotateCcw size={18} /> Relapse / Reset
                </button>
              </div>
              
              <div className="w-full max-w-xs mx-auto min-h-[140px] flex flex-col items-center justify-start">
                {isEditingGoal ? (
                     <div className="w-full bg-white p-5 rounded-3xl shadow-xl border border-primary/20">
                         <div className="flex w-full mb-3 bg-slate-100 rounded-xl p-1">
                            <button onClick={() => setGoalMode('days')} className={`flex-1 text-[10px] font-black py-2.5 rounded-lg ${goalMode === 'days' ? 'bg-primary text-white' : 'text-secondary'}`}>DAYS</button>
                            <button onClick={() => setGoalMode('date')} className={`flex-1 text-[10px] font-black py-2.5 rounded-lg ${goalMode === 'date' ? 'bg-primary text-white' : 'text-secondary'}`}>DATE</button>
                         </div>
                         <div className="flex items-center gap-2 mb-4 justify-center">
                           {goalMode === 'days' ? (
                              <input type="number" value={tempGoal} onChange={(e) => setTempGoal(e.target.value)} className="w-full bg-transparent border-b-2 border-slate-300 p-1 text-center text-4xl font-black text-text focus:border-primary outline-none" autoFocus />
                           ) : (
                              <input type="date" value={tempGoalDate} onChange={(e) => setTempGoalDate(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-center text-sm font-bold text-text focus:border-primary outline-none" autoFocus />
                           )}
                         </div>
                         <div className="flex w-full gap-2">
                             <button onClick={saveGoal} className="flex-1 p-3 bg-primary text-white rounded-xl"><Check size={20} /></button>
                             <button onClick={() => setIsEditingGoal(false)} className="flex-1 p-3 bg-slate-100 text-text rounded-xl"><X size={20} /></button>
                         </div>
                     </div>
                ) : (
                    <>
                         <div className="flex flex-col items-center leading-none mb-6">
                             <span className="text-7xl sm:text-7xl font-black text-text tracking-tighter">{Math.max(0, data.goal - currentDays)}</span>
                             <span className="text-sm font-bold text-secondary uppercase tracking-widest mt-2">Days Remaining</span>
                         </div>
                         <div className="bg-white border border-slate-200 rounded-full p-1.5 pl-5 pr-1.5 flex items-center gap-4 shadow-sm">
                            <span className="text-sm font-bold text-text">Target: {goalReachDate}</span>
                            <button onClick={() => { setIsEditingGoal(true); setGoalMode('days'); }} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-primary"><Edit2 size={14} /></button>
                         </div>
                    </>
                )}
              </div>
            </div>
            
            <StatCard label="Best Streak" value={`${longestStreak}`} icon={Flame} colorClass="text-orange-600" />

            {(data.showMotivation ?? true) && (
              <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 to-slate-50 border border-slate-200 rounded-3xl p-6 shadow-sm mb-8">
                 <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2"><Sparkles size={16} /> Daily Wisdom</span>
                    <button onClick={handleFetchMotivation} disabled={loadingMotivation} className="text-slate-400 hover:text-primary transition-colors p-1"><RefreshCw size={18} className={loadingMotivation ? "animate-spin" : ""} /></button>
                 </div>
                 <p className="text-lg text-slate-700 font-medium leading-relaxed italic min-h-[60px] flex items-center">
                    {loadingMotivation ? "Consulting the oracle..." : `"${motivation}"`}
                 </p>
              </div>
            )}
          </div>
        )}

        {view === 'history' && data && (
          <div className="animate-fade-in flex flex-col gap-6">
            <h2 className="text-3xl font-black text-text tracking-tight">History</h2>
            <div className="bg-surface p-6 rounded-3xl border border-slate-200 h-72 w-full relative shadow-sm">
              <h3 className="text-sm text-secondary font-black mb-6 uppercase tracking-wider flex items-center gap-2"><Target size={18} className="text-primary"/> Streak Evolution</h3>
              <ResponsiveContainer width="100%" height="80%">
                <BarChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} opacity={0.6} />
                  <XAxis dataKey="index" hide />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return <div className="bg-white border p-3 rounded-xl shadow-lg text-xs font-bold"><p className="text-primary text-2xl">{d.days} Days</p></div>;
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="days" radius={[6, 6, 0, 0]}>
                     {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.days >= data.goal ? '#facc15' : '#0d9488'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <StreakCalendar activeDates={activeStreakDays} overlapDates={overlapDates} />

            <div className="bg-surface p-6 rounded-3xl border border-slate-200">
              <h3 className="text-base font-black mb-6 flex items-center gap-3 uppercase tracking-wide"><Plus size={20} className="text-primary"/> Log Past Streak</h3>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <input type="date" value={manualStartDate} onChange={(e) => setManualStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-bold" />
                  <input type="date" value={manualEndDate} onChange={(e) => setManualEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-bold" />
                </div>
                <button onClick={handleManualAdd} className="mt-2 w-full bg-primary text-white font-black py-4 rounded-xl flex items-center justify-center gap-2"><Calculator size={20} /> Add Record</button>
              </div>
            </div>

            <div className="flex flex-col gap-4 pb-20">
              {data.history.map((streak) => (
                <div key={streak.id} className="bg-surface p-5 rounded-2xl border border-slate-200 flex justify-between items-center group">
                  <div className="flex flex-col">
                    <span className="text-4xl font-black text-text tracking-tighter">{streak.days} <span className="text-sm font-black text-secondary ml-1">Days</span></span>
                    <span className="text-xs font-bold text-slate-400 mt-2">{new Date(streak.startDate).toLocaleDateString()} → {new Date(streak.endDate).toLocaleDateString()}</span>
                  </div>
                  <button onClick={() => {
                    const newData = { ...data, history: data.history.filter(item => item.id !== streak.id) };
                    setData(newData);
                    saveUserData(user, newData);
                  }} className="p-3 text-slate-300 hover:text-danger"><Trash2 size={20} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'settings' && data && (
          <div className="animate-fade-in flex flex-col gap-6">
            <h2 className="text-3xl font-black text-text tracking-tight">Settings</h2>
            
            <div className="bg-surface p-6 rounded-3xl border border-slate-200">
               <h3 className="text-lg font-black mb-5">Account</h3>
               <div className="p-4 bg-slate-50 rounded-xl mb-4">
                 {user ? (
                   <div className="flex items-center gap-4">
                     <div className="p-2 bg-primary/10 rounded-full text-primary">
                       <UserIcon size={24} />
                     </div>
                     <div>
                       <p className="text-sm font-bold text-text">{user.email}</p>
                       <p className="text-[10px] text-secondary font-bold uppercase tracking-widest">Cloud Sync Active</p>
                     </div>
                   </div>
                 ) : (
                   <div className="flex flex-col gap-3">
                     <p className="text-sm text-secondary font-medium">Data is currently stored on this device only.</p>
                     <button onClick={handleSignIn} className="w-full bg-primary text-white font-black py-3 rounded-xl flex items-center justify-center gap-2">
                       <LogIn size={18} /> Sync with Google
                     </button>
                   </div>
                 )}
               </div>
            </div>

            <div className="bg-surface p-6 rounded-3xl border border-slate-200">
               <h3 className="text-lg font-black mb-5">Preferences</h3>
               <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <span className="text-sm font-bold">Daily Stoic Wisdom</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={data.showMotivation ?? true} onChange={toggleMotivation} />
                    <div className="w-14 h-7 bg-slate-300 rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:after:translate-x-full"></div>
                  </label>
               </div>
            </div>
            <div className="text-center text-xs text-slate-300 font-bold mt-4">Streaker v{APP_VERSION}</div>
          </div>
        )}
      </main>

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-2xl font-black mb-6">Reset Streak?</h3>
            <p className="text-slate-600 mb-8 leading-relaxed">This will end your current streak of <span className="text-primary font-black">{currentDays} days</span> and save it to history.</p>
            <div className="flex gap-4">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-4 rounded-2xl bg-slate-100 font-bold">Cancel</button>
              <button onClick={confirmReset} className="flex-1 py-4 rounded-2xl bg-danger text-white font-black uppercase tracking-wider">Reset</button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 w-full bg-white/90 backdrop-blur-lg border-t border-slate-200 pb-safe z-50">
        <div className="max-w-md mx-auto flex justify-around p-2">
          <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={Flame} label="Streak" />
          <NavButton active={view === 'history'} onClick={() => setView('history')} icon={HistoryIcon} label="History" />
          <NavButton active={view === 'settings'} onClick={() => setView('settings')} icon={Settings} label="Settings" />
        </div>
      </nav>
    </div>
  );
}

const NavButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-full p-2 rounded-2xl transition-all ${active ? 'text-primary bg-primary/10' : 'text-secondary'}`}>
    <Icon size={28} strokeWidth={active ? 3 : 2} />
    <span className="text-[10px] font-black mt-1 uppercase">{label}</span>
  </button>
);
