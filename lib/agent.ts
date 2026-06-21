import Anthropic from "@anthropic-ai/sdk";
import {
  createSchool,
  createClass,
  createLecture,
  addCards,
  addQuestions,
  getCatalogSummary,
  moveLecture,
  updateLecture,
  deleteLecture,
  deleteClass,
  deleteSchool,
  getLecture,
  getClass,
  listLectures,
  getAgentModel,
  OwnershipError,
} from "./data";
import type { NewCard, NewQuestion, Difficulty, SyllabusItem } from "./types";

const DIFFICULTY_LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Expert",
] as const;

// Cost ceiling is the design constraint here: cheapest current model, terse
// system prompt, catalog injected up-front (avoids a lookup round-trip), and
// tool results that return bare IDs instead of echoing content back. The model
// is read per request via getAgentModel() so the owner can switch it from
// /admin without a redeploy.
const MAX_TOKENS = 4096;
const MAX_ITERATIONS = 8;

// Both the learner's "Go deeper" button and the Course Builder's deepen_class
// tool add this many lessons in one go, through the same code path (deepenClass).
// All DEEPEN_COUNT lessons are produced in a SINGLE model turn (one ordered
// batch) — faster and cheaper than separate calls, which also share less context.
// The batch needs a bigger output budget than a normal single-lecture turn.
const DEEPEN_COUNT = 5;
const DEEPEN_MAX_TOKENS = 16384;

// Web search is a server-side tool: it runs on Anthropic's side and results come
// back inline in the same response (no client execution). The basic version is
// used deliberately — the dynamic-filtering versions require Opus/Sonnet, but
// the agent model is runtime-switchable (incl. Haiku) via getAgentModel(), and
// basic search works on every model. max_uses caps the per-turn search count to
// bound cost ($10 / 1k searches + results billed as input tokens).
const MAX_WEB_SEARCHES = 5;
const WEB_SEARCH_TOOL: Anthropic.Messages.ToolUnion = {
  type: "web_search_20250305",
  name: "web_search",
  max_uses: MAX_WEB_SEARCHES,
};

export interface AgentAction {
  kind: "school" | "class" | "lecture" | "cards" | "moved" | "deleted";
  id: number;
  label: string;
}

export interface AgentTurnResult {
  reply: string;
  actions: AgentAction[];
}

const CARD_SCHEMA = {
  type: "object" as const,
  properties: {
    front: { type: "string", description: "One concept, a few words" },
    back: { type: "string", description: "Plain explanation, 2-4 sentences" },
    example: { type: "string", description: "Concrete real-world example" },
    diagram: {
      type: "string",
      description:
        "A complete inline SVG (<svg viewBox=...>...</svg>) that visually conveys the concept — diagrams make lessons more gripping, so add one to MOST cards by default (a process, structure, relationship, comparison, or simple illustration). Keep it small and use currentColor for strokes/fills so it adapts to light/dark. Skip only when an idea genuinely can't be drawn.",
    },
  },
  required: ["front", "back", "example"],
};

const QUESTION_SCHEMA = {
  type: "object" as const,
  properties: {
    prompt: { type: "string" },
    options: { type: "array", items: { type: "string" }, description: "4 choices" },
    answer_index: { type: "integer", description: "0-based index of correct option" },
    explanation: { type: "string", description: "1 sentence on why" },
  },
  required: ["prompt", "options", "answer_index", "explanation"],
};

const SYLLABUS_ITEM_SCHEMA = {
  type: "object" as const,
  properties: {
    title: { type: "string", description: "the planned lesson's title" },
    summary: { type: "string", description: "one line, what this lesson will cover" },
    difficulty: {
      type: "string",
      enum: [...DIFFICULTY_LEVELS],
      description: "this lesson's level on the ladder",
    },
  },
  required: ["title", "summary", "difficulty"],
};

const TOOLS: Anthropic.Tool[] = [
  {
    name: "create_school",
    description:
      "Create a new school (broad field of study). Only when no existing school fits the topic.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "e.g. 'School of Finance'" },
        emoji: { type: "string", description: "single emoji" },
        description: { type: "string", description: "one sentence" },
      },
      required: ["name", "emoji", "description"],
    },
  },
  {
    name: "create_class",
    description:
      "Create a class (one topic) inside an existing school. This AUTOMATICALLY builds the first batch of lessons from the syllabus you provide, so you do NOT call create_lecture afterward for a new class.",
    input_schema: {
      type: "object",
      properties: {
        school_id: { type: "integer" },
        name: { type: "string", description: "e.g. 'Equities 101'" },
        emoji: { type: "string", description: "single emoji" },
        description: { type: "string", description: "one sentence" },
        objective: {
          type: "string",
          description:
            "The learner's TRUE goal and scope for this class, in their terms — what they actually want to learn and how far it extends. Capture the real intent, not a broadened field. E.g. 'Cover the key lessons from the book The Psychology of Money' (NOT 'Personal finance'). This bounds the class: 'go deeper' stays within it and stops when it's fully covered.",
        },
        syllabus: {
          type: "array",
          items: SYLLABUS_ITEM_SCHEMA,
          description:
            "The COMPLETE, finite, ordered roadmap of lessons that fully cover the objective — title + one-line summary + difficulty for each, climbing Beginner→Expert in order. This is the class's plan and finish line, shown to the learner and followed by 'go deeper'. Size it to the objective (a focused topic ≈ 5-8 lessons; a whole book/course ≈ 8-15); don't pad with tangents and don't stop short. The first item is the intro lecture you create next.",
        },
      },
      required: ["school_id", "name", "emoji", "description", "objective", "syllabus"],
    },
  },
  {
    name: "create_lecture",
    description:
      "Add a single one-off lecture (bite-size cards plus test questions) to an ALREADY-EXISTING class. Do NOT use this for a brand-new class — create_class builds its first lessons for you.",
    input_schema: {
      type: "object",
      properties: {
        class_id: { type: "integer" },
        title: { type: "string" },
        summary: { type: "string", description: "one line, what this lecture covers" },
        rationale: {
          type: "string",
          description:
            "Why this lecture was created and who it's for (the learner's goal and level). Briefs the in-lesson teacher agent.",
        },
        difficulty: {
          type: "string",
          enum: [...DIFFICULTY_LEVELS],
          description: "Approximate level of this lecture.",
        },
        cards: { type: "array", items: CARD_SCHEMA, description: "4-8 cards" },
        questions: {
          type: "array",
          items: QUESTION_SCHEMA,
          description: "2-4 multiple-choice questions on this lecture",
        },
      },
      required: ["class_id", "title", "summary", "difficulty", "cards", "questions"],
    },
  },
  {
    name: "add_cards",
    description: "Append more cards to an existing lecture (deepen a topic).",
    input_schema: {
      type: "object",
      properties: {
        lecture_id: { type: "integer" },
        cards: { type: "array", items: CARD_SCHEMA },
      },
      required: ["lecture_id", "cards"],
    },
  },
  {
    name: "add_questions",
    description: "Append more test questions to an existing lecture.",
    input_schema: {
      type: "object",
      properties: {
        lecture_id: { type: "integer" },
        questions: { type: "array", items: QUESTION_SCHEMA },
      },
      required: ["lecture_id", "questions"],
    },
  },
  {
    name: "deepen_class",
    description:
      "Build the next lessons of an EXISTING class by following its planned syllabus in order (each one step deeper, strictly within the class objective). This is the same engine as the learner's 'Go deeper' button, and it stops on its own when the syllabus is fully built. Use it whenever the user asks for more lessons, to extend, or to go deeper on an existing class. Builds 5 lessons by default; set count when the user asks for a specific number. Do NOT hand-write follow-up lectures with create_lecture for this. (create_lecture is only for the first intro lecture of a brand-new class; add_cards/add_questions only expand one specific existing lecture.)",
    input_schema: {
      type: "object",
      properties: {
        class_id: { type: "integer" },
        count: {
          type: "integer",
          description:
            "How many lessons to add. Omit for the default of 5; set it to the number the user asked for.",
        },
      },
      required: ["class_id"],
    },
  },
];

// Management tools (edit / move / delete) are always attached to the agents;
// the system prompt tells them to use these only on an explicit request. They
// were previously gated on a keyword heuristic, but it missed most real
// phrasings ("make it simpler", "redo this", "drop the last lesson", "scrap
// this class"), so edits and deletes silently failed — hence always-on.
const MANAGEMENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "edit_lecture",
    description:
      "Edit an existing lecture in place. Include ONLY the fields you want to change: title, summary, difficulty, rationale, cards, and/or questions. Passing cards or questions REPLACES that whole set (overwrites — use add_cards/add_questions to append instead). Each card keeps the front/back/example shape.",
    input_schema: {
      type: "object",
      properties: {
        lecture_id: { type: "integer" },
        title: { type: "string" },
        summary: { type: "string", description: "one line, what this lecture covers" },
        difficulty: {
          type: "string",
          enum: [...DIFFICULTY_LEVELS],
          description: "Level of this lecture on the ladder.",
        },
        rationale: {
          type: "string",
          description: "Why this lecture exists / who it's for (briefs the teacher).",
        },
        cards: {
          type: "array",
          items: CARD_SCHEMA,
          description: "Complete replacement set of cards (overwrites the existing ones).",
        },
        questions: {
          type: "array",
          items: QUESTION_SCHEMA,
          description: "Complete replacement set of questions (overwrites the existing ones).",
        },
      },
      required: ["lecture_id"],
    },
  },
  {
    name: "move_lecture",
    description:
      "Move a lecture to a different class. To move into a class that does NOT exist yet, pass to_new_class_name in this SAME call — the class is created in the lecture's current school and the lecture is moved into it. Never create the class separately for a move. (Order within a class is automatic, by difficulty — set difficulty to reorder.)",
    input_schema: {
      type: "object",
      properties: {
        lecture_id: { type: "integer" },
        class_id: {
          type: "integer",
          description: "Existing target class id. Omit if using to_new_class_name.",
        },
        to_new_class_name: {
          type: "string",
          description:
            "If the destination class doesn't exist yet, its name — it's created in the lecture's current school and the lecture moved into it.",
        },
        emoji: {
          type: "string",
          description: "Single emoji for the new class (with to_new_class_name).",
        },
        description: {
          type: "string",
          description: "One-sentence description for the new class (with to_new_class_name).",
        },
      },
      required: ["lecture_id"],
    },
  },
  {
    name: "delete_lecture",
    description:
      "Permanently delete a lecture and all its cards, questions, and progress.",
    input_schema: {
      type: "object",
      properties: { lecture_id: { type: "integer" } },
      required: ["lecture_id"],
    },
  },
  {
    name: "delete_class",
    description:
      "Permanently delete a class and ALL its lectures, cards, questions, progress, and test history. Cannot be undone — only on a clear request.",
    input_schema: {
      type: "object",
      properties: { class_id: { type: "integer" } },
      required: ["class_id"],
    },
  },
  {
    name: "delete_school",
    description:
      "Permanently delete a school and EVERYTHING under it (every class, lecture, card, question, progress record, and test). Cannot be undone — only on a clear, explicit request.",
    input_schema: {
      type: "object",
      properties: { school_id: { type: "integer" } },
      required: ["school_id"],
    },
  },
];

// The subset of MANAGEMENT_TOOLS the in-lesson teacher gets: edit/delete only,
// no move (moving lectures across classes is the Course Builder's job).
const TEACHER_MANAGEMENT_TOOL_NAMES = new Set([
  "edit_lecture",
  "delete_lecture",
  "delete_class",
  "delete_school",
]);

function systemPrompt(userId: number): string {
  const management = `
- Editing & management tools: edit_lecture (change a lecture's title/summary/difficulty/rationale, or replace its cards or questions), move_lecture (change class and/or reorder), delete_lecture, delete_class, and delete_school. Use these only when the user clearly asks — never edit or delete unprompted. With edit_lecture, include only the fields being changed; passing cards or questions REPLACES that set (use add_cards/add_questions to append). To move a lecture into a class that doesn't exist yet, call move_lecture with to_new_class_name in a SINGLE call (it creates the class in the lecture's school and moves it) — do NOT create the class separately. delete_class removes a class and all its lectures; delete_school removes a school and everything under it — these cascade and can't be undone, so use them only on an explicit request. After any delete, confirm exactly what you removed in one short sentence.`;
  return `You are the Course Builder for Online University, a bite-size card-based learning platform for people with short attention spans.

Your ONLY job: through brief conversation, create and extend learning content (schools > classes > lectures). If asked anything else, decline in one sentence and steer back.

Rules:
- A school = broad field (Finance, Computer Science & AI). A class = one learnable topic (Equities, RAG). Reuse an existing school when the topic fits; create a new one only when none fits.
- Class vs. lecture: add a lecture to an existing class ONLY when the topic is clearly a subtopic of that class's subject. If the user's topic is a distinct skill or area, create a NEW class within the school — even if a related class already exists. The catalog below lists each class's lectures; use it to judge fit rather than attaching to the nearest-sounding class.
- Decide this yourself and just build it — never ask the user to choose between a new lecture and a new class. Only ask where to put it if the topic genuinely fits two places equally and you cannot pick. When you act, briefly state the call you made (e.g. "Made this a new class since it's its own topic").
- When the user names a topic, ask at most 1-2 short questions (their level, what they want from it) before building. If they already gave enough, build immediately.
- A lecture = 4-8 cards. front: one concept in a few words. back: 2-4 plain sentences, no jargon. example: a concrete real-world example or use-case — every card must have one. Include 2-4 multiple-choice questions per lecture.
- Bias HARD toward visuals: graphics make lessons more gripping, so add a small inline SVG (currentColor) to the "diagram" field of MOST cards by default — a process, structure, relationship, comparison, or simple illustration. Skip a diagram only when a concept genuinely can't be drawn.
- When you create a lecture, set "rationale" to why the learner wants it and their level, so the in-lesson teacher can tailor answers.
- Always set "difficulty" (Beginner/Intermediate/Advanced/Expert). Lessons in a class are auto-ordered by difficulty, so this places the lesson correctly on the ladder — an intro lesson is Beginner, deeper ones go higher.
- When you create a class, set "objective" to the learner's real goal and scope in their own terms — what they actually want and how far it goes. A class is BOUNDED by its objective. If they ask for a specific book, course, or finite topic, say so exactly ("the key lessons from <book>"), not the broad field it belongs to. This is what "go deeper" follows, so getting it right keeps later lessons on target instead of drifting into the wider subject.
- Also set "syllabus": the COMPLETE finite roadmap of lessons that fully cover the objective, in order, each with a title, one-line summary, and difficulty climbing Beginner→Expert. This is the learner's visible plan and finish line, and it's the exact path "go deeper" builds out. Size it to the objective (a focused topic ≈ 5-8 lessons; a whole book/course ≈ 8-15) — don't pad with tangents, don't stop short. The intro lecture you create next must be the FIRST syllabus item (same title/difficulty).
- Creating a class automatically builds the first batch of lessons from your syllabus — do NOT call create_lecture for a brand-new class. When the user wants more lessons on an EXISTING class, call deepen_class — it builds the next batch from the syllabus, in order (the same engine as the "Go deeper" button), 5 by default; pass count when the user names a specific number (e.g. "add 3 more"). It stops on its own once the syllabus is fully built. Don't hand-write follow-up lectures yourself for that. Use create_lecture only to add a single one-off lecture to an already-existing class, and add_cards/add_questions only to expand one specific existing lecture.
- You can search the web when building content that needs current facts or specifics you're unsure of (recent events, prices, dates, fast-changing fields). Don't search for well-established fundamentals — answer from your own knowledge to keep it fast and cheap.
- Be brief. Confirm what you created in 1-2 sentences. Never repeat card content back in chat.${management}

Current catalog (id: name):
${getCatalogSummary(userId)}`;
}

async function executeTool(
  userId: number,
  name: string,
  input: Record<string, unknown>,
  actions: AgentAction[],
): Promise<string> {
  switch (name) {
    case "create_school": {
      const id = createSchool(
        userId,
        input.name as string,
        input.emoji as string,
        input.description as string,
      );
      actions.push({ kind: "school", id, label: input.name as string });
      return `school_id=${id}`;
    }
    case "create_class": {
      const id = createClass(
        userId,
        input.school_id as number,
        input.name as string,
        input.emoji as string,
        input.description as string,
        input.objective as string | undefined,
        (input.syllabus as SyllabusItem[] | undefined) ?? [],
      );
      actions.push({ kind: "class", id, label: input.name as string });
      // Build the first batch of lessons from the syllabus right away (no lessons
      // exist yet, so deepenClass with the default count produces syllabus[0..5]),
      // so the class is usable immediately without the learner pressing Go deeper.
      // The deeper lessons stay on Go deeper. A build failure must not look like a
      // failed class creation — the class exists and Go deeper can fill it later.
      try {
        const result = await deepenClass(id, userId);
        if (result.status === "added") {
          for (const l of result.lectures) {
            actions.push({ kind: "lecture", id: l.lectureId, label: l.title });
          }
          return `class_id=${id}; built ${result.lectures.length} lesson(s): ${result.lectures
            .map((l) => l.title)
            .join("; ")}. The class is ready — do not call create_lecture for it.`;
        }
        return `class_id=${id} created (no lessons built — syllabus was empty).`;
      } catch (err) {
        return `class_id=${id} created, but building the first lessons failed (${
          err instanceof Error ? err.message : String(err)
        }). The class exists; the learner can press Go deeper to build it.`;
      }
    }
    case "create_lecture": {
      const cards = input.cards as NewCard[];
      const id = createLecture(
        userId,
        input.class_id as number,
        input.title as string,
        "cards",
        input.summary as string,
        {
          cards,
          rationale: input.rationale as string | undefined,
          difficulty: input.difficulty as Difficulty | undefined,
        },
        input.questions as NewQuestion[],
      );
      actions.push({ kind: "lecture", id, label: input.title as string });
      return `lecture_id=${id}`;
    }
    case "add_cards": {
      const total = addCards(
        userId,
        input.lecture_id as number,
        input.cards as NewCard[],
      );
      actions.push({
        kind: "cards",
        id: input.lecture_id as number,
        label: `lecture ${input.lecture_id}`,
      });
      return `ok, lecture now has ${total} cards`;
    }
    case "add_questions": {
      addQuestions(
        userId,
        input.lecture_id as number,
        input.questions as NewQuestion[],
      );
      return "ok";
    }
    case "deepen_class": {
      // Delegate to the exact same skill the "Go deeper" button uses.
      const count =
        typeof input.count === "number" && input.count > 0
          ? input.count
          : undefined;
      const result = await deepenClass(input.class_id as number, userId, count);
      if (result.status === "complete") {
        return `class already covers its objective: ${result.reason}`;
      }
      for (const l of result.lectures) {
        actions.push({ kind: "lecture", id: l.lectureId, label: l.title });
      }
      return `ok, added ${result.lectures.length} lesson(s): ${result.lectures
        .map((l) => l.title)
        .join("; ")}`;
    }
    case "edit_lecture": {
      const lectureId = input.lecture_id as number;
      updateLecture(userId, lectureId, {
        title: input.title as string | undefined,
        summary: input.summary as string | undefined,
        difficulty: input.difficulty as Difficulty | undefined,
        rationale: input.rationale as string | undefined,
        cards: input.cards as NewCard[] | undefined,
        questions: input.questions as NewQuestion[] | undefined,
      });
      actions.push({ kind: "lecture", id: lectureId, label: `lecture ${lectureId}` });
      return `ok, updated lecture ${lectureId}`;
    }
    case "delete_class": {
      const classId = input.class_id as number;
      deleteClass(userId, classId);
      actions.push({ kind: "deleted", id: classId, label: `class ${classId}` });
      return `ok, deleted class ${classId}`;
    }
    case "delete_school": {
      const schoolId = input.school_id as number;
      deleteSchool(userId, schoolId);
      actions.push({ kind: "deleted", id: schoolId, label: `school ${schoolId}` });
      return `ok, deleted school ${schoolId}`;
    }
    case "move_lecture": {
      const lectureId = input.lecture_id as number;
      let targetClassId = input.class_id as number | undefined;
      const newName = input.to_new_class_name as string | undefined;
      // Atomic: create the destination class in the lecture's school if needed,
      // so the move never depends on the model chaining two tool calls.
      if (!targetClassId && newName) {
        const lecture = getLecture(lectureId, userId);
        if (!lecture) throw new OwnershipError(`lecture ${lectureId} not found`);
        const cur = getClass(lecture.class_id, userId);
        if (!cur) throw new OwnershipError(`class ${lecture.class_id} not found`);
        targetClassId = createClass(
          userId,
          cur.school_id,
          newName,
          (input.emoji as string) || "📚",
          (input.description as string) || newName,
          (input.description as string) || newName,
        );
        actions.push({ kind: "class", id: targetClassId, label: newName });
      }
      moveLecture(userId, lectureId, { classId: targetClassId });
      actions.push({ kind: "moved", id: lectureId, label: `lecture ${lectureId}` });
      return `ok, moved lecture ${lectureId}`;
    }
    case "delete_lecture": {
      const lectureId = input.lecture_id as number;
      deleteLecture(userId, lectureId);
      actions.push({ kind: "deleted", id: lectureId, label: `lecture ${lectureId}` });
      return `ok, deleted lecture ${lectureId}`;
    }
    default:
      throw new Error(`unknown tool ${name}`);
  }
}

/**
 * Runs one user turn through the agent loop. `history` is plain text turns
 * from the client (tool blocks are never round-tripped to the browser).
 */
export async function runAgentTurn(
  userId: number,
  history: { role: "user" | "assistant"; content: string }[],
): Promise<AgentTurnResult> {
  const client = new Anthropic();
  const actions: AgentAction[] = [];
  const messages: Anthropic.MessageParam[] = [...history];
  let reply = "";

  // Management tools are always available; the system prompt limits their use to
  // explicit requests (the old keyword gate missed too many phrasings).
  const tools: Anthropic.Messages.ToolUnion[] = [
    ...TOOLS,
    ...MANAGEMENT_TOOLS,
    WEB_SEARCH_TOOL,
  ];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: getAgentModel(),
      max_tokens: MAX_TOKENS,
      system: systemPrompt(userId),
      tools,
      messages,
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    if (text) reply = text;

    // Web search runs server-side; if its loop hits the cap mid-turn the API
    // returns pause_turn — echo the turn back to let it resume.
    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }

    if (response.stop_reason !== "tool_use") break;

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    messages.push({ role: "assistant", content: response.content });

    const results: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUses.map(async (tu) => {
        try {
          return {
            type: "tool_result" as const,
            tool_use_id: tu.id,
            content: await executeTool(
              userId,
              tu.name,
              tu.input as Record<string, unknown>,
              actions,
            ),
          };
        } catch (err) {
          return {
            type: "tool_result" as const,
            tool_use_id: tu.id,
            content: `Error: ${err instanceof Error ? err.message : String(err)}`,
            is_error: true,
          };
        }
      }),
    );
    messages.push({ role: "user", content: results });
  }

  return { reply: reply || "Done.", actions };
}

/**
 * The in-lesson teacher: an expert on ONE lecture. Its context is the lecture's
 * rationale (why it was made) plus all its card content. Read-only Q&A by
 * default; when the learner clearly asks to change content it can also edit this
 * lesson or delete this lesson / its class / its school (same data-layer skills
 * as the Course Builder), gated on the latest message like the builder is.
 */
export async function runTeacherTurn(
  lectureId: number,
  userId: number,
  history: { role: "user" | "assistant"; content: string }[],
): Promise<{ reply: string; actions: AgentAction[] }> {
  const lecture = getLecture(lectureId, userId);
  if (!lecture) throw new OwnershipError(`lecture ${lectureId} not found`);
  const cls = getClass(lecture.class_id, userId);

  const cards = lecture.content.cards ?? [];
  const rationale = lecture.content.rationale ?? lecture.summary;
  const cardText =
    cards
      .map(
        (c, i) =>
          `Card ${i + 1}: ${c.front}\n${c.back}${c.example ? `\nExample: ${c.example}` : ""}`,
      )
      .join("\n\n") || "(no cards)";

  // Edit/delete tools are always available; the prompt below limits their use to
  // explicit learner requests (the old keyword gate missed too many phrasings).
  const tools: Anthropic.Messages.ToolUnion[] = [
    WEB_SEARCH_TOOL,
    ...MANAGEMENT_TOOLS.filter((t) => TEACHER_MANAGEMENT_TOOL_NAMES.has(t.name)),
  ];

  const management = `

Editing & deletion (only when the learner clearly and explicitly asks — otherwise just answer):
- IDs for these tools: this lesson is lecture_id=${lectureId}${cls ? `, in class_id=${cls.id} ("${cls.name}"), school_id=${cls.school_id}` : ""}.
- edit_lecture: fix or improve THIS lesson — change its title/summary/difficulty/rationale, or replace its cards or questions (pass lecture_id=${lectureId}). Include only the fields you're changing; sending cards or questions REPLACES that whole set, so resend the full corrected list. Keep each card's front/back/example shape.
- delete_lecture / delete_class / delete_school: permanently delete this lesson, its whole class, or its whole school. These cascade and cannot be undone — do it only on an explicit request, and confirm exactly what you removed in one short sentence.`;

  const system = `You are the Teacher for the lesson "${lecture.title}" on Online University. You are an expert on THIS lesson only.

Why this lesson exists / who it's for:
${rationale}

The full lesson content (your single source of truth):
${cardText}

Rules:
- Answer the learner's questions about this lesson clearly and patiently, in a few short sentences.
- Ground answers in the lesson content above; you may add brief, directly-relevant context to clarify a point.
- You can search the web for current or factual details that help answer a question about this lesson (e.g. recent figures, dates, or events). Keep it tied to the lesson — don't search to go off-topic.
- If asked about something unrelated to this lesson, say it's outside this lesson and suggest the Course Builder, in one sentence.
- Be encouraging and concise. Plain text, no markdown headers.${management}`;

  const client = new Anthropic();
  const actions: AgentAction[] = []; // not surfaced to the teacher UI; needed by executeTool
  const messages: Anthropic.MessageParam[] = [...history];
  let reply = "";

  // Loop to resume server-side web search on pause_turn and to run any edit/
  // delete tool calls the learner asked for.
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: getAgentModel(),
      // Editing can replace a lecture's whole card set, so keep the bigger output
      // budget available; short answers still bill only for tokens generated.
      max_tokens: MAX_TOKENS,
      system,
      tools,
      messages,
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    if (text) reply = text;

    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }

    if (response.stop_reason !== "tool_use") break;

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    messages.push({ role: "assistant", content: response.content });

    const results: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUses.map(async (tu) => {
        try {
          return {
            type: "tool_result" as const,
            tool_use_id: tu.id,
            content: await executeTool(
              userId,
              tu.name,
              tu.input as Record<string, unknown>,
              actions,
            ),
          };
        } catch (err) {
          return {
            type: "tool_result" as const,
            tool_use_id: tu.id,
            content: `Error: ${err instanceof Error ? err.message : String(err)}`,
            is_error: true,
          };
        }
      }),
    );
    messages.push({ role: "user", content: results });
  }

  return { reply: reply || "…", actions };
}

/**
 * "Go deeper": generate the next `count` lessons for a class in ONE model turn,
 * as an ordered progression where each lesson is a step deeper than the last.
 * Used by both the learner's button and the Course Builder's deepen_class tool,
 * so the two share one skill. Context is each existing lesson's title + summary +
 * difficulty (compact), so the model avoids repeats and knows the current level
 * without sending card text.
 */
export interface AddedLecture {
  lectureId: number;
  title: string;
  difficulty: Difficulty;
}

export type DeepenResult =
  | { status: "added"; lectures: AddedLecture[] }
  | { status: "complete"; reason: string };

/**
 * Plan-following deepen: author cards + questions for the next planned lessons
 * of a class's syllabus, in order. Titles/summaries/difficulty come from the
 * plan (not re-invented), so the built lectures match the roadmap the learner
 * sees and "go deeper" walks the plan to a real finish.
 */
async function authorPlannedLessons(
  classId: number,
  userId: number,
  className: string,
  objective: string,
  covered: string,
  remaining: SyllabusItem[],
  builtCount: number,
): Promise<DeepenResult> {
  const authorTool: Anthropic.Tool = {
    name: "author_lessons",
    description: `Write the cards and questions for the ${remaining.length} planned lesson(s) listed, in the same order. Return exactly one entry per lesson.`,
    input_schema: {
      type: "object",
      properties: {
        lessons: {
          type: "array",
          items: {
            type: "object",
            properties: {
              cards: { type: "array", items: CARD_SCHEMA, description: "4-8 cards" },
              questions: {
                type: "array",
                items: QUESTION_SCHEMA,
                description: "2-4 multiple-choice questions",
              },
            },
            required: ["cards", "questions"],
          },
          description: `One entry per planned lesson, in order (${remaining.length} total).`,
        },
      },
      required: ["lessons"],
    },
  };

  const planList = remaining
    .map((l, i) => `${builtCount + i + 1}. ${l.title} — ${l.summary} [${l.difficulty}]`)
    .join("\n");

  const system = `You are building the next lessons of the class "${className}" on Online University, a bite-size card-based learning platform.

THE CLASS OBJECTIVE (the boundary — never go beyond it):
${objective}

Already built (assume the learner has mastered these):
${covered}

Author the content for these planned lessons, in this exact order — do not rename them, change their scope, or reorder:
${planList}

For each lesson:
- cards: 4-8. front = one concept in a few words; back = 2-4 plain sentences, no jargon; example = a concrete real-world example. Bias toward visuals — add a small inline SVG (currentColor) to MOST cards by default, since graphics make lessons more gripping; skip only when a concept genuinely can't be drawn.
- questions: 2-4 multiple-choice on that lesson.
Stay strictly within the objective and at each lesson's stated level. Return one entry per lesson via author_lessons, in order.

You may search the web first when a lesson needs current facts or specifics you're unsure of; rely on your own knowledge for well-established material.`;

  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: `Write the ${remaining.length} planned lesson(s) now.` },
  ];

  // Loop so the model can optionally web-search before committing its lessons.
  let toolUse: Anthropic.ToolUseBlock | undefined;
  for (let i = 0; i < MAX_ITERATIONS && !toolUse; i++) {
    const response = await client.messages.create({
      model: getAgentModel(),
      max_tokens: DEEPEN_MAX_TOKENS,
      system,
      tools: [authorTool, WEB_SEARCH_TOOL],
      messages,
    });

    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }

    toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock =>
        b.type === "tool_use" && b.name === "author_lessons",
    );
    if (toolUse) break;

    messages.push({ role: "assistant", content: response.content });
    messages.push({
      role: "user",
      content: "Now call author_lessons with one entry per planned lesson, in order.",
    });
  }

  if (!toolUse) throw new Error("model did not produce lessons");

  const { lessons } = toolUse.input as {
    lessons: { cards: NewCard[]; questions: NewQuestion[] }[];
  };
  const authored = lessons ?? [];

  // Zip authored content with the planned lessons (by order); the plan owns the
  // title/summary/difficulty so the built lectures stay aligned to the roadmap.
  const lectures: AddedLecture[] = remaining
    .slice(0, authored.length)
    .map((plan, i) => {
      const lectureId = createLecture(
        userId,
        classId,
        plan.title,
        "cards",
        plan.summary,
        {
          cards: authored[i].cards,
          rationale: `Planned lesson ${builtCount + i + 1} on the path toward: ${objective}`,
          difficulty: plan.difficulty,
        },
        authored[i].questions,
      );
      return { lectureId, title: plan.title, difficulty: plan.difficulty };
    });

  if (lectures.length === 0) throw new Error("model returned no lessons");
  return { status: "added", lectures };
}

export async function deepenClass(
  classId: number,
  userId: number,
  count: number = DEEPEN_COUNT,
): Promise<DeepenResult> {
  const cls = getClass(classId, userId);
  if (!cls) throw new OwnershipError(`class ${classId} not found`);

  // What this class is actually for — the boundary "go deeper" must respect.
  // Falls back to description/name for classes created before objectives existed.
  const objective = cls.objective?.trim() || cls.description?.trim() || cls.name;

  const existing = listLectures(classId, userId);
  const covered =
    existing
      .map(
        (l) =>
          `- ${l.title} — ${l.summary}${l.content.difficulty ? ` [${l.content.difficulty}]` : ""}`,
      )
      .join("\n") || "(none yet)";

  // Plan-following: build out the next slots of the class's finite syllabus, in
  // order, until the whole roadmap exists. Classes created before syllabi keep
  // the free-form behavior below.
  if (cls.syllabus.length > 0) {
    const remaining = cls.syllabus.slice(existing.length, existing.length + count);
    if (remaining.length === 0) {
      return {
        status: "complete",
        reason: `You've built out every lesson in the plan for "${objective}". 🎓`,
      };
    }
    return authorPlannedLessons(
      classId,
      userId,
      cls.name,
      objective,
      covered,
      remaining,
      existing.length,
    );
  }

  const lessonSchema = {
    type: "object" as const,
    properties: {
      title: { type: "string" },
      summary: { type: "string", description: "one line, what this lesson covers" },
      difficulty: {
        type: "string",
        enum: [...DIFFICULTY_LEVELS],
        description: "Level of THIS lesson on the ladder.",
      },
      rationale: {
        type: "string",
        description: "Why this deeper lesson follows, for the in-lesson teacher.",
      },
      cards: { type: "array", items: CARD_SCHEMA, description: "4-8 cards" },
      questions: {
        type: "array",
        items: QUESTION_SCHEMA,
        description: "2-4 multiple-choice questions",
      },
    },
    required: ["title", "summary", "difficulty", "cards", "questions"],
  };

  const createTool: Anthropic.Tool = {
    name: "create_deeper_lessons",
    description: `Create the next lessons for this class in one call (up to ${count}), as an ordered progression where each lesson is one step deeper than the previous.`,
    input_schema: {
      type: "object",
      properties: {
        lessons: {
          type: "array",
          items: lessonSchema,
          description: `Up to ${count} lessons, ordered from the next step to the deepest, each strictly within the class objective. Include fewer than ${count} only if the objective runs out before then.`,
        },
      },
      required: ["lessons"],
    },
  };

  const completeTool: Anthropic.Tool = {
    name: "scope_complete",
    description:
      "Call this INSTEAD of create_deeper_lessons when the existing lessons already cover the class objective in full, so any further lesson would go beyond what the learner asked for.",
    input_schema: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description:
            "One friendly sentence telling the learner they've covered the whole objective (name the objective).",
        },
      },
      required: ["reason"],
    },
  };

  const system = `You extend the class "${cls.name}" on Online University, a bite-size card-based learning platform.

THE CLASS OBJECTIVE (this is the boundary — never go beyond it):
${objective}

Already covered (assume the learner has mastered all of these):
${covered}

Decide between two actions:
1. If there is still material WITHIN the objective that hasn't been covered, call create_deeper_lessons with the next ${count} lessons as ONE ordered progression: the first continues from what's above, each following lesson one logical step deeper. Do not repeat covered material, and do NOT drift into the broader field the objective belongs to. Climb the difficulty ladder Beginner → Intermediate → Advanced → Expert in order (don't skip rungs). Give FEWER than ${count} lessons only if the objective is fully covered before then — never pad with tangential material. Each lesson's cards: front = one concept in a few words; back = 2-4 plain sentences, no jargon; example = a concrete real-world example. Bias toward visuals — add a small inline SVG (currentColor) to MOST cards by default, since graphics make lessons more gripping; skip only when a concept genuinely can't be drawn.
2. If the existing lessons already cover the objective in full, call scope_complete instead.

You may search the web first when the lessons need current facts or specifics you're unsure of; rely on your own knowledge for well-established material.`;

  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Add the next ${count} lessons for this class, or report it complete.`,
    },
  ];

  // Loop so the model can optionally web-search before committing. tool_choice
  // "any" is dropped (it would force a decision before any search could run);
  // the nudge below keeps the model from stalling without a decision.
  let toolUse: Anthropic.ToolUseBlock | undefined;
  for (let i = 0; i < MAX_ITERATIONS && !toolUse; i++) {
    const response = await client.messages.create({
      model: getAgentModel(),
      max_tokens: DEEPEN_MAX_TOKENS,
      system,
      tools: [createTool, completeTool, WEB_SEARCH_TOOL],
      messages,
    });

    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }

    toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock =>
        b.type === "tool_use" &&
        (b.name === "create_deeper_lessons" || b.name === "scope_complete"),
    );
    if (toolUse) break;

    // Searched or replied without deciding — record the turn and prompt a commit.
    messages.push({ role: "assistant", content: response.content });
    messages.push({
      role: "user",
      content: "Now call create_deeper_lessons or scope_complete.",
    });
  }

  if (!toolUse) throw new Error("model did not produce a result");

  if (toolUse.name === "scope_complete") {
    const { reason } = toolUse.input as { reason: string };
    return { status: "complete", reason };
  }

  const { lessons } = toolUse.input as {
    lessons: {
      title: string;
      summary: string;
      difficulty: Difficulty;
      rationale?: string;
      cards: NewCard[];
      questions: NewQuestion[];
    }[];
  };

  const lectures: AddedLecture[] = (lessons ?? []).map((l) => {
    const lectureId = createLecture(
      userId,
      classId,
      l.title,
      "cards",
      l.summary,
      { cards: l.cards, rationale: l.rationale, difficulty: l.difficulty },
      l.questions,
    );
    return { lectureId, title: l.title, difficulty: l.difficulty };
  });

  if (lectures.length === 0) {
    return {
      status: "complete",
      reason: "This class already covers its objective.",
    };
  }
  return { status: "added", lectures };
}
