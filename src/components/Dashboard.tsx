import React, { useState } from "react";
import { 
  Sparkles, 
  Clock, 
  Brain, 
  Calendar, 
  Award, 
  Flame, 
  ArrowRight,
  BookOpen,
  Plus
} from "lucide-react";
import { FlashcardSet, StudySchedule, StudyLog } from "../types";

interface DashboardProps {
  schedules: StudySchedule[];
  sets: FlashcardSet[];
  logs: StudyLog[];
  onNavigate: (tab: string) => void;
  onAddManualLog: (subject: string, minutes: number, notes: string) => Promise<void>;
  onCreateDemoData: () => void;
}

export default function Dashboard({
  schedules,
  sets,
  logs,
  onNavigate,
  onAddManualLog,
  onCreateDemoData
}: DashboardProps) {
  const [quickSubject, setQuickSubject] = useState("");
  const [quickMinutes, setQuickMinutes] = useState(30);
  const [quickNotes, setQuickNotes] = useState("");
  const [logSuccess, setLogSuccess] = useState(false);

  // Calculates stats
  const totalMinutes = logs.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const hoursFraction = (totalMinutes / 60).toFixed(1);
  const totalSets = sets.length;
  const totalCards = sets.reduce((acc, curr) => acc + curr.cards.length, 0);
  
  // Calculate Streak
  const calculateStreak = (allLogs: StudyLog[]) => {
    if (allLogs.length === 0) return 0;
    
    // Extract unique dates as YYYY-MM-DD
    const uniqueDates = Array.from(
      new Set(allLogs.map(l => l.date))
    ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // descending order

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // If the latest logged day isn't today or yesterday, streak is broken
    if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) {
      return 0;
    }

    let streak = 0;
    let expectedDate = new Date(uniqueDates[0]);

    for (let i = 0; i < uniqueDates.length; i++) {
      const currentLogDate = new Date(uniqueDates[i]);
      const diffTime = Math.abs(expectedDate.getTime() - currentLogDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) {
        streak++;
        expectedDate = currentLogDate;
      } else {
        break;
      }
    }
    return streak;
  };

  const streak = calculateStreak(logs);

  const handleQuickLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSubject.trim() || quickMinutes <= 0) return;
    
    try {
      await onAddManualLog(quickSubject.trim(), quickMinutes, quickNotes);
      setLogSuccess(true);
      setQuickSubject("");
      setQuickNotes("");
      setTimeout(() => setLogSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  // Find next uncompleted day's schedule
  const activeSchedule = schedules[0]; // takes the newest one
  const nextTask = activeSchedule?.dailySchedules.find(s => !s.completed);

  return (
    <div className="space-y-8 animate-fade-in" id="dashboard-tab-panel">
      {/* Greetings Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-slate-200 pb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2">
            Ready to learn, Scholar? 👋
          </h1>
          <p className="text-slate-500 font-medium">
            Analyze your study metrics, log hours, and run Gemini AI generations to boost your learning.
          </p>
        </div>
        
        <button
          onClick={() => onNavigate("schedules")}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-2xl text-xs font-bold shadow-md transition-all cursor-pointer"
          id="btn-nav-schedule-creator"
        >
          <Sparkles className="h-4.5 w-4.5 text-amber-300 fill-amber-300" />
          Plan AI Study Schedule
        </button>
      </div>

      {/* Grid: 4 Premium Stats Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Stat Item 1: Study Streak */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 flex items-center justify-between" id="stat-widget-streak">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Daily Streak</p>
            <p className="text-2xl font-black text-orange-500">
              🔥 {streak} Days
            </p>
          </div>
          <div className="bg-orange-50 text-orange-600 p-3 rounded-xl">
            <Flame className="h-5 w-5 stroke-[2.5]" />
          </div>
        </div>

        {/* Stat Item 2: Total Study Hours */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 flex items-center justify-between" id="stat-widget-hours">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Practice Session</p>
            <p className="text-2xl font-black text-indigo-600">
              ⏱️ {hoursFraction} Hrs
            </p>
          </div>
          <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl">
            <Clock className="h-5 w-5 stroke-[2.5]" />
          </div>
        </div>

        {/* Stat Item 3: Active Flashcards Sets */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 flex items-center justify-between" id="stat-widget-cards">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mastery Score</p>
            <p className="text-2xl font-black text-emerald-600">
              🧠 {totalSets} Decks
            </p>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl">
            <Brain className="h-5 w-5 stroke-[2.5]" />
          </div>
        </div>

        {/* Stat Item 4: Schedules Count */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 flex items-center justify-between" id="stat-widget-schedules">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">AI Track Rate</p>
            <p className="text-2xl font-black text-violet-650">
              📅 {schedules.length} Paths
            </p>
          </div>
          <div className="bg-violet-50 text-violet-600 p-3 rounded-xl">
            <Calendar className="h-5 w-5 stroke-[2.5]" />
          </div>
        </div>
      </div>

      {/* Main Layout Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Smart Recommendations & Flashcard Quick Access */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Smart AI Study Recommendation Box - Restyled as Emerald Green Smart Study Mode Banner */}
          <div className="bg-emerald-500 rounded-[32px] p-8 text-white relative overflow-hidden shadow-lg" id="ai-recommender-card">
            {/* Background elements */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-100 rounded-full opacity-10"></div>
            <div className="absolute left-1/3 top-0 bg-white/10 h-24 w-24 rounded-full blur-xl animate-pulse"></div>

            <div className="flex items-center gap-2 text-white/95 font-mono text-xs tracking-widest uppercase mb-4 font-bold">
              <Sparkles className="h-4.5 w-4.5 text-amber-300 fill-amber-300" />
              <span>Smart Study Recommendation</span>
            </div>

            {nextTask && activeSchedule ? (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 flex-1">
                  <h3 className="text-2xl font-bold mb-1">
                    Day {nextTask.dayNumber} of "{activeSchedule.title}"
                  </h3>
                  <p className="opacity-90 text-sm leading-relaxed max-w-md">
                    Today is dedicated to <strong className="font-extrabold decoration-amber-300 underline">{nextTask.topic}</strong>. {nextTask.description}
                  </p>
                  <p className="opacity-75 text-xs">AI recommends Spaced Repetition study session now ({nextTask.durationMinutes} minutes).</p>
                </div>
                <button 
                  onClick={() => onNavigate("schedules")}
                  className="bg-white text-emerald-600 font-extrabold px-6 py-3.5 rounded-2xl shadow-lg shadow-emerald-700/20 text-xs shrink-0 hover:bg-emerald-50 active:scale-95 transition-all cursor-pointer"
                >
                  START SESSION
                </button>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 flex-1">
                  <h3 className="text-2xl font-bold mb-1">
                    Smart Study Mode
                  </h3>
                  <p className="opacity-90 text-sm leading-relaxed max-w-md">
                    AI recommends starting a custom study tracking blueprint. Spaced Recalling maximizes educational performance.
                  </p>
                </div>
                <button
                  onClick={() => onNavigate("schedules")}
                  className="bg-white text-emerald-600 font-extrabold px-6 py-3.5 rounded-2xl shadow-lg shadow-emerald-700/20 text-xs shrink-0 hover:bg-emerald-50 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1 mt-2 font-black"
                >
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                  CREATE TRACK
                </button>
              </div>
            )}
          </div>
          
          {/* Quick Access Flashcards sets */}
          <div className="bg-white border border-slate-100 rounded-[32px] p-8 space-y-6 shadow-sm" id="quick-flashcards-deck-view">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-500" />
                Active Flashcard Decks
              </h3>
              <button 
                onClick={() => onNavigate("flashcards")}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-bold cursor-pointer"
              >
                Go to Flashcards Studio
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sets.slice(0, 4).map((set) => (
                <div 
                  key={set.id}
                  onClick={() => onNavigate("flashcards")}
                  className="border border-slate-200 rounded-2xl p-5 hover:border-indigo-400 hover:bg-indigo-50/20 cursor-pointer transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 border border-slate-200/50 rounded-lg px-2 py-0.5">
                      {set.subject || "General"}
                    </span>
                    <h4 className="font-sans font-bold text-slate-800 text-sm line-clamp-1">
                      {set.title}
                    </h4>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500 font-mono">
                    <span>{set.cards.length} cards</span>
                    <span className="text-indigo-650 inline-flex items-center gap-0.5 font-bold hover:underline">
                      Review <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              ))}
              
              {sets.length === 0 && (
                <div className="col-span-2 text-center py-8 border border-dashed border-slate-200 rounded-2xl text-slate-500 bg-slate-50/50">
                  <p className="text-xs font-semibold">No active study decks.</p>
                  <button
                    onClick={() => onNavigate("flashcards")}
                    className="text-xs text-indigo-600 font-bold underline mt-1 cursor-pointer"
                  >
                    Generate a deck using AI
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Activity Logger */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Quick study logger Form */}
          <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm" id="manual-study-logger">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Award className="h-5 w-5 text-indigo-500" />
              Log Offline Study Activity
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Read books, took notes, or worked on practice assignments? Feed your study metrics into the tracker!
            </p>

            <form onSubmit={handleQuickLogSubmit} className="space-y-4 mt-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Subject / Event</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Organic Chemistry, Linear Algebra"
                  value={quickSubject}
                  onChange={(e) => setQuickSubject(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 text-sm px-4 py-3 rounded-2xl focus:border-indigo-500 focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Duration (Minutes)</label>
                  <select
                    value={quickMinutes}
                    onChange={(e) => setQuickMinutes(Number(e.target.value))}
                    className="w-full bg-slate-50/50 border border-slate-200 text-sm px-4 py-3 rounded-2xl focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
                  >
                    <option value={15}>15 m</option>
                    <option value={30}>30 m</option>
                    <option value={45}>45 m</option>
                    <option value={60}>1h (60 m)</option>
                    <option value={90}>1.5h (90 m)</option>
                    <option value={120}>2h (120 m)</option>
                    <option value={180}>3h (180 m)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Today's Date</label>
                  <input
                    type="text"
                    disabled
                    value="Today"
                    className="w-full bg-slate-100 border border-slate-200 text-sm px-4 py-3 rounded-2xl text-slate-400 focus:outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Optional Notes</label>
                <input
                  type="text"
                  placeholder="e.g., Studied reaction pathways"
                  value={quickNotes}
                  onChange={(e) => setQuickNotes(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 text-sm px-4 py-3 rounded-2xl focus:border-indigo-500 focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl py-3.5 text-xs font-extrabold shadow-md transition-all cursor-pointer"
              >
                Log Session
              </button>

              {logSuccess && (
                <div className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-150 p-3.5 text-center rounded-2xl animate-fade-in font-semibold">
                  Activity logged successfully! Metrics updated.
                </div>
              )}
            </form>
          </div>

          {/* Today's Agenda study tips design card - Amber 400 design block */}
          <div className="bg-amber-400 rounded-[32px] p-8 text-amber-950 space-y-4 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-900 font-sans">Science Backed Insight</span>
              <span className="text-xl">💡</span>
            </div>
            
            <h4 className="text-2xl font-black text-amber-950 tracking-tight">Spaced Repetition & Spacing Recall</h4>
            
            <div className="bg-white/40 p-4 rounded-xl border border-white/40 flex gap-3 text-amber-950 text-xs leading-relaxed">
              <span>Instead of cramming 4 hours on a single afternoon, study the same material for 30 minutes across 8 different days. Spaced Repetition lets your brain consolidated memories effectively.</span>
            </div>

            <div className="bg-white p-4 rounded-xl border-2 border-amber-600/20 flex gap-3 shadow-md text-slate-800">
              <div className="font-bold text-amber-600">RULE</div>
              <div>
                <p className="font-bold text-xs text-slate-900">Consistency &gt; Intensity</p>
                <p className="text-[11px] text-slate-500">Improves recall speed by up to 88%</p>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
