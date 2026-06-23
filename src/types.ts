export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  box: number; // For Leitner system (1 to 5)
  nextReviewDate?: string; // ISO string
  lastReviewStatus: 'know' | 'dont-know' | 'none';
}

export interface FlashcardSet {
  id: string;
  title: string;
  subject: string;
  createdAt: string;
  cards: Flashcard[];
  cardsReviewCount?: number;
  cardsMasteredCount?: number;
}

export interface DailyScheduleTask {
  dayNumber: number;
  topic: string;
  description: string;
  durationMinutes: number;
  completed: boolean;
  resources?: string[];
}

export interface StudySchedule {
  id: string;
  title: string;
  subject: string;
  objective: string;
  createdAt: string;
  totalDays: number;
  dailySchedules: DailyScheduleTask[];
  progressPercent: number; // Calculates from completed days
}

export interface StudyLog {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  subject: string;
  durationMinutes: number;
  type: 'flashcards' | 'schedule' | 'other';
  cardsReviewed?: number;
  notes?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  metric?: string;
}
