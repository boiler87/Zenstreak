import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Trophy, 
  RotateCcw, 
  History as HistoryIcon, 
  Settings, 
  Plus, 
  Flame, 
  User as UserIcon,
  LogOut,
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
  ArrowUpDown,
  ListFilter,
  ArrowUp,
  ArrowDown
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
  signInWithGoogle, 
  logout, 
  subscribeToAuth, 
  getUserData, 
  saveUserData, 
  isFirebaseInitialized
} from './services/firebase';
import { getMotivation } from './services/geminiService';
import { User } from 'firebase/auth';

// --- Constants ---
const MILLIS_PER_DAY = 1000 * 60 * 60 * 24;

const calculateDays = (start: number): number => {
  const now = Date.now();
  const diff = now - start;
  return Math.floor(diff / MILLIS_PER_DAY);
};

// Helper: parse "YYYY-MM-DD" as local midnight timestamp
const parseLocalDate = (dateStr: string): number => {
  if (!dateStr) return Date.now();
  const [y, m, d] = dateStr.split('-').map(Number);
  // Create date using local components (months are 0-indexed)
  return new Date(y, m - 1, d).getTime();
};

// Helper: format timestamp to "YYYY-MM-DD" in local time
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
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const days = [];
  // Empty slots for start of month
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
    <div className="bg-surface p-6 rounded-3xl border border-slate-200 w-full animate-fade-in shadow-sm">
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
      <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-secondary border-t border-slate-200 pt-4 font-bold uppercase tracking-wider">
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded-sm shadow-[0_0_5px_rgba(13,148,136,0.5)]"></div>
            <span>Streak</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-sm shadow-[0_0_5px_rgba(249,115,22,0.5)]"></div>
            <span>Reset</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-primary rounded-sm"></div>
            <span>Today</span>
         </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, colorClass = "text-text", onClick, active = false }: any) => (
  <div 
    onClick={onClick}
    className={`bg-surface rounded-3xl p-4 sm:p-6 flex flex-col items-center justify-center shadow-sm border transition-all cursor-pointer select-none h-full relative overflow-hidden group
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
  const radius = 175; // Increased size (350px diameter) to accommodate content comfortably
  const stroke = 22; 
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center group my-8 select-none">
      <svg
        height={radius * 2}
        width={radius * 2}
        className="rotate-[-90deg] transition-all duration-500 ease-out relative z-10"
        style={{ maxWidth: '100%', height: 'auto' }}
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
        <circle
          stroke="#e2e8f0"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
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
      <div className="absolute flex flex-col items-center z-20 w-full">
        <span className="text-[8.5rem] leading-none font-black text-text tracking-tighter drop-shadow-sm">{current}</span>
        <span className="text-lg text-secondary font-black uppercase tracking-[0.25em] -mt-2 mb-3">DAYS</span>
        
        {/* Percentage Badge */}
        <div className="flex items-center gap-1.5 bg-white/80 border border-slate-200 px-3 py-1 rounded-full shadow-sm backdrop-blur-md mb-3">
            <Target size={12} className="text-primary" />
            <span className="text-xs font-mono font-bold text-primary">{percentage.toFixed(0)}%</span>
        </div>

        {/* Injected Content (Start Date) */}
        {children}
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UserData | null>(null);
  const [view, setView] = useState<'dashboard' | 'history' | 'settings'>('dashboard');

  // AI Motivation State
  const [motivation, setMotivation] = useState<string>("");
  const [loadingMotivation, setLoadingMotivation] = useState(false);

  // Manual entry state for history
  const [manualStartDate, setManualStartDate] = useState("");
  const [manualEndDate, setManualEndDate] = useState("");

  // History Editing State
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

  // Goal editing state (Dashboard)
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalMode, setGoalMode] = useState<'days' | 'date'>('days');
  const [tempGoal, setTempGoal] = useState("30");
  const [tempGoalDate, setTempGoalDate] = useState("");

  // Streak Start Date editing state (Dashboard)
  const [isEditingStart, setIsEditingStart] = useState(false);
  const [tempStartDate, setTempStartDate] = useState("");
  
  // Reset Confirmation Modal state
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'days'; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'desc'
  });

  useEffect(() => {
    const unsubscribe = subscribeToAuth((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

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

  // Fetch motivation when data loads initially
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

  // Compute set of active streak days and overlap days for the calendar
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
        // Limit loop to prevent potential infinite loops with bad data
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
        startDates.add(toLocalDateString(data.currentStreakStart));
    }
    
    // Find intersections (Overlap / Reset days)
    const overlaps = new Set<string>();
    for (const d of startDates) {
        if (endDates.has(d)) {
            overlaps.add(d);
        }
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
    
    // Refresh motivation for day 0 if enabled
    if (newData.showMotivation ?? true) {
      setLoadingMotivation(true);
      const msg = await getMotivation(0, data.goal);
      setMotivation(msg);
      setLoadingMotivation(false);
    }
  };

  const handleManualAdd = async () => {
    if (!manualStartDate || !manualEndDate || !data) return;
    
    const start = parseLocalDate(manualStartDate);
    const end = parseLocalDate(manualEndDate);

    if (isNaN(start) || isNaN(end)) return;

    if (end <= start) {
      alert("End date must be after start date.");
      return;
    }
    
    // Calculate days based on dates
    const days = Math.floor((end - start) / MILLIS_PER_DAY);

    const newItem: StreakHistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      startDate: start,
      endDate: end,
      days: days > 0 ? days : 0
    };

    const newData = {
      ...data,
      history: [newItem, ...data.history].sort((a, b) => b.endDate - a.endDate)
    };

    setData(newData);
    await saveUserData(user, newData);
    setManualStartDate("");
    setManualEndDate("");
  };

  const manualDaysCalculated = useMemo(() => {
    if (!manualStartDate || !manualEndDate) return 0;
    const start = parseLocalDate(manualStartDate);
    const end = parseLocalDate(manualEndDate);
    if (isNaN(start) || isNaN(end) || end <= start) return 0;
    return Math.floor((end - start) / MILLIS_PER_DAY);
  }, [manualStartDate, manualEndDate]);

  // --- History Edit Functions ---
  const startEditingHistory = (item: StreakHistoryItem) => {
    setEditingHistoryId(item.id);
    setEditStartDate(toLocalDateString(item.startDate));
    setEditEndDate(toLocalDateString(item.endDate));
  };

  const cancelEditingHistory = () => {
    setEditingHistoryId(null);
    setEditStartDate("");
    setEditEndDate("");
  };

  const saveHistoryEdit = async () => {
    if (!data || !editingHistoryId) return;
    
    const start = parseLocalDate(editStartDate);
    const end = parseLocalDate(editEndDate);

    if (isNaN(start) || isNaN(end)) return;

    if (end <= start) {
      alert("End date must be after start date.");
      return;
    }
    
    const days = Math.floor((end - start) / MILLIS_PER_DAY);
    const finalDays = days > 0 ? days : 0;

    const updatedHistory = data.history.map(item => {
      if (item.id === editingHistoryId) {
        return {
          ...item,
          startDate: start,
          endDate: end,
          days: finalDays
        };
      }
      return item;
    }).sort((a, b) => b.endDate - a.endDate);

    const newData = {
      ...data,
      history: updatedHistory
    };

    setData(newData);
    await saveUserData(user, newData);
    cancelEditingHistory();
  };

  const deleteHistoryItem = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    if (!data) return;
    
    const updatedHistory = data.history.filter(item => item.id !== id);
    const newData = { ...data, history: updatedHistory };
    setData(newData);
    await saveUserData(user, newData);
    if (editingHistoryId === id) cancelEditingHistory();
  };

  const editDaysCalculated = useMemo(() => {
    if (!editStartDate || !editEndDate) return 0;
    const start = parseLocalDate(editStartDate);
    const end = parseLocalDate(editEndDate);
    if (isNaN(start) || isNaN(end) || end <= start) return 0;
    return Math.floor((end - start) / MILLIS_PER_DAY);
  }, [editStartDate, editEndDate]);

  // --- Goal Edit Functions ---
  const saveGoal = async () => {
    if (!data) return;
    let newGoal = 0;

    if (goalMode === 'days') {
      newGoal = parseInt(tempGoal);
    } else {
      // Calculate days from current start to goal date
      const target = parseLocalDate(tempGoalDate);
      const start = data.currentStreakStart || Date.now();
      
      if (isNaN(target)) return;
      if (target <= start) {
        alert("Goal date must be after your streak start date.");
        return;
      }
      newGoal = Math.floor((target - start) / MILLIS_PER_DAY);
    }

    if (isNaN(newGoal) || newGoal < 1) {
      alert("Invalid goal. It must be at least 1 day.");
      return;
    }
    
    const newData = { ...data, goal: newGoal };
    setData(newData);
    await saveUserData(user, newData);
    setIsEditingGoal(false);
  };

  const startEditingDate = () => {
    if (!data?.currentStreakStart) return;
    const dateString = toLocalDateString(data.currentStreakStart);
    setTempStartDate(dateString);
    setIsEditingStart(true);
  };

  const saveStartDate = async () => {
    if (!data || !tempStartDate) return;
    const newStartTimestamp = parseLocalDate(tempStartDate);
    
    if (isNaN(newStartTimestamp)) return;
    if (newStartTimestamp > Date.now()) {
      alert("Start date cannot be in the future.");
      return;
    }

    const newData = { ...data, currentStreakStart: newStartTimestamp };
    setData(newData);
    await saveUserData(user, newData);
    setIsEditingStart(false);
  };

  const longestStreak = useMemo(() => {
    if (!data) return 0;
    const histMax = data.history.reduce((max, item) => Math.max(max, item.days), 0);
    return Math.max(histMax, currentDays);
  }, [data, currentDays]);

  const chartData = useMemo(() => {
    if (!data) return [];
    // Returns last 15 entries in chronological order (Oldest -> Newest)
    // This allows the user to see "Are my streaks getting longer?"
    return [...data.history]
      .sort((a, b) => a.endDate - b.endDate)
      .slice(-15)
      .map((item, index) => ({
        ...item,
        index: index + 1,
        dateLabel: new Date(item.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      }));
  }, [data]);

  const sortedHistory = useMemo(() => {
    if (!data) return [];
    const sorted = [...data.history];
    
    sorted.sort((a, b) => {
      if (sortConfig.key === 'days') {
        return sortConfig.direction === 'asc' ? a.days - b.days : b.days - a.days;
      } else {
        // Default to date (using endDate)
        return sortConfig.direction === 'asc' ? a.endDate - b.endDate : b.endDate - a.endDate;
      }
    });
    
    return sorted;
  }, [data, sortConfig]);

  const toggleSort = (key: 'date' | 'days') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  if (loading) return <div className="h-screen w-full bg-background flex items-center justify-center"><LoadingSpinner /></div>;

  return (
    <div className="min-h-screen bg-background text-text font-sans selection:bg-primary selection:text-white pb-24 sm:pb-0">
      
      {/* --- Top Bar --- */}
      <header className="p-6 flex justify-between items-center max-w-md mx-auto w-full">
        <div>
          <h1 className="text-xl font-black tracking-tight text-text flex items-center gap-2">
            <Flame className="text-primary" size={28} fill="currentColor" />
            Streaker
          </h1>
        </div>
        <div>
          {user ? (
            <button onClick={() => logout()} className="p-2 bg-slate-100 rounded-full text-secondary hover:text-primary transition-colors">
              <LogOut size={24} />
            </button>
          ) : (
            isFirebaseInitialized && (
              <button onClick={() => signInWithGoogle()} className="flex items-center gap-2 text-sm font-bold bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-full transition-colors">
                <UserIcon size={18} /> Sign In
              </button>
            )
          )}
        </div>
      </header>

      {/* --- Main Content Area --- */}
      <main className="max-w-md mx-auto w-full px-6 flex flex-col gap-6">
        
        {view === 'dashboard' && data && (
          <div className="animate-fade-in flex flex-col gap-6">
            
            {/* Progress Section */}
            <div className="flex flex-col items-center justify-center pt-8">
              <ProgressBar current={currentDays} max={data.goal}>
                  {/* Start Date Display / Edit Control moved inside */}
                  {!isEditingStart ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); startEditingDate(); }}
                      className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-primary transition-colors px-3 py-1 rounded-full hover:bg-slate-50 border border-transparent hover:border-slate-200"
                    >
                      <span>Started {new Date(data.currentStreakStart || Date.now()).toLocaleDateString()}</span>
                      <PenLine size={10} />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 animate-fade-in bg-white/95 p-1.5 rounded-xl border border-primary/30 shadow-lg backdrop-blur-sm">
                      <input 
                        type="date" 
                        value={tempStartDate}
                        onChange={(e) => setTempStartDate(e.target.value)}
                        className="bg-slate-50 border border-slate-300 rounded-md p-1 text-text text-[10px] focus:border-primary outline-none"
                      />
                      <button onClick={saveStartDate} className="p-1.5 bg-primary text-white rounded-md hover:bg-teal-500">
                        <Check size={12}/>
                      </button>
                      <button onClick={() => setIsEditingStart(false)} className="p-1.5 bg-slate-100 text-text rounded-md hover:bg-slate-200">
                        <X size={12}/>
                      </button>
                    </div>
                  )}
              </ProgressBar>
              
              {/* Goal / Context Section */}
              <div className="mt-8 w-full max-w-xs mx-auto min-h-[140px] flex flex-col items-center justify-start">
                {isEditingGoal ? (
                     <div className="w-full bg-white p-5 rounded-3xl shadow-xl border border-primary/20 animate-fade-in z-20">
                         <div className="flex w-full mb-3 bg-slate-100 rounded-xl p-1">
                            <button 
                              onClick={() => setGoalMode('days')}
                              className={`flex-1 text-[10px] font-black py-2.5 rounded-lg transition-all ${goalMode === 'days' ? 'bg-primary text-white shadow' : 'text-secondary hover:text-text'}`}
                            >
                              DAYS
                            </button>
                            <button 
                              onClick={() => setGoalMode('date')}
                              className={`flex-1 text-[10px] font-black py-2.5 rounded-lg transition-all ${goalMode === 'date' ? 'bg-primary text-white shadow' : 'text-secondary hover:text-text'}`}
                            >
                              DATE
                            </button>
                         </div>

                         <div className="flex items-center gap-2 mb-4 justify-center">
                           {goalMode === 'days' ? (
                              <div className="flex flex-col items-center w-full">
                                <input 
                                  type="number" 
                                  value={tempGoal}
                                  onChange={(e) => setTempGoal(e.target.value)}
                                  className="w-full bg-transparent border-b-2 border-slate-300 p-1 text-center text-4xl font-black text-text focus:border-primary outline-none"
                                  autoFocus
                                />
                                <span className="text-[10px] text-secondary mt-1 font-black uppercase tracking-widest">Target Days</span>
                              </div>
                           ) : (
                              <div className="flex flex-col items-center w-full">
                                <input 
                                  type="date" 
                                  value={tempGoalDate}
                                  onChange={(e) => setTempGoalDate(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-center text-sm font-bold text-text focus:border-primary outline-none"
                                  autoFocus
                                />
                                <span className="text-[10px] text-secondary mt-1 font-black uppercase tracking-widest">Target Date</span>
                              </div>
                           )}
                         </div>

                         <div className="flex w-full gap-2">
                             <button onClick={saveGoal} className="flex-1 p-3 bg-primary text-white rounded-xl hover:bg-teal-500 flex justify-center shadow-sm">
                               <Check size={20} strokeWidth={3} />
                             </button>
                             <button onClick={() => { setIsEditingGoal(false); setTempGoal(data.goal.toString()); }} className="flex-1 p-3 bg-slate-100 text-text rounded-xl hover:bg-slate-200 flex justify-center shadow-sm">
                               <X size={20} strokeWidth={3} />
                             </button>
                           </div>
                     </div>
                ) : (
                    <>
                         {currentDays >= data.goal ? (
                            <div className="text-primary font-black flex items-center justify-center gap-2 text-3xl animate-bounce mb-6">
                                <Trophy size={36}/> 
                                <span>Goal Reached!</span>
                            </div>
                         ) : (
                            <div className="flex flex-col items-center leading-none mb-6">
                                <span className="text-7xl font-black text-text tracking-tighter">{data.goal - currentDays}</span>
                                <span className="text-sm font-bold text-secondary uppercase tracking-widest mt-2">Days Remaining</span>
                            </div>
                         )}
                        
                         {/* Target Date Pill */}
                         <div 
                            className="bg-white border border-slate-200 rounded-full p-1.5 pl-5 pr-1.5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all"
                         >
                            <span className="text-sm font-bold text-text">Target: {goalReachDate}</span>
                            <button 
                                onClick={() => { setIsEditingGoal(true); setGoalMode('days'); }}
                                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-primary/20 text-slate-400 hover:text-primary transition-colors"
                            >
                                <Edit2 size={14} />
                            </button>
                         </div>
                    </>
                )}
              </div>

            </div>
            
            {/* Best Streak Card - Full Width */}
            <div className="w-full">
                <StatCard label="Best Streak" value={`${longestStreak}`} icon={Flame} colorClass="text-orange-600" />
            </div>

            {/* Motivation Card */}
            {(data.showMotivation ?? true) && (
              <div className="relative group overflow-hidden bg-gradient-to-br from-indigo-50 to-slate-50 border border-slate-200 rounded-3xl p-6 shadow-sm animate-fade-in hover:border-primary/30 transition-colors">
                 <div className="flex flex-col gap-4 relative z-10">
                   <div className="flex justify-between items-start">
                      <span className="text-xs font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                         <Sparkles size={16} /> Daily Wisdom
                      </span>
                      <button 
                        onClick={handleFetchMotivation}
                        disabled={loadingMotivation}
                        className="text-slate-400 hover:text-primary transition-colors disabled:animate-spin p-1 hover:bg-slate-100 rounded-full"
                      >
                         <RefreshCw size={18} />
                      </button>
                   </div>
                   <p className="text-lg md:text-xl text-slate-700 font-medium leading-relaxed italic min-h-[60px] flex items-center">
                      {loadingMotivation ? "Consulting the oracle..." : `"${motivation}"`}
                   </p>
                 </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pb-8">
              <button 
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-5 rounded-2xl bg-white border border-red-200 text-danger font-black uppercase tracking-[0.2em] hover:bg-red-50 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-sm group hover:border-red-300"
              >
                <RotateCcw size={22} className="group-hover:rotate-180 transition-transform duration-500" />
                Relapse / Reset
              </button>
            </div>

          </div>
        )}

        {view === 'history' && data && (
          <div className="animate-fade-in flex flex-col gap-6">
            <h2 className="text-3xl font-black text-text tracking-tight">History</h2>

            {/* Chart - Bar Chart Replacement */}
            <div className="bg-surface p-6 rounded-3xl border border-slate-200 h-72 w-full relative shadow-sm">
              <h3 className="text-sm text-secondary font-black mb-6 uppercase tracking-wider flex items-center gap-2">
                 <Target size={18} className="text-primary"/>
                 Streak Evolution <span className="text-[10px] text-slate-400 normal-case font-medium">(Last 15)</span>
              </h3>
              <ResponsiveContainer width="100%" height="80%">
                <BarChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} opacity={0.6} />
                  <XAxis dataKey="index" hide />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip 
                    cursor={{fill: '#f1f5f9', opacity: 0.5}}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-lg text-xs">
                             <p className="text-slate-500 mb-1 font-bold">{data.dateLabel}</p>
                             <p className="text-primary font-black text-2xl">{data.days} <span className="text-xs font-bold text-text uppercase">Days</span></p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="days" 
                    radius={[6, 6, 0, 0]}
                    animationDuration={1500}
                  >
                     {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.days >= data.goal ? '#facc15' : '#0d9488'} />
                     ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Calendar */}
            <StreakCalendar activeDates={activeStreakDays} overlapDates={overlapDates} />

            {/* Manual Add */}
            <div className="bg-surface p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-black text-text mb-6 flex items-center gap-3 uppercase tracking-wide">
                <Plus size={20} className="text-primary"/> 
                Log Past Streak
              </h3>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-secondary mb-2 block font-black uppercase tracking-wider">Start Date</label>
                    <input 
                      type="date" 
                      value={manualStartDate}
                      onChange={(e) => setManualStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-text text-sm font-bold focus:border-primary outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-secondary mb-2 block font-black uppercase tracking-wider">End Date</label>
                    <input 
                      type="date" 
                      value={manualEndDate}
                      onChange={(e) => setManualEndDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-text text-sm font-bold focus:border-primary outline-none transition-colors"
                    />
                  </div>
                </div>
                
                {manualDaysCalculated > 0 && (
                  <div className="bg-slate-100 p-4 rounded-xl text-center border border-slate-200 flex items-center justify-between px-6">
                     <span className="text-xs text-secondary uppercase font-bold">Calculated Duration</span> 
                     <span className="text-primary font-black text-2xl">{manualDaysCalculated} <span className="text-sm text-secondary">Days</span></span>
                  </div>
                )}

                <button 
                  onClick={handleManualAdd}
                  className="mt-2 w-full bg-primary text-white font-black uppercase tracking-[0.1em] py-4 rounded-xl hover:bg-teal-500 transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-primary/20"
                >
                  <Calculator size={20} strokeWidth={2.5} /> Add Record
                </button>
              </div>
            </div>

            {/* List with Sorting */}
            <div className="flex flex-col gap-4 pb-20">
              <div className="flex justify-between items-end mb-2">
                 <h3 className="text-sm font-black text-secondary uppercase flex items-center gap-2 tracking-wider">
                   <ListFilter size={18} /> Recent Logs
                 </h3>
                 
                 {/* Sort Controls */}
                 <div className="flex bg-surface rounded-xl p-1.5 border border-slate-200 gap-1">
                    <button 
                      onClick={() => toggleSort('date')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${sortConfig.key === 'date' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-text'}`}
                    >
                       Date {sortConfig.key === 'date' && (sortConfig.direction === 'desc' ? <ArrowDown size={12}/> : <ArrowUp size={12}/>)}
                    </button>
                    <button 
                      onClick={() => toggleSort('days')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${sortConfig.key === 'days' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-text'}`}
                    >
                       Days {sortConfig.key === 'days' && (sortConfig.direction === 'desc' ? <ArrowDown size={12}/> : <ArrowUp size={12}/>)}
                    </button>
                 </div>
              </div>

              {sortedHistory.length === 0 ? (
                <div className="text-center py-12 text-secondary italic bg-surface rounded-2xl border border-slate-200 border-dashed">
                    No history recorded yet.
                </div>
              ) : (
                sortedHistory.map((streak) => (
                  <div key={streak.id} className="bg-surface p-5 rounded-2xl border border-slate-200 transition-all hover:border-slate-300 shadow-sm hover:shadow-md">
                    {editingHistoryId === streak.id ? (
                      <div className="flex flex-col gap-4 animate-fade-in">
                        <div className="flex items-center gap-2 mb-1">
                          <Edit2 size={16} className="text-primary" />
                          <span className="text-xs font-black text-primary tracking-widest">EDITING RECORD</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                             <label className="text-[10px] text-secondary uppercase font-black mb-1.5 block">Start</label>
                             <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs text-text focus:border-primary outline-none font-bold" />
                           </div>
                           <div>
                             <label className="text-[10px] text-secondary uppercase font-black mb-1.5 block">End</label>
                             <input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs text-text focus:border-primary outline-none font-bold" />
                           </div>
                        </div>
                        <div className="flex justify-between items-center bg-slate-100 p-4 rounded-xl border border-slate-200">
                           <span className="text-xs text-secondary font-black uppercase">Duration</span>
                           <span className="text-primary font-black text-2xl">{editDaysCalculated} Days</span>
                        </div>
                        <div className="flex gap-2 mt-2">
                           <button onClick={saveHistoryEdit} className="flex-1 bg-primary text-white p-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-teal-500">
                             <Save size={16} /> Save
                           </button>
                           <button onClick={() => deleteHistoryItem(streak.id)} className="p-3 bg-red-50 text-danger border border-red-200 rounded-xl hover:bg-red-100">
                             <Trash2 size={16} />
                           </button>
                           <button onClick={cancelEditingHistory} className="p-3 bg-slate-200 text-text rounded-xl hover:bg-slate-300">
                             <X size={16} />
                           </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center group">
                        <div className="flex flex-col">
                          <span className="text-4xl font-black text-text tracking-tighter">{streak.days} <span className="text-sm font-black text-secondary uppercase tracking-widest ml-1">Days</span></span>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mt-2">
                            <CalendarIcon size={14} className="text-slate-400" />
                            <span>{new Date(streak.startDate).toLocaleDateString()}</span>
                            <ArrowRight size={12} className="text-slate-400"/>
                            <span>{new Date(streak.endDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {streak.days >= data.goal && <Trophy size={28} className="text-yellow-500 drop-shadow-sm" />}
                            <button onClick={() => startEditingHistory(streak)} className="p-3 text-slate-400 hover:text-primary transition-colors bg-transparent hover:bg-slate-100 rounded-xl">
                              <Edit2 size={20} />
                            </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {view === 'settings' && data && (
          <div className="animate-fade-in flex flex-col gap-6">
            <h2 className="text-3xl font-black text-text tracking-tight">Settings</h2>
            
            {/* Preferences Section */}
            <div className="bg-surface p-6 rounded-3xl border border-slate-200 shadow-sm">
               <h3 className="text-lg font-black mb-5 tracking-wide text-text">Preferences</h3>
               <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-200 rounded-full text-primary">
                       <Sparkles size={24} />
                    </div>
                    <span className="text-sm font-bold text-text">Daily Stoic Wisdom</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={data.showMotivation ?? true}
                      onChange={toggleMotivation}
                    />
                    <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                  </label>
               </div>
            </div>

            {/* Account Section */}
            <div className="bg-surface p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-black mb-5 tracking-wide text-text">Account</h3>
              <p className="text-sm text-secondary mb-6 font-medium">
                {user ? `Signed in as ${user.email}` : "Data is stored locally. Sign in to sync across devices."}
              </p>
              {user ? (
                <button 
                  onClick={logout}
                  className="w-full border-2 border-slate-300 text-text font-black uppercase tracking-wider py-4 rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut size={20} /> Sign Out
                </button>
              ) : (
                isFirebaseInitialized ? (
                  <button 
                    onClick={signInWithGoogle}
                    className="w-full bg-slate-900 text-white font-black uppercase tracking-wider py-4 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-3 shadow-lg"
                  >
                    <UserIcon size={20} /> Sign In with Google
                  </button>
                ) : (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold">
                    Sign-in unavailable.
                  </div>
                )
              )}
            </div>
          </div>
        )}

      </main>

      {/* --- Reset Confirmation Modal --- */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-sm w-full shadow-2xl transform transition-all scale-100">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-red-100 rounded-full text-danger">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-2xl font-black text-text">Reset Streak?</h3>
            </div>
            
            <p className="text-slate-600 mb-8 leading-relaxed text-base font-medium">
              This will end your current streak of <span className="text-primary font-black text-xl">{currentDays} days</span>.
              <br/><br/>
              Your progress will be saved to your history so you can track it later. Are you sure you want to restart from day 0?
            </p>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setShowResetConfirm(false)} 
                className="flex-1 py-4 rounded-2xl bg-slate-100 text-text font-bold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmReset} 
                className="flex-1 py-4 rounded-2xl bg-danger text-white font-black uppercase tracking-wider hover:bg-red-600 shadow-lg shadow-red-200 transition-all active:scale-95"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Bottom Navigation (Mobile Friendly) --- */}
      <nav className="fixed bottom-0 w-full bg-white/90 backdrop-blur-lg border-t border-slate-200 pb-safe z-50">
        <div className="max-w-md mx-auto flex justify-around p-2">
          <NavButton 
            active={view === 'dashboard'} 
            onClick={() => setView('dashboard')} 
            icon={Flame} 
            label="Streak" 
          />
          <NavButton 
            active={view === 'history'} 
            onClick={() => setView('history')} 
            icon={HistoryIcon} 
            label="History" 
          />
          <NavButton 
            active={view === 'settings'} 
            onClick={() => setView('settings')} 
            icon={Settings} 
            label="Settings" 
          />
        </div>
      </nav>
    </div>
  );
}

const NavButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full p-2 rounded-2xl transition-all ${active ? 'text-primary bg-primary/10' : 'text-secondary hover:text-primary'}`}
  >
    <Icon size={28} strokeWidth={active ? 3 : 2} />
    <span className="text-[10px] font-black mt-1 tracking-wide uppercase">{label}</span>
  </button>
);