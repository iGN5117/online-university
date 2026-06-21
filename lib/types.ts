// Shared domain types. The DB stores lecture content and question options as JSON text;
// lib/data.ts parses them into these shapes before they reach UI or agent code.

export type LectureFormat = "cards" | "reading" | "video" | "game";

export type Difficulty = "Beginner" | "Intermediate" | "Advanced" | "Expert";

export interface School {
  id: number;
  name: string;
  slug: string;
  emoji: string;
  description: string;
  classCount: number;
}

// One planned lesson in a class's finite roadmap. The Course Builder emits the
// full ordered list when it creates a class; lessons are then built (as real
// lectures) in this order, so the syllabus is both the roadmap shown to the
// learner and the path "go deeper" follows to a real finish.
export interface SyllabusItem {
  title: string;
  summary: string; // one line, what this planned lesson will cover
  difficulty: Difficulty;
}

export interface ClassRow {
  id: number;
  school_id: number;
  name: string;
  slug: string;
  emoji: string;
  description: string;
  objective: string; // the learner's true goal/scope — anchors "go deeper" within bounds
  syllabus: SyllabusItem[]; // finite planned roadmap; [] for legacy classes
  lectureCount: number;
  completedCount: number;
}

export interface Card {
  front: string; // concept / question side — keep short, one idea per card
  back: string; // explanation side — 2-4 sentences max
  example?: string; // real-world example or use-case
  diagram?: string; // optional inline SVG that visually explains the concept
}

export interface LectureContent {
  cards?: Card[]; // format === "cards"
  body_md?: string; // format === "reading"
  url?: string; // format === "video"
  html?: string; // format === "game" (self-contained interactive snippet)
  notes?: string;
  rationale?: string; // why/for-whom this lecture was created (teacher-agent context)
  difficulty?: Difficulty; // beginner→expert level, shown as a chip and used by "go deeper"
}

export interface Lecture {
  id: number;
  class_id: number;
  title: string;
  format: LectureFormat;
  position: number;
  summary: string;
  content: LectureContent;
  completed: boolean;
  questionCount: number;
}

export interface Question {
  id: number;
  lecture_id: number;
  prompt: string;
  options: string[];
  answer_index: number;
  explanation: string;
}

export interface TestAttempt {
  id: number;
  class_id: number;
  score: number;
  total: number;
  taken_at: string;
}

// Input shapes used by the companion agent and seed data
export interface NewCard {
  front: string;
  back: string;
  example?: string;
  diagram?: string;
}

export interface NewQuestion {
  prompt: string;
  options: string[];
  answer_index: number;
  explanation: string;
}
