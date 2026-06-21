# Session Handoff — Online University

Single-file context for the next agent. Read this first, then `graphify-out/GRAPH_REPORT.md`.

## What this project is
A bite-size, card-based learning platform for short attention spans. Browse **schools → classes → lectures**; each lecture is a deck of flashcards (front / back / example / optional **diagram** SVG) plus a quiz. An AI **Course Builder** companion creates/extends content via chat; a per-lesson **Teacher** answers questions and can edit/delete. **Multi-user** (Google sign-in, invite-only) with a **private per-user universe**; deployable to Fly.io with a persistent SQLite volume + iPhone "reel" mode + PWA install.

**Stack:** Next.js **16.2.9** (App Router, Turbopack) · React **19.2** · **MUI v9** (Emotion) · **better-sqlite3** · Anthropic SDK (**claude-haiku-4-5**, runtime-switchable from /admin) · **Auth.js v5** (`next-auth@5`, Google, JWT).

---

## Next session — todos (as of 2026-06-21)

### 1. Stream the lesson-generation calls (unlock output headroom)
**Why:** `deepenClass` and its helper `authorPlannedLessons` (lib/agent.ts) call the model **non-streaming** at `DEEPEN_MAX_TOKENS = 16384`. Two problems compound now that we (a) build 5 lessons in one batch and (b) bias hard toward inline SVG diagrams:
- Non-streaming requests above ~16K output risk **SDK HTTP timeouts**.
- A graphics-heavy 5-lesson batch can brush 16384 and **truncate** → malformed tool-call JSON → the deepen turn fails. For the *create* flow this is worst: the new class is created but its first lessons fail to build (the handler catches it and returns "press Go deeper", but the first impression is an empty class).

**Verified limits** (via the claude-api skill): Haiku 4.5 and Sonnet 4.6 allow **64K** output; Opus 4.8 / Fable 5 allow **128K**. So the floor is 64K — plenty of headroom *if we stream*.

**Do this:**
- Switch the model calls in `authorPlannedLessons` and the legacy free-form path of `deepenClass` from `client.messages.create(...)` to `client.messages.stream(...)` + `await stream.finalMessage()`. Inspect `stop_reason` / `content` on the final message exactly as today.
- **Preserve the `pause_turn` loop** (server-side web_search can pause mid-turn). The streamed `finalMessage()` still carries `stop_reason === "pause_turn"`; re-push the assistant turn and continue as now.
- After streaming works, raise `DEEPEN_MAX_TOKENS` to ~**32000** (safe across all runtime-switchable models incl. Haiku's 64K floor). Leave `MAX_TOKENS = 4096` for the chat agents unless you also stream them.
- Optional: stream `runAgentTurn` / `runTeacherTurn` too, but they're at 4096/1024 — not urgent.
- **Verify:** `npx tsc --noEmit`; then a real `POST /api/deepen` on a class that has a syllabus, and confirm 5 diagram-heavy lessons build with no truncation. Agent calls cost money — keep it to one test and clean up.

### 2. Backfill existing classes/lessons with the new model
New classes get all of this automatically; **pre-existing classes do not.** The owner DB has a handful of legacy classes (was ~7) created before syllabi/graphics existed.

**2a. Syllabus backfill (higher value, cheap).** Legacy classes have `classes.syllabus = '[]'`, so they fall back to free-form "Go deeper" and the class page shows none of the finite roadmap / milestone bands / progress-to-done / done banner. For each such class, generate a syllabus that covers `objective` **and accounts for the lessons already built** — the first `listLectures(classId).length` syllabus items must correspond (in ladder order: difficulty then id) to the existing lessons, with the remainder being the planned-but-unbuilt path. (Progress mapping is positional — see Known limitations.)
- **Add a data fn:** `createClass` only sets `syllabus` at creation. Add `setClassSyllabus(userId, classId, items: SyllabusItem[])` to lib/data.ts (ownership-guarded like the others).
- **Generate:** one cheap model call per class — give it `objective` + the existing lessons' title/summary/difficulty, ask for the full ordered syllabus with the existing lessons first.
- **Where:** prefer an **/admin action** (e.g. a "Generate roadmap" button per class) over an external `tsx` script — the Next process already holds the `better-sqlite3` handle, so a separate writer process risks WAL contention with the running dev server. Scope to the owner.

**2b. Graphics backfill (optional, heavier).** Existing lessons' cards predate the diagram bias, so most have no SVG. To add them, read each lecture's cards, ask the model to fill a `diagram` SVG per card (keep front/back/example), and `updateLecture(userId, lectureId, { cards })` (it replaces the card set wholesale). This is **output-token expensive** (an SVG per card across every lecture) — gate it behind an explicit per-class /admin action and warn on cost. Lower priority than 2a.

Deploy/setup commands live in **`DEPLOYMENT.md`**.

---

## Hard rules (do not violate)
- **AGENTS.md:** this is a non-standard Next.js — read `node_modules/next/dist/docs/...` before writing Next code. Dynamic route `params` are async (`await params`).
- **graphify:** read `graphify-out/GRAPH_REPORT.md` before exploring; run `graphify update .` after code changes.
- **Cost minimization:** Haiku everywhere; no paid image APIs (graphics are model-authored inline SVG). Keep prompts/contexts lean. Bound output budgets. (Memory: `project-online-university`.)
- **Dev server:** the **user runs their own `next dev` on port 3000** — do NOT kill it, start a competing `next dev`, or run `next build` (build clobbers the shared `.next`). Edits apply via HMR; `next.config.ts` / new deps need a manual restart. Verify with `npx tsc --noEmit` (build only when the user's dev server is down).
- **Verification without the browser:** agent paths via `curl localhost:3000/api/...`; DB via `sqlite3 data/university.db`. Agent calls cost money — minimal test calls, clean up test data.
- **Multi-part requests:** parallelize only file-disjoint tasks via subagents; shared-core work (lib/agent.ts, lib/data.ts, lib/types.ts) stays sequential. (Memory: `parallelization-workflow`.)

## Architecture map
- **lib/db.ts** — SQLite schema. FKs ON; `questions` + `lecture_progress` cascade on `lectures`; class/school deletes cascade. Cards live in the lecture `content` JSON (no cards table). **`classes.syllabus TEXT DEFAULT '[]'`** (migration present) holds the finite roadmap.
- **lib/types.ts** — `LectureContent` (JSON): `cards[]` (front/back/example/**diagram** SVG), `rationale`, `difficulty`. New **`SyllabusItem { title, summary, difficulty }`**; `ClassRow.syllabus: SyllabusItem[]`. `Difficulty = Beginner|Intermediate|Advanced|Expert`.
- **lib/data.ts** — data access (every fn ownership-guarded via `schools.user_id`). Lessons ordered by **difficulty then id** (`byLadder`), not the dead `position` column. `parseClass` parses the `syllabus` JSON; `createClass(... , objective, syllabus)` persists it. `updateLecture` replaces cards/questions wholesale; `addCards` clears progress (auto-unfinish). **No update-syllabus fn yet** — add `setClassSyllabus` for backfill (todo 2a).
- **lib/agent.ts** — Haiku agents:
  - `runAgentTurn` — Course Builder. Tools: create_school/class/lecture, add_cards/add_questions, deepen_class. **Management tools (edit_lecture, move_lecture, delete_lecture, delete_class, delete_school) are ALWAYS attached** (the old `wantsManagement` keyword gate was removed — it silently broke CRUD). System prompt limits them to explicit requests.
  - **`create_class` auto-builds the first batch:** after creating the class it calls `deepenClass` (which, with 0 lessons + a syllabus, produces `syllabus[0..5]`), so a new class arrives usable without a button. Do NOT call `create_lecture` for a new class.
  - `runTeacherTurn(lectureId, userId, history)` — per-lesson expert; context = rationale + card text; also always carries its edit/delete subset; returns an `actions[]` the UI reacts to.
  - `deepenClass(classId, userId, count=5)` — **plan-following**: if the class has a syllabus, `authorPlannedLessons` writes cards+questions for the next `syllabus.slice(built, built+count)` slots (titles/difficulty come from the plan); returns `{status:"complete"}` with no model call once the roadmap is built. **No syllabus → legacy free-form path** (create_deeper_lessons / scope_complete). `DEEPEN_COUNT=5`, `DEEPEN_MAX_TOKENS=16384`, **non-streaming** (todo 1).
  - Card prompts everywhere now **bias toward an inline SVG `diagram` on most cards** (currentColor, kept small).
- **lib/templates.ts** (new) — `STARTER_TEMPLATES`, `composeBuilderPrompt(goal, level, depth)`, and the `open-builder` window-event helpers (`openBuilder(goal)`, `OPEN_BUILDER_EVENT`) bridging the home page to the global chat.
- **Pages/components:** `app/page.tsx` empty state → **`components/StarterGrid.tsx`** (template cards dispatch `open-builder`). `components/AgentChat.tsx` empty state = **structured intake** (goal + level + depth chips + templates) and listens for `open-builder`. `app/class/[id]/page.tsx` renders the **roadmap** (built + greyed upcoming lessons), **difficulty milestone bands** (`BAND_LABEL`), **finite progress** (denominator = planned total), and a **done banner**.
- **Routes:** `/api/agent`, `/api/teacher`, `/api/deepen`, `/api/lectures/complete`, `/api/tests`, `/api/admin/*`. **Pages** all `force-dynamic`.

## What shipped this session (committed `ee84b6a`)
1. **Finite syllabus + milestones** — `classes.syllabus`; roadmap UI with upcoming lessons, difficulty bands, finite progress, done state.
2. **Plan-following Go deeper** — `deepenClass` builds the next planned slots; completes when the roadmap is full; legacy free-form fallback.
3. **Auto-build first batch at class creation** — no button for typical classes.
4. **Onboarding** — structured intake (goal/level/depth) + starter templates on home + chat empty states.
5. **CRUD fix** — management tools always attached (removed the fragile keyword gate that broke edit/delete).
6. **Graphics bias** — diagrams on most cards by default.
7. Folded in prior uncommitted work: batch deepen engine, edit/delete CRUD, UI refresh after destructive actions, CardViewer/ReelViewer index clamping.

## Settled decisions (don't relitigate)
- Graphics = **inline SVG diagrams only**, no paid image APIs (cost). Now **biased onto most cards** (was "only where it helps").
- Lesson order = **difficulty then creation time**; reorder by changing difficulty.
- A class is **bounded by its `objective`** and has a **finite `syllabus`** = the visible roadmap and the path Go deeper follows.
- **Deepening is plan-following with an upfront roadmap** (reversed the old "incremental, no upfront roadmap" decision), and **the first batch builds at creation** (reversed "incremental only / press a button").
- **Management/CRUD tools are always available** to both agents (reversed the old "intent-gated" decision) — limited to explicit requests via the system prompt.

## Known limitations / open items
- **Non-streaming generation caps output at 16384** → truncation risk on graphics-heavy 5-lesson batches (todo 1).
- **Legacy classes have no syllabus** → free-form Go deeper, no roadmap/milestones/done state until backfilled (todo 2a). **Existing lessons mostly lack diagrams** until backfilled (todo 2b).
- **Syllabus↔lecture mapping is positional** (slot N = the Nth built lesson by ladder order). Deleting a mid-plan lesson can nudge the progress denominator; benign for now. Backfill must put existing lessons first in the generated syllabus.
- SVG is injected via `dangerouslySetInnerHTML` — content is per-user/self-authored (low risk), but consider a sanitizer (DOMPurify) before any content sharing.
- `position` column is dead weight (kept to avoid a migration).
- Note: `AGENTS.md` gets an auto-injected `<claude-mem-context>` block from the claude-mem plugin; it was deliberately kept out of commit `ee84b6a`. Consider gitignoring/stripping it if it churns the file.

## Quick commands
```
npx tsc --noEmit                 # typecheck (primary gate; build only when dev server is down)
graphify update .                # refresh knowledge graph after code changes
sqlite3 data/university.db "SELECT id,name,objective,syllabus FROM classes;"   # inspect classes + syllabi
curl -s localhost:3000/api/deepen -H 'Content-Type: application/json' -d '{"classId":2}'   # exercise plan-following deepen (costs money)
```
