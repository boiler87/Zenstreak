import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  RotateCcw, 
  History as HistoryIcon, 
  Settings, 
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
  ChevronLeft, 
  ChevronRight,
  Smile,
  Activity,
  Trophy,
  Crown,
  Info,
  Award
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

import { UserData, StreakHistoryItem, ForecastResponse, CelebrationResponse } from './types';
import { 
  getUserData, 
  saveUserData,
  subscribeToAuth,
  signInWithGoogle,
  logout,
} from './services/firebase';
import { getMotivation, getStreakForecast, getMilestoneCelebration } from './services/geminiService';

// Define User type as any to handle missing exports in environment
type User = any;

// --- Constants ---
const APP_VERSION = "3.6.0";
const MILLIS_PER_DAY = 1000 * 60 * 60 * 24;

// --- Gamification Data Structures (Non-Electrical) ---
const RANK_METADATA = [
  { level: 1, name: "Seed", factor: 0, color: "#94a3b8", icon: UserIcon },
  { level: 2, name: "Momentum", factor: 0.1, color: "#38bdf8", icon: Activity },
  { level: 3, name: "Intentional", factor: 0.25, color: "#fbbf24", icon: Target },
  { level: 4, name: "Resilience", factor: 0.45, color: "#f59e0b", icon: Shield },
  { level: 5, name: "Clarity", factor: 0.65, color: "#d97706", icon: Sparkles },
  { level: 6, name: "Ascendant", factor: 0.85, color: "#d4af37", icon: Crown },
  { level: 7, name: "Mastery", factor: 1.0, color: "#000000", icon: Trophy },
];

const Logo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 512 512" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M166 182C128.5 182 98 212.5 98 250C98 287.5 128.5 318 166 318C189.5 318 211 306 224 286L288 226C301 206 322.5 194 346 194C383.5 194 414 224.5 414 262C414 299.5 383.5 330 346 330C322.5 330 301 318 288 298L224 238C211 218 189.5 206 166 206C142.5 206 122 226.5 122 250C122 273.5 142.5 294 166 294" 
      stroke="#d4af37" 
      strokeWidth="28" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <text 
      x="50%" 
      y="52%" 
      dominantBaseline="middle" 
      textAnchor="middle" 
      fill="black" 
      fontSize="72" 
      fontWeight="900" 
      fontFamily="'Inter', sans-serif"
      letterSpacing="-2"
    >
      Streaker
    </text>
  </svg>
);

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

const parseLocalDate = (dateString: string): number => {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
};

const LoadingSpinner = () => (
  <div className="flex flex-col gap-4 justify-center items-center h-full text-primary animate-pulse">
    <div className="w-12 h-12 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
    <span className="text-xs font-bold tracking-widest uppercase">Syncing Data...</span>
  </div>
);

const StreakProgress = ({ start, goal, currentRank }: { start: number; goal: number, currentRank: any }) => {
  const days = calculateDays(start);
  const percentage = Math.min(100, Math.max(0, (days / goal) * 100));
  const radius = 90; 
  const stroke = 12; 
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center select-none my-6">
      <div 
        className="absolute inset-0 rounded-full blur-3xl opacity-30 transition-all duration-1000 animate-pulse"
        style={{ backgroundColor: currentRank.color, transform: `scale(${1 + (days / 100)})` }}
      />
      
      <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg] transition-all duration-1000 relative z-10">
        <defs>
          <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={currentRank.color} />
            <stop offset="100%" stopColor="#d4af37" />
          </linearGradient>
          <filter id="glow">
             <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
             <feMerge>
                 <feMergeNode in="coloredBlur"/>
                 <feMergeNode in="SourceGraphic"/>
             </feMerge>
          </filter>
        </defs>
        <circle stroke="#f8fafc" strokeWidth={stroke} fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
        <circle 
          stroke="url(#progress-gradient)" 
          strokeWidth={stroke} 
          strokeDasharray={circumference + ' ' + circumference} 
          style={{ strokeDashoffset, filter: days > 7 ? 'url(#glow)' : 'none' }} 
          strokeLinecap="round" 
          fill="transparent" 
          r={normalizedRadius} 
          cx={radius} 
          cy={radius} 
          className="transition-all duration-1000"
        />
      </svg>
      
      <div className="absolute flex flex-col items-center z-20">
        <span className="text-6xl font-black text-text tracking-tighter drop-shadow-sm">{days}</span>
        <span className="text-[10px] font-black text-secondary uppercase tracking-[0.4em] mt-1">Days</span>
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

  const [motivation, setMotivation] = useState<string>("True strength is found in discipline.");
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

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDayDetails, setSelectedDayDetails] = useState<{date: string, statuses: string[], details: string[]} | null>(null);

  // Milestone Celebration State
  const [celebration, setCelebration] = useState<CelebrationResponse | null>(null);
  const [isCelebrating, setIsCelebrating] = useState(false);

  // Username feature state
  const [tempUsername, setTempUsername] = useState("");

  useEffect(() => {
    setIsAppInstalled(isStandalone());
  }, []);

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
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000); 
    return () => clearInterval(timer);
  }, []);

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

  useEffect(() => {
    const loadData = async () => {
      try {
        const fetched = await getUserData(user);
        setData(fetched);
        setTempGoal(fetched.goal.toString());
        setTempUsername(fetched.username || "");
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

  // --- Dynamic Ranks Logic ---
  const dynamicRanks = useMemo(() => {
    const goal = data?.goal || 30;
    return RANK_METADATA.map(rank => ({
      ...rank,
      minDays: Math.floor(rank.factor * goal)
    }));
  }, [data?.goal]);

  const currentRank = useMemo(() => {
    return [...dynamicRanks].reverse().find(rank => currentDays >= rank.minDays) || dynamicRanks[0];
  }, [dynamicRanks, currentDays]);

  const nextRank = useMemo(() => {
    return dynamicRanks.find(rank => currentDays < rank.minDays) || null;
  }, [dynamicRanks, currentDays]);
  
  const focusScore = useMemo(() => {
    if (!data) return 0;
    const totalLifetimeDays = data.history.reduce((sum, h) => sum + h.days, 0) + currentDays;
    return (currentDays * 10) + Math.floor(totalLifetimeDays / 2);
  }, [data, currentDays]);

  // Milestone check logic
  useEffect(() => {
    if (!data || loading) return;

    const milestones = [
      { id: `goal_${data.goal}`, name: 'Target Threshold Hit', condition: currentDays >= data.goal },
      { id: `rank_${currentRank.name}`, name: `Rank Attained: ${currentRank.name}`, condition: currentRank.level > 1 },
      { id: 'days_7', name: '7 Days Focused', condition: currentDays >= 7 },
      { id: 'days_14', name: '14 Days Focused', condition: currentDays >= 14 },
      { id: 'days_30', name: '30 Days Focused', condition: currentDays >= 30 },
      { id: 'days_50', name: '50 Days Focused', condition: currentDays >= 50 },
      { id: 'days_90', name: '90 Days Focused', condition: currentDays >= 90 },
      { id: 'days_100', name: '100 Days Focused', condition: currentDays >= 100 },
    ];

    const uncelebrated = milestones.find(m => m.condition && !(data.celebratedMilestones || []).includes(m.id));

    if (uncelebrated) {
      const triggerCelebration = async () => {
        const res = await getMilestoneCelebration(uncelebrated.name, currentDays, currentRank.name);
        setCelebration(res);
        setIsCelebrating(true);
        
        // Save milestone as celebrated
        const newData = {
          ...data,
          celebratedMilestones: [...(data.celebratedMilestones || []), uncelebrated.id]
        };
        setData(newData);
        saveUserData(user, newData);
      };
      triggerCelebration();
    }
  }, [currentDays, currentRank.name, data, loading, user]);

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
      setMotivation("Stay committed to the path of mastery.");
    } finally {
      setLoadingMotivation(false);
      setLoadingForecast(false);
    }
  }, [data, currentDays]);

  useEffect(() => {
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
      history: [newHistoryItem, ...data.history],
      celebratedMilestones: [] // Reset milestones on relapse to allow re-celebration
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
        alert("Cannot start a journey in the future.");
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

  const handleUsernameSubmit = async () => {
    if (!data) return;
    const newData = { ...data, username: tempUsername };
    setData(newData);
    await saveUserData(user, newData);
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
    const checkDate = new Date(year, month, day).getTime();
    let isCurrent = false;
    let isPast = false;
    let rangesCount = 0;
    const details: string[] = [];
    if (data.currentStreakStart && checkDate >= data.currentStreakStart && checkDate <= Date.now()) {
        isCurrent = true;
        rangesCount++;
        const daysIn = Math.floor((checkDate - data.currentStreakStart) / MILLIS_PER_DAY);
        details.push(`Current Journey: Day ${daysIn}`);
    }
    data.history.forEach(h => {
        if (checkDate >= h.startDate && checkDate <= h.endDate) {
            isPast = true;
            rangesCount++;
            const dayOfStreak = Math.floor((checkDate - h.startDate) / MILLIS_PER_DAY);
            details.push(`Past Journey: Day ${dayOfStreak} of ${h.days}`);
        }
    });
    return { isCurrent, isPast, isOverlap: rangesCount > 1, details };
  };

  const handleDayClick = (day: number) => {
    const status = getDayStatus(calendarDate.getFullYear(), calendarDate.getMonth(), day);
    if (status.isCurrent || status.isPast) {
        setSelectedDayDetails({
            date: new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day).toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}),
            statuses: [status.isOverlap ? 'Overlap' : (status.isCurrent ? 'Current' : 'Past')],
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

  const stats = useMemo(() => {
    if (!data) return { totalDays: 0, avgStreak: 0, totalStreaks: 0 };
    const allStreaks = [...data.history, { days: currentDays }];
    const totalDays = allStreaks.reduce((sum, s) => sum + s.days, 0);
    const avgStreak = allStreaks.length > 0 ? (totalDays / allStreaks.length).toFixed(1) : 0;
    return { totalDays, avgStreak, totalStreaks: allStreaks.length };
  }, [data, currentDays]);

  const chartData = useMemo(() => {
    if (!data) return [];
    const streaks = [...data.history].sort((a, b) => a.endDate - b.endDate).slice(-9);
    const formatted = streaks.map(s => ({
      name: new Date(s.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      days: s.days,
      fullDate: new Date(s.endDate).toLocaleDateString()
    }));
    formatted.push({ name: 'Now', days: currentDays, fullDate: 'Current Ongoing' });
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
      <header className="px-6 pt-8 pb-4 flex justify-between items-start max-w-md mx-auto w-full">
        <div className="flex flex-col items-start">
            {data?.username && (
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] animate-fade-in mb-[-12px] ml-4">
                Welcome, {data.username}
              </span>
            )}
            <div className="flex items-center">
              <Logo className="w-24 h-24 -ml-4" />
            </div>
            <span className="text-[9px] font-bold text-slate-300 tracking-widest uppercase ml-4 -mt-6">v{APP_VERSION}</span>
        </div>
        
        <div className="flex items-center gap-2 mt-6">
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
                <p className="font-bold">Sync Error</p>
                <p className="mt-1 opacity-80 break-words leading-relaxed">{authError}</p>
             </div>
             <button onClick={() => setAuthError(null)} className="shrink-0 p-1 hover:bg-red-100 rounded-lg"><X size={14}/></button>
          </div>
        </div>
      )}

      <main className="max-w-md mx-auto w-full px-6 flex flex-col gap-6">
        {view === 'dashboard' && data && (
          <div className="animate-fade-in flex flex-col gap-6">
            <div className="bg-surface rounded-[40px] p-6 flex flex-col items-center justify-center shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
               
               <StreakProgress start={data.currentStreakStart || Date.now()} goal={data.goal} currentRank={currentRank} />

               {/* Rank Badge Indicator & Next Rank Info */}
               <div className="flex flex-col items-center gap-3 mt-2 mb-6 z-20 w-full px-4">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-100 shadow-sm">
                    <currentRank.icon size={14} style={{ color: currentRank.color }} className="animate-pulse" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-text">Current Rank: {currentRank.name}</span>
                  </div>
                  
                  {nextRank && (
                    <div className="flex flex-col items-center w-full max-w-[200px]">
                       <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                          <div 
                            className="h-full transition-all duration-1000" 
                            style={{ 
                              backgroundColor: currentRank.color, 
                              width: `${((currentDays - currentRank.minDays) / (nextRank.minDays - currentRank.minDays)) * 100}%` 
                            }} 
                          />
                       </div>
                       <span className="text-[12px] font-black text-slate-500 uppercase tracking-widest text-center">
                          {nextRank.minDays - currentDays} Days until {nextRank.name}
                       </span>
                    </div>
                  )}
               </div>
               
               <div className="flex flex-col items-center gap-1 mb-6">
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

               <div className="grid grid-cols-2 gap-2 w-full relative z-20">
                  <div className="bg-slate-50 rounded-2xl p-3 flex flex-col items-center justify-center border border-slate-100">
                     <Target size={18} className="text-primary mb-1" />
                     <span className="text-lg font-black text-text">{focusScore}</span>
                     <span className="text-[8px] font-black text-secondary uppercase tracking-widest">Focus Score</span>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3 flex flex-col items-center justify-center border border-slate-100">
                     <Flame size={18} className="text-orange-500 mb-1" />
                     <span className="text-lg font-black text-text">{longestStreak}</span>
                     <span className="text-[8px] font-black text-secondary uppercase tracking-widest">Max Mastery</span>
                  </div>
                  <button onClick={() => setIsEditingGoal(true)} className={`rounded-2xl p-3 flex flex-col items-center justify-center border transition-all duration-200 ${isEditingGoal ? 'bg-primary/5 border-primary' : 'bg-slate-50 border-slate-100'}`}>
                     <Milestone size={18} className="text-primary mb-1" />
                     <span className="text-lg font-black text-text">{data.goal}</span>
                     <span className="text-[8px] font-black text-secondary uppercase tracking-widest">Goal</span>
                  </button>
                  <button onClick={() => setShowResetConfirm(true)} className="bg-slate-50 hover:bg-red-50 rounded-2xl p-3 flex flex-col items-center justify-center border border-slate-100 hover:border-red-100 transition-colors group active:scale-95">
                     <RotateCcw size={18} className="text-slate-400 group-hover:text-danger mb-1 transition-colors" />
                     <span className="text-lg font-black text-slate-300 group-hover:text-danger transition-colors">Reset</span>
                     <span className="text-[8px] font-black text-slate-300 group-hover:text-danger/60 uppercase tracking-widest transition-colors">Relapse</span>
                  </button>
               </div>
            </div>

            <div className="bg-surface border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
               <div className="flex justify-between items-start mb-6">
                 <div className="flex items-center gap-2">
                   <Sparkles size={16} className="text-primary" />
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daily Insight</span>
                 </div>
                 <div className="flex items-center gap-2">
                   {forecast && !loadingForecast && (
                      <div className={`text-[8px] font-black px-2 py-1 rounded-lg border uppercase tracking-widest ${getConfidenceColor(forecast.confidenceLevel)}`}>
                         {forecast.confidenceLevel} Path
                      </div>
                   )}
                   <button onClick={handleFetchInsights} disabled={loadingMotivation || loadingForecast} className="text-slate-300 hover:text-primary p-1 transition-colors">
                     <RefreshCw size={14} className={loadingMotivation || loadingForecast ? "animate-spin" : ""} />
                   </button>
                 </div>
               </div>
               <div className="mb-6 relative z-10">
                 <p className="text-lg font-bold text-text leading-snug italic">
                   {loadingMotivation ? <span className="flex items-center gap-2 text-slate-300 text-sm"><Loader2 size={14} className="animate-spin" /> Querying the Source...</span> : `"${motivation}"`}
                 </p>
               </div>
               <div className="w-full h-px bg-slate-100 mb-4"></div>
               <div className="flex flex-col gap-3">
                   <div className="flex items-center gap-2 mb-1">
                     <TrendingUp size={12} className="text-secondary" />
                     <span className="text-[9px] font-black text-secondary uppercase tracking-widest">Growth Trajectory</span>
                   </div>
                   {loadingForecast ? (
                     <div className="flex items-center gap-2 text-slate-300 text-xs font-bold">
                       <Loader2 size={12} className="animate-spin" /> Analyzing patterns...
                     </div>
                   ) : (
                     <>
                       <p className="text-sm font-semibold text-slate-700 leading-relaxed">{forecast?.prediction || "Maintain focus to secure your progress."}</p>
                       {forecast?.insight && (
                          <div className="bg-slate-50 rounded-xl p-3 flex gap-3 items-start border border-slate-100 mt-1">
                             <Lightbulb size={14} className="text-amber-500 shrink-0 mt-0.5" />
                             <p className="text-xs font-medium text-slate-500">{forecast.insight}</p>
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
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-text">History</h2>
              <button onClick={() => setIsAddingHistory(true)} className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-all active:scale-95 flex items-center gap-2">
                <Plus size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest mr-1">Add Entry</span>
              </button>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-2xl w-full">
                <button onClick={() => setHistoryTab('list')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${historyTab === 'list' ? 'bg-white shadow-sm text-primary' : 'text-secondary'}`}><ListIcon size={14} /> List</button>
                <button onClick={() => setHistoryTab('trends')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${historyTab === 'trends' ? 'bg-white shadow-sm text-primary' : 'text-secondary'}`}><BarChart3 size={14} /> Trends</button>
                <button onClick={() => setHistoryTab('calendar')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${historyTab === 'calendar' ? 'bg-white shadow-sm text-primary' : 'text-secondary'}`}><CalendarIcon size={14} /> Calendar</button>
            </div>

            {historyTab === 'calendar' && (
              <div className="animate-fade-in flex flex-col gap-4">
                 <div className="bg-surface p-4 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4 px-2">
                       <button onClick={handlePrevMonth} className="p-2 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-xl transition-colors"><ChevronLeft size={20} /></button>
                       <span className="text-sm font-black uppercase tracking-widest text-text">{calendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
                       <button onClick={handleNextMonth} className="p-2 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-xl transition-colors"><ChevronRight size={20} /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-2 text-center">{['S','M','T','W','T','F','S'].map((d,i) => <div key={i} className="text-[9px] font-bold text-slate-300">{d}</div>)}</div>
                    <div className="grid grid-cols-7 gap-1">
                       {Array.from({ length: getFirstDayOfMonth(calendarDate) }).map((_, i) => <div key={`empty-${i}`} className="aspect-square" />)}
                       {getDaysInMonth(calendarDate).map(day => {
                          const { isCurrent, isPast, isOverlap } = getDayStatus(calendarDate.getFullYear(), calendarDate.getMonth(), day);
                          let bgClass = "bg-slate-50 text-slate-300";
                          if (isOverlap) bgClass = "bg-gradient-to-br from-amber-200 to-emerald-200 text-slate-800 font-bold border border-slate-300";
                          else if (isCurrent) bgClass = "bg-primary/10 text-primary font-bold border border-primary/20";
                          else if (isPast) bgClass = "bg-amber-100 text-amber-900 font-bold border border-amber-200";
                          const thisDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day).getTime();
                          if (thisDate > Date.now()) bgClass = "bg-transparent text-slate-200 opacity-50";
                          return (
                             <button key={day} onClick={() => handleDayClick(day)} disabled={thisDate > Date.now()} className={`aspect-square rounded-lg flex items-center justify-center text-xs transition-all relative ${bgClass} ${(isCurrent || isPast) ? 'hover:scale-105 shadow-sm' : ''}`}>
                                {day}
                                {isOverlap && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-400 rounded-full" />}
                             </button>
                          );
                       })}
                    </div>
                 </div>
              </div>
            )}

            {historyTab === 'trends' && (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-1"><span className="text-[9px] font-black text-secondary uppercase tracking-widest">Total Days Gained</span><span className="text-2xl font-black text-primary">{stats.totalDays}</span></div>
                  <div className="bg-surface p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-1"><span className="text-[9px] font-black text-secondary uppercase tracking-widest">Avg Growth Length</span><span className="text-2xl font-black text-text">{stats.avgStreak}</span></div>
                </div>
                <div className="bg-surface p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-[10px] font-black text-secondary uppercase tracking-widest mb-6 flex items-center gap-2"><BarChart3 size={14} className="text-primary" /> Mastery History</h3>
                  <div className="h-64 w-full">
                    {chartData.length > 1 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} dy={10}/>
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                          <Tooltip cursor={{ fill: 'rgba(212, 175, 55, 0.05)' }} content={({ active, payload }) => {
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
                            {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#d4af37' : '#e2e8f0'} className="transition-all hover:fill-primary/80"/>)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-300 text-xs font-medium italic">Insufficient history for visualization</div>}
                  </div>
                </div>
              </div>
            )}

            {historyTab === 'list' && (
              <div className="flex flex-col gap-6 animate-fade-in">
                {data.history.length > 0 && (
                  <div className="flex items-center justify-between bg-surface p-2 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex gap-1">
                      {['startDate', 'endDate', 'days'].map(key => (
                        <button key={key} onClick={() => setSortKey(key as any)} className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sortKey === key ? 'bg-primary text-white' : 'text-slate-400 bg-slate-50 hover:bg-slate-100'}`}>{key.replace('Date','')}</button>
                      ))}
                    </div>
                    <button onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="p-2 text-primary hover:bg-primary/5 rounded-xl transition-colors">{sortOrder === 'asc' ? <ArrowUpNarrowWide size={18} /> : <ArrowDownWideNarrow size={18} />}</button>
                  </div>
                )}
                <div className="flex flex-col gap-3 pb-12">
                  {data.history.length === 0 ? <div className="text-center py-10 text-slate-400 text-sm italic">The path is clear. Begin your journey.</div> : sortedHistory.map((streak) => (
                      <div key={streak.id} className="bg-surface p-4 rounded-2xl border border-slate-200 flex justify-between items-center group hover:shadow-md transition-all">
                        <div className="flex flex-col">
                          <div className="flex items-baseline gap-2"><span className="text-xl font-black text-text">{streak.days}</span><span className="text-[10px] font-black text-secondary uppercase">Days Mastered</span></div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(streak.startDate).toLocaleDateString()} - {new Date(streak.endDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => handleEditHistoryClick(streak)} className="p-2 text-slate-200 hover:text-primary transition-colors"><Pencil size={16} /></button>
                          <button onClick={() => {
                            const newData = { ...data, history: data.history.filter(item => item.id !== streak.id) };
                            setData(newData);
                            saveUserData(user, newData);
                          }} className="p-2 text-slate-200 hover:text-danger transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'settings' && data && (
          <div className="animate-fade-in flex flex-col gap-6">
            <h2 className="text-2xl font-black text-text">Configuration</h2>
            
            <div className="bg-surface p-6 rounded-3xl border border-slate-200 shadow-sm">
               <h3 className="text-[10px] font-black mb-4 text-secondary uppercase tracking-widest flex items-center gap-2">
                 <Smile size={14} className="text-primary" /> Identity
               </h3>
               <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Callsign</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="e.g. Operator" 
                      value={tempUsername} 
                      onChange={(e) => setTempUsername(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    />
                    <button 
                      onClick={handleUsernameSubmit}
                      className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-xs hover:bg-primary/90 active:scale-95 transition-all"
                    >
                      Save
                    </button>
                  </div>
               </div>
            </div>

            <div className="bg-surface p-6 rounded-3xl border border-slate-200 shadow-sm">
               <h3 className="text-[10px] font-black mb-4 text-secondary uppercase tracking-widest flex items-center gap-2">
                 <Award size={14} className="text-primary" /> Mastery Ranks Reference
               </h3>
               <div className="flex flex-col gap-3">
                  {dynamicRanks.map((rank) => (
                    <div key={rank.level} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white shadow-sm" style={{ color: rank.color }}>
                          <rank.icon size={16} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-text uppercase tracking-tight">{rank.name}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{Math.round(rank.factor * 100)}% of Goal</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-primary">{rank.minDays}</span>
                        <span className="text-[8px] font-black text-secondary uppercase ml-1">Days</span>
                      </div>
                    </div>
                  ))}
                  <div className="mt-2 bg-primary/5 rounded-xl p-3 flex gap-3 items-start border border-primary/10">
                     <Info size={14} className="text-primary shrink-0 mt-0.5" />
                     <p className="text-[10px] font-medium text-slate-500 leading-relaxed">
                       Ranks adjust dynamically as you change your <strong className="text-text">Target Threshold</strong>. Reaching your goal signifies hitting the <strong className="text-text">Mastery</strong> rank.
                     </p>
                  </div>
               </div>
            </div>

            <div className="bg-surface p-6 rounded-3xl border border-slate-200">
               <h3 className="text-[10px] font-black mb-4 text-secondary uppercase tracking-widest">Access</h3>
               {user ? (
                 <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                    <div className="p-2 bg-primary/10 rounded-full text-primary"><UserIcon size={16} /></div>
                    <div className="flex flex-col overflow-hidden"><span className="text-[10px] font-bold text-secondary uppercase">Authenticated as</span><span className="text-xs font-bold truncate text-text">{user.email}</span></div>
                 </div>
               ) : <button onClick={handleSignIn} className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform">Connect Google Profile</button>}
            </div>
          </div>
        )}
      </main>

      {/* Milestone Celebration Modal */}
      {isCelebrating && celebration && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-fade-in">
           <div className="bg-white rounded-[40px] p-10 max-w-sm w-full shadow-2xl relative text-center flex flex-col items-center">
              <div className="absolute top-[-40px] p-6 bg-primary text-white rounded-full shadow-xl shadow-primary/30 border-4 border-white">
                <Trophy size={48} />
              </div>
              <h2 className="text-3xl font-black text-text mt-8 mb-2">{celebration.title}</h2>
              <div className="w-12 h-1 bg-primary rounded-full mb-6"></div>
              <p className="text-lg font-bold text-slate-700 leading-relaxed italic mb-8">
                "{celebration.message}"
              </p>
              <div className="w-full bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col gap-2">
                 <div className="flex items-center justify-center gap-2 mb-1">
                   <Crown size={14} className="text-primary" />
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mastery Insight</span>
                 </div>
                 <p className="text-xs font-semibold text-slate-500">{celebration.rankInsight}</p>
              </div>
              <button 
                onClick={() => setIsCelebrating(false)} 
                className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm mt-8 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Continue The Path
              </button>
           </div>
        </div>
      )}

      {/* Selected Day Details Modal */}
      {selectedDayDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6 animate-fade-in">
           <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl relative">
              <button onClick={() => setSelectedDayDetails(null)} className="absolute top-4 right-4 text-slate-400 hover:text-text"><X size={20} /></button>
              <div className="flex flex-col items-center text-center gap-2">
                 <div className="p-3 bg-primary/10 rounded-2xl text-primary mb-2"><CalendarIcon size={24} /></div>
                 <h3 className="text-xl font-black text-text mb-1">{selectedDayDetails.date}</h3>
                 <div className="flex gap-2 mb-4">
                     {selectedDayDetails.statuses.map((status, idx) => (
                        <span key={idx} className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${status === 'Current' ? 'bg-primary/10 text-primary border-primary/20' : status === 'Past' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-gradient-to-r from-amber-100 to-emerald-100 text-slate-800 border-slate-200'}`}>{status}</span>
                     ))}
                 </div>
                 <div className="w-full flex flex-col gap-2">{selectedDayDetails.details.map((detail, idx) => <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm font-medium text-slate-600">{detail}</div>)}</div>
              </div>
           </div>
        </div>
      )}

      {/* Install Instruction Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6 animate-fade-in">
           <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl relative">
              <button onClick={() => setShowInstallModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-text"><X size={20} /></button>
              <div className="flex flex-col items-center text-center gap-4">
                 <div className="p-4 bg-primary/10 rounded-2xl text-primary mb-2"><Download size={32} /></div>
                 <h3 className="text-xl font-black text-text">Initialize App</h3>
                 <p className="text-sm text-secondary font-medium leading-relaxed">To install Streaker on your device, tap the <strong className="text-text">Share</strong> button in your browser menu and select <strong className="text-text">Add to Home Screen</strong>.</p>
                 <div className="w-full bg-slate-50 rounded-xl p-4 flex flex-col gap-3 mt-2 border border-slate-100">
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500"><Share size={16} className="text-primary" /><span>1. Tap Share</span></div>
                    <div className="w-full h-px bg-slate-200"></div>
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500"><PlusSquare size={16} className="text-primary" /><span>2. Add to Home Screen</span></div>
                 </div>
                 <button onClick={() => setShowInstallModal(false)} className="w-full py-3 bg-primary text-white rounded-xl font-black text-sm mt-2">Understood</button>
              </div>
           </div>
        </div>
      )}

      {/* Edit Start Date Modal */}
      {isEditingStart && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-2xl font-black mb-6">Update Start</h3>
            <div className="mb-8"><input type="date" value={tempStart} onChange={e => setTempStart(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl text-center font-bold text-lg" /></div>
            <div className="flex gap-3"><button onClick={() => setIsEditingStart(false)} className="flex-1 p-4 bg-slate-100 rounded-2xl font-bold">Cancel</button><button onClick={handleStartSubmit} className="flex-1 p-4 bg-primary text-white rounded-2xl font-black">Adjust Path</button></div>
          </div>
        </div>
      )}

      {/* Edit Goal Modal */}
      {isEditingGoal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-2xl font-black mb-6">Target Threshold</h3>
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-6"><button onClick={() => setGoalMode('days')} className={`flex-1 py-3 rounded-xl text-xs font-black ${goalMode === 'days' ? 'bg-white text-primary' : ''}`}>Days</button><button onClick={() => setGoalMode('date')} className={`flex-1 py-3 rounded-xl text-xs font-black ${goalMode === 'date' ? 'bg-white text-primary' : ''}`}>Date</button></div>
            <div className="mb-8">{goalMode === 'days' ? <input type="number" value={tempGoal} onChange={e => setTempGoal(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl text-center text-2xl font-black" /> : <input type="date" value={tempGoalDate} onChange={e => setTempGoalDate(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl text-center" />}</div>
            <div className="flex gap-3"><button onClick={() => setIsEditingGoal(false)} className="flex-1 p-4 bg-slate-100 rounded-2xl font-bold">Cancel</button><button onClick={handleGoalSubmit} className="flex-1 p-4 bg-primary text-white rounded-2xl font-black">Set Target</button></div>
          </div>
        </div>
      )}

      {/* Manual History Modal */}
      {isAddingHistory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-2xl font-black mb-6">Log Past Mastery</h3>
            <div className="space-y-4 mb-8">
              <input type="date" value={manualStart} onChange={e => setManualStart(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100" />
              <input type="date" value={manualEnd} onChange={e => setManualEnd(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100" />
            </div>
            <div className="flex gap-3"><button onClick={() => setIsAddingHistory(false)} className="flex-1 p-4 bg-slate-100 rounded-2xl font-bold">Cancel</button><button onClick={handleManualHistorySubmit} className="flex-1 p-4 bg-primary text-white rounded-2xl font-black">Store Log</button></div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-2xl font-black mb-4 text-center text-danger">Relapse?</h3>
            <p className="text-slate-500 text-sm mb-8 text-center leading-relaxed">Discipline lapsed. Re-centering the system. History will be archived for re-analysis.</p>
            <div className="flex gap-3"><button onClick={() => setShowResetConfirm(false)} className="flex-1 p-4 bg-slate-100 rounded-2xl font-bold">Cancel</button><button onClick={handleReset} className="flex-1 p-4 bg-danger text-white rounded-2xl font-black">Confirm Relapse</button></div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-100 pb-safe z-50">
        <div className="max-w-md mx-auto flex justify-around p-3">
          <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={Shield} label="Journey" />
          <NavButton active={view === 'history'} onClick={() => setView('history')} icon={HistoryIcon} label="Logs" />
          <NavButton active={view === 'settings'} onClick={() => setView('settings')} icon={Settings} label="Config" />
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
