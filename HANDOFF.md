# Session Handoff — Online University

Single-file context for the next agent. Read this first, then `graphify-out/GRAPH_REPORT.md`.

## What this project is
A bite-size, card-based learning platform for short attention spans. Browse **schools → classes → lectures**; each lecture is a deck of flashcards (front / back / example) plus a quiz. An AI **Course Builder** companion creates/extends content via chat. Single-user, local.

**Stack:** Next.js **16.2.9** (App Router, Turbopack) · React **19.2** · **MUI v9** (Emotion) · **better-sqlite3** · Anthropic SDK (**claude-haiku-4-5**).

## Hard rules (do not violate)
- **AGENTS.md:** this is a non-standard Next.js — read `node_modules/next/dist/docs/...` before writing Next code. Dynamic route `params` are async (`await params`).
- **graphify:** read `graphify-out/GRAPH_REPORT.md` before exploring; run `graphify update .` after code changes.
- **Cost minimization:** Haiku everywhere; no paid image APIs. Keep prompts/contexts lean. (See memory: `project-online-university`.)
- **Dev server:** the **user runs their own `next dev` on port 3000** — do NOT kill it or start a competing preview (Next refuses a 2nd server for the same dir). Agent/API/component edits apply via **HMR**; `next.config.ts` and new deps need a **manual restart**.
- **Verification without the browser:** agent paths via `curl localhost:3000/api/...`; DB via `sqlite3 data/university.db`; always `npx tsc --noEmit` + `npm run build`. Agent calls cost money — keep test calls minimal and clean up test data.
- **Multi-part requests:** parallelize only file-disjoint tasks via subagents; shared-core work (lib/agent.ts, lib/data.ts, lib/types.ts) stays sequential. (See memory: `parallelization-workflow`.)

## Architecture map
- **lib/db.ts** — SQLite schema. FKs ON; `questions` + `lecture_progress` are `ON DELETE CASCADE` on `lectures`. Cards live in the lecture `content` JSON (no cards table).
- **lib/types.ts** — domain types. `LectureContent` (JSON) holds: `cards[]` (front/back/example/**diagram** SVG), `rationale`, `difficulty`, plus `body_md`/`url`/`html`/`notes`. `Difficulty = Beginner|Intermediate|Advanced|Expert`.
- **lib/data.ts** — data access. **Lessons are ordered by difficulty then id** (`byLadder`), NOT by the `position` column (now dead but kept to avoid a migration). `addCards` clears `lecture_progress` (auto-unfinish). `moveLecture`, `deleteLecture`, `getCatalogSummary` (feeds agent; lists lecture ids+titles+difficulty).
- **lib/agent.ts** — three agents, all Haiku:
  - `runAgentTurn` — Course Builder. Tools: create_school/class/lecture, add_cards/add_questions. **Management tools (move_lecture, delete_lecture) are intent-gated** via `wantsManagement(lastUserText)` so they're not in context normally. `move_lecture` can create the destination class atomically (`to_new_class_name`).
  - `runTeacherTurn(lectureId, history)` — per-lesson expert; context = rationale (or summary) + all card text; no tools; declines off-topic.
  - `deepenClass(classId)` — one forced-tool call; compact context (title+summary+difficulty of existing lessons); appends the next-harder lesson.
- **lib/theme.ts** + **components/ThemeRegistry.tsx** + **components/LinkBehaviour.tsx** — MUI theme (teal/sage, `cssVariables`, class color-scheme selector), App Router cache provider, and the Next `Link` adapter (`MuiLink`/`MuiButtonBase` default), so **server pages pass only `href`** — never a function across the RSC boundary.
- **Routes:** `/api/agent`, `/api/teacher`, `/api/deepen`, `/api/lectures/complete`, `/api/tests`.
- **Components:** `AgentChat` (global FAB, bottom-right), `TeacherChat` (lecture FAB, bottom-left), `DeepenButton`, `CardViewer`, `TestRunner`, `Header` (brand + dark-mode toggle).
- **Pages:** `/`, `/school/[id]`, `/class/[id]`, `/class/[id]/test`, `/lecture/[id]` (all `force-dynamic`).

## What shipped this session
1. **Bug:** companion 400 — server passed client-only `actions` field to Anthropic. Fixed by normalizing history to `{role,content}` in `/api/agent`.
2. **Full MUI migration** from Tailwind (Tailwind/PostCSS removed); teal/sage theme; **dark-mode toggle** (light/dark/system) in header.
3. **Class-vs-lecture** prompt rule + catalog now lists lecture titles/difficulty so the agent judges placement.
4. **SVG diagrams** on cards (text-model generated; rendered via `dangerouslySetInnerHTML`).
5. **Move/delete lecture skills** (intent-gated) + atomic move-to-new-class.
6. **Teacher agent** (per-lesson).
7. **Auto-unfinish** a lecture when cards are added.
8. **Chat UX:** reset button; Shift+Enter newline (multiline); keyboard guard so typing in chat no longer triggers card reveal/quiz keys.
9. `devIndicators: false` (was overlapping the teacher FAB).
10. **"Go deeper"** one-click incremental deepening + **difficulty labels**.
11. **Difficulty-based ordering** (derived from difficulty+id; immune to position corruption).

## Settled decisions (don't relitigate)
- Graphics = **SVG diagrams only**, no AI photos (cost).
- Lesson order = **difficulty then creation time**; no manual per-lesson reorder (change difficulty to reorder).
- Teacher context = **rationale + card contents**; rationale stored in `content.rationale`, falls back to `summary` for legacy lessons.
- Management tools **intent-gated**, not always in context.
- Deepening = **incremental + compact context** (not an upfront roadmap).

## Known limitations / open items
- **Nothing is committed.** All work is uncommitted on `main` (last commit `eda19e1`). New files: `components/{Header,ThemeRegistry,LinkBehaviour,TeacherChat,DeepenButton}.tsx`, `lib/theme.ts`, `app/api/{teacher,deepen}/`. `postcss.config.mjs` deleted. **Offer to commit early.**
- SVG injected via `dangerouslySetInnerHTML` — fine for single-user; add a sanitizer if it ever goes multi-user.
- `InitColorSchemeScript` emits benign **dev-only** console warnings ("Encountered a script tag…") — stripped in production.
- Legacy/seed lessons have **no difficulty** → they sort first (as foundations). Could backfill difficulties.
- Teacher button appears on all lectures, but only lessons created after this session carry a real `rationale`.
- `position` column is dead weight (kept to avoid a migration).

## Current data quirks (data/university.db)
- Class **2 "RAG Fundamentals"** (school 2): 5 lessons — Why RAG, RAG in the Real World, Building RAG (unlabeled), Embeddings (Intermediate), Retrieval (Advanced). Its `position` values are intentionally scrambled (proving order is difficulty-derived) — harmless.
- Class **10 "LLM Fundamentals"** (school 2) holds lecture 9 "How LLMs Work" (a real user move).

## Quick commands
```
npx tsc --noEmit                 # typecheck
npm run build                    # full build (catches RSC/client-boundary issues)
graphify update .                # refresh knowledge graph after code changes
sqlite3 data/university.db "..." # inspect data
curl -s localhost:3000/api/deepen -H 'Content-Type: application/json' -d '{"classId":2}'
```
