import React from "react";
import { 
  BarChart3, 
  Trash2, 
  Award, 
  Sparkles, 
  Calendar, 
  History, 
  Check, 
  Lock, 
  Clock, 
  Flame, 
  Brain 
} from "lucide-react";
import { StudyLog, FlashcardSet, StudySchedule } from "../types";

interface ProgressVisualizerProps {
  logs: StudyLog[];
  sets: FlashcardSet[];
  schedules: StudySchedule[];
  onDeleteLog: (id: string) => Promise<void>;
}

export default function ProgressVisualizer({
  logs,
  sets,
  schedules,
  onDeleteLog
}: ProgressVisualizerProps) {
  
  // Calculate analytics
  const totalMinutes = logs.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const hoursFraction = (totalMinutes / 60).toFixed(1);
  const logsCount = logs.length;
  
  // Flashcard stats
  const totalSets = sets.length;
  const cardsReviewedTotal = sets.reduce((acc, curr) => acc + (curr.cardsReviewCount || 0), 0);
  const cardsMasteredTotal = sets.reduce((acc, curr) => acc + (curr.cardsMasteredCount || 0), 0);

  // Day list helper for SVG Graph (Last 7 Days)
  const getLast7DaysData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];
      const dayLabel = date.toLocaleDateString("en-US", { weekday: "short" });
      
      // Calculate minutes for this day
      const minutesOnDay = logs
        .filter(l => l.date === dateStr)
        .reduce((sum, curr) => sum + curr.durationMinutes, 0);
      
      data.push({
        dateStr,
        label: dayLabel,
        hours: Number((minutesOnDay / 60).toFixed(2))
      });
    }
    return data;
  };

  const graphData = getLast7DaysData();
  const maxHours = Math.max(...graphData.map(d => d.hours), 1); // avoids division by zero, min scale of 1 hour

  // Achievements evaluation system
  const achievements = [
    {
      id: "ach-deepwork-1",
      title: "Focus Initiate",
      description: "Successfully log your first study session in the ledger.",
      icon: "Clock",
      metric: "Logged 1+ study sessions",
      unlocked: logsCount > 0,
      color: "bg-indigo-550 border-indigo-200 text-indigo-700"
    },
    {
      id: "ach-gemini-sched",
      title: "Architect of Devotion",
      description: "Forge an AI-driven study schedule blueprint using Gemini.",
      icon: "Calendar",
      metric: "Configure an AI study schedule",
      unlocked: schedules.length > 0,
      color: "bg-violet-55 border-violet-200 text-violet-700"
    },
    {
      id: "ach-flashcard-rev",
      title: "Spaced Explorer",
      description: "Review your first flashcard set to update Leitner boxes.",
      icon: "Brain",
      metric: "Perform a flashcards review game",
      unlocked: cardsReviewedTotal > 0,
      color: "bg-emerald-55 border-emerald-200 text-emerald-700"
    },
    {
      id: "ach-hours-hard",
      title: "Academic Titan",
      description: "Power through over 5 hours of total study logs.",
      icon: "Flame",
      metric: "Accumulate 5+ hours of logs",
      unlocked: totalMinutes >= 300,
      color: "bg-amber-55 border-amber-200 text-amber-700"
    }
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="space-y-8 animate-fade-in" id="progress-visualizer-panel">
      
      {/* Top Overview stats */}
      <div className="border-b border-slate-200 pb-6 mb-2">
        <h1 className="text-4xl font-extrabold text-slate-900 flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-indigo-600" />
          Analytics & Progress Ledger
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          Visualize daily hours dedicated to learning, view earned milestones, and audit historical logs.
        </p>
      </div>

      {/* Grid: SVG Tracker Graph vs Achievements progress ring */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Card: 7-Day learning activity graph (7-cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              Practice Distribution (Last 7 Days)
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Daily hours dedicated to online/offline study hours.
            </p>
          </div>

          {/* SVG Custom Premium Bar Chart */}
          <div className="pt-8 pb-3">
            <div className="flex justify-between items-end h-48 gap-3 relative border-b border-slate-200 pb-2">
              
              {/* Grid background markers */}
              <div className="absolute left-0 right-0 top-0 border-t border-dashed border-slate-100 z-0 pointer-events-none"></div>
              <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-slate-100 z-0 pointer-events-none"></div>

              {graphData.map((day, di) => {
                const percentHeight = (day.hours / maxHours) * 100;
                
                return (
                  <div 
                    key={di} 
                    className="flex-1 flex flex-col items-center group relative z-10"
                  >
                    {/* Tooltip on Hover */}
                    <div className="absolute bottom-full mb-3 bg-slate-950 text-white text-[10px] font-mono font-bold px-2.5 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 pointer-events-none whitespace-nowrap shadow-md">
                      {day.hours} hrs Study
                    </div>

                    {/* Colored Bar */}
                    <div 
                      className={`w-full max-w-[34px] rounded-t-xl transition-all duration-700 ease-out cursor-pointer ${
                        day.hours > 0 
                          ? "bg-indigo-600 group-hover:bg-indigo-700 shadow-sm" 
                          : "bg-slate-100 hover:bg-slate-205"
                      }`}
                      style={{ height: `${Math.max(percentHeight, 4)}%` }} // minimum 4% so they can see empty bars
                    ></div>

                    {/* Day label */}
                    <span className="text-[10px] font-mono font-black text-slate-400 mt-3 uppercase tracking-wider">
                      {day.label}
                    </span>
                  </div>
                );
              })}

            </div>
          </div>

          {/* Summary Legend */}
          <div className="flex justify-between items-center text-xs text-slate-500 font-mono border-t border-slate-100 pt-5">
            <span className="font-bold text-slate-400">Range: 7 Days</span>
            <span className="text-zinc-700 font-bold">
              Total Recorded Time: {hoursFraction} hrs ({totalMinutes}m)
            </span>
          </div>
        </div>

        {/* Right Card: Gamified Trophy Box (5-cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Award className="h-5 w-5 text-indigo-500" />
              Unlocked Milestones
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Earn awards as you work on flashcards and accumulate hours!
            </p>
          </div>

          <div className="space-y-3.5 pt-2">
            {achievements.map((ach) => (
              <div 
                key={ach.id}
                className={`border rounded-2xl p-4 flex gap-4 items-center transition-all ${
                  ach.unlocked 
                    ? "bg-slate-50 border-slate-200 text-slate-800" 
                    : "bg-slate-50/20 border-slate-100 text-slate-400 opacity-60"
                }`}
              >
                {/* Visual Icon Badge */}
                <div className={`p-3 rounded-xl border ${
                  ach.unlocked 
                    ? "bg-indigo-50 border-indigo-100/70 text-indigo-700 font-bold" 
                    : "bg-slate-100 border-slate-205 text-slate-400"
                }`}>
                  {ach.icon === "Clock" && <Clock className="h-4.5 w-4.5 stroke-[2.5]" />}
                  {ach.icon === "Calendar" && <Calendar className="h-4.5 w-4.5 stroke-[2.5]" />}
                  {ach.icon === "Brain" && <Brain className="h-4.5 w-4.5 stroke-[2.5]" />}
                  {ach.icon === "Flame" && <Flame className="h-4.5 w-4.5 stroke-[2.5]" />}
                </div>

                {/* Text metrics */}
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-center">
                    <h4 className={`text-xs font-black tracking-tight ${ach.unlocked ? "text-slate-800" : "text-slate-500 font-bold"}`}>
                      {ach.title}
                    </h4>
                    {ach.unlocked ? (
                      <span className="text-[10px] font-mono text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 rounded-lg flex items-center gap-0.5">
                        <Check className="h-3 w-3 inline" /> Unlocked
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 rounded-lg px-2 py-0.5 flex items-center gap-0.5 font-bold">
                        <Lock className="h-3 w-3 inline" /> Locked
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal font-medium">
                    {ach.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar ratio summary */}
          <div className="border-t border-slate-100 pt-5 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider font-mono">Trophy Completion</span>
            <span className="text-xs font-mono font-black text-indigo-650 bg-indigo-50 px-2.5 py-0.5 rounded-lg">
              {unlockedCount} / {achievements.length} unlocked ({Math.round((unlockedCount/achievements.length)*100)}%)
            </span>
          </div>

        </div>

      </div>

      {/* HISTORICAL STUDY LOGS LEDGER */}
      <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm space-y-6">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <History className="h-5 w-5 text-indigo-500" />
          Study Activity Register ({logsCount} entries)
        </h3>

        {logs.length === 0 ? (
          <div className="text-center py-10 text-slate-450 border border-dashed border-slate-200 rounded-2xl text-xs bg-slate-5/50 font-medium">
            No study sessions logged yet. Review flashcards or log independent tasks to build up history!
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-450 text-[10px] font-bold uppercase tracking-widest bg-slate-50/75 select-none font-mono">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Subject / Event</th>
                  <th className="py-3 px-4">Study Method</th>
                  <th className="py-3 px-4">Duration (Min)</th>
                  <th className="py-3 px-4">Notes & Highlights</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr 
                    key={log.id}
                    className="hover:bg-slate-50/30 text-slate-705 group"
                    id={`study-log-record-${log.id}`}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold whitespace-nowrap">
                      {new Date(log.date).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 font-sans font-extrabold text-slate-900 text-[13px]">
                      {log.subject}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 font-mono text-[10px] font-bold rounded-lg border ${
                        log.type === "flashcards" 
                          ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                          : log.type === "schedule" 
                            ? "bg-indigo-50 border-indigo-100 text-indigo-800" 
                            : "bg-slate-100 border-slate-205 text-slate-700"
                      }`}>
                        {log.type === "flashcards" ? "Flashcards Review" : log.type === "schedule" ? "AI Schedule Track" : "Independent Log"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                      {log.durationMinutes} minutes
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 leading-relaxed max-w-xs truncate" title={log.notes || ""}>
                      {log.notes || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={async () => {
                          if (confirm("Delete this study session from history? Consecutive days streak could be re-evaluated.")) {
                            await onDeleteLog(log.id);
                          }
                        }}
                        className="p-2 hover:text-rose-600 hover:bg-rose-50 text-slate-400 rounded-xl cursor-pointer transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Delete entry"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
