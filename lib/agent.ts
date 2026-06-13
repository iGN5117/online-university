import Anthropic from "@anthropic-ai/sdk";
import {
  createSchool,
  createClass,
  createLecture,
  addCards,
  addQuestions,
  getCatalogSummary,
} from "./data";
import type { NewCard, NewQuestion } from "./types";

// Cost ceiling is the design constraint here: cheapest current model, terse
// system prompt, catalog injected up-front (avoids a lookup round-trip), and
// tool results that return bare IDs instead of echoing content back.
const MODEL = process.env.AGENT_MODEL ?? "claude-haiku-4-5";
const MAX_TOKENS = 4096;
const MAX_ITERATIONS = 8;

export interface AgentAction {
  kind: "school" | "class" | "lecture" | "cards";
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
        cards: { type: "array", items: CARD_SCHEMA, description: "4-8 cards" },
        questions: {
          type: "array",
          items: QUESTION_SCHEMA,
          description: "2-4 multiple-choice questions on this lecture",
        },
      },
      required: ["class_id", "title", "summary", "cards", "questions"],
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

function systemPrompt(): string {
  return `You are the Course Builder for Online University, a bite-size card-based learning platform for people with short attention spans.

Your ONLY job: through brief conversation, create and extend learning content (schools > classes > lectures). If asked anything else, decline in one sentence and steer back.

Rules:
- A school = broad field (Finance, Computer Science & AI). A class = one learnable topic (Equities, RAG). Reuse an existing school when the topic fits; create a new one only when none fits.
- When the user names a topic, ask at most 1-2 short questions (their level, what they want from it) before building. If they already gave enough, build immediately.
- A lecture = 4-8 cards. front: one concept in a few words. back: 2-4 plain sentences, no jargon. example: a concrete real-world example or use-case — every card must have one. Include 2-4 multiple-choice questions per lecture.
- Start a new class with ONE introductory lecture. When the user wants more depth, add further lectures or add_cards/add_questions to existing ones.
- Be brief. Confirm what you created in 1-2 sentences. Never repeat card content back in chat.

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
        { cards },
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

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt(),
      tools: TOOLS,
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
