import React, { useState } from "react";
import { 
  Sparkles, 
  Brain, 
  Trash2, 
  Plus, 
  FileText, 
  Play, 
  RotateCcw, 
  Check, 
  X, 
  ChevronRight, 
  Undo2, 
  AlertCircle,
  FolderOpen
} from "lucide-react";
import { FlashcardSet, Flashcard } from "../types";

interface FlashcardSuiteProps {
  sets: FlashcardSet[];
  onGenerateDecks: (topic: string, content: string, count: number) => Promise<void>;
  onUpdateDeck: (id: string, updatedSet: FlashcardSet) => Promise<void>;
  onDeleteDeck: (id: string) => Promise<void>;
  onLogReviewSession: (subject: string, minutes: number, cardCount: number) => void;
}

export default function FlashcardSuite({
  sets,
  onGenerateDecks,
  onUpdateDeck,
  onDeleteDeck,
  onLogReviewSession
}: FlashcardSuiteProps) {
  // Navigation: "list" | "review" | "create"
  const [panelView, setPanelView] = useState<"list" | "review" | "create">("list");
  
  // AI Generator Form States
  const [topic, setTopic] = useState("");
  const [contextText, setContextText] = useState("");
  const [numCards, setNumCards] = useState(8);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorText, setErrorText] = useState("");

  // Reviewing Decks States
  const [activeSet, setActiveSet] = useState<FlashcardSet | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCards, setReviewedCards] = useState<Flashcard[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  // Manual Deck States
  const [manualTitle, setManualTitle] = useState("");
  const [manualSubject, setManualSubject] = useState("");
  const [isCreatingManualDeck, setIsCreatingManualDeck] = useState(false);

  // Manual Card Form States for existing decks
  const [newCardQuestion, setNewCardQuestion] = useState("");
  const [newCardAnswer, setNewCardAnswer] = useState("");
  const [isAddingCardId, setIsAddingCardId] = useState<string | null>(null);

  // Submit AI Generation
  const handleAIGeneratorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setErrorText("A study topic is required.");
      return;
    }

    setIsGenerating(true);
    setErrorText("");
    try {
      await onGenerateDecks(topic.trim(), contextText.trim(), numCards);
      setTopic("");
      setContextText("");
      setPanelView("list");
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "Failed to generate educational flashcards. Validate your connection and API Key.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Start Studying / Reviewing a Deck
  const handleStartReview = (set: FlashcardSet) => {
    if (set.cards.length === 0) {
      alert("This deck is currently empty. Please add cards manually before reviewing.");
      return;
    }
    setActiveSet(set);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setReviewedCards([...set.cards]);
    setCorrectCount(0);
    setShowSummary(false);
    setPanelView("review");
  };

  // Handle Memorization feedback (Leitner Leitner)
  const handleAssessment = (status: "know" | "dont-know") => {
    if (!activeSet) return;

    const cardsCopy = [...reviewedCards];
    const currentCard = cardsCopy[currentCardIndex];
    
    // Leitner Scoring mechanics
    let newBox = currentCard.box || 1;
    if (status === "know") {
      newBox = Math.min(newBox + 1, 5); // caps at Box 5 (Mastered)
      currentCard.lastReviewStatus = "know";
      setCorrectCount(prev => prev + 1);
    } else {
      newBox = 1; // Resets back to Box 1 for further immediate study
      currentCard.lastReviewStatus = "dont-know";
    }
    
    currentCard.box = newBox;
    // Calculate new calendar schedule if preferred, or just review box assignment
    const reviewIntervalDays = [1, 2, 4, 7, 14]; // Spaced progression intervals
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + reviewIntervalDays[newBox - 1]);
    currentCard.nextReviewDate = nextDate.toISOString();

    setReviewedCards(cardsCopy);

    // Continue to next card or trigger summarized metrics
    if (currentCardIndex + 1 < activeSet.cards.length) {
      setIsFlipped(false);
      // Brief timeout to avoid sudden jarring content jump while rotating back (transition timing)
      setTimeout(() => {
        setCurrentCardIndex(prev => prev + 1);
      }, 200);
    } else {
      setShowSummary(true);
    }
  };

  // Complete review, save stats to Firestore
  const handleFinishReviewSession = async () => {
    if (!activeSet) return;

    // Calculate mastered cards: Cards in Box >= 3 or marked as "know"
    const masteredCount = reviewedCards.filter(c => c.box >= 4 || c.lastReviewStatus === "know").length;
    const reviewCount = reviewedCards.length;

    // Update the set's cards in Firestore structure
    const updatedSet: FlashcardSet = {
      ...activeSet,
      cards: reviewedCards,
      cardsReviewCount: (activeSet.cardsReviewCount || 0) + reviewCount,
      cardsMasteredCount: masteredCount
    };

    try {
      await onUpdateDeck(activeSet.id, updatedSet);
      
      // Auto-log study session (approx. 45 seconds per card reviewed)
      const calculatedMinutes = Math.max(1, Math.round((reviewCount * 45) / 60));
      onLogReviewSession(activeSet.title, calculatedMinutes, reviewCount);
      
      // Reset state and bounce back to lists
      setActiveSet(null);
      setPanelView("list");
    } catch (e) {
      console.error("Failed to commit deck review stats:", e);
    }
  };

  // Handle manual deck configuration
  const handleCreateManualDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    const newSet: Omit<FlashcardSet, "id"> = {
      title: manualTitle.trim(),
      subject: manualSubject.trim() || "General",
      createdAt: new Date().toISOString(),
      cards: [],
      cardsReviewCount: 0,
      cardsMasteredCount: 0
    };

    try {
      await onGenerateDecks(newSet.title, "__MANUAL_CREATE__:" + JSON.stringify(newSet), 0);
      setManualTitle("");
      setManualSubject("");
      setIsCreatingManualDeck(false);
    } catch (e) {
      console.error(e);
    }
  };

  // Add card manually to existing sets
  const handleAddManualCard = async (deckId: string) => {
    if (!newCardQuestion.trim() || !newCardAnswer.trim()) return;

    const findSet = sets.find(s => s.id === deckId);
    if (!findSet) return;

    const newCard: Flashcard = {
      id: "card-" + Math.random().toString(36).substr(2, 9),
      question: newCardQuestion.trim(),
      answer: newCardAnswer.trim(),
      box: 1,
      lastReviewStatus: "none"
    };

    const updatedSet: FlashcardSet = {
      ...findSet,
      cards: [...findSet.cards, newCard]
    };

    try {
      await onUpdateDeck(deckId, updatedSet);
      setNewCardQuestion("");
      setNewCardAnswer("");
      setIsAddingCardId(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in" id="flashcards-main-canvas">
      
      {/* Header controls */}
      {panelView === "list" && (
        <div className="flex flex-col sm:flex-row justify-between items-end gap-6 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 flex items-center gap-3">
              <Brain className="h-8 w-8 text-indigo-600" />
              Flashcard Deck Library
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Generate structured spaced-repetition cards from any topics or pasted lecture notes instantly.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setIsCreatingManualDeck(true)}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-800 px-5 py-3 rounded-2xl text-xs font-bold border border-slate-250 cursor-pointer transition-all active:scale-95 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              New Empty Deck
            </button>
            <button
              onClick={() => setPanelView("create")}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
              id="goto-ai-cards-btn"
            >
              <Sparkles className="h-4 w-4 text-amber-300 fill-amber-300" />
              Create AI Deck
            </button>
          </div>
        </div>
      )}

      {/* VIEW PANEL 1: CONSTRUCT NEW AI DECKS */}
      {panelView === "create" && (
        <div className="max-w-2xl mx-auto bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <Sparkles className="h-5 w-5 text-indigo-600 fill-indigo-100" />
            <h2 className="text-2xl font-bold text-slate-900">AI Flashcard Generator</h2>
            <button 
              onClick={() => setPanelView("list")}
              className="ml-auto text-xs text-slate-500 hover:text-slate-800 font-bold"
            >
              Back to Sets
            </button>
          </div>

          {/* Educational Visual helper block */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
              <span className="text-2xl mb-1">📁</span>
              <p className="text-xs font-bold text-slate-700">Topic-Specific</p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex flex-col items-center justify-center text-center">
              <span className="text-2xl mb-1">🧠</span>
              <p className="text-xs font-bold text-indigo-700">Notes Assisted</p>
            </div>
            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex flex-col items-center justify-center text-center">
              <span className="text-2xl mb-1">✍️</span>
              <p className="text-xs font-bold text-rose-700">Strict Synthesis</p>
            </div>
          </div>

          <form onSubmit={handleAIGeneratorSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Decks Topic</label>
              <input
                type="text"
                required
                disabled={isGenerating}
                placeholder="e.g. Mitochondria Respiration, French Revolution, React Router v6"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                <span>Material / pasted Notes (Optional)</span>
                <span className="text-[10px] text-slate-400 font-sans font-medium whitespace-nowrap lowercase">Class lectures, textbooks summaries</span>
              </label>
              <textarea
                rows={5}
                disabled={isGenerating}
                placeholder="Paste paragraphs from textbooks, lecture slides, outline notes, or summaries. Gemini will design structured cards based precisely on this context."
                value={contextText}
                onChange={(e) => setContextText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400 transition-all resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Number of Cards</label>
              <select
                disabled={isGenerating}
                value={numCards}
                onChange={(e) => setNumCards(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
              >
                <option value={5}>5 Flashcards (Short review)</option>
                <option value={8}>8 Flashcards (Standard stack)</option>
                <option value={10}>10 Flashcards (Robust set)</option>
                <option value={15}>15 Flashcards (Intelligent bundle)</option>
              </select>
            </div>

            {errorText && (
              <div className="text-xs text-rose-600 bg-rose-50 border border-rose-150 p-4 rounded-2xl leading-relaxed flex items-start gap-2 animate-fade-in font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorText}</span>
              </div>
            )}

            <div className="flex gap-4 pt-3">
              <button
                type="button"
                onClick={() => setPanelView("list")}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-2xl font-bold text-xs border border-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGenerating}
                className="flex-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl py-3.5 font-bold text-xs shadow-md transition-all text-center flex items-center justify-center gap-1.5 disabled:bg-zinc-400 cursor-pointer"
                id="sumbit-ai-deck-builder"
              >
                {isGenerating ? (
                  <>
                    <Brain className="h-4.5 w-4.5 animate-spin text-amber-300" />
                    Generating educational cards...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4.5 w-4.5 text-amber-300 fill-amber-300" />
                    Construct AI Study Deck
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: MANUAL DECK CREATION */}
      {isCreatingManualDeck && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-sans font-bold text-base text-zinc-900">Configure Custom Study Deck</h3>
            <form onSubmit={handleCreateManualDeck} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-zinc-500 uppercase">Deck Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AP US History Terms"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  className="w-full bg-zinc-50 border p-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-zinc-500 uppercase">Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Humanities, Medicine"
                  value={manualSubject}
                  onChange={(e) => setManualSubject(e.target.value)}
                  className="w-full bg-zinc-50 border p-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingManualDeck(false)}
                  className="flex-1 bg-zinc-100 text-zinc-700 rounded-xl py-2 text-xs font-semibold border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-zinc-900 text-white rounded-xl py-2 text-xs font-semibold cursor-pointer"
                >
                  Establish Deck
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PANEL 2: SHOW CASE DECK CARDS */}
      {panelView === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sets.map((set) => (
            <div 
              key={set.id}
              className="bg-white border border-slate-100 text-slate-800 rounded-[32px] shadow-sm hover:shadow-md/10 p-6 flex flex-col justify-between hover:border-slate-200 transition-all space-y-5"
              id={`deck-collection-${set.id}`}
            >
              {/* Top row */}
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-[10px] font-mono uppercase bg-indigo-50 border border-indigo-150/70 text-indigo-700 tracking-wider font-extrabold px-2.5 py-0.5 rounded-md">
                    {set.subject || "General"}
                  </span>
                  <p className="text-xs font-bold text-slate-400 font-mono">
                    {set.cards.length} cards
                  </p>
                </div>
                
                <h3 className="text-lg font-extrabold text-slate-900 leading-snug line-clamp-2">
                  {set.title}
                </h3>
              </div>

              {/* Middle row: Spaced repetition indicators */}
              {set.cards.length > 0 ? (
                <div className="bg-slate-50 rounded-2xl p-4 flex justify-around text-center border border-slate-100">
                  <div>
                    <span className="text-[10px] font-mono text-slate-450 block uppercase font-bold">Box 1</span>
                    <span className="text-sm font-extrabold text-slate-800">
                      {set.cards.filter(c => !c.box || c.box === 1).length}
                    </span>
                  </div>
                  <div className="border-r border-slate-200"></div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-450 block uppercase font-bold">Box 2-4</span>
                    <span className="text-sm font-extrabold text-slate-800">
                      {set.cards.filter(c => c.box > 1 && c.box < 5).length}
                    </span>
                  </div>
                  <div className="border-r border-slate-200"></div>
                  <div>
                    <span className="text-[10px] font-mono text-indigo-500 block uppercase font-black">Mastered</span>
                    <span className="text-sm font-black text-indigo-650 block">
                      {set.cards.filter(c => c.box === 5).length}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-5 border border-dashed rounded-2xl text-slate-400 text-xs bg-slate-50/50">
                  Empty deck. Add cards manually below!
                </div>
              )}

              {/* Bottom row: controls */}
              <div className="pt-3 flex flex-col space-y-3.5 border-t border-slate-100">
                
                {/* Manual Card addition toggle */}
                {isAddingCardId === set.id ? (
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3 animate-slide-in">
                    <input
                      type="text"
                      placeholder="Enter front question..."
                      value={newCardQuestion}
                      onChange={(e) => setNewCardQuestion(e.target.value)}
                      className="w-full bg-white border border-slate-200 placeholder:text-slate-450 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                    <textarea
                      placeholder="Enter back answer/definition..."
                      rows={2}
                      value={newCardAnswer}
                      onChange={(e) => setNewCardAnswer(e.target.value)}
                      className="w-full bg-white border border-slate-200 placeholder:text-slate-450 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 resize-none"
                    />
                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsAddingCardId(null)}
                        className="text-[11px] bg-slate-200 px-3.5 py-1.5 rounded-xl text-slate-600 font-bold hover:bg-slate-300 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddManualCard(set.id)}
                        className="text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl font-bold ml-auto cursor-pointer"
                      >
                        Add Card
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between gap-3">
                    <button
                      onClick={() => setIsAddingCardId(set.id)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 py-2.5 rounded-2xl text-xs font-bold cursor-pointer hover:border-slate-300 transition-all"
                    >
                      <Plus className="h-4 w-4" />
                      Add Card
                    </button>

                    <button
                      onClick={() => handleStartReview(set)}
                      className="inline-flex flex-2 items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-850 text-white px-4 py-2.5 rounded-2xl text-xs font-black cursor-pointer transition-all shadow-md active:scale-95"
                      id={`btn-review-${set.id}`}
                    >
                      <Play className="h-4 w-4 fill-current" />
                      Study Deck
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Delete the "${set.title}" deck permanently?`)) {
                          onDeleteDeck(set.id);
                        }
                      }}
                      className="p-2.5 hover:bg-rose-50 border border-transparent hover:border-rose-200/50 text-slate-400 hover:text-rose-600 rounded-2xl transition-all cursor-pointer"
                      title="Delete Deck"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                )}

              </div>
            </div>
          ))}

          {sets.length === 0 && (
            <div className="col-span-3 text-center border-2 border-dashed rounded-2xl bg-white border-zinc-200 p-12 space-y-4">
              <div className="h-12 w-12 bg-zinc-100 rounded-full mx-auto flex items-center justify-center text-zinc-500">
                <FolderOpen className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-800 text-sm">No flashcard sets.</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed mt-1">
                  Start generating structured spaced repetition cards on any topic with the Gemini AI engine.
                </p>
              </div>
              <button
                onClick={() => setPanelView("create")}
                className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
              >
                Launch Card Creator
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW PANEL 3: INTERACTIVE CARDS REVIEW GAME */}
      {panelView === "review" && activeSet && reviewedCards.length > 0 && (
        <div className="max-w-xl mx-auto space-y-6" id="deck-session-card-game">
          
          {/* Header Progress Indicators */}
          <div className="flex justify-between items-center bg-white border border-zinc-200 p-4 rounded-2xl shadow-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block font-bold">Reviewing Deck</span>
              <h2 className="font-sans font-bold text-sm text-zinc-800">{activeSet.title}</h2>
            </div>
            
            <button
              onClick={() => {
                if (confirm("Abandon active review progress? Your updates so far won't be saved until you complete the deck.")) {
                  setActiveSet(null);
                  setPanelView("list");
                }
              }}
              className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 border bg-zinc-50 hover:bg-zinc-100 px-3 py-1.5 rounded-xl cursor-pointer"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Abandon
            </button>
          </div>

          {!showSummary ? (
            <div className="space-y-6">
              
              {/* Spaced repetition indicator bar */}
              <div className="flex justify-between text-xs font-mono text-zinc-500">
                <span>Card {currentCardIndex + 1} of {reviewedCards.length}</span>
                <span className="bg-amber-100/80 border border-amber-200/90 text-amber-800 font-bold px-2 rounded-md">
                  Leitner Box: {reviewedCards[currentCardIndex].box || 1}
                </span>
              </div>

              {/* Progress slider percentage */}
              <div className="bg-zinc-200 h-1 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-1 transition-all duration-300"
                  style={{ width: `${((currentCardIndex) / reviewedCards.length) * 100}%` }}
                ></div>
              </div>

              {/* Interactive Flipping Card Canvas */}
              <div 
                onClick={() => setIsFlipped(!isFlipped)}
                style={{ perspective: "1000px" }}
                className="w-full h-80 relative cursor-pointer group"
                id="active-studycards-deck-interactive"
              >
                {/* CARD INNER FLIP ROTATOR */}
                <div 
                  className="w-full h-full relative transition-all duration-500 ease-in-out select-none"
                  style={{ 
                    transformStyle: "preserve-3d", 
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)"
                  }}
                >
                  
                  {/* FRONT: Question Container */}
                  <div 
                    className="absolute inset-0 w-full h-full bg-white border border-zinc-200 rounded-3xl p-8 flex flex-col justify-between shadow-md"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest font-bold">Front Question</span>
                    
                    <div className="text-center py-4 flex-1 flex items-center justify-center">
                      <p className="text-zinc-900 font-sans font-semibold text-lg md:text-xl leading-relaxed">
                        {reviewedCards[currentCardIndex].question}
                      </p>
                    </div>

                    <div className="text-center text-[10px] font-mono text-indigo-500 bg-indigo-50 border border-indigo-100 rounded-lg py-1.5 font-semibold">
                      Click standard to flip card & view explanation
                    </div>
                  </div>

                  {/* BACK: Answer Container */}
                  <div 
                    className="absolute inset-0 w-full h-full bg-zinc-900 border border-zinc-800 text-white rounded-3xl p-8 flex flex-col justify-between shadow-lg"
                    style={{ 
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)"
                    }}
                  >
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold">Back Answer</span>

                    <div className="py-4 flex-1 flex items-center justify-center overflow-y-auto">
                      <p className="text-zinc-100 text-sm md:text-base leading-relaxed text-center">
                        {reviewedCards[currentCardIndex].answer}
                      </p>
                    </div>

                    <div className="text-center text-[10px] font-mono text-zinc-400 bg-zinc-800 rounded-lg py-1.5">
                      Click to flip back to question
                    </div>
                  </div>

                </div>
              </div>


              {/* CONTROLLERS - Only visible/prompted when user flipped to reveal explanation */}
              <div 
                className={`transition-all duration-300 space-y-4 ${
                  isFlipped ? "opacity-100 translate-y-0" : "opacity-40 pointer-events-none scale-95"
                }`}
              >
                <div className="text-center text-xs text-zinc-500">
                  Assess your recall accuracy: did you know this card correctly?
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleAssessment("dont-know")}
                    className="inline-flex items-center justify-center gap-2 border border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-50 px-4 py-3 rounded-2xl font-bold text-sm cursor-pointer"
                    id="btn-failed-card"
                  >
                    <X className="h-4 w-4" />
                    Incorrect / Review
                  </button>

                  <button
                    onClick={() => handleAssessment("know")}
                    className="inline-flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-805 hover:bg-zinc-800 text-white px-4 py-3 rounded-2xl font-bold text-sm cursor-pointer"
                    id="btn-passed-card"
                  >
                    <Check className="h-4 w-4 text-emerald-400" />
                    Correct / Mastered
                  </button>
                </div>
              </div>

            </div>
          ) : (
            /* SESSION COMPLETED SUMMARY */
            <div className="bg-white border rounded-3xl p-8 text-center space-y-6 shadow-md animate-fade-in" id="deck-review-completed-analytics">
               <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-full mx-auto flex items-center justify-center">
                 <Check className="h-8 w-8 stroke-[2.5]" />
               </div>

               <div className="space-y-2">
                 <h2 className="font-sans font-bold text-2xl text-zinc-900">Deck Session Completed!</h2>
                 <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                   Excellent! You just powered through a learning session with this stack. Spaced repetition database variables have been updated.
                 </p>
               </div>

               {/* Metrics Box */}
               <div className="bg-zinc-50 border rounded-2xl p-4 max-w-xs mx-auto grid grid-cols-2 gap-4 divide-x">
                 <div>
                   <span className="text-[10px] font-mono text-zinc-400 block uppercase">Correct</span>
                   <span className="text-2xl font-bold text-zinc-800">{correctCount} / {reviewedCards.length}</span>
                 </div>
                 <div>
                   <span className="text-[10px] font-mono text-zinc-400 block uppercase">Memorized</span>
                   <span className="text-2xl font-bold text-indigo-650">
                     {Math.round((correctCount / reviewedCards.length) * 100)}%
                   </span>
                 </div>
               </div>

               <p className="text-xs text-zinc-400 italic">
                 An automated study session log will be created representing this practice event (approx. {reviewedCards.length} cards tracked).
               </p>

               <button
                 onClick={handleFinishReviewSession}
                 className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-bold text-sm shadow-sm hover:shadow-indigo-100 transition-all cursor-pointer"
                 id="finalize-deck-practice-btn"
               >
                 Finalize and Update Progress
               </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
