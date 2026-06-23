import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  setDoc,
  writeBatch
} from "firebase/firestore";
import { db } from "./firebase";
import { FlashcardSet, StudySchedule, StudyLog, Flashcard, DailyScheduleTask } from "../types";

// Starter Flashcard set
const DEFAULT_FLASHCARD_SETS: FlashcardSet[] = [
  {
    id: "seed-set-react19",
    title: "React 19 & Web Architecture",
    subject: "Computer Science",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    cards: [
      {
        id: "react-1",
        question: "What is the new 'use' hook in React 19 and how does it differ from older patterns?",
        answer: "The 'use' hook is a React 19 API that can read promises and context inline. Unlike standard hooks, 'use' can be called conditionally or inside loops, making async data fetching and conditional context consumption significantly cleaner.",
        box: 1,
        lastReviewStatus: "none"
      },
      {
        id: "react-2",
        question: "Explain ‘Server Components’ (RSC) vs ‘Client Components’ in modern React frameworks.",
        answer: "Server Components render on the server, minimizing bundle size and enabling direct database/backend access without APIs. Client Components are traditional interactive components marked with the 'use client' directive, booted in the browser for client state and event handling.",
        box: 1,
        lastReviewStatus: "none"
      },
      {
        id: "react-3",
        question: "What are React 19 'Actions' and how do they simplify state pending states?",
        answer: "Actions are async transitions that automatically handle pending states, error states, and optimistic updates. They integrate natively with standard form elements and hooks like 'useActionState' to remove manual 'setIsLoading' logic.",
        box: 1,
        lastReviewStatus: "none"
      },
      {
        id: "react-4",
        question: "What is the difference between debounce and throttle in web performance?",
        answer: "Debounce delay-triggers a function until a certain timespan of inactivity passes (e.g. autocompletions). Throttle limits execution to at most once per defined interval (e.g. window resize or scroll tracking).",
        box: 1,
        lastReviewStatus: "none"
      }
    ]
  },
  {
    id: "seed-set-astronomy",
    title: "Cosmovision & Solar Dynamics",
    subject: "Astronomy",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    cards: [
      {
        id: "astro-1",
        question: "What is the cosmic microwave background (CMB)?",
        answer: "CMB is the relic electromagnetic radiation filling all space, dating back to 380,000 years after the Big Bang when the universe cooled down enough for neutral hydrogen atoms to form, allowing photons to travel freely.",
        box: 1,
        lastReviewStatus: "none"
      },
      {
        id: "astro-2",
        question: "What is the Schwarzschild radius of a massive body?",
        answer: "It is the physical radius of the event horizon of a black hole, where the escape velocity exactly equals the speed of light. Any mass compressed within its Schwarzschild radius forms a black hole.",
        box: 1,
        lastReviewStatus: "none"
      }
    ]
  }
];

// Starter Study Schedule
const DEFAULT_SCHEDULES: StudySchedule[] = [
  {
    id: "seed-sched-webdev",
    title: "7-Day Fullstack Web Architecture",
    subject: "Fullstack Engineering",
    objective: "Master fullstack request/response cycles, server architecture, and server-side APIs",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    totalDays: 7,
    progressPercent: 28, // 2 out of 7 completed
    dailySchedules: [
      {
        dayNumber: 1,
        topic: "HTTP, Protocols, and Domain Routing",
        description: "Review request headers, HTTP/2 multiplexing, DNS resolution sequence, and reverse proxy mechanics.",
        durationMinutes: 90,
        completed: true,
        resources: [
          "MDN Web Docs: An Overview of HTTP",
          "Cloudflare Learning Center: How DNS Works"
        ]
      },
      {
        dayNumber: 2,
        topic: "RESTful API Design & Express Middleware",
        description: "Study idempotency, proper HTTP status code structures, and build standard request interception middleware.",
        durationMinutes: 120,
        completed: true,
        resources: [
          "Express.js Official Documentation: Writing Middleware",
          "HTTP API Design Best Practices Guide"
        ]
      },
      {
        dayNumber: 3,
        topic: "Database Modeling & ORM Structuring",
        description: "Configure basic schemas, primary/foreign key connections, and understand N+1 query problems.",
        durationMinutes: 100,
        completed: false,
        resources: [
          "SQL vs NoSQL: Practical guides on schema design",
          "Prisma or Drizzle schema basics"
        ]
      },
      {
        dayNumber: 4,
        topic: "State Hydration & Authentication Flows",
        description: "Implement JWT token headers, cookie sessions, CORS configuration, and browser security contexts.",
        durationMinutes: 120,
        completed: false,
        resources: [
          "OWASP Cheat Sheet: HTML5 & Cookie Security",
          "Auth0 Blog: JWT Structure & Security"
        ]
      },
      {
        dayNumber: 5,
        topic: "Async Data Hydration & React Promises",
        description: "Master React async data loading pools, handling race conditions, and error boundaries.",
        durationMinutes: 90,
        completed: false,
        resources: [
          "React 19 Docs: Server Actions and Promises",
          "Using abort controller to cancel stale API fetch requests"
        ]
      },
      {
        dayNumber: 6,
        topic: "Caching Patterns and Systems",
        description: "Explore stale-while-revalidate headers, browser localStorage, and Redis in-memory lookup keys.",
        durationMinutes: 110,
        completed: false,
        resources: [
          "Vercel Blog: caching policies & CDN mechanisms"
        ]
      },
      {
        dayNumber: 7,
        topic: "Deployment, CI/CD, & CDN Assets",
        description: "Build release files, publish to container ingress routing systems, and configure static asset edge points.",
        durationMinutes: 80,
        completed: false,
        resources: [
          "Vite Guide: Building for Production",
          "Introduction to Docker and Serverless Containers"
        ]
      }
    ]
  }
];

const DEFAULT_LOGS: StudyLog[] = [
  {
    id: "seed-log-1",
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    subject: "Fullstack Engineering",
    durationMinutes: 90,
    type: "schedule",
    notes: "Completed Day 1 tasks. Read standard MDN web docs and felt confident with HTTP structure."
  },
  {
    id: "seed-log-2",
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    subject: "Fullstack Engineering",
    durationMinutes: 120,
    type: "schedule",
    notes: "Completed Day 2 tasks. Built custom routing middleware and tested Express server logs."
  },
  {
    id: "seed-log-3",
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    subject: "Computer Science",
    durationMinutes: 45,
    type: "flashcards",
    cardsReviewed: 12,
    notes: "Reviewed React 19 core features. Memorized the 'use' hook differences and Actions state model."
  }
];

// Helper to check and seed database if completely empty
async function seedDefaultDataIfEmpty() {
  try {
    const flashcardsCol = collection(db, "flashcard_sets");
    const flashcardsSnapshot = await getDocs(flashcardsCol);
    
    if (flashcardsSnapshot.empty) {
      console.log("Seeding flashcard sets to Firestore...");
      for (const set of DEFAULT_FLASHCARD_SETS) {
        await setDoc(doc(db, "flashcard_sets", set.id), set);
      }
    }

    const schedulesCol = collection(db, "study_schedules");
    const schedulesSnapshot = await getDocs(schedulesCol);
    
    if (schedulesSnapshot.empty) {
      console.log("Seeding study schedules to Firestore...");
      for (const sched of DEFAULT_SCHEDULES) {
        await setDoc(doc(db, "study_schedules", sched.id), sched);
      }
    }

    const logsCol = collection(db, "study_logs");
    const logsSnapshot = await getDocs(logsCol);
    
    if (logsSnapshot.empty) {
      console.log("Seeding study logs to Firestore...");
      for (const log of DEFAULT_LOGS) {
        await setDoc(doc(db, "study_logs", log.id), log);
      }
    }
  } catch (error) {
    console.warn("DB seed warning (might be offline or Firestore index warming):", error);
  }
}

// Ensure seeding coordinates smoothly on first load
seedDefaultDataIfEmpty();

// FLASHCARD API CALLS FOR FIRESTORE
export async function getFlashcardSets(): Promise<FlashcardSet[]> {
  try {
    const colRef = collection(db, "flashcard_sets");
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) {
      return DEFAULT_FLASHCARD_SETS;
    }
    const setsList: FlashcardSet[] = [];
    snapshot.forEach((docSnap) => {
      setsList.push({ id: docSnap.id, ...docSnap.data() } as FlashcardSet);
    });
    // Sort by createdAt descending
    return setsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (e) {
    console.error("Firestore getFlashcardSets error:", e);
    return DEFAULT_FLASHCARD_SETS;
  }
}

export async function addFlashcardSet(set: Omit<FlashcardSet, 'id'>): Promise<FlashcardSet> {
  const colRef = collection(db, "flashcard_sets");
  const docRef = await addDoc(colRef, set);
  return { id: docRef.id, ...set } as FlashcardSet;
}

export async function updateFlashcardSet(id: string, updates: Partial<FlashcardSet>): Promise<void> {
  const docRef = doc(db, "flashcard_sets", id);
  await updateDoc(docRef, updates);
}

export async function deleteFlashcardSet(id: string): Promise<void> {
  const docRef = doc(db, "flashcard_sets", id);
  await deleteDoc(docRef);
}


// STUDY SCHEDULES API CALLS FOR FIRESTORE
export async function getStudySchedules(): Promise<StudySchedule[]> {
  try {
    const colRef = collection(db, "study_schedules");
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) {
      return DEFAULT_SCHEDULES;
    }
    const list: StudySchedule[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as StudySchedule);
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (e) {
    console.error("Firestore getStudySchedules error:", e);
    return DEFAULT_SCHEDULES;
  }
}

export async function addStudySchedule(schedule: Omit<StudySchedule, 'id'>): Promise<StudySchedule> {
  const colRef = collection(db, "study_schedules");
  const docRef = await addDoc(colRef, schedule);
  return { id: docRef.id, ...schedule } as StudySchedule;
}

export async function updateStudySchedule(id: string, updates: Partial<StudySchedule>): Promise<void> {
  const docRef = doc(db, "study_schedules", id);
  await updateDoc(docRef, updates);
}

export async function deleteStudySchedule(id: string): Promise<void> {
  const docRef = doc(db, "study_schedules", id);
  await deleteDoc(docRef);
}


// STUDY LOGS API CALLS FOR FIRESTORE
export async function getStudyLogs(): Promise<StudyLog[]> {
  try {
    const colRef = collection(db, "study_logs");
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) {
      return DEFAULT_LOGS;
    }
    const list: StudyLog[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as StudyLog);
    });
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (e) {
    console.error("Firestore getStudyLogs error:", e);
    return DEFAULT_LOGS;
  }
}

export async function addStudyLog(log: Omit<StudyLog, 'id'>): Promise<StudyLog> {
  const colRef = collection(db, "study_logs");
  const docRef = await addDoc(colRef, log);
  return { id: docRef.id, ...log } as StudyLog;
}

export async function deleteStudyLog(id: string): Promise<void> {
  const docRef = doc(db, "study_logs", id);
  await deleteDoc(docRef);
}
