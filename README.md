# 🎓 Online University

A web platform for learning anything, one bite-size card at a time — built for people (and attention spans) that get overwhelmed by the open internet. Content is organized like a real university: **Schools → Classes → Lectures**, and a built-in **AI Course Builder** creates new content on request.

## Quick start

```bash
npm install
# add your key to .env.local:  ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```

Open http://localhost:3000. The database (SQLite, `data/university.db`) is created and seeded on first run with two schools (Finance, CS & AI) so there's something to explore immediately.

## What's inside

| Area | Where | Notes |
|---|---|---|
| Browsing UI | `app/page.tsx`, `app/school/[id]`, `app/class/[id]` | School grid → class list → lecture list with progress |
| Card viewer | `app/lecture/[id]`, `components/CardViewer.tsx` | One card at a time, flip to reveal, every card has a real-world example, keyboard nav, completion tracking |
| Tests | `app/class/[id]/test`, `components/TestRunner.tsx` | Quizzes **only the lectures you've completed so far**, instant feedback + explanations, attempt history |
| Companion agent | `components/AgentChat.tsx`, `app/api/agent/route.ts`, `lib/agent.ts` | The ✨ button, bottom-right on every page |
| Data layer | `lib/db.ts`, `lib/data.ts`, `lib/types.ts`, `lib/seed.ts` | better-sqlite3, schema auto-created |

## The Course Builder agent

Tell it what you want to learn ("teach me about black holes"). After a short back-and-forth it:

1. Reuses an existing school if the topic fits, otherwise creates one (`create_school`)
2. Creates a class for the topic (`create_class`)
3. Writes an introductory lecture of 4–8 cards — each with a concept, plain-language explanation, and a real-world example — plus test questions (`create_lecture`)
4. On request, deepens content with more lectures, `add_cards`, or `add_questions`

It is deliberately scoped to content creation only and declines anything else.

### Cost design

The agent is built to minimize dollar cost:

- **Model:** `claude-haiku-4-5` (cheapest current model) by default — override with `AGENT_MODEL` in `.env.local` (e.g. `claude-sonnet-4-6` for higher-quality content).
- Terse system prompt; the catalog (school/class IDs) is injected into it, saving a lookup round-trip.
- Tool results return bare IDs (`class_id=3`), never echo content.
- Content is generated once, directly as structured tool input — the model is instructed never to repeat card text in chat.
- Capped `max_tokens` and loop iterations.

## Lecture formats

`lectures.format` supports `cards` (default, preferred), `reading`, `video`, and `game`; content lives in a JSON column (`lib/types.ts → LectureContent`), so new formats are an additive change to the viewer, not a schema migration.

## Notes

- Single-user by design; auth is out of scope.
- Delete `data/` to reset all content and progress (reseeds on next start).
