// Curated starting points for the Course Builder's empty states (home page and
// chat intake). One tap prefills a goal so a brand-new user never faces a blank
// prompt — and the intake captures level + depth, which sharpen the syllabus the
// builder generates.

export type Level = "new" | "some" | "advanced";
export type Depth = "overview" | "solid" | "deep";

export interface StarterTemplate {
  emoji: string;
  title: string; // short label shown on a card / chip
  goal: string; // the learning goal dropped into the builder prompt
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    emoji: "🪙",
    title: "Personal finance",
    goal: "the fundamentals of personal finance — budgeting, saving, and investing",
  },
  {
    emoji: "🧠",
    title: "How LLMs work",
    goal: "how large language models work, from tokens to training",
  },
  {
    emoji: "🌌",
    title: "Black holes",
    goal: "what black holes are and the physics behind them",
  },
  {
    emoji: "📈",
    title: "Reading financials",
    goal: "how to read a company's income statement, balance sheet, and cash flow",
  },
  {
    emoji: "🇪🇸",
    title: "Survival Spanish",
    goal: "practical conversational Spanish for travel",
  },
  {
    emoji: "⚖️",
    title: "Logical fallacies",
    goal: "the most common logical fallacies and how to spot them",
  },
  {
    emoji: "🧬",
    title: "How CRISPR works",
    goal: "how CRISPR gene editing works and what it's used for",
  },
  {
    emoji: "🎨",
    title: "Color theory",
    goal: "color theory fundamentals for design",
  },
];

const LEVEL_PHRASE: Record<Level, string> = {
  new: "I'm completely new to this.",
  some: "I already have some background.",
  advanced: "I'm fairly advanced and want depth.",
};

const DEPTH_PHRASE: Record<Depth, string> = {
  overview: "Give me a quick overview.",
  solid: "I want a solid foundation.",
  deep: "Take me all the way to mastery.",
};

// Turns the intake answers into a first message the Course Builder can act on
// immediately (it builds without further questions when given enough).
export function composeBuilderPrompt(
  goal: string,
  level: Level | null,
  depth: Depth,
): string {
  return [
    `I want to learn ${goal.trim()}.`,
    level ? LEVEL_PHRASE[level] : "",
    DEPTH_PHRASE[depth],
  ]
    .filter(Boolean)
    .join(" ");
}

// Lightweight cross-component channel: home-page templates dispatch this event
// and the globally-mounted Course Builder chat (AgentChat) opens and prefills.
export const OPEN_BUILDER_EVENT = "open-builder";

export interface OpenBuilderDetail {
  goal?: string;
}

export function openBuilder(goal?: string): void {
  window.dispatchEvent(
    new CustomEvent<OpenBuilderDetail>(OPEN_BUILDER_EVENT, { detail: { goal } }),
  );
}
