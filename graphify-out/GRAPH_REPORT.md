# Graph Report - Online_University  (2026-06-21)

## Corpus Check
- 56 files · ~30,068 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 335 nodes · 589 edges · 27 communities (19 shown, 8 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e25b2a20`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Card Viewer & Data Storage|Card Viewer & Data Storage]]
- [[_COMMUNITY_Companion Agent Core|Companion Agent Core]]
- [[_COMMUNITY_App Shell & Chat Panel|App Shell & Chat Panel]]
- [[_COMMUNITY_Browsing Pages & Queries|Browsing Pages & Queries]]
- [[_COMMUNITY_API Endpoints & Page Map|API Endpoints & Page Map]]
- [[_COMMUNITY_Class & Progress Data Access|Class & Progress Data Access]]
- [[_COMMUNITY_Content Creation (Lectures & Cards)|Content Creation (Lectures & Cards)]]
- [[_COMMUNITY_School Management & Agent Cost Design|School Management & Agent Cost Design]]
- [[_COMMUNITY_Quiz Runner & Test Flow|Quiz Runner & Test Flow]]
- [[_COMMUNITY_Lecture Content Model|Lecture Content Model]]
- [[_COMMUNITY_Lecture Completion|Lecture Completion]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_Next Env Types|Next Env Types]]
- [[_COMMUNITY_Lecture Format Type|Lecture Format Type]]
- [[_COMMUNITY_Single-User Rationale|Single-User Rationale]]
- [[_COMMUNITY_Agent Instructions Doc|Agent Instructions Doc]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 36 edges
2. `getDb` - 16 edges
3. `getClass()` - 14 edges
4. `executeTool()` - 14 edges
5. `Session Handoff — Online University` - 12 edges
6. `isOwnerEmail()` - 11 edges
7. `requireUser()` - 11 edges
8. `getAgentModel()` - 10 edges
9. `listLectures()` - 10 edges
10. `OwnershipError` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Cost Minimization Design` --rationale_for--> `runAgentTurn`  [EXTRACTED]
  README.md → lib/agent.ts
- `Online University - Main Documentation` --references--> `runAgentTurn`  [EXTRACTED]
  README.md → lib/agent.ts
- `Extensible Lecture Formats via JSON Content Column` --rationale_for--> `LectureContent`  [EXTRACTED]
  README.md → lib/types.ts
- `Bite-Size Card Learning Design` --rationale_for--> `Card`  [EXTRACTED]
  README.md → lib/types.ts
- `Home()` --calls--> `requireUser()`  [EXTRACTED]
  app/page.tsx → lib/auth.ts

## Hyperedges (group relationships)
- **Client → API → Data Layer Write Pattern** — cardviewer_cardviewer, route_lectures_complete, testrunner_testrunner, route_tests [INFERRED 0.85]
- **Next.js App Router Page Hierarchy** — layout_rootlayout, page_home, school_schoolpage, class_classpage, lecture_lecturepage, test_testpage [EXTRACTED 1.00]
- **Learning Experience Components** — agentchat_agentchat, lecture_lecturepage, cardviewer_cardviewer, testrunner_testrunner [INFERRED 0.75]
- **Agent Content Creation Flow** — agent_executetool, data_createschool, data_createclass, data_createlecture, data_addcards, data_addquestions [EXTRACTED 1.00]
- **Data Retrieval & Query Layer** — data_listschools, data_listclasses, data_listlectures, data_gettestquestions, data_getcatalogsummary [INFERRED 0.85]
- **Database Initialization & Seeding** — db_init, seed_seed, seed_insertlectures [EXTRACTED 1.00]

## Communities (27 total, 8 thin omitted)

### Community 0 - "Card Viewer & Data Storage"
Cohesion: 0.12
Nodes (36): POST(), AddedLecture, AgentAction, AgentTurnResult, authorPlannedLessons(), CARD_SCHEMA, deepenClass(), DeepenResult (+28 more)

### Community 1 - "Companion Agent Core"
Cohesion: 0.08
Nodes (38): AgentAction, AgentTurnResult, executeTool, runAgentTurn, systemPrompt, addCards, addQuestions, createClass (+30 more)

### Community 2 - "App Shell & Chat Panel"
Cohesion: 0.09
Nodes (24): Action, AgentChat(), AgentResponse, ChatMessage, DEPTHS, ErrorResponse, LEVELS, MessageWithActions (+16 more)

### Community 3 - "Browsing Pages & Queries"
Cohesion: 0.11
Nodes (23): TestDetail, TestRunnerProps, TestState, ClassDbRow, DIFFICULTY_RANK, LectureDbRow, QuestionDbRow, globalForDb (+15 more)

### Community 4 - "API Endpoints & Page Map"
Cohesion: 0.11
Nodes (18): DELETE(), POST(), requireOwner(), generateClassSyllabus(), addAllowedEmail(), getOrCreateUser(), isEmailAllowed(), isOwnerEmail() (+10 more)

### Community 5 - "Class & Progress Data Access"
Cohesion: 0.2
Nodes (16): BAND_LABEL, ClassPage(), LecturePage(), RoadmapEntry, SchoolPage(), requireUser(), getClass(), getLecture() (+8 more)

### Community 6 - "Content Creation (Lectures & Cards)"
Cohesion: 0.15
Nodes (12): ChatTurn, POST(), POST(), runAgentTurn(), runTeacherTurn(), wantsManagement(), markLectureComplete(), OwnershipError (+4 more)

### Community 7 - "School Management & Agent Cost Design"
Cohesion: 0.12
Nodes (6): geistMono, geistSans, metadata, viewport, LinkBehaviour, theme

### Community 8 - "Quiz Runner & Test Flow"
Cohesion: 0.12
Nodes (15): 1. Stream the lesson-generation calls (unlock output headroom), 2. Backfill existing classes/lessons with the new model, Architecture map, code:block1 (npx tsc --noEmit                 # typecheck (primary gate; ), Current data quirks (data/university.db), Hard rules (do not violate), Known limitations / open items, Next session — todos (as of 2026-06-18) (+7 more)

### Community 9 - "Lecture Content Model"
Cohesion: 0.16
Nodes (7): ModelOption, AdminPage(), LegacyClass, Home(), AGENT_MODELS, listAllowedEmails(), listSchools()

### Community 10 - "Lecture Completion"
Cohesion: 0.16
Nodes (7): CardViewerProps, AddedLecture, DeepenResult, ErrorResponse, LectureCardsProps, ReelViewerProps, Lecture

### Community 11 - "PostCSS Config"
Cohesion: 0.2
Nodes (12): AgentChat, CardViewer, ClassPage, RootLayout, LecturePage, Home, POST /api/agent, POST /api/lectures/complete (+4 more)

### Community 12 - "ESLint Config"
Cohesion: 0.18
Nodes (10): 1. Google OAuth (Google Cloud Console), 2. Local dev, 3. Deploy to Fly.io, 4. Migrate existing local content (optional, one-time), 5. iPhone / PWA verification, code:bash (ANTHROPIC_API_KEY=sk-ant-...), code:bash (npm run dev), code:bash (fly auth login) (+2 more)

### Community 13 - "Next.js Config"
Cohesion: 0.22
Nodes (8): code:bash (npm install), Cost design, Lecture formats, Notes, 🎓 Online University, Quick start, The Course Builder agent, What's inside

### Community 14 - "Next Env Types"
Cohesion: 0.25
Nodes (6): 1. Think Before Coding, 2. Simplicity First, 3. Surgical Changes, 4. Goal-Driven Execution, code:block1 (1. [Step] → verify: [check]), graphify

### Community 15 - "Lecture Format Type"
Cohesion: 0.29
Nodes (7): Jun 19, 2026, Jun 20, 2026, Jun 21, 2026, Memory Context, [Online_University] recent context, 2026-06-20 9:28pm EDT, [Online_University] recent context, 2026-06-21 8:59pm EDT, This is NOT the Next.js you know

## Knowledge Gaps
- **115 isolated node(s):** `{ spawn }`, `env`, `{ auth }`, `url`, `config` (+110 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDb()` connect `Card Viewer & Data Storage` to `Browsing Pages & Queries`, `API Endpoints & Page Map`, `Class & Progress Data Access`, `Content Creation (Lectures & Cards)`, `Lecture Content Model`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `getClass()` connect `Class & Progress Data Access` to `Card Viewer & Data Storage`, `Browsing Pages & Queries`, `API Endpoints & Page Map`, `Content Creation (Lectures & Cards)`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `{ spawn }`, `env`, `{ auth }` to the rest of the system?**
  _115 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Card Viewer & Data Storage` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Companion Agent Core` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `App Shell & Chat Panel` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Browsing Pages & Queries` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._