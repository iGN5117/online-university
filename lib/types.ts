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

export interface ClassRow {
  id: number;
  school_id: number;
  name: string;
  slug: string;
  emoji: string;
  description: string;
  objective: string; // the learner's true goal/scope — anchors "go deeper" within bounds
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
