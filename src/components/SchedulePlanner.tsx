import React, { useState } from "react";
import { 
  Calendar, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Menu, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Sparkles, 
  Link,
  BookOpen
} from "lucide-react";
import { StudySchedule } from "../types";

interface SchedulePlannerProps {
  schedules: StudySchedule[];
  onGenerateSchedule: (title: string, subject: string, objective: string, totalDays: number) => Promise<void>;
  onToggleTask: (scheduleId: string, dayNumber: number) => Promise<void>;
  onDeleteSchedule: (id: string) => Promise<void>;
}

export default function SchedulePlanner({
  schedules,
  onGenerateSchedule,
  onToggleTask,
  onDeleteSchedule
}: SchedulePlannerProps) {
  // Input fields for creator form
  const [subject, setSubject] = useState("");
  const [objective, setObjective] = useState("");
  const [totalDays, setTotalDays] = useState(7);
  const [customTitle, setCustomTitle] = useState("");
  
  // UI states
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !objective.trim()) {
      setErrorMessage("Please supply a Subject and your Target Objective.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage("");
    try {
      const generatedTitle = customTitle.trim() || `${totalDays}-Day ${subject} Plan`;
      await onGenerateSchedule(generatedTitle, subject, objective, totalDays);
      
      // Reset inputs
      setSubject("");
      setObjective("");
      setCustomTitle("");
      setTotalDays(7);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to generate schedule. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper to expand first schedule as default if none set yet
  React.useEffect(() => {
    if (schedules.length > 0 && expandedScheduleId === null) {
      setExpandedScheduleId(schedules[0].id);
    }
  }, [schedules]);

  return (
    <div className="space-y-8 animate-fade-in" id="schedules-canvas">
      
      {/* Top Header Section */}
      <div className="border-b border-slate-200 pb-6 mb-2">
        <h1 className="text-4xl font-extrabold text-slate-900 flex items-center gap-3">
          <Calendar className="h-8 w-8 text-indigo-600" />
          Study Schedule Planner
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          Formulate granular, customized learning plans using Gemini AI and track daily tasks.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="schedules-tab-panel">
        
        {/* Left Column: Generator Form (5-cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600 flex items-center justify-center">
                <Sparkles className="h-5 w-5 fill-indigo-100" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">AI Schedule Builder</h3>
                <p className="text-xs text-slate-400">Generate custom educational outlines instantly.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Subject / Skill</label>
                <input
                  type="text"
                  required
                  disabled={isGenerating}
                  placeholder="e.g. Organic Chemistry, Quantum Mechanics, NextJS"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-sm px-4 py-3 rounded-2xl focus:border-indigo-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Target Objective */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Target Objective / Study Goals</label>
                <textarea
                  required
                  disabled={isGenerating}
                  rows={3}
                  placeholder="e.g., Learn basic reactions and mechanisms to prepare for the midterm exam on the 30th."
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-sm px-4 py-3 rounded-2xl focus:border-indigo-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400 resize-none"
                />
              </div>

              {/* Total Days */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Schedule Duration (Days)</label>
                <select
                  disabled={isGenerating}
                  value={totalDays}
                  onChange={(e) => setTotalDays(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 text-sm px-4 py-3 rounded-2xl focus:border-indigo-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                >
                  <option value={3}>3 Days (Crash Course)</option>
                  <option value={5}>5 Days (Compact Review)</option>
                  <option value={7}>7 Days (1 Week Blueprint)</option>
                  <option value={10}>10 Days (Rigorous Track)</option>
                  <option value={14}>14 Days (2 Week Deep Study)</option>
                  <option value={30}>30 Days (Comprehensive Masterclass)</option>
                </select>
              </div>

              {/* Custom Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Custom Plan Name (Optional)</label>
                <input
                  type="text"
                  disabled={isGenerating}
                  placeholder="Defaults to '[Days]-Day [Subject] Plan'"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-sm px-4 py-3 rounded-2xl focus:border-indigo-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
                />
              </div>

              {errorMessage && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-150 p-4 rounded-2xl leading-relaxed font-semibold">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl py-3.5 font-bold text-xs shadow-md transition-all disabled:bg-zinc-400 cursor-pointer disabled:cursor-not-allowed"
                id="forge-schedule-button"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="h-4.5 w-4.5 animate-spin text-amber-300" />
                    Generating study plan...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4.5 w-4.5 text-amber-300 fill-amber-300" />
                    Forge AI Study Schedule
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Science Info box */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-805">Why Use AI Schedules?</h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Gemini parses your subject material to create a structured path, ensuring you prioritize critical foundation blocks first before moving to advanced materials. It cuts off decision fatigue and guarantees cohesive study progression.
            </p>
          </div>
        </div>

        {/* Right Column: Schedule Display Dashboard (7-cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {schedules.length === 0 ? (
            <div className="border border-dashed border-slate-200 bg-white rounded-[32px] p-12 text-center space-y-4">
              <div className="h-16 w-16 bg-slate-50 border border-slate-100 rounded-2xl mx-auto flex items-center justify-center text-slate-400 shadow-sm">
                <Calendar className="h-7 w-7 text-indigo-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-800">No active schedules found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed font-medium">
                  Input your current study objective to let Gemini model a custom day-by-day learning schedule for you.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              
              <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3">
                Active Learning Programs ({schedules.length})
              </h3>

            {schedules.map((schedule) => {
              const isExpanded = expandedScheduleId === schedule.id;
              
              return (
                <div 
                  key={schedule.id}
                  className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm hover:shadow-md/5 transition-all"
                  id={`schedule-card-${schedule.id}`}
                >
                  {/* Card Header Summary */}
                  <div 
                    onClick={() => setExpandedScheduleId(isExpanded ? null : schedule.id)}
                    className="p-6 flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-50/50"
                  >
                    <div className="space-y-2 flex-1 select-none">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-150/70 text-indigo-700">
                          {schedule.subject}
                        </span>
                        <span className="text-xs font-bold text-slate-400 font-mono">
                          Generated {new Date(schedule.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <h4 className="text-xl font-extrabold text-slate-900 tracking-tight hover:text-indigo-650 transition-colors">
                        {schedule.title}
                      </h4>
                      
                      <p className="text-xs text-slate-500 line-clamp-1 italic font-medium">
                        Objective: {schedule.objective}
                      </p>

                      {/* Progress bar info */}
                      <div className="flex items-center gap-4 pt-3">
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${schedule.progressPercent}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-600 whitespace-nowrap bg-emerald-50 px-2 py-0.5 rounded-md">
                          {schedule.progressPercent}% Completed
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Are you sure you want to delete this AI Schedule?")) {
                            onDeleteSchedule(schedule.id);
                          }
                        }}
                        className="p-2 hover:text-rose-605 hover:bg-rose-50 text-slate-400 rounded-xl transition-colors cursor-pointer"
                        title="Delete Schedule"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>

                      <div className="text-slate-400 bg-slate-50 p-1.5 rounded-lg">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Daily Tasks - Expanded Section */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/40 p-6 space-y-5 divide-y divide-slate-200/60 font-sans">
                      
                      {schedule.dailySchedules.map((dayTask) => (
                        <div 
                          key={dayTask.dayNumber}
                          className="pt-5 first:pt-0 flex gap-4 items-start"
                        >
                          {/* Left: Completion Switch */}
                          <button
                            onClick={() => onToggleTask(schedule.id, dayTask.dayNumber)}
                            className={`p-1.5 mt-0.5 rounded-xl border cursor-pointer transition-all flex items-center justify-center ${
                              dayTask.completed 
                                ? "bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/20" 
                                : "bg-white border-slate-200 text-slate-300 hover:border-slate-400 hover:text-slate-600"
                            }`}
                            id={`check-task-d${dayTask.dayNumber}`}
                            title={dayTask.completed ? "Mark Incomplete" : "Mark Completed"}
                          >
                            <CheckCircle2 className="h-4.5 w-4.5" />
                          </button>

                          {/* Right: Task content */}
                          <div className="flex-1 space-y-3">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                              <h5 className="font-sans font-extrabold text-sm text-slate-800 flex items-center gap-2">
                                <span className="text-[10px] bg-slate-200/80 px-2 py-0.5 rounded-lg font-mono font-bold text-slate-700 block whitespace-nowrap">
                                  DAY {dayTask.dayNumber}
                                </span>
                                <span className={dayTask.completed ? "line-through text-slate-400 font-medium" : "text-slate-900"}>
                                  {dayTask.topic}
                                </span>
                              </h5>
                              
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 whitespace-nowrap bg-slate-100/60 px-2 py-0.5 rounded-md">
                                <Clock className="h-3.5 w-3.5 text-slate-405" />
                                {dayTask.durationMinutes} min
                              </span>
                            </div>

                            <p className={`text-xs leading-relaxed font-medium ${
                              dayTask.completed ? "text-slate-400 line-through" : "text-slate-600"
                            }`}>
                              {dayTask.description}
                            </p>

                            {/* Resources */}
                            {dayTask.resources && dayTask.resources.length > 0 && (
                              <div className="pt-2 space-y-2">
                                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                                  <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
                                  Actionable Study Steps & Guidelines
                                </div>
                                <ul className="space-y-1.5 pl-1.5">
                                  {dayTask.resources.map((resource, ri) => (
                                    <li 
                                      key={ri} 
                                      className={`text-xs font-mono text-indigo-705/90 flex items-start gap-1.5 ${
                                        dayTask.completed ? "text-slate-400 line-through font-normal" : "font-bold"
                                      }`}
                                    >
                                      <span className="text-amber-500">▶</span>
                                      <span>{resource}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                        </div>
                      ))}

                    </div>
                  )}

                </div>
              );
            })}

          </div>
        )}

      </div>

    </div>

  </div>
  );
}
