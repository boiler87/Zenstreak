import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  RotateCcw, 
  History as HistoryIcon, 
  Settings, 
  Zap, 
  Flame, 
  Calendar as CalendarIcon, 
  Target, 
  Sparkles, 
  RefreshCw, 
  LogIn, 
  LogOut, 
  User as UserIcon,
  AlertCircle,
  Loader2,
  Shield,
  X,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  Plus,
  TrendingUp,
  Milestone,
  BarChart3,
  List as ListIcon,
  Trash2,
  Pencil,
  Lightbulb,
  Download,
  Share,
  PlusSquare,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';

import { UserData, StreakHistoryItem, ForecastResponse } from './types';
import { 
  getUserData, 
  saveUserData,
  subscribeToAuth,
  signInWithGoogle,
  logout,
} from './services/firebase';
import { getMotivation, getStreakForecast } from './services/geminiService';

// Define User type as any to handle missing exports in environment
type User = any;

// --- Constants ---
const APP_VERSION = "3.4.11";
const MILLIS_PER_DAY = 1000 * 60 * 60 * 24;
const LOGO_URL = "https://raw.githubusercontent.com/boiler87/Zenstreak/main/icon.png";

const calculateDays = (start: number, end?: number): number => {
  const endTime = end || Date.now();
  const diff = endTime - start;
  return Math.max(0, Math.floor(diff / MILLIS_PER_DAY));
};

const toLocalDateString = (timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Fixes timezone offset issues by explicitly parsing YYYY-MM-DD to local midnight
const parseLocalDate = (dateString: string): number => {
  const [y, m, d] = dateString.split('-').map(Number);
  // Month is 0-indexed in JS Date
  return new Date(y, m - 1, d).getTime();
};

const LoadingSpinner = () => (
  <div className="flex flex-col gap-4 justify-center items-center h-full text-primary animate-pulse">
    <div className="w-12 h-12 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
    <span className="text-xs font-bold tracking-widest uppercase">Syncing...</span>
  </div>
);

const StreakProgress = ({ start, goal }: { start: number; goal: number }) => {
  const days = calculateDays(start);
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
            <stop offset="0%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#AA8C2C" />
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
      </div>
    </div>
  );
};

// Detect iOS
const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

// Detect if running in standalone mode (installed)
const isStandalone = () => {
  return (window.matchMedia('(display-mode: standalone)').matches) || ((navigator as any).standalone === true);
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UserData | null>(null);
  const [view, setView] = useState<'dashboard' | 'history' | 'settings'>('dashboard');
  const [historyTab, setHistoryTab] = useState<'list' | 'trends' | 'calendar'>('list');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Initialize with a default value so the box is never empty/invisible
  const [motivation, setMotivation] = useState<string>("Discipline is the bridge between goals and accomplishment.");
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loadingMotivation, setLoadingMotivation] = useState(false);
  const [loadingForecast, setLoadingForecast] = useState(false);
  
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalMode, setGoalMode] = useState<'days' | 'date'>('days');
  const [tempGoal, setTempGoal] = useState("30");
  const [tempGoalDate, setTempGoalDate] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [tick, setTick] = useState(0); 

  const [isAddingHistory, setIsAddingHistory] = useState(false);
  const [manualStart, setManualStart] = useState(toLocalDateString(Date.now() - MILLIS_PER_DAY * 7));
  const [manualEnd, setManualEnd] = useState(toLocalDateString(Date.now()));

  const [isEditingHistory, setIsEditingHistory] = useState<string | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  const [isEditingStart, setIsEditingStart] = useState(false);
  const [tempStart, setTempStart] = useState("");

  const [sortKey, setSortKey] = useState<'startDate' | 'endDate' | 'days'>('endDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDayDetails, setSelectedDayDetails] = useState<{date: string, statuses: string[], details: string[]} | null>(null);

  // Check installation status
  useEffect(() => {
    setIsAppInstalled(isStandalone());
  }, []);

  // Install Prompt Listener (Android/Chrome)
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      // Android/Chrome automatic prompt
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
      }
    } else {
      // iOS or other browsers - show manual instructions
      setShowInstallModal(true);
    }
  };

  // Timer for midnight updates
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000); 
    return () => clearInterval(timer);
  }, []);

  // Auth Subscription
  useEffect(() => {
    let mounted = true;
    const unsubscribe = subscribeToAuth((currentUser) => {
      if (!mounted) return;
      setUser(currentUser);
      if (!currentUser) {
        setIsRedirecting(false);
      }
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Data Loading
  useEffect(() => {
    const loadData = async () => {
      try {
        const fetched = await getUserData(user);
        setData(fetched);
        
        // Init temp state
        setTempGoal(fetched.goal.toString());
        const targetDate = new Date((fetched.currentStreakStart || Date.now()) + fetched.goal * MILLIS_PER_DAY);
        setTempGoalDate(toLocalDateString(targetDate.getTime()));
      } catch (e) {
        console.error("Failed to load user data", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const currentDays = useMemo(() => {
    return data && data.currentStreakStart ? calculateDays(data.currentStreakStart) : 0;
  }, [data, tick]);

  const handleFetchInsights = useCallback(async () => {
    if (!data) return;
    setLoadingMotivation(true);
    setLoadingForecast(true);
    
    try {
      const [motMsg, foreData] = await Promise.all([
        getMotivation(currentDays, data.goal),
        getStreakForecast(data.history, currentDays, data.goal)
      ]);
      if (motMsg) setMotivation(motMsg);
      if (foreData) setForecast(foreData);
    } catch (e) {
      console.error("AI Insight Error", e);
      // Fallback if AI fails completely
      setMotivation("Stay the course. The results will speak for themselves.");
    } finally {
      setLoadingMotivation(false);
      setLoadingForecast(false);
    }
  }, [data, currentDays]);

  useEffect(() => {
    // Force update of insights whenever data or current streak changes
    if (data && !loading) {
        handleFetchInsights();
    }
  }, [data, loading, currentDays]);

  const handleSignIn = async () => {
    setAuthError(null);
    setIsRedirecting(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      console.error("Login Error:", e);
      setIsRedirecting(false);
      setAuthError(e.message || "Failed to start Google Login.");
    }
  };

  const handleSignOut = async () => {
    try {
        await logout();
        setUser(null);
        window.location.reload(); 
    } catch (e) {
        console.error("Logout failed", e);
    }
  };

  const handleReset = async () => {
    if (!data) return;
    const now = new Date();
    now.setHours(0,0,0,0);
    const todayTimestamp = now.getTime();
    
    const currentDaysVal = calculateDays(data.currentStreakStart || todayTimestamp, todayTimestamp);
    
    const newHistoryItem: StreakHistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      startDate: data.currentStreakStart || todayTimestamp,
      endDate: todayTimestamp,
      days: currentDaysVal
    };

    const newData: UserData = {
      ...data,
      currentStreakStart: todayTimestamp,
      totalEvents: (data.totalEvents || 0) + 1, 
      history: [newHistoryItem, ...data.history]
    };

    setData(newData);
    await saveUserData(user, newData);
    setShowResetConfirm(false);
  };

  const handleStartClick = () => {
    if (!data) return;
    setTempStart(toLocalDateString(data.currentStreakStart || Date.now()));
    setIsEditingStart(true);
  };

  const handleStartSubmit = async () => {
    if (!data) return;
    const newDate = parseLocalDate(tempStart);
    if (isNaN(newDate)) return;
    if (newDate > Date.now()) {
        alert("Cannot start a streak in the future.");
        return;
    }
    const newData = { ...data, currentStreakStart: newDate };
    setData(newData);
    await saveUserData(user, newData);
    setIsEditingStart(false);
  };

  const handleGoalSubmit = async () => {
    if (!data) return;
    let newGoalDays = 30;
    if (goalMode === 'days') {
      newGoalDays = parseInt(tempGoal) || 30;
    } else {
      const targetDate = parseLocalDate(tempGoalDate);
      const start = data.currentStreakStart || Date.now();
      newGoalDays = Math.ceil((targetDate - start) / MILLIS_PER_DAY);
    }
    if (newGoalDays < 1) newGoalDays = 1;
    const newData = { ...data, goal: newGoalDays };
    setData(newData);
    await saveUserData(user, newData);
    setIsEditingGoal(false);
  };

  const handleManualHistorySubmit = async () => {
    if (!data) return;
    const start = parseLocalDate(manualStart);
    const end = parseLocalDate(manualEnd);
    if (end < start) {
      alert("End date cannot be before start date.");
      return;
    }
    const days = calculateDays(start, end);
    const newItem: StreakHistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      startDate: start,
      endDate: end,
      days
    };
    const newData = { ...data, history: [newItem, ...data.history] };
    setData(newData);
    await saveUserData(user, newData);
    setIsAddingHistory(false);
  };

  const handleEditHistoryClick = (item: StreakHistoryItem) => {
    setEditStart(toLocalDateString(item.startDate));
    setEditEnd(toLocalDateString(item.endDate));
    setIsEditingHistory(item.id);
  };

  const handleEditHistorySubmit = async () => {
    if (!data || !isEditingHistory) return;
    const start = parseLocalDate(editStart);
    const end = parseLocalDate(editEnd);
    if (end < start) {
      alert("End date cannot be before start date.");
      return;
    }
    const days = calculateDays(start, end);
    const newData = {
      ...data,
      history: data.history.map(item =>
        item.id === isEditingHistory
          ? { ...item, startDate: start, endDate: end, days }
          : item
      )
    };
    setData(newData);
    await saveUserData(user, newData);
    setIsEditingHistory(null);
  };

  // Calendar Helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => i + 1);
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePrevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const getDayStatus = (year: number, month: number, day: number) => {
    if (!data) return { isCurrent: false, isPast: false, isOverlap: false, details: [] as string[] };
    
    // Construct local midnight timestamp for this day
    const checkDate = new Date(year, month, day).getTime();

    let isCurrent = false;
    let isPast = false;
    let rangesCount = 0;
    const details: string[] = [];

    // Check Current
    if (data.currentStreakStart && checkDate >= data.currentStreakStart && checkDate <= Date.now()) {
        isCurrent = true;
        rangesCount++;
        const daysIn = Math.floor((checkDate - data.currentStreakStart) / MILLIS_PER_DAY);
        details.push(`Current Streak: Day ${daysIn}`);
    }

    // Check History
    data.history.forEach(h => {
        if (checkDate >= h.startDate && checkDate <= h.endDate) {
            isPast = true;
            rangesCount++;
            const dayOfStreak = Math.floor((checkDate - h.startDate) / MILLIS_PER_DAY);
            details.push(`Past Streak: Day ${dayOfStreak} of ${h.days}`);
        }
    });

    return {
        isCurrent,
        isPast,
        isOverlap: rangesCount > 1, 
        details
    };
  };

  const handleDayClick = (day: number) => {
    const status = getDayStatus(calendarDate.getFullYear(), calendarDate.getMonth(), day);
    if (status.isCurrent || status.isPast) {
        setSelectedDayDetails({
            date: new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day).toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}),
            statuses: [
                status.isOverlap ? 'Overlap' : (status.isCurrent ? 'Current' : 'Past')
            ],
            details: status.details
        });
    }
  };


  const longestStreak = useMemo(() => {
    if (!data) return 0;
    return Math.max(data.history.reduce((max, h) => Math.max(max, h.days), 0), currentDays);
  }, [data, currentDays]);

  const sortedHistory = useMemo(() => {
    if (!data?.history) return [];
    return [...data.history].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }, [data?.history, sortKey, sortOrder]);

  const manualEntryDays = useMemo(() => {
    const s = parseLocalDate(manualStart);
    const e = parseLocalDate(manualEnd);
    if (isNaN(s) || isNaN(e)) return 0;
    return calculateDays(s, e);
  }, [manualStart, manualEnd]);

  const editEntryDays = useMemo(() => {
    const s = parseLocalDate(editStart);
    const e = parseLocalDate(editEnd);
    if (isNaN(s) || isNaN(e)) return 0;
    return calculateDays(s, e);
  }, [editStart, editEnd]);

  const stats = useMemo(() => {
    if (!data) return { totalDays: 0, avgStreak: 0, totalStreaks: 0 };
    const allStreaks = [...data.history, { days: currentDays }];
    const totalDays = allStreaks.reduce((sum, s) => sum + s.days, 0);
    const avgStreak = allStreaks.length > 0 ? (totalDays / allStreaks.length).toFixed(1) : 0;
    return {
      totalDays,
      avgStreak,
      totalStreaks: allStreaks.length
    };
  }, [data, currentDays]);

  const chartData = useMemo(() => {
    if (!data) return [];
    const streaks = [...data.history]
      .sort((a, b) => a.endDate - b.endDate)
      .slice(-9);
    
    const formatted = streaks.map(s => ({
      name: new Date(s.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      days: s.days,
      fullDate: new Date(s.endDate).toLocaleDateString()
    }));

    formatted.push({
      name: 'Now',
      days: currentDays,
      fullDate: 'Current Ongoing'
    });

    return formatted;
  }, [data, currentDays]);

  const getConfidenceColor = (conf: string) => {
    switch(conf?.toLowerCase()) {
      case 'high': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  if (loading) return <div className="h-screen w-full bg-background flex items-center justify-center"><LoadingSpinner /></div>;

  return (
    <div className="min-h-screen bg-background text-text font-sans pb-32">
      <header className="p-6 flex justify-between items-center max-w-md mx-auto w-full">
        <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tight text-text flex items-center gap-2">
            {!logoError ? (
              <img 
                src={LOGO_URL}
                className="w-8 h-8 rounded-lg shadow-sm" 
                alt="Streaker Logo" 
                onError={() => setLogoError(true)} 
              />
            ) : (
              <Shield className="text-primary" size={24} />
            )}
            Streaker
            </h1>
            <span className="text-[9px] font-bold text-slate-300 tracking-widest uppercase ml-8">v{APP_VERSION}</span>
        </div>
        
        <div className="flex items-center gap-2">
            {/* Show install button if not already installed, supports prompt OR is iOS */}
            {!isAppInstalled && (installPrompt || isIOS()) && (
                <button 
                  onClick={handleInstallClick} 
                  className="p-2 bg-slate-100 text-primary rounded-full hover:bg-primary/10 transition-colors animate-fade-in"
                  aria-label="Install App"
                >
                  <Download size={18} />
                </button>
            )}

            {user ? (
              <button onClick={handleSignOut} className="p-2 bg-slate-100 rounded-full text-secondary hover:text-primary transition-colors">
                <LogOut size={18} />
              </button>
            ) : (
              <button 
                onClick={handleSignIn} 
                disabled={isRedirecting}
                className="flex items-center gap-2 text-[10px] font-black bg-primary text-white px-4 py-2 rounded-full shadow-md shadow-primary/20 disabled:opacity-70 transition-all hover:bg-primary/90"
              >
                {isRedirecting ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                {isRedirecting ? "Syncing..." : "Sync"}
              </button>
            )}
        </div>
      </header>

      {authError && (
        <div className="max-w-md mx-auto px-6 mb-4 animate-fade-in">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3 text-xs shadow-sm">
             <AlertCircle size={14} className="mt-0.5 shrink-0" />
             <div className="flex-1">
                <p className="font-bold">Login Issue</p>
                <p className="mt-1 opacity-80 break-words leading-relaxed">{authError}</p>
             </div>
             <button onClick={() => setAuthError(null)} className="shrink-0 p-1 hover:bg-red-100 rounded-lg"><X size={14}/></button>
          </div>
        </div>
      )}

      <main className="max-w-md mx-auto w-full px-6 flex flex-col gap-6">
        {view === 'dashboard' && data && (
          <div className="animate-fade-in flex flex-col gap-6">
            
            <div className="bg-surface rounded-[40px] p-6 flex flex-col items-center justify-center shadow-xl shadow-slate-200/50 border border-slate-100 relative">
               
               <StreakProgress start={data.currentStreakStart || Date.now()} goal={data.goal} />

               <div className="flex flex-col items-center gap-1 mb-6 mt-[-8px]">
                  <button 
                    onClick={handleStartClick}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100 hover:bg-slate-100 transition-colors group"
                  >
                    <CalendarIcon size={12} className="text-secondary" />
                    <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Started:</span>
                    <span className="text-[10px] font-bold text-text uppercase tracking-widest group-hover:text-primary transition-colors">
                      {toLocalDateString(data.currentStreakStart || Date.now())}
                    </span>
                    <Pencil size={10} className="text-slate-300 ml-1 group-hover:text-primary transition-colors" />
                  </button>
               </div>

               <div className="grid grid-cols-2 gap-2 w-full">
                  <button 
                    onClick={() => setIsEditingGoal(true)}
                    className={`rounded-2xl p-3 flex flex-col items-center justify-center border transition-all duration-200 ${isEditingGoal ? 'bg-primary/5 border-primary' : 'bg-slate-50 border-slate-100'}`}
                  >
                     <Target size={18} className="text-primary mb-1" />
                     <span className="text-lg font-black text-text">{data.goal}</span>
                     <span className="text-[8px] font-black text-secondary uppercase tracking-widest">Goal</span>
                  </button>

                  <div className="bg-slate-50 rounded-2xl p-3 flex flex-col items-center justify-center border border-slate-100">
                     <Flame size={18} className="text-orange-500 mb-1" />
                     <span className="text-lg font-black text-text">{longestStreak}</span>
                     <span className="text-[8px] font-black text-secondary uppercase tracking-widest">Best</span>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-3 flex flex-col items-center justify-center border border-slate-100">
                     <BarChart3 size={18} className="text-indigo-500 mb-1" />
                     <span className="text-lg font-black text-text">{stats.avgStreak}</span>
                     <span className="text-[8px] font-black text-secondary uppercase tracking-widest">Average</span>
                  </div>

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

            {/* Combined AI Guidance Card */}
            <div className="bg-surface border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
               <div className="flex justify-between items-start mb-6">
                 <div className="flex items-center gap-2">
                   <Sparkles size={16} className="text-primary" />
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Guidance</span>
                 </div>
                 
                 <div className="flex items-center gap-2">
                   {forecast && !loadingForecast && (
                      <div className={`text-[8px] font-black px-2 py-1 rounded-lg border uppercase tracking-widest ${getConfidenceColor(forecast.confidenceLevel)}`}>
                         {forecast.confidenceLevel} Confidence
                      </div>
                   )}
                   <button 
                     onClick={handleFetchInsights} 
                     disabled={loadingMotivation || loadingForecast} 
                     className="text-slate-300 hover:text-primary p-1 transition-colors"
                   >
                     <RefreshCw size={14} className={loadingMotivation || loadingForecast ? "animate-spin" : ""} />
                   </button>
                 </div>
               </div>

               {/* Motivation */}
               <div className="mb-6 relative z-10">
                 <p className="text-lg font-bold text-text leading-snug italic">
                   {loadingMotivation ? (
                      <span className="flex items-center gap-2 text-slate-300 text-sm"><Loader2 size={14} className="animate-spin" /> Consulting the oracle...</span>
                   ) : (
                      `"${motivation}"`
                   )}
                 </p>
               </div>

               {/* Divider */}
               <div className="w-full h-px bg-slate-100 mb-4"></div>

               {/* Forecast */}
               <div className="flex flex-col gap-3">
                   <div className="flex items-center gap-2 mb-1">
                     <TrendingUp size={12} className="text-secondary" />
                     <span className="text-[9px] font-black text-secondary uppercase tracking-widest">Trajectory</span>
                   </div>
                   
                   {loadingForecast ? (
                     <div className="flex items-center gap-2 text-slate-300 text-xs font-bold">
                       <Loader2 size={12} className="animate-spin" /> Analyzing patterns...
                     </div>
                   ) : (
                     <>
                       <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                         {forecast?.prediction || "Maintain discipline to reach your goal."}
                       </p>
                       
                       {forecast?.insight && (
                          <div className="bg-slate-50 rounded-xl p-3 flex gap-3 items-start border border-slate-100 mt-1">
                             <Lightbulb size={14} className="text-amber-500 shrink-0 mt-0.5" />
                             <p className="text-xs font-medium text-slate-500">
                                {forecast.insight}
                             </p>
                          </div>
                       )}
                     </>
                   )}
               </div>
            </div>
          </div>
        )}

        {view === 'history' && data && (
          <div className="animate-fade-in flex flex-col gap-6">
            {/* History View Content ... (Same as before) */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-text">History</h2>
              <button 
                onClick={() => setIsAddingHistory(true)}
                className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-all active:scale-95 flex items-center gap-2"
              >
                <Plus size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest mr-1">Add Entry</span>
              </button>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-2xl w-full">
                <button 
                  onClick={() => setHistoryTab('list')}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${historyTab === 'list' ? 'bg-white shadow-sm text-primary' : 'text-secondary'}`}
                >
                  <ListIcon size={14} /> List
                </button>
                <button 
                  onClick={() => setHistoryTab('trends')}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${historyTab === 'trends' ? 'bg-white shadow-sm text-primary' : 'text-secondary'}`}
                >
                  <BarChart3 size={14} /> Trends
                </button>
                <button 
                  onClick={() => setHistoryTab('calendar')}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${historyTab === 'calendar' ? 'bg-white shadow-sm text-primary' : 'text-secondary'}`}
                >
                  <CalendarIcon size={14} /> Calendar
                </button>
            </div>

            {historyTab === 'calendar' && (
              <div className="animate-fade-in flex flex-col gap-4">
                 <div className="bg-surface p-4 rounded-3xl border border-slate-200 shadow-sm">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-4 px-2">
                       <button onClick={handlePrevMonth} className="p-2 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-xl transition-colors">
                          <ChevronLeft size={20} />
                       </button>
                       <span className="text-sm font-black uppercase tracking-widest text-text">
                          {calendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                       </span>
                       <button onClick={handleNextMonth} className="p-2 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-xl transition-colors">
                          <ChevronRight size={20} />
                       </button>
                    </div>

                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                       {['S','M','T','W','T','F','S'].map((d,i) => (
                          <div key={i} className="text-[9px] font-bold text-slate-300">{d}</div>
                       ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                       {/* Empty Slots */}
                       {Array.from({ length: getFirstDayOfMonth(calendarDate) }).map((_, i) => (
                          <div key={`empty-${i}`} className="aspect-square" />
                       ))}
                       
                       {/* Days */}
                       {getDaysInMonth(calendarDate).map(day => {
                          const { isCurrent, isPast, isOverlap } = getDayStatus(calendarDate.getFullYear(), calendarDate.getMonth(), day);
                          
                          let bgClass = "bg-slate-50 text-slate-300"; // Default
                          if (isOverlap) {
                             bgClass = "bg-gradient-to-br from-amber-200 to-emerald-200 text-slate-800 font-bold border border-slate-300";
                          } else if (isCurrent) {
                             bgClass = "bg-primary/10 text-primary font-bold border border-primary/20";
                          } else if (isPast) {
                             bgClass = "bg-amber-100 text-amber-900 font-bold border border-amber-200";
                          }

                          // Dim future dates
                          const thisDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day).getTime();
                          if (thisDate > Date.now()) {
                            bgClass = "bg-transparent text-slate-200 opacity-50";
                          }

                          return (
                             <button 
                                key={day} 
                                onClick={() => handleDayClick(day)}
                                disabled={thisDate > Date.now()}
                                className={`aspect-square rounded-lg flex items-center justify-center text-xs transition-all relative ${bgClass} ${(isCurrent || isPast) ? 'hover:scale-105 shadow-sm' : ''}`}
                             >
                                {day}
                                {/* Indicator Dot for Overlaps */}
                                {isOverlap && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-400 rounded-full" />}
                             </button>
                          );
                       })}
                    </div>
                 </div>

                 {/* Legend */}
                 <div className="flex gap-4 justify-center py-2 px-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full bg-primary/10 border border-primary/20"></div>
                       <span className="text-[9px] font-bold text-secondary uppercase">Current</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full bg-amber-100 border border-amber-200"></div>
                       <span className="text-[9px] font-bold text-secondary uppercase">Past</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-200 to-emerald-200 border border-slate-300"></div>
                       <span className="text-[9px] font-bold text-secondary uppercase">Both</span>
                    </div>
                 </div>
              </div>
            )}

            {historyTab === 'trends' ? (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-1">
                    <span className="text-[9px] font-black text-secondary uppercase tracking-widest">Total Days Denied</span>
                    <span className="text-2xl font-black text-primary">{stats.totalDays}</span>
                  </div>
                  <div className="bg-surface p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-1">
                    <span className="text-[9px] font-black text-secondary uppercase tracking-widest">Avg Streak Length</span>
                    <span className="text-2xl font-black text-text">{stats.avgStreak}</span>
                  </div>
                </div>

                <div className="bg-surface p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-[10px] font-black text-secondary uppercase tracking-widest mb-6 flex items-center gap-2">
                    <BarChart3 size={14} className="text-primary" /> Performance History
                  </h3>
                  <div className="h-64 w-full">
                    {chartData.length > 1 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} 
                            dy={10}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} 
                          />
                          <Tooltip 
                            cursor={{ fill: 'rgba(13, 148, 136, 0.05)' }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-white p-3 rounded-2xl shadow-xl border border-slate-100 text-xs font-bold">
                                    <p className="text-secondary mb-1 uppercase tracking-tighter text-[10px]">{payload[0].payload.fullDate}</p>
                                    <p className="text-primary">{payload[0].value} Days</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="days" radius={[6, 6, 6, 6]} barSize={20}>
                            {chartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={index === chartData.length - 1 ? '#0d9488' : '#e2e8f0'} 
                                className="transition-all hover:fill-primary/80"
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-300 text-xs font-medium italic">
                        Insufficient data for visualization
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : ( historyTab === 'list' &&
              <div className="flex flex-col gap-6 animate-fade-in">
                {/* Sorting Controls */}
                {data.history.length > 0 && (
                  <div className="flex items-center justify-between bg-surface p-2 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex gap-1">
                      <button 
                        onClick={() => setSortKey('startDate')}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sortKey === 'startDate' ? 'bg-primary text-white' : 'text-slate-400 bg-slate-50 hover:bg-slate-100'}`}
                      >
                        Start
                      </button>
                      <button 
                        onClick={() => setSortKey('endDate')}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sortKey === 'endDate' ? 'bg-primary text-white' : 'text-slate-400 bg-slate-50 hover:bg-slate-100'}`}
                      >
                        End
                      </button>
                      <button 
                        onClick={() => setSortKey('days')}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sortKey === 'days' ? 'bg-primary text-white' : 'text-slate-400 bg-slate-50 hover:bg-slate-100'}`}
                      >
                        Days
                      </button>
                    </div>
                    <button 
                      onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="p-2 text-primary hover:bg-primary/5 rounded-xl transition-colors"
                    >
                      {sortOrder === 'asc' ? <ArrowUpNarrowWide size={18} /> : <ArrowDownWideNarrow size={18} />}
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-3 pb-12">
                  {data.history.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm">No history yet. Keep going!</div>
                  ) : (
                    sortedHistory.map((streak) => (
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
                        <div className="flex gap-1">
                          <button onClick={() => handleEditHistoryClick(streak)} className="p-2 text-slate-200 hover:text-primary transition-colors">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => {
                            const newData = { 
                              ...data, 
                              history: data.history.filter(item => item.id !== streak.id) 
                            };
                            setData(newData);
                            saveUserData(user, newData);
                          }} className="p-2 text-slate-200 hover:text-danger transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
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
            </div>
          </div>
        )}
      </main>

      {/* Calendar Details Modal */}
      {selectedDayDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6 animate-fade-in">
           <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl relative">
              <button 
                onClick={() => setSelectedDayDetails(null)} 
                className="absolute top-4 right-4 text-slate-400 hover:text-text"
              >
                <X size={20} />
              </button>
              
              <div className="flex flex-col items-center text-center gap-2">
                 <div className="p-3 bg-primary/10 rounded-2xl text-primary mb-2">
                    <CalendarIcon size={24} />
                 </div>
                 <h3 className="text-xl font-black text-text mb-1">{selectedDayDetails.date}</h3>
                 
                 <div className="flex gap-2 mb-4">
                     {selectedDayDetails.statuses.map((status, idx) => (
                        <span key={idx} className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${
                            status === 'Current' ? 'bg-primary/10 text-primary border-primary/20' : 
                            status === 'Past' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                            'bg-gradient-to-r from-amber-100 to-emerald-100 text-slate-800 border-slate-200'
                        }`}>
                           {status}
                        </span>
                     ))}
                 </div>

                 <div className="w-full flex flex-col gap-2">
                    {selectedDayDetails.details.map((detail, idx) => (
                        <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm font-medium text-slate-600">
                           {detail}
                        </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Install Instruction Modal for iOS/Other */}
      {showInstallModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6 animate-fade-in">
           <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl relative">
              <button 
                onClick={() => setShowInstallModal(false)} 
                className="absolute top-4 right-4 text-slate-400 hover:text-text"
              >
                <X size={20} />
              </button>
              
              <div className="flex flex-col items-center text-center gap-4">
                 <div className="p-4 bg-primary/10 rounded-2xl text-primary mb-2">
                    <Download size={32} />
                 </div>
                 <h3 className="text-xl font-black text-text">Install App</h3>
                 <p className="text-sm text-secondary font-medium leading-relaxed">
                    To install Streaker on your device, tap the <strong className="text-text">Share</strong> button in your browser menu and select <strong className="text-text">Add to Home Screen</strong>.
                 </p>
                 
                 <div className="w-full bg-slate-50 rounded-xl p-4 flex flex-col gap-3 mt-2 border border-slate-100">
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                       <Share size={16} className="text-primary" />
                       <span>1. Tap Share</span>
                    </div>
                    <div className="w-full h-px bg-slate-200"></div>
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                       <PlusSquare size={16} className="text-primary" />
                       <span>2. Add to Home Screen</span>
                    </div>
                 </div>

                 <button 
                    onClick={() => setShowInstallModal(false)}
                    className="w-full py-3 bg-primary text-white rounded-xl font-black text-sm mt-2"
                 >
                    Got it
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {isAddingHistory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-2xl font-black mb-6">Add History</h3>
            <div className="space-y-4 mb-8">
              <input type="date" value={manualStart} onChange={e => setManualStart(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100" />
              <input type="date" value={manualEnd} onChange={e => setManualEnd(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100" />
              <div className="text-center font-bold text-primary">{manualEntryDays} Days</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsAddingHistory(false)} className="flex-1 p-4 bg-slate-100 rounded-2xl font-bold">Cancel</button>
              <button onClick={handleManualHistorySubmit} className="flex-1 p-4 bg-primary text-white rounded-2xl font-black">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ... (Existing modals for Editing history, Editing start date, Editing goal, Reset confirmation remain unchanged) ... */}
      {/* Edit History Modal */}
      {isEditingHistory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-2xl font-black mb-6">Edit Entry</h3>
            <div className="space-y-4 mb-8">
              <div className="flex flex-col gap-1">
                 <span className="text-[10px] font-black uppercase tracking-widest text-secondary">Start Date</span>
                 <input type="date" value={editStart} onChange={e => setEditStart(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100" />
              </div>
              <div className="flex flex-col gap-1">
                 <span className="text-[10px] font-black uppercase tracking-widest text-secondary">End Date</span>
                 <input type="date" value={editEnd} onChange={e => setEditEnd(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100" />
              </div>
              <div className="text-center font-bold text-primary">{editEntryDays} Days</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsEditingHistory(null)} className="flex-1 p-4 bg-slate-100 rounded-2xl font-bold">Cancel</button>
              <button onClick={handleEditHistorySubmit} className="flex-1 p-4 bg-primary text-white rounded-2xl font-black">Update</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Start Date Modal */}
      {isEditingStart && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-2xl font-black mb-6">Edit Start Date</h3>
            <div className="mb-8">
               <input type="date" value={tempStart} onChange={e => setTempStart(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl text-center font-bold text-lg" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsEditingStart(false)} className="flex-1 p-4 bg-slate-100 rounded-2xl font-bold">Cancel</button>
              <button onClick={handleStartSubmit} className="flex-1 p-4 bg-primary text-white rounded-2xl font-black">Update</button>
            </div>
          </div>
        </div>
      )}

      {isEditingGoal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-2xl font-black mb-6">Edit Goal</h3>
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
              <button onClick={() => setGoalMode('days')} className={`flex-1 py-3 rounded-xl text-xs font-black ${goalMode === 'days' ? 'bg-white text-primary' : ''}`}>Days</button>
              <button onClick={() => setGoalMode('date')} className={`flex-1 py-3 rounded-xl text-xs font-black ${goalMode === 'date' ? 'bg-white text-primary' : ''}`}>Date</button>
            </div>
            <div className="mb-8">
              {goalMode === 'days' ? (
                <input type="number" value={tempGoal} onChange={e => setTempGoal(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl text-center text-2xl font-black" />
              ) : (
                <input type="date" value={tempGoalDate} onChange={e => setTempGoalDate(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl text-center" />
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsEditingGoal(false)} className="flex-1 p-4 bg-slate-100 rounded-2xl font-bold">Cancel</button>
              <button onClick={handleGoalSubmit} className="flex-1 p-4 bg-primary text-white rounded-2xl font-black">Set</button>
            </div>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-2xl font-black mb-4">Reset?</h3>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 p-4 bg-slate-100 rounded-2xl font-bold">Cancel</button>
              <button onClick={handleReset} className="flex-1 p-4 bg-danger text-white rounded-2xl font-black">Reset</button>
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
    <span className="text-[8px] font-black mt-1 uppercase">{label}</span>
  </button>
);