import { getDb } from "./db";
import type {
  School,
  ClassRow,
  Lecture,
  LectureContent,
  LectureFormat,
  Question,
  TestAttempt,
  NewCard,
  NewQuestion,
  Difficulty,
} from "./types";

// Lessons within a class are ordered by difficulty (the learning ladder), then
// by creation time (id). Unlabeled legacy lessons rank first as foundations.
const DIFFICULTY_RANK: Record<Difficulty, number> = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
  Expert: 4,
};

function byLadder(a: Lecture, b: Lecture): number {
  const ra = a.content.difficulty ? DIFFICULTY_RANK[a.content.difficulty] : 0;
  const rb = b.content.difficulty ? DIFFICULTY_RANK[b.content.difficulty] : 0;
  return ra - rb || a.id - b.id;
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "item"
  );
}

// ---------- Schools ----------

export function listSchools(): School[] {
  return getDb()
    .prepare(
      `SELECT s.*, (SELECT COUNT(*) FROM classes c WHERE c.school_id = s.id) AS classCount
       FROM schools s ORDER BY s.id`,
    )
    .all() as School[];
}

export function getSchool(id: number): School | undefined {
  return getDb()
    .prepare(
      `SELECT s.*, (SELECT COUNT(*) FROM classes c WHERE c.school_id = s.id) AS classCount
       FROM schools s WHERE s.id = ?`,
    )
    .get(id) as School | undefined;
}

export function createSchool(
  name: string,
  emoji: string,
  description: string,
): number {
  const db = getDb();
  let slug = slugify(name);
  const exists = db.prepare("SELECT 1 FROM schools WHERE slug = ?");
  if (exists.get(slug)) slug = `${slug}-${Date.now() % 10000}`;
  return db
    .prepare(
      "INSERT INTO schools (name, slug, emoji, description) VALUES (?, ?, ?, ?)",
    )
    .run(name, slug, emoji, description).lastInsertRowid as number;
}

// ---------- Classes ----------

const CLASS_SELECT = `
  SELECT c.*,
    (SELECT COUNT(*) FROM lectures l WHERE l.class_id = c.id) AS lectureCount,
    (SELECT COUNT(*) FROM lectures l
       JOIN lecture_progress p ON p.lecture_id = l.id
     WHERE l.class_id = c.id) AS completedCount
  FROM classes c`;

export function listClasses(schoolId: number): ClassRow[] {
  return getDb()
    .prepare(`${CLASS_SELECT} WHERE c.school_id = ? ORDER BY c.id`)
    .all(schoolId) as ClassRow[];
}

export function getClass(id: number): ClassRow | undefined {
  return getDb().prepare(`${CLASS_SELECT} WHERE c.id = ?`).get(id) as
    | ClassRow
    | undefined;
}

export function createClass(
  schoolId: number,
  name: string,
  emoji: string,
  description: string,
): number {
  const db = getDb();
  let slug = slugify(name);
  const exists = db.prepare(
    "SELECT 1 FROM classes WHERE school_id = ? AND slug = ?",
  );
  if (exists.get(schoolId, slug)) slug = `${slug}-${Date.now() % 10000}`;
  return db
    .prepare(
      "INSERT INTO classes (school_id, name, slug, emoji, description) VALUES (?, ?, ?, ?, ?)",
    )
    .run(schoolId, name, slug, emoji, description).lastInsertRowid as number;
}

// ---------- Lectures ----------

interface LectureDbRow {
  id: number;
  class_id: number;
  title: string;
  format: LectureFormat;
  position: number;
  summary: string;
  content: string;
  completed: number;
  questionCount: number;
}

const LECTURE_SELECT = `
  SELECT l.*,
    EXISTS(SELECT 1 FROM lecture_progress p WHERE p.lecture_id = l.id) AS completed,
    (SELECT COUNT(*) FROM questions q WHERE q.lecture_id = l.id) AS questionCount
  FROM lectures l`;

function parseLecture(row: LectureDbRow): Lecture {
  return {
    ...row,
    content: JSON.parse(row.content) as LectureContent,
    completed: !!row.completed,
  };
}

export function listLectures(classId: number): Lecture[] {
  const rows = getDb()
    .prepare(`${LECTURE_SELECT} WHERE l.class_id = ?`)
    .all(classId) as LectureDbRow[];
  return rows.map(parseLecture).sort(byLadder);
}

export function getLecture(id: number): Lecture | undefined {
  const row = getDb().prepare(`${LECTURE_SELECT} WHERE l.id = ?`).get(id) as
    | LectureDbRow
    | undefined;
  return row ? parseLecture(row) : undefined;
}

export function createLecture(
  classId: number,
  title: string,
  format: LectureFormat,
  summary: string,
  content: LectureContent,
  questions: NewQuestion[] = [],
): number {
  const db = getDb();
  const max = db
    .prepare("SELECT COALESCE(MAX(position), 0) AS m FROM lectures WHERE class_id = ?")
    .get(classId) as { m: number };
  const lectureId = db
    .prepare(
      "INSERT INTO lectures (class_id, title, format, position, summary, content) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(classId, title, format, max.m + 1, summary, JSON.stringify(content))
    .lastInsertRowid as number;
  if (questions.length) addQuestions(lectureId, questions);
  return lectureId;
}

export function addCards(lectureId: number, cards: NewCard[]): number {
  const db = getDb();
  const row = db
    .prepare("SELECT content FROM lectures WHERE id = ?")
    .get(lectureId) as { content: string } | undefined;
  if (!row) throw new Error(`lecture ${lectureId} not found`);
  const content = JSON.parse(row.content) as LectureContent;
  content.cards = [...(content.cards ?? []), ...cards];
  db.prepare("UPDATE lectures SET content = ? WHERE id = ?").run(
    JSON.stringify(content),
    lectureId,
  );
  // New cards mean new material to learn — reset completion so the lecture
  // shows as unfinished again.
  db.prepare("DELETE FROM lecture_progress WHERE lecture_id = ?").run(lectureId);
  return content.cards.length;
}

export function addQuestions(lectureId: number, questions: NewQuestion[]) {
  const ins = getDb().prepare(
    "INSERT INTO questions (lecture_id, prompt, options, answer_index, explanation) VALUES (?, ?, ?, ?, ?)",
  );
  for (const q of questions) {
    ins.run(
      lectureId,
      q.prompt,
      JSON.stringify(q.options),
      q.answer_index,
      q.explanation,
    );
  }
}

export function moveLecture(
  lectureId: number,
  opts: { classId?: number; position?: number },
): void {
  const db = getDb();
  const row = db
    .prepare("SELECT class_id FROM lectures WHERE id = ?")
    .get(lectureId) as { class_id: number } | undefined;
  if (!row) throw new Error(`lecture ${lectureId} not found`);

  const movingClass = opts.classId !== undefined && opts.classId !== row.class_id;
  let position = opts.position;
  // Moving into a different class with no explicit position → append to the end.
  if (movingClass && position === undefined) {
    const max = db
      .prepare("SELECT COALESCE(MAX(position), 0) AS m FROM lectures WHERE class_id = ?")
      .get(opts.classId) as { m: number };
    position = max.m + 1;
  }

  if (opts.classId !== undefined && position !== undefined) {
    db.prepare("UPDATE lectures SET class_id = ?, position = ? WHERE id = ?").run(
      opts.classId,
      position,
      lectureId,
    );
  } else if (opts.classId !== undefined) {
    db.prepare("UPDATE lectures SET class_id = ? WHERE id = ?").run(
      opts.classId,
      lectureId,
    );
  } else if (position !== undefined) {
    db.prepare("UPDATE lectures SET position = ? WHERE id = ?").run(
      position,
      lectureId,
    );
  }
}

export function deleteLecture(lectureId: number): void {
  // questions + lecture_progress cascade (FK ON DELETE CASCADE); cards live in
  // the lecture row's JSON, so this single delete removes everything.
  const info = getDb().prepare("DELETE FROM lectures WHERE id = ?").run(lectureId);
  if (info.changes === 0) throw new Error(`lecture ${lectureId} not found`);
}

// ---------- Progress ----------

export function markLectureComplete(lectureId: number) {
  getDb()
    .prepare(
      "INSERT OR IGNORE INTO lecture_progress (lecture_id) VALUES (?)",
    )
    .run(lectureId);
}

// ---------- Tests ----------

interface QuestionDbRow {
  id: number;
  lecture_id: number;
  prompt: string;
  options: string;
  answer_index: number;
  explanation: string;
}

/**
 * Questions eligible for a class test right now: only those belonging to
 * lectures the user has completed — "test only what was learned so far".
 */
export function getTestQuestions(classId: number): Question[] {
  const rows = getDb()
    .prepare(
      `SELECT q.* FROM questions q
       JOIN lectures l ON l.id = q.lecture_id
       JOIN lecture_progress p ON p.lecture_id = l.id
       WHERE l.class_id = ?
       ORDER BY l.position, l.id, q.id`,
    )
    .all(classId) as QuestionDbRow[];
  return rows.map((r) => ({
    ...r,
    options: JSON.parse(r.options) as string[],
  }));
}

export function recordTestAttempt(
  classId: number,
  score: number,
  total: number,
  detail: unknown = [],
): number {
  return getDb()
    .prepare(
      "INSERT INTO test_attempts (class_id, score, total, detail) VALUES (?, ?, ?, ?)",
    )
    .run(classId, score, total, JSON.stringify(detail)).lastInsertRowid as number;
}

export function listTestAttempts(classId: number): TestAttempt[] {
  return getDb()
    .prepare(
      "SELECT id, class_id, score, total, taken_at FROM test_attempts WHERE class_id = ? ORDER BY id DESC",
    )
    .all(classId) as TestAttempt[];
}

// ---------- Agent helpers ----------

/**
 * Compact catalog summary for the companion agent. Pipe-delimited lines keep
 * the tool result small (token frugality) while giving the model every ID it
 * needs to place new content.
 */
export function getCatalogSummary(): string {
  const schools = listSchools();
  if (!schools.length) return "(empty — no schools yet)";
  const lines: string[] = [];
  const db = getDb();
  const classStmt = db.prepare(
    "SELECT id, name FROM classes WHERE school_id = ? ORDER BY id",
  );
  for (const s of schools) {
    lines.push(`school ${s.id}: ${s.name}`);
    const classes = classStmt.all(s.id) as { id: number; name: string }[];
    for (const c of classes) {
      lines.push(`  class ${c.id}: ${c.name}`);
      // listLectures applies the difficulty-ladder ordering used everywhere.
      for (const l of listLectures(c.id)) {
        const diff = l.content.difficulty ? ` (${l.content.difficulty})` : "";
        lines.push(`    lecture ${l.id}: ${l.title}${diff}`);
      }
    }
  }
  return lines.join("\n");
}
