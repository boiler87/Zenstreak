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
    <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
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
    days.push(<div key={`empty-${i}`} className="h-8 w-full" />);
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
          h-8 w-full flex items-center justify-center rounded-lg text-xs font-medium transition-all relative select-none
          ${isOverlap 
             ? 'bg-orange-500 text-white font-bold shadow-[0_0_10px_rgba(249,115,22,0.3)]' 
             : isActive 
                 ? 'bg-primary text-black font-bold shadow-[0_0_10px_rgba(20,184,166,0.3)]' 
                 : 'text-slate-400 hover:bg-slate-800'
          }
          ${isToday && !isActive && !isOverlap ? 'border border-primary text-primary' : ''}
          ${isToday && (isActive || isOverlap) ? 'ring-2 ring-white' : ''}
        `}
      >
        {i}
      </div>
    );
  }

  return (
    <div className="bg-surface p-4 rounded-2xl border border-slate-700 w-full animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-bold text-sm md:text-base capitalize flex items-center gap-2">
           <CalendarIcon size={16} className="text-primary"/>
           {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="p-1.5 hover:bg-slate-700 rounded-lg text-secondary hover:text-white transition-colors">
            <ChevronLeft size={18} />
          </button>
          <button onClick={nextMonth} className="p-1.5 hover:bg-slate-700 rounded-lg text-secondary hover:text-white transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-secondary uppercase">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[10px] text-secondary border-t border-slate-700/50 pt-3">
         <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-primary rounded-sm shadow-[0_0_5px_rgba(20,184,166,0.5)]"></div>
            <span>Streak</span>
         </div>
         <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-orange-500 rounded-sm shadow-[0_0_5px_rgba(249,115,22,0.5)]"></div>
            <span>Reset</span>
         </div>
         <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 border border-primary rounded-sm"></div>
            <span>Today</span>
         </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, colorClass = "text-text", onClick, active = false }: any) => (
  <div 
    onClick={onClick}
    className={`bg-surface rounded-2xl p-4 flex flex-col items-center justify-center shadow-lg border transition-all cursor-pointer select-none
      ${active ? 'border-primary ring-1 ring-primary' : 'border-slate-700/50 hover:border-slate-600 active:scale-95'}
    `}
  >
    <div className={`mb-2 p-2 rounded-full bg-background ${colorClass}`}>
      <Icon size={20} />
    </div>
    <span className="text-secondary text-xs uppercase tracking-wider font-bold">{label}</span>
    <span className="text-2xl font-bold mt-1">{value}</span>
  </div>
);

const ProgressBar = ({ current, max }: { current: number; max: number }) => {
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));
  const radius = 90; // Slightly larger
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center group">
       {/* Background Glow */}
       <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full scale-110 opacity-50 animate-pulse"></div>
       
      <svg
        height={radius * 2}
        width={radius * 2}
        className="rotate-[-90deg] transition-all duration-500 ease-out relative z-10"
      >
         <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="50%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#0f766e" />
          </linearGradient>
          <filter id="glow">
             <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
             <feMerge>
                 <feMergeNode in="coloredBlur"/>
                 <feMergeNode in="SourceGraphic"/>
             </feMerge>
          </filter>
        </defs>
        <circle
          stroke="#1e293b"
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
      <div className="absolute flex flex-col items-center z-20">
        <span className="text-6xl font-bold text-white tracking-tighter drop-shadow-lg">{current}</span>
        <span className="text-xs text-secondary font-bold uppercase tracking-widest mb-2">DAYS</span>
        
        {/* Percentage Badge */}
        <div className="flex items-center gap-1.5 bg-surface/80 border border-slate-700/50 px-3 py-1 rounded-full shadow-lg backdrop-blur-md">
            <Target size={12} className="text-primary" />
            <span className="text-xs font-mono font-bold text-primary">{percentage.toFixed(0)}%</span>
        </div>
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
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Flame className="text-primary" size={24} fill="currentColor" />
            ZenStreak
          </h1>
        </div>
        <div>
          {user ? (
            <button onClick={() => logout()} className="p-2 bg-surface rounded-full text-secondary hover:text-white transition-colors">
              <LogOut size={20} />
            </button>
          ) : (
            isFirebaseInitialized && (
              <button onClick={() => signInWithGoogle()} className="flex items-center gap-2 text-sm font-semibold bg-surface hover:bg-slate-700 px-3 py-1.5 rounded-full transition-colors">
                <UserIcon size={16} /> Sign In
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
            <div className="flex flex-col items-center justify-center pt-4">
              <ProgressBar current={currentDays} max={data.goal} />
              
              {/* Context Text below Progress Bar */}
              <div className="mt-4 text-center">
                 <p className="text-secondary text-sm">
                   {currentDays >= data.goal 
                     ? <span className="text-primary font-bold flex items-center justify-center gap-1"><Trophy size={14}/> Goal Reached!</span>
                     : <span><span className="text-white font-bold">{data.goal - currentDays}</span> days until goal</span>
                   }
                 </p>
              </div>

              {/* Date Display / Edit Control */}
              {!isEditingStart ? (
                <button 
                  onClick={startEditingDate}
                  className="mt-2 flex items-center gap-2 text-xs text-secondary hover:text-primary transition-colors px-3 py-1 rounded-full hover:bg-surface border border-transparent hover:border-slate-700/50"
                >
                  <span>Started {new Date(data.currentStreakStart || Date.now()).toLocaleDateString()}</span>
                  <PenLine size={12} />
                </button>
              ) : (
                <div className="mt-4 flex flex-col items-center gap-2 animate-fade-in bg-surface p-2 rounded-xl border border-primary/30">
                  <span className="text-xs font-bold text-primary uppercase">Set Start Date</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="date" 
                      value={tempStartDate}
                      onChange={(e) => setTempStartDate(e.target.value)}
                      className="bg-background border border-slate-600 rounded p-1.5 text-white text-sm focus:border-primary outline-none"
                    />
                    <button onClick={saveStartDate} className="p-1.5 bg-primary text-black rounded hover:bg-teal-400">
                      <Check size={16}/>
                    </button>
                    <button onClick={() => setIsEditingStart(false)} className="p-1.5 bg-slate-700 text-white rounded hover:bg-slate-600">
                      <X size={16}/>
                    </button>
                  </div>
                </div>
              )}
              
              <div className="mt-6 grid grid-cols-2 gap-4 w-full h-32">
                {/* Goal Card (Editable) */}
                {isEditingGoal ? (
                   <div className="bg-surface rounded-2xl p-2 sm:p-3 flex flex-col items-center justify-center shadow-lg border border-primary ring-1 ring-primary h-full relative overflow-hidden">
                     {/* Toggle */}
                     <div className="flex w-full mb-2 bg-slate-900 rounded-lg p-0.5">
                        <button 
                          onClick={() => setGoalMode('days')}
                          className={`flex-1 text-[10px] font-bold py-1 rounded-md transition-all ${goalMode === 'days' ? 'bg-primary text-black shadow' : 'text-secondary hover:text-white'}`}
                        >
                          DAYS
                        </button>
                        <button 
                          onClick={() => setGoalMode('date')}
                          className={`flex-1 text-[10px] font-bold py-1 rounded-md transition-all ${goalMode === 'date' ? 'bg-primary text-black shadow' : 'text-secondary hover:text-white'}`}
                        >
                          DATE
                        </button>
                     </div>

                     <div className="flex items-center gap-2 mb-1 flex-1">
                       {goalMode === 'days' ? (
                          <div className="flex flex-col items-center">
                            <input 
                              type="number" 
                              value={tempGoal}
                              onChange={(e) => setTempGoal(e.target.value)}
                              className="w-16 bg-background border border-slate-600 rounded p-1 text-center text-lg font-bold text-white focus:border-primary outline-none"
                              autoFocus
                            />
                            <span className="text-[10px] text-secondary mt-1">Total Days</span>
                          </div>
                       ) : (
                          <div className="flex flex-col items-center">
                            <input 
                              type="date" 
                              value={tempGoalDate}
                              onChange={(e) => setTempGoalDate(e.target.value)}
                              className="w-24 bg-background border border-slate-600 rounded p-1 text-center text-xs font-bold text-white focus:border-primary outline-none"
                              autoFocus
                            />
                            <span className="text-[10px] text-secondary mt-1">Goal Date</span>
                          </div>
                       )}
                     </div>

                     <div className="flex w-full gap-2 mt-auto">
                         <button onClick={saveGoal} className="flex-1 p-1 bg-primary text-black rounded hover:bg-teal-400 flex justify-center">
                           <Check size={14} />
                         </button>
                         <button onClick={() => { setIsEditingGoal(false); setTempGoal(data.goal.toString()); }} className="flex-1 p-1 bg-slate-700 text-white rounded hover:bg-slate-600 flex justify-center">
                           <X size={14} />
                         </button>
                       </div>
                   </div>
                ) : (
                  <StatCard 
                    label="Goal Progress" 
                    value={`${currentDays} / ${data.goal}`} 
                    icon={Trophy} 
                    colorClass="text-yellow-500" 
                    onClick={() => { setIsEditingGoal(true); setGoalMode('days'); }}
                  />
                )}
                
                <StatCard label="Best" value={`${longestStreak} Days`} icon={Flame} colorClass="text-orange-500" />
              </div>
            </div>

            {/* Motivation Card */}
            {(data.showMotivation ?? true) && (
              <div className="relative group overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-xl animate-fade-in">
                 <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Sparkles size={60} />
                 </div>
                 <div className="flex flex-col gap-2 relative z-10">
                   <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
                         <Sparkles size={12} /> Daily Stoic Wisdom
                      </span>
                      <button 
                        onClick={handleFetchMotivation}
                        disabled={loadingMotivation}
                        className="text-slate-500 hover:text-white transition-colors disabled:animate-spin"
                      >
                         <RefreshCw size={14} />
                      </button>
                   </div>
                   <p className="text-sm md:text-base text-slate-200 font-medium leading-relaxed italic min-h-[40px] flex items-center">
                      {loadingMotivation ? "Consulting the oracle..." : `"${motivation}"`}
                   </p>
                 </div>
              </div>
            )}

            {/* Action Buttons - Moved Here */}
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-4 rounded-xl bg-surface border border-red-900/30 text-danger font-bold uppercase tracking-widest hover:bg-red-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw size={20} />
                Relapse / Reset
              </button>
            </div>

          </div>
        )}

        {view === 'history' && data && (
          <div className="animate-fade-in flex flex-col gap-6">
            <h2 className="text-2xl font-bold">History</h2>

            {/* Chart - Bar Chart Replacement */}
            <div className="bg-surface p-4 rounded-2xl border border-slate-700 h-64 w-full relative">
              <h3 className="text-sm text-secondary font-bold mb-4 uppercase flex items-center gap-2">
                 <Target size={16} className="text-primary"/>
                 Streak Evolution <span className="text-[10px] text-slate-500 normal-case">(Last 15)</span>
              </h3>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.5} />
                  <XAxis dataKey="index" hide />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip 
                    cursor={{fill: '#334155', opacity: 0.2}}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-800 border border-slate-600 p-2 rounded-lg shadow-xl text-xs">
                             <p className="text-slate-400 mb-1">{data.dateLabel}</p>
                             <p className="text-primary font-bold text-lg">{data.days} <span className="text-xs font-normal text-white">Days</span></p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="days" 
                    radius={[4, 4, 0, 0]}
                    animationDuration={1500}
                  >
                     {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.days >= data.goal ? '#f59e0b' : '#14b8a6'} />
                     ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Calendar */}
            <StreakCalendar activeDates={activeStreakDays} overlapDates={overlapDates} />

            {/* Manual Add */}
            <div className="bg-surface p-5 rounded-2xl border border-slate-700">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Plus size={16} className="text-primary"/> 
                Log Past Streak
              </h3>
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-secondary mb-1 block">Start Date</label>
                    <input 
                      type="date" 
                      value={manualStartDate}
                      onChange={(e) => setManualStartDate(e.target.value)}
                      className="w-full bg-background border border-slate-600 rounded-lg p-3 text-white text-sm focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-secondary mb-1 block">End Date</label>
                    <input 
                      type="date" 
                      value={manualEndDate}
                      onChange={(e) => setManualEndDate(e.target.value)}
                      className="w-full bg-background border border-slate-600 rounded-lg p-3 text-white text-sm focus:border-primary outline-none"
                    />
                  </div>
                </div>
                
                {manualDaysCalculated > 0 && (
                  <div className="bg-slate-900/50 p-2 rounded text-center border border-slate-700/50">
                     <span className="text-xs text-secondary">Calculated Duration:</span> <span className="text-primary font-bold">{manualDaysCalculated} Days</span>
                  </div>
                )}

                <button 
                  onClick={handleManualAdd}
                  className="mt-2 w-full bg-primary text-background font-bold py-3 rounded-lg hover:bg-teal-400 transition-colors flex items-center justify-center gap-2"
                >
                  <Calculator size={18} /> Add Record
                </button>
              </div>
            </div>

            {/* List with Sorting */}
            <div className="flex flex-col gap-3 pb-20">
              <div className="flex justify-between items-end mb-1">
                 <h3 className="text-sm font-bold text-secondary uppercase flex items-center gap-2">
                   <ListFilter size={14} /> Recent Logs
                 </h3>
                 
                 {/* Sort Controls */}
                 <div className="flex bg-surface rounded-lg p-1 border border-slate-700/50 gap-1">
                    <button 
                      onClick={() => toggleSort('date')}
                      className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${sortConfig.key === 'date' ? 'bg-primary text-black' : 'text-slate-400 hover:text-white'}`}
                    >
                       Date {sortConfig.key === 'date' && (sortConfig.direction === 'desc' ? <ArrowDown size={10}/> : <ArrowUp size={10}/>)}
                    </button>
                    <button 
                      onClick={() => toggleSort('days')}
                      className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${sortConfig.key === 'days' ? 'bg-primary text-black' : 'text-slate-400 hover:text-white'}`}
                    >
                       Days {sortConfig.key === 'days' && (sortConfig.direction === 'desc' ? <ArrowDown size={10}/> : <ArrowUp size={10}/>)}
                    </button>
                 </div>
              </div>

              {sortedHistory.length === 0 ? (
                <div className="text-center py-8 text-secondary italic">No history recorded yet.</div>
              ) : (
                sortedHistory.map((streak) => (
                  <div key={streak.id} className="bg-surface p-4 rounded-xl border border-slate-700/50 transition-all">
                    {editingHistoryId === streak.id ? (
                      <div className="flex flex-col gap-3 animate-fade-in">
                        <div className="flex items-center gap-2 mb-1">
                          <Edit2 size={14} className="text-primary" />
                          <span className="text-xs font-bold text-primary">EDITING RECORD</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                           <div>
                             <label className="text-[10px] text-secondary uppercase font-bold mb-1 block">Start</label>
                             <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-xs text-white focus:border-primary outline-none" />
                           </div>
                           <div>
                             <label className="text-[10px] text-secondary uppercase font-bold mb-1 block">End</label>
                             <input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-xs text-white focus:border-primary outline-none" />
                           </div>
                        </div>
                        <div className="flex justify-between items-center bg-slate-900/30 p-2 rounded">
                           <span className="text-xs text-secondary">Duration:</span>
                           <span className="text-primary font-bold">{editDaysCalculated} Days</span>
                        </div>
                        <div className="flex gap-2 mt-1">
                           <button onClick={saveHistoryEdit} className="flex-1 bg-primary text-black p-2 rounded text-xs font-bold flex items-center justify-center gap-1 hover:bg-teal-400">
                             <Save size={14} /> Save
                           </button>
                           <button onClick={() => deleteHistoryItem(streak.id)} className="p-2 bg-red-900/20 text-danger border border-red-900/30 rounded hover:bg-red-900/40">
                             <Trash2 size={14} />
                           </button>
                           <button onClick={cancelEditingHistory} className="p-2 bg-slate-700 text-white rounded hover:bg-slate-600">
                             <X size={14} />
                           </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center group">
                        <div className="flex flex-col">
                          <span className="text-xl font-bold text-white">{streak.days} <span className="text-sm font-normal text-secondary">Days</span></span>
                          <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                            <CalendarIcon size={12} />
                            <span>{new Date(streak.startDate).toLocaleDateString()}</span>
                            <ArrowRight size={10} />
                            <span>{new Date(streak.endDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {streak.days >= data.goal && <Trophy size={20} className="text-yellow-500" />}
                            <button onClick={() => startEditingHistory(streak)} className="p-2 text-slate-600 hover:text-white transition-colors bg-transparent hover:bg-slate-700/50 rounded-lg">
                              <Edit2 size={16} />
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
            <h2 className="text-2xl font-bold">Settings</h2>
            
            {/* Preferences Section */}
            <div className="bg-surface p-5 rounded-2xl border border-slate-700">
               <h3 className="text-lg font-bold mb-4">Preferences</h3>
               <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-full text-primary">
                       <Sparkles size={18} />
                    </div>
                    <span className="text-sm font-medium text-white">Daily Stoic Wisdom</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={data.showMotivation ?? true}
                      onChange={toggleMotivation}
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
               </div>
            </div>

            {/* Account Section */}
            <div className="bg-surface p-5 rounded-2xl border border-slate-700">
              <h3 className="text-lg font-bold mb-4">Account</h3>
              <p className="text-sm text-secondary mb-4">
                {user ? `Signed in as ${user.email}` : "Data is stored locally. Sign in to sync across devices."}
              </p>
              {user ? (
                <button 
                  onClick={logout}
                  className="w-full border border-slate-600 text-white font-bold py-3 rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut size={18} /> Sign Out
                </button>
              ) : (
                isFirebaseInitialized ? (
                  <button 
                    onClick={signInWithGoogle}
                    className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <UserIcon size={18} /> Sign In with Google
                  </button>
                ) : (
                  <div className="p-3 bg-red-900/20 border border-red-900/50 rounded text-red-200 text-xs">
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl transform transition-all scale-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-500/10 rounded-full text-danger">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">Reset Streak?</h3>
            </div>
            
            <p className="text-slate-300 mb-6 leading-relaxed text-sm">
              This will end your current streak of <span className="text-primary font-bold text-base">{currentDays} days</span>.
              <br/><br/>
              Your progress will be saved to your history so you can track it later. Are you sure you want to restart from day 0?
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowResetConfirm(false)} 
                className="flex-1 py-3 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmReset} 
                className="flex-1 py-3 rounded-xl bg-danger text-white font-bold hover:bg-red-600 shadow-lg shadow-red-900/20 transition-all active:scale-95"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Bottom Navigation (Mobile Friendly) --- */}
      <nav className="fixed bottom-0 w-full bg-surface/90 backdrop-blur-lg border-t border-slate-700/50 pb-safe z-50">
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
    className={`flex flex-col items-center justify-center w-full p-2 rounded-xl transition-all ${active ? 'text-primary bg-primary/10' : 'text-secondary hover:text-white'}`}
  >
    <Icon size={24} strokeWidth={active ? 2.5 : 2} />
    <span className="text-[10px] font-medium mt-1">{label}</span>
  </button>
);