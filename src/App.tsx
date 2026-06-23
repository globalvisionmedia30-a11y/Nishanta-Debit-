import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Brain, 
  Calendar, 
  Clock, 
  Award, 
  Flame, 
  ChevronRight, 
  Activity, 
  GraduationCap
} from "lucide-react";

import { FlashcardSet, StudySchedule, StudyLog } from "./types";
import { 
  getFlashcardSets, 
  addFlashcardSet, 
  updateFlashcardSet, 
  deleteFlashcardSet,
  getStudySchedules,
  addStudySchedule,
  updateStudySchedule,
  deleteStudySchedule,
  getStudyLogs,
  addStudyLog,
  deleteStudyLog
} from "./lib/dbServices";

import Dashboard from "./components/Dashboard";
import SchedulePlanner from "./components/SchedulePlanner";
import FlashcardSuite from "./components/FlashcardSuite";
import ProgressVisualizer from "./components/ProgressVisualizer";

export default function App() {
  // Global Tabs state: "dashboard" | "schedules" | "flashcards" | "progress"
  const [activeTab, setActiveTab] = useState("dashboard");

  // State caches loaded from Firestore
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [schedules, setSchedules] = useState<StudySchedule[]>([]);
  const [logs, setLogs] = useState<StudyLog[]>([]);
  
  // Loading and error tracking
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  // Load Firestore data on mount
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [fetchedSets, fetchedSchedules, fetchedLogs] = await Promise.all([
          getFlashcardSets(),
          getStudySchedules(),
          getStudyLogs()
        ]);
        
        setSets(fetchedSets);
        setSchedules(fetchedSchedules);
        setLogs(fetchedLogs);
      } catch (err) {
        console.error("Firestore database hydrate failure:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // 1. GENERATE DECK (Triggers AI backend or Empty creation)
  const handleGenerateDecks = async (topic: string, content: string, count: number) => {
    // Check if it's a manual empty deck trigger
    if (content.startsWith("__MANUAL_CREATE__:")) {
      const parsedDeck = JSON.parse(content.replace("__MANUAL_CREATE__:", ""));
      const savedSet = await addFlashcardSet(parsedDeck);
      setSets(prev => [savedSet, ...prev]);
      return;
    }

    // Call server API for Gemini Educational generation
    const response = await fetch("/api/generate-flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, content, count })
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.details || "Internal Server requested generation timeout.");
    }

    const data = await response.json();
    if (!data.cards || !Array.isArray(data.cards)) {
      throw new Error("Invalid structure returned from Gemini model.");
    }

    // Format new Flashcard Set object
    const newSet: Omit<FlashcardSet, "id"> = {
      title: `${topic} Study Set`,
      subject: "AI Generated",
      createdAt: new Date().toISOString(),
      cards: data.cards.map((c: any, index: number) => ({
        id: `gcard-${Date.now()}-${index}`,
        question: c.question,
        answer: c.answer,
        box: 1,
        lastReviewStatus: "none"
      })),
      cardsReviewCount: 0,
      cardsMasteredCount: 0
    };

    const savedSet = await addFlashcardSet(newSet);
    setSets(prev => [savedSet, ...prev]);
  };

  // 2. UPDATE DECK DETAILS
  const handleUpdateDeck = async (id: string, updatedSet: FlashcardSet) => {
    await updateFlashcardSet(id, updatedSet);
    setSets(prev => prev.map(s => s.id === id ? updatedSet : s));
  };

  // 3. DELETE DECK
  const handleDeleteDeck = async (id: string) => {
    await deleteFlashcardSet(id);
    setSets(prev => prev.filter(s => s.id !== id));
  };


  // 4. GENERATE STUDY SCHEDULE
  const handleGenerateSchedule = async (title: string, subject: string, objective: string, totalDays: number) => {
    const response = await fetch("/api/generate-schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, subject, objective, totalDays })
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.details || "API route returned validation failure.");
    }

    const data = await response.json();
    if (!data.dailySchedules || !Array.isArray(data.dailySchedules)) {
      throw new Error("Invalid schedule structure returned from Gemini models.");
    }

    // Format final schedule object to commit
    const newSchedule: Omit<StudySchedule, "id"> = {
      title: data.title || title,
      subject,
      objective: data.objective || objective,
      createdAt: new Date().toISOString(),
      totalDays: Number(data.totalDays) || totalDays,
      progressPercent: 0,
      dailySchedules: data.dailySchedules.map((day: any) => ({
        dayNumber: Number(day.dayNumber),
        topic: day.topic,
        description: day.description,
        durationMinutes: Number(day.durationMinutes) || 45,
        completed: false,
        resources: day.suggestedResources || []
      }))
    };

    const savedSchedule = await addStudySchedule(newSchedule);
    setSchedules(prev => [savedSchedule, ...prev]);
  };

  // 5. TOGGLE DAILY STUDY TASK COMPLETION
  const handleToggleTask = async (scheduleId: string, dayNumber: number) => {
    const targetSchedule = schedules.find(s => s.id === scheduleId);
    if (!targetSchedule) return;

    const modifiedDaily = targetSchedule.dailySchedules.map(task => {
      if (task.dayNumber === dayNumber) {
        return { ...task, completed: !task.completed };
      }
      return task;
    });

    const completedDays = modifiedDaily.filter(t => t.completed).length;
    const progressPercent = Math.round((completedDays / targetSchedule.totalDays) * 100);

    const updatedSchedule: StudySchedule = {
      ...targetSchedule,
      dailySchedules: modifiedDaily,
      progressPercent
    };

    // If a task is checked to completed, we auto-create an audit study log for the student!
    const newlyCompletedTask = modifiedDaily.find(t => t.dayNumber === dayNumber);
    if (newlyCompletedTask && newlyCompletedTask.completed) {
      const newLog: Omit<StudyLog, "id"> = {
        date: new Date().toISOString().split("T")[0],
        subject: targetSchedule.subject,
        durationMinutes: newlyCompletedTask.durationMinutes,
        type: "schedule",
        notes: `Checked off Day ${dayNumber} task of "${targetSchedule.title}": ${newlyCompletedTask.topic}.`
      };
      const savedLog = await addStudyLog(newLog);
      setLogs(prev => [savedLog, ...prev]);
    }

    await updateStudySchedule(scheduleId, updatedSchedule);
    setSchedules(prev => prev.map(s => s.id === scheduleId ? updatedSchedule : s));
  };

  // 6. DELETE STUDY SCHEDULE
  const handleDeleteSchedule = async (id: string) => {
    await deleteStudySchedule(id);
    setSchedules(prev => prev.filter(s => s.id !== id));
  };


  // 7. RECORD MANUAL STUDY SESSION
  const handleAddManualLog = async (subject: string, minutes: number, notes: string) => {
    const newLog: Omit<StudyLog, "id"> = {
      date: new Date().toISOString().split("T")[0],
      subject,
      durationMinutes: minutes,
      type: "other",
      notes
    };
    
    const savedLog = await addStudyLog(newLog);
    setLogs(prev => [savedLog, ...prev]);
  };

  // 8. LOG ACTIVE FLASHCARD REVIEW COMPLETION EVENT (Attaches Leitner boxes history)
  const handleLogReviewSession = async (deckTitle: string, minutes: number, cardCount: number) => {
    const newLog: Omit<StudyLog, "id"> = {
      date: new Date().toISOString().split("T")[0],
      subject: deckTitle,
      durationMinutes: minutes,
      type: "flashcards",
      notes: `Studied spacing repetition deck: reviewed exactly ${cardCount} active cards. Interval Box levels consolidated.`
    };

    try {
      const savedLog = await addStudyLog(newLog);
      setLogs(prev => [savedLog, ...prev]);
    } catch (e) {
      console.error("Self log review trigger failure:", e);
    }
  };

  // 9. REVERT / DELETE A RECENT LOG
  const handleDeleteLog = async (id: string) => {
    await deleteStudyLog(id);
    setLogs(prev => prev.filter(l => l.id !== id));
  };

  // Quick seed refetch triggered automatically if user requests
  const handleSeedRefresh = async () => {
    setIsSeeding(true);
    setTimeout(async () => {
      const [fetchedSets, fetchedSchedules, fetchedLogs] = await Promise.all([
        getFlashcardSets(),
        getStudySchedules(),
        getStudyLogs()
      ]);
      setSets(fetchedSets);
      setSchedules(fetchedSchedules);
      setLogs(fetchedLogs);
      setIsSeeding(false);
    }, 1500);
  };

  const streakCount = React.useMemo(() => {
    if (logs.length === 0) return 0;
    const uniqueDates = Array.from(new Set(logs.map(l => l.date))) as string[];
    uniqueDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) return 0;
    
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
  }, [logs]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col md:flex-row antialiased select-none" id="web-workspace-canvas">
      
      {/* SIDEBAR NAVIGATION PANEL */}
      <aside className="w-full md:w-64 bg-indigo-600 p-6 flex flex-col justify-between shrink-0 h-auto md:h-screen sticky top-0 z-40 text-white shadow-xl" id="sidebar-navigation">
        <div className="space-y-8">
          {/* Logo / Header Branding */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 font-black text-xl shadow-md">
              L
            </div>
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">LUMINA</h2>
              <span className="text-[10px] font-mono text-indigo-200 block font-bold tracking-wider">AI STUDY HUB</span>
            </div>
          </div>

          {/* Nav list */}
          <nav className="flex flex-col gap-3">
            
            {/* Dashboard Link */}
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-indigo-500/40 text-white font-bold border border-indigo-400/20"
                  : "text-white opacity-70 hover:opacity-100 hover:bg-indigo-500/25"
              }`}
              id="sidebar-link-dashboard"
            >
              <span className="inline-flex items-center gap-3">
                <Activity className="h-4.5 w-4.5" />
                Dashboard
              </span>
              <ChevronRight className={`h-3 w-3 transition-transform ${activeTab === "dashboard" ? "rotate-90 opacity-100" : "opacity-0"}`} />
            </button>

            {/* AI Schedules Link */}
            <button
              onClick={() => setActiveTab("schedules")}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "schedules"
                  ? "bg-indigo-500/40 text-white font-bold border border-indigo-400/20"
                  : "text-white opacity-70 hover:opacity-100 hover:bg-indigo-500/25"
              }`}
              id="sidebar-link-schedules"
            >
              <span className="inline-flex items-center gap-3">
                <Calendar className="h-4.5 w-4.5" />
                Schedule Tracker
              </span>
              <ChevronRight className={`h-3 w-3 transition-transform ${activeTab === "schedules" ? "rotate-90 opacity-100" : "opacity-0"}`} />
            </button>

            {/* Flashcards Link */}
            <button
              onClick={() => setActiveTab("flashcards")}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "flashcards"
                  ? "bg-indigo-500/40 text-white font-bold border border-indigo-400/20"
                  : "text-white opacity-70 hover:opacity-100 hover:bg-indigo-500/25"
              }`}
              id="sidebar-link-flashcards"
            >
              <span className="inline-flex items-center gap-3">
                <Brain className="h-4.5 w-4.5" />
                Flashcards Suite
              </span>
              <ChevronRight className={`h-3 w-3 transition-transform ${activeTab === "flashcards" ? "rotate-90 opacity-100" : "opacity-0"}`} />
            </button>

            {/* Progress Visualizer Link */}
            <button
              onClick={() => setActiveTab("progress")}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "progress"
                  ? "bg-indigo-500/40 text-white font-bold border border-indigo-400/20"
                  : "text-white opacity-70 hover:opacity-100 hover:bg-indigo-500/25"
              }`}
              id="sidebar-link-ledger"
            >
              <span className="inline-flex items-center gap-3">
                <Award className="h-4.5 w-4.5" />
                Activity Ledger
              </span>
              <ChevronRight className={`h-3 w-3 transition-transform ${activeTab === "progress" ? "rotate-90 opacity-100" : "opacity-0"}`} />
            </button>

          </nav>
        </div>

        {/* Sidebar Footer Widgets */}
        <div className="mt-8 space-y-4">
          
          {/* Flame streak count summary */}
          <div className="bg-indigo-500/30 p-4 rounded-3xl border border-indigo-400/30 flex items-center gap-3">
            <div className="bg-white/10 text-orange-400 p-2 rounded-xl">
              <Flame className="h-5 w-5 fill-current" />
            </div>
            <div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-indigo-200 block font-bold">Daily Streak</span>
              <span className="text-sm font-sans font-bold text-white">{streakCount} Days active</span>
            </div>
          </div>

          {/* Inspirational quotes card */}
          <div className="bg-indigo-500/20 p-4 rounded-3xl border border-indigo-400/20">
            <p className="text-xs opacity-80 mb-2 italic">"Your focus determines your reality."</p>
            <p className="text-[10px] font-bold">— Master Yoda</p>
          </div>

          {/* Refetch seed button */}
          <div className="text-center font-mono">
            <button
              onClick={handleSeedRefresh}
              disabled={isSeeding}
              className="text-[10px] text-indigo-200 hover:text-white transition-colors uppercase cursor-pointer tracking-wider font-semibold"
            >
              {isSeeding ? "Syncing..." : "↻ Hard sync cloud DB"}
            </button>
          </div>

        </div>
      </aside>

      {/* CORE WORKSPACE CONTENT AREA */}
      <main className="flex-1 overflow-y-auto h-screen relative">
        {isLoading ? (
          <div className="absolute inset-0 bg-[#F9FAFB]/90 backdrop-blur-xs flex flex-col items-center justify-center p-4">
            <div className="space-y-4 text-center">
              <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest animate-pulse font-semibold">
                loading Firebase connection & datasets ...
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto p-4 md:p-8 lg:p-10 pb-16">
            
            {/* View Switching Router */}
            {activeTab === "dashboard" && (
              <Dashboard 
                schedules={schedules}
                sets={sets}
                logs={logs}
                onNavigate={(tab) => setActiveTab(tab)}
                onAddManualLog={handleAddManualLog}
                onCreateDemoData={handleSeedRefresh}
              />
            )}

            {activeTab === "schedules" && (
              <SchedulePlanner 
                schedules={schedules}
                onGenerateSchedule={handleGenerateSchedule}
                onToggleTask={handleToggleTask}
                onDeleteSchedule={handleDeleteSchedule}
              />
            )}

            {activeTab === "flashcards" && (
              <FlashcardSuite 
                sets={sets}
                onGenerateDecks={handleGenerateDecks}
                onUpdateDeck={handleUpdateDeck}
                onDeleteDeck={handleDeleteDeck}
                onLogReviewSession={handleLogReviewSession}
              />
            )}

            {activeTab === "progress" && (
              <ProgressVisualizer 
                logs={logs}
                sets={sets}
                schedules={schedules}
                onDeleteLog={handleDeleteLog}
              />
            )}

          </div>
        )}
      </main>

    </div>
  );
}
