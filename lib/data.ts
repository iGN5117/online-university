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

// Thrown when a user references content they don't own. Routes map this to a
// 403 so a tampered id never mutates or reveals another user's data.
export class OwnershipError extends Error {
  constructor(message = "not found") {
    super(message);
    this.name = "OwnershipError";
  }
}

// ---------- Ownership guards ----------
// Every accessor scopes to the caller via schools.user_id. Content cascades
// from a school (school → class → lecture → questions/progress/tests), so
// checking the owning school is enough to authorize any descendant.

function ownsSchool(userId: number, schoolId: number): boolean {
  return !!getDb()
    .prepare("SELECT 1 FROM schools WHERE id = ? AND user_id = ?")
    .get(schoolId, userId);
}

function ownsClass(userId: number, classId: number): boolean {
  return !!getDb()
    .prepare(
      `SELECT 1 FROM classes c JOIN schools s ON s.id = c.school_id
       WHERE c.id = ? AND s.user_id = ?`,
    )
    .get(classId, userId);
}

function ownsLecture(userId: number, lectureId: number): boolean {
  return !!getDb()
    .prepare(
      `SELECT 1 FROM lectures l
         JOIN classes c ON c.id = l.class_id
         JOIN schools s ON s.id = c.school_id
       WHERE l.id = ? AND s.user_id = ?`,
    )
    .get(lectureId, userId);
}

// ---------- Users ----------

/**
 * Upsert the signed-in user (called from the auth jwt callback) and return the
 * internal user id. If the email matches OWNER_EMAIL, adopt any pre-multi-user
 * content (NULL-owned schools) — idempotent and safe to run on every login, so
 * migrating the existing DB before or after first sign-in both work.
 */
export function getOrCreateUser(
  email: string,
  name: string,
  image: string,
): number {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email) as { id: number } | undefined;

  let id: number;
  if (existing) {
    id = existing.id;
    db.prepare("UPDATE users SET name = ?, image = ? WHERE id = ?").run(
      name,
      image,
      id,
    );
  } else {
    id = db
      .prepare("INSERT INTO users (email, name, image) VALUES (?, ?, ?)")
      .run(email, name, image).lastInsertRowid as number;
  }

  const owner = process.env.OWNER_EMAIL;
  if (owner && email.toLowerCase() === owner.toLowerCase()) {
    db.prepare("UPDATE schools SET user_id = ? WHERE user_id IS NULL").run(id);
  }
  return id;
}

// ---------- Schools ----------

export function listSchools(userId: number): School[] {
  return getDb()
    .prepare(
      `SELECT s.*, (SELECT COUNT(*) FROM classes c WHERE c.school_id = s.id) AS classCount
       FROM schools s WHERE s.user_id = ? ORDER BY s.id`,
    )
    .all(userId) as School[];
}

export function getSchool(id: number, userId: number): School | undefined {
  return getDb()
    .prepare(
      `SELECT s.*, (SELECT COUNT(*) FROM classes c WHERE c.school_id = s.id) AS classCount
       FROM schools s WHERE s.id = ? AND s.user_id = ?`,
    )
    .get(id, userId) as School | undefined;
}

export function createSchool(
  userId: number,
  name: string,
  emoji: string,
  description: string,
): number {
  const db = getDb();
  let slug = slugify(name);
  const exists = db.prepare("SELECT 1 FROM schools WHERE user_id = ? AND slug = ?");
  if (exists.get(userId, slug)) slug = `${slug}-${Date.now() % 10000}`;
  return db
    .prepare(
      "INSERT INTO schools (user_id, name, slug, emoji, description) VALUES (?, ?, ?, ?, ?)",
    )
    .run(userId, name, slug, emoji, description).lastInsertRowid as number;
}

// ---------- Classes ----------

const CLASS_SELECT = `
  SELECT c.*,
    (SELECT COUNT(*) FROM lectures l WHERE l.class_id = c.id) AS lectureCount,
    (SELECT COUNT(*) FROM lectures l
       JOIN lecture_progress p ON p.lecture_id = l.id
     WHERE l.class_id = c.id) AS completedCount
  FROM classes c JOIN schools s ON s.id = c.school_id`;

export function listClasses(schoolId: number, userId: number): ClassRow[] {
  return getDb()
    .prepare(`${CLASS_SELECT} WHERE c.school_id = ? AND s.user_id = ? ORDER BY c.id`)
    .all(schoolId, userId) as ClassRow[];
}

export function getClass(id: number, userId: number): ClassRow | undefined {
  return getDb()
    .prepare(`${CLASS_SELECT} WHERE c.id = ? AND s.user_id = ?`)
    .get(id, userId) as ClassRow | undefined;
}

export function createClass(
  userId: number,
  schoolId: number,
  name: string,
  emoji: string,
  description: string,
  objective = "",
): number {
  const db = getDb();
  if (!ownsSchool(userId, schoolId))
    throw new OwnershipError(`school ${schoolId} not found`);
  let slug = slugify(name);
  const exists = db.prepare(
    "SELECT 1 FROM classes WHERE school_id = ? AND slug = ?",
  );
  if (exists.get(schoolId, slug)) slug = `${slug}-${Date.now() % 10000}`;
  return db
    .prepare(
      "INSERT INTO classes (school_id, name, slug, emoji, description, objective) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(schoolId, name, slug, emoji, description, objective)
    .lastInsertRowid as number;
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
  FROM lectures l
    JOIN classes c ON c.id = l.class_id
    JOIN schools s ON s.id = c.school_id`;

function parseLecture(row: LectureDbRow): Lecture {
  return {
    ...row,
    content: JSON.parse(row.content) as LectureContent,
    completed: !!row.completed,
  };
}

export function listLectures(classId: number, userId: number): Lecture[] {
  const rows = getDb()
    .prepare(`${LECTURE_SELECT} WHERE l.class_id = ? AND s.user_id = ?`)
    .all(classId, userId) as LectureDbRow[];
  return rows.map(parseLecture).sort(byLadder);
}

export function getLecture(id: number, userId: number): Lecture | undefined {
  const row = getDb()
    .prepare(`${LECTURE_SELECT} WHERE l.id = ? AND s.user_id = ?`)
    .get(id, userId) as LectureDbRow | undefined;
  return row ? parseLecture(row) : undefined;
}

export function createLecture(
  userId: number,
  classId: number,
  title: string,
  format: LectureFormat,
  summary: string,
  content: LectureContent,
  questions: NewQuestion[] = [],
): number {
  const db = getDb();
  if (!ownsClass(userId, classId))
    throw new OwnershipError(`class ${classId} not found`);
  const max = db
    .prepare("SELECT COALESCE(MAX(position), 0) AS m FROM lectures WHERE class_id = ?")
    .get(classId) as { m: number };
  const lectureId = db
    .prepare(
      "INSERT INTO lectures (class_id, title, format, position, summary, content) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(classId, title, format, max.m + 1, summary, JSON.stringify(content))
    .lastInsertRowid as number;
  if (questions.length) insertQuestions(lectureId, questions);
  return lectureId;
}

export function addCards(
  userId: number,
  lectureId: number,
  cards: NewCard[],
): number {
  const db = getDb();
  if (!ownsLecture(userId, lectureId))
    throw new OwnershipError(`lecture ${lectureId} not found`);
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

// Bare insert used internally after ownership is already established (e.g. by
// createLecture on a lecture it just created).
function insertQuestions(lectureId: number, questions: NewQuestion[]) {
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

export function addQuestions(
  userId: number,
  lectureId: number,
  questions: NewQuestion[],
) {
  if (!ownsLecture(userId, lectureId))
    throw new OwnershipError(`lecture ${lectureId} not found`);
  insertQuestions(lectureId, questions);
}

export function moveLecture(
  userId: number,
  lectureId: number,
  opts: { classId?: number; position?: number },
): void {
  const db = getDb();
  if (!ownsLecture(userId, lectureId))
    throw new OwnershipError(`lecture ${lectureId} not found`);
  // Can't move a lecture into a class the user doesn't own.
  if (opts.classId !== undefined && !ownsClass(userId, opts.classId))
    throw new OwnershipError(`class ${opts.classId} not found`);
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

export function deleteLecture(userId: number, lectureId: number): void {
  if (!ownsLecture(userId, lectureId))
    throw new OwnershipError(`lecture ${lectureId} not found`);
  // questions + lecture_progress cascade (FK ON DELETE CASCADE); cards live in
  // the lecture row's JSON, so this single delete removes everything.
  const info = getDb().prepare("DELETE FROM lectures WHERE id = ?").run(lectureId);
  if (info.changes === 0) throw new Error(`lecture ${lectureId} not found`);
}

// ---------- Progress ----------

export function markLectureComplete(userId: number, lectureId: number) {
  if (!ownsLecture(userId, lectureId))
    throw new OwnershipError(`lecture ${lectureId} not found`);
  getDb()
    .prepare("INSERT OR IGNORE INTO lecture_progress (lecture_id) VALUES (?)")
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
 * Scoped to the caller's own content via the schools join.
 */
export function getTestQuestions(classId: number, userId: number): Question[] {
  const rows = getDb()
    .prepare(
      `SELECT q.* FROM questions q
       JOIN lectures l ON l.id = q.lecture_id
       JOIN lecture_progress p ON p.lecture_id = l.id
       JOIN classes c ON c.id = l.class_id
       JOIN schools s ON s.id = c.school_id
       WHERE l.class_id = ? AND s.user_id = ?
       ORDER BY l.position, l.id, q.id`,
    )
    .all(classId, userId) as QuestionDbRow[];
  return rows.map((r) => ({
    ...r,
    options: JSON.parse(r.options) as string[],
  }));
}

export function recordTestAttempt(
  userId: number,
  classId: number,
  score: number,
  total: number,
  detail: unknown = [],
): number {
  if (!ownsClass(userId, classId))
    throw new OwnershipError(`class ${classId} not found`);
  return getDb()
    .prepare(
      "INSERT INTO test_attempts (class_id, score, total, detail) VALUES (?, ?, ?, ?)",
    )
    .run(classId, score, total, JSON.stringify(detail)).lastInsertRowid as number;
}

export function listTestAttempts(classId: number, userId: number): TestAttempt[] {
  return getDb()
    .prepare(
      `SELECT t.id, t.class_id, t.score, t.total, t.taken_at
       FROM test_attempts t
       JOIN classes c ON c.id = t.class_id
       JOIN schools s ON s.id = c.school_id
       WHERE t.class_id = ? AND s.user_id = ?
       ORDER BY t.id DESC`,
    )
    .all(classId, userId) as TestAttempt[];
}

// ---------- Agent helpers ----------

/**
 * Compact catalog summary for the companion agent. Pipe-delimited lines keep
 * the tool result small (token frugality) while giving the model every ID it
 * needs to place new content. Scoped to the signed-in user's universe only.
 */
export function getCatalogSummary(userId: number): string {
  const schools = listSchools(userId);
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
      for (const l of listLectures(c.id, userId)) {
        const diff = l.content.difficulty ? ` (${l.content.difficulty})` : "";
        lines.push(`    lecture ${l.id}: ${l.title}${diff}`);
      }
    }
  }
  return lines.join("\n");
}
