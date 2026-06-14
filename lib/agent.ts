import Anthropic from "@anthropic-ai/sdk";
import {
  createSchool,
  createClass,
  createLecture,
  addCards,
  addQuestions,
  getCatalogSummary,
  moveLecture,
  deleteLecture,
  getLecture,
  getClass,
  listLectures,
} from "./data";
import type { NewCard, NewQuestion, Difficulty } from "./types";

const DIFFICULTY_LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Expert",
] as const;

// Cost ceiling is the design constraint here: cheapest current model, terse
// system prompt, catalog injected up-front (avoids a lookup round-trip), and
// tool results that return bare IDs instead of echoing content back.
const MODEL = process.env.AGENT_MODEL ?? "claude-haiku-4-5";
const MAX_TOKENS = 4096;
const MAX_ITERATIONS = 8;

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
        "Optional: a complete inline SVG (<svg viewBox=...>...</svg>) when a simple visual makes the concept clearer. Keep it small and use currentColor for strokes/fills so it adapts to light/dark. Omit when a picture wouldn't add much.",
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
    description: "Create a class (one topic) inside an existing school.",
    input_schema: {
      type: "object",
      properties: {
        school_id: { type: "integer" },
        name: { type: "string", description: "e.g. 'Equities 101'" },
        emoji: { type: "string", description: "single emoji" },
        description: { type: "string", description: "one sentence" },
      },
      required: ["school_id", "name", "emoji", "description"],
    },
  },
  {
    name: "create_lecture",
    description:
      "Add a lecture of bite-size learning cards (plus test questions) to a class.",
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
];

// Management tools are destructive/structural and rarely needed, so they are
// attached only when the user's message implies organizing content (see
// wantsManagement) — keeping them out of context on normal turns.
const MANAGEMENT_TOOLS: Anthropic.Tool[] = [
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
];

function wantsManagement(text: string): boolean {
  return /\b(move|moved|moving|delete|deleted|remove|removing|reorder|reorganiz|reorganis|relocat|get rid|take out)\b/i.test(
    text,
  );
}

function systemPrompt(includeManagement: boolean): string {
  const management = includeManagement
    ? `
- Lecture management is available now: move_lecture (change class and/or reorder) and delete_lecture. Only do this when the user clearly asks. To move a lecture into a class that doesn't exist yet, call move_lecture with to_new_class_name in a SINGLE call (it creates the class in the lecture's school and moves it) — do NOT create the class separately. After a delete, confirm what you removed in one short sentence.`
    : "";
  return `You are the Course Builder for Online University, a bite-size card-based learning platform for people with short attention spans.

Your ONLY job: through brief conversation, create and extend learning content (schools > classes > lectures). If asked anything else, decline in one sentence and steer back.

Rules:
- A school = broad field (Finance, Computer Science & AI). A class = one learnable topic (Equities, RAG). Reuse an existing school when the topic fits; create a new one only when none fits.
- Class vs. lecture: add a lecture to an existing class ONLY when the topic is clearly a subtopic of that class's subject. If the user's topic is a distinct skill or area, create a NEW class within the school — even if a related class already exists. The catalog below lists each class's lectures; use it to judge fit rather than attaching to the nearest-sounding class.
- Decide this yourself and just build it — never ask the user to choose between a new lecture and a new class. Only ask where to put it if the topic genuinely fits two places equally and you cannot pick. When you act, briefly state the call you made (e.g. "Made this a new class since it's its own topic").
- When the user names a topic, ask at most 1-2 short questions (their level, what they want from it) before building. If they already gave enough, build immediately.
- A lecture = 4-8 cards. front: one concept in a few words. back: 2-4 plain sentences, no jargon. example: a concrete real-world example or use-case — every card must have one. Include 2-4 multiple-choice questions per lecture.
- For cards where a picture genuinely aids understanding (a process, a structure, a relationship), add a small inline SVG to that card's "diagram" field using currentColor — not every card, only where it helps.
- When you create a lecture, set "rationale" to why the learner wants it and their level, so the in-lesson teacher can tailor answers.
- Always set "difficulty" (Beginner/Intermediate/Advanced/Expert). Lessons in a class are auto-ordered by difficulty, so this places the lesson correctly on the ladder — an intro lesson is Beginner, deeper ones go higher.
- Start a new class with ONE introductory lecture. When the user wants more depth, add further lectures or add_cards/add_questions to existing ones.
- Be brief. Confirm what you created in 1-2 sentences. Never repeat card content back in chat.${management}

Current catalog (id: name):
${getCatalogSummary()}`;
}

function executeTool(
  name: string,
  input: Record<string, unknown>,
  actions: AgentAction[],
): string {
  switch (name) {
    case "create_school": {
      const id = createSchool(
        input.name as string,
        input.emoji as string,
        input.description as string,
      );
      actions.push({ kind: "school", id, label: input.name as string });
      return `school_id=${id}`;
    }
    case "create_class": {
      const id = createClass(
        input.school_id as number,
        input.name as string,
        input.emoji as string,
        input.description as string,
      );
      actions.push({ kind: "class", id, label: input.name as string });
      return `class_id=${id}`;
    }
    case "create_lecture": {
      const cards = input.cards as NewCard[];
      const id = createLecture(
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
      const total = addCards(input.lecture_id as number, input.cards as NewCard[]);
      actions.push({
        kind: "cards",
        id: input.lecture_id as number,
        label: `lecture ${input.lecture_id}`,
      });
      return `ok, lecture now has ${total} cards`;
    }
    case "add_questions": {
      addQuestions(input.lecture_id as number, input.questions as NewQuestion[]);
      return "ok";
    }
    case "move_lecture": {
      const lectureId = input.lecture_id as number;
      let targetClassId = input.class_id as number | undefined;
      const newName = input.to_new_class_name as string | undefined;
      // Atomic: create the destination class in the lecture's school if needed,
      // so the move never depends on the model chaining two tool calls.
      if (!targetClassId && newName) {
        const lecture = getLecture(lectureId);
        if (!lecture) throw new Error(`lecture ${lectureId} not found`);
        const cur = getClass(lecture.class_id);
        if (!cur) throw new Error(`class ${lecture.class_id} not found`);
        targetClassId = createClass(
          cur.school_id,
          newName,
          (input.emoji as string) || "📚",
          (input.description as string) || newName,
        );
        actions.push({ kind: "class", id: targetClassId, label: newName });
      }
      moveLecture(lectureId, { classId: targetClassId });
      actions.push({ kind: "moved", id: lectureId, label: `lecture ${lectureId}` });
      return `ok, moved lecture ${lectureId}`;
    }
    case "delete_lecture": {
      const lectureId = input.lecture_id as number;
      deleteLecture(lectureId);
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
  history: { role: "user" | "assistant"; content: string }[],
): Promise<AgentTurnResult> {
  const client = new Anthropic();
  const actions: AgentAction[] = [];
  const messages: Anthropic.MessageParam[] = [...history];
  let reply = "";

  // Only expose the management tools when the latest user turn implies it.
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const includeManagement = wantsManagement(lastUser?.content ?? "");
  const tools = includeManagement ? [...TOOLS, ...MANAGEMENT_TOOLS] : TOOLS;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt(includeManagement),
      tools,
      messages,
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    if (text) reply = text;

    if (response.stop_reason !== "tool_use") break;

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    messages.push({ role: "assistant", content: response.content });

    const results: Anthropic.ToolResultBlockParam[] = toolUses.map((tu) => {
      try {
        return {
          type: "tool_result",
          tool_use_id: tu.id,
          content: executeTool(
            tu.name,
            tu.input as Record<string, unknown>,
            actions,
          ),
        };
      } catch (err) {
        return {
          type: "tool_result",
          tool_use_id: tu.id,
          content: `Error: ${err instanceof Error ? err.message : String(err)}`,
          is_error: true,
        };
      }
    });
    messages.push({ role: "user", content: results });
  }

  return { reply: reply || "Done.", actions };
}

/**
 * The in-lesson teacher: an expert on ONE lecture. Its context is the lecture's
 * rationale (why it was made) plus all its card content. No tools — read-only Q&A.
 */
export async function runTeacherTurn(
  lectureId: number,
  history: { role: "user" | "assistant"; content: string }[],
): Promise<{ reply: string }> {
  const lecture = getLecture(lectureId);
  if (!lecture) throw new Error(`lecture ${lectureId} not found`);

  const cards = lecture.content.cards ?? [];
  const rationale = lecture.content.rationale ?? lecture.summary;
  const cardText =
    cards
      .map(
        (c, i) =>
          `Card ${i + 1}: ${c.front}\n${c.back}${c.example ? `\nExample: ${c.example}` : ""}`,
      )
      .join("\n\n") || "(no cards)";

  const system = `You are the Teacher for the lesson "${lecture.title}" on Online University. You are an expert on THIS lesson only.

Why this lesson exists / who it's for:
${rationale}

The full lesson content (your single source of truth):
${cardText}

Rules:
- Answer the learner's questions about this lesson clearly and patiently, in a few short sentences.
- Ground answers in the lesson content above; you may add brief, directly-relevant context to clarify a point.
- If asked about something unrelated to this lesson, say it's outside this lesson and suggest the Course Builder, in one sentence.
- Be encouraging and concise. Plain text, no markdown headers.`;

  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages: history,
  });

  const reply = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return { reply: reply || "…" };
}

/**
 * "Go deeper": generate the next, one-step-harder lecture for a class. Context is
 * just each existing lesson's title + summary + difficulty (compact, one-shot), so
 * the model avoids repeats and knows the current level without sending card text.
 */
export async function deepenClass(
  classId: number,
): Promise<{ lectureId: number; title: string; difficulty: Difficulty }> {
  const cls = getClass(classId);
  if (!cls) throw new Error(`class ${classId} not found`);

  const existing = listLectures(classId);
  const covered =
    existing
      .map(
        (l) =>
          `- ${l.title} — ${l.summary}${l.content.difficulty ? ` [${l.content.difficulty}]` : ""}`,
      )
      .join("\n") || "(none yet)";

  const tool: Anthropic.Tool = {
    name: "create_deeper_lecture",
    description: "Create the next, deeper lecture for this class.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        summary: { type: "string", description: "one line, what this lecture covers" },
        difficulty: {
          type: "string",
          enum: [...DIFFICULTY_LEVELS],
          description: "Level of THIS lecture on the ladder.",
        },
        rationale: {
          type: "string",
          description: "Why this deeper lecture follows, for the in-lesson teacher.",
        },
        cards: { type: "array", items: CARD_SCHEMA, description: "4-8 cards" },
        questions: {
          type: "array",
          items: QUESTION_SCHEMA,
          description: "2-4 multiple-choice questions",
        },
      },
      required: ["title", "summary", "difficulty", "cards", "questions"],
    },
  };

  const system = `You extend the class "${cls.name}" (${cls.description}) on Online University, a bite-size card-based learning platform.

Already covered (assume the learner has mastered all of these):
${covered}

Produce the NEXT lecture — exactly ONE step deeper than what's above. Do not repeat covered material; advance to the next logical, more advanced subtopic. Pick the appropriate difficulty on the ladder Beginner → Intermediate → Advanced → Expert (don't skip rungs; once everything is Expert, add a new Expert-level deep-dive). Cards: front = one concept in a few words; back = 2-4 plain sentences, no jargon; example = a concrete real-world example. Add a small inline SVG (currentColor) to a card only where a visual truly helps.`;

  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    tools: [tool],
    tool_choice: { type: "tool", name: "create_deeper_lecture" },
    messages: [
      {
        role: "user",
        content: "Create the next deeper lecture for this class.",
      },
    ],
  });

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) throw new Error("model did not produce a lecture");

  const input = toolUse.input as {
    title: string;
    summary: string;
    difficulty: Difficulty;
    rationale?: string;
    cards: NewCard[];
    questions: NewQuestion[];
  };

  const lectureId = createLecture(
    classId,
    input.title,
    "cards",
    input.summary,
    { cards: input.cards, rationale: input.rationale, difficulty: input.difficulty },
    input.questions,
  );

  return { lectureId, title: input.title, difficulty: input.difficulty };
}
