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
  BrainCircuit,
  PenLine,
  Check,
  X,
  Calendar,
  ArrowRight,
  Calculator,
  AlertTriangle,
  Edit2,
  Trash2,
  Save,
  Target
} from 'lucide-react';
import { 
  BarChart,
  Bar,
  Cell,
  XAxis,
  Tooltip, 
  ResponsiveContainer
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
  const [motivation, setMotivation] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);

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

  const confirmReset = async () => {
    if (!data) return;
    
    const currentDays = calculateDays(data.currentStreakStart || Date.now());
    const now = Date.now();
    
    const newHistoryItem: StreakHistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      startDate: data.currentStreakStart || now,
      endDate: now,
      days: currentDays
    };

    const newData: UserData = {
      ...data,
      currentStreakStart: now,
      history: [newHistoryItem, ...data.history]
    };

    setData(newData);
    await saveUserData(user, newData);
    
    // Get fresh motivation
    fetchMotivation(0, newData.goal);
    setShowResetConfirm(false);
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
    
    // Refresh motivation based on new days
    const days = calculateDays(newStartTimestamp);
    fetchMotivation(days, newData.goal);
  };

  const fetchMotivation = async (days: number, goal: number) => {
    setIsAiLoading(true);
    const msg = await getMotivation(days, goal);
    setMotivation(msg);
    setIsAiLoading(false);
  };

  // On mount or streak change, get motivation if empty
  useEffect(() => {
    if (data && data.currentStreakStart && !motivation) {
      const d = calculateDays(data.currentStreakStart);
      fetchMotivation(d, data.goal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const currentDays = useMemo(() => {
    return data && data.currentStreakStart ? calculateDays(data.currentStreakStart) : 0;
  }, [data]);

  const longestStreak = useMemo(() => {
    if (!data) return 0;
    const histMax = data.history.reduce((max, item) => Math.max(max, item.days), 0);
    return Math.max(histMax, currentDays);
  }, [data, currentDays]);

  const chartData = useMemo(() => {
    if (!data) return [];
    // Returns last 10 entries in chronological order
    return [...data.history].reverse().slice(-10);
  }, [data]);

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
          <div className="animate-fade-in flex flex-col gap-8">
            
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

            {/* AI Motivation Card */}
            <div className="bg-gradient-to-br from-surface to-slate-900 border border-slate-700 p-5 rounded-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <BrainCircuit size={64} />
               </div>
               <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                 AI INSIGHT
                 {isAiLoading && <span className="animate-spin ml-2">⟳</span>}
               </h3>
               <p className="text-lg italic font-light leading-relaxed text-slate-300">
                 "{motivation || "Loading wisdom..."}"
               </p>
               <button 
                onClick={() => fetchMotivation(currentDays, data.goal)}
                className="mt-4 text-xs font-bold text-secondary hover:text-primary transition-colors uppercase tracking-widest"
               >
                 Refresh Wisdom
               </button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 mt-2">
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

            {/* Chart */}
            <div className="bg-surface p-4 rounded-2xl border border-slate-700 h-64 w-full">
              <h3 className="text-sm text-secondary font-bold mb-4 uppercase">Performance Trend</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="days" hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#14b8a6' }}
                    cursor={{fill: '#334155'}}
                  />
                  <Bar dataKey="days" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.days >= data.goal ? '#14b8a6' : '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

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

            {/* List */}
            <div className="flex flex-col gap-3 pb-20">
              <h3 className="text-sm font-bold text-secondary uppercase">Recent Logs</h3>
              {data.history.length === 0 ? (
                <div className="text-center py-8 text-secondary italic">No history recorded yet.</div>
              ) : (
                data.history.map((streak) => (
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
                            <Calendar size={12} />
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
