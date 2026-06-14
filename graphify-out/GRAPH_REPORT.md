# Graph Report - Online_University  (2026-06-13)

## Corpus Check
- 31 files · ~13,769 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 198 nodes · 316 edges · 18 communities (12 shown, 6 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `eda19e1d`
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
- [[_COMMUNITY_Single-User Rationale|Single-User Rationale]]
- [[_COMMUNITY_Agent Instructions Doc|Agent Instructions Doc]]

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 21 edges
2. `getDb` - 16 edges
3. `getClass()` - 11 edges
4. `executeTool()` - 10 edges
5. `listLectures()` - 9 edges
6. `executeTool` - 9 edges
7. `getLecture()` - 8 edges
8. `getSchool()` - 6 edges
9. `createLecture()` - 6 edges
10. `getCatalogSummary()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Cost Minimization Design` --rationale_for--> `runAgentTurn`  [EXTRACTED]
  README.md → lib/agent.ts
- `Online University - Main Documentation` --references--> `runAgentTurn`  [EXTRACTED]
  README.md → lib/agent.ts
- `Extensible Lecture Formats via JSON Content Column` --rationale_for--> `LectureContent`  [EXTRACTED]
  README.md → lib/types.ts
- `Bite-Size Card Learning Design` --rationale_for--> `Card`  [EXTRACTED]
  README.md → lib/types.ts
- `Home()` --calls--> `listSchools()`  [EXTRACTED]
  app/page.tsx → lib/data.ts

## Hyperedges (group relationships)
- **Client → API → Data Layer Write Pattern** — cardviewer_cardviewer, route_lectures_complete, testrunner_testrunner, route_tests [INFERRED 0.85]
- **Next.js App Router Page Hierarchy** — layout_rootlayout, page_home, school_schoolpage, class_classpage, lecture_lecturepage, test_testpage [EXTRACTED 1.00]
- **Learning Experience Components** — agentchat_agentchat, lecture_lecturepage, cardviewer_cardviewer, testrunner_testrunner [INFERRED 0.75]
- **Agent Content Creation Flow** — agent_executetool, data_createschool, data_createclass, data_createlecture, data_addcards, data_addquestions [EXTRACTED 1.00]
- **Data Retrieval & Query Layer** — data_listschools, data_listclasses, data_listlectures, data_gettestquestions, data_getcatalogsummary [INFERRED 0.85]
- **Database Initialization & Seeding** — db_init, seed_seed, seed_insertlectures [EXTRACTED 1.00]

## Communities (18 total, 6 thin omitted)

### Community 0 - "Card Viewer & Data Storage"
Cohesion: 0.08
Nodes (38): AgentAction, AgentTurnResult, executeTool, runAgentTurn, systemPrompt, addCards, addQuestions, createClass (+30 more)

### Community 1 - "Companion Agent Core"
Cohesion: 0.13
Nodes (26): ChatTurn, POST(), AgentAction, AgentTurnResult, CARD_SCHEMA, DIFFICULTY_LEVELS, executeTool(), MANAGEMENT_TOOLS (+18 more)

### Community 2 - "App Shell & Chat Panel"
Cohesion: 0.13
Nodes (20): Home(), POST(), DIFFICULTY_RANK, LectureDbRow, listSchools(), markLectureComplete(), QuestionDbRow, recordTestAttempt() (+12 more)

### Community 3 - "Browsing Pages & Queries"
Cohesion: 0.09
Nodes (11): geistMono, geistSans, metadata, Action, AgentResponse, ChatMessage, ErrorResponse, MessageWithActions (+3 more)

### Community 4 - "API Endpoints & Page Map"
Cohesion: 0.16
Nodes (14): AgentResponse, ChatMessage, ErrorResponse, POST(), ClassPage(), LecturePage(), SchoolPage(), deepenClass() (+6 more)

### Community 5 - "Class & Progress Data Access"
Cohesion: 0.2
Nodes (12): AgentChat, CardViewer, ClassPage, RootLayout, LecturePage, Home, POST /api/agent, POST /api/lectures/complete (+4 more)

### Community 6 - "Content Creation (Lectures & Cards)"
Cohesion: 0.28
Nodes (6): TestDetail, TestRunnerProps, TestState, getTestQuestions(), listTestAttempts(), TestPage()

### Community 7 - "School Management & Agent Cost Design"
Cohesion: 0.22
Nodes (8): code:bash (npm install), Cost design, Lecture formats, Notes, 🎓 Online University, Quick start, The Course Builder agent, What's inside

### Community 8 - "Quiz Runner & Test Flow"
Cohesion: 0.25
Nodes (6): 1. Think Before Coding, 2. Simplicity First, 3. Surgical Changes, 4. Goal-Driven Execution, code:block1 (1. [Step] → verify: [check]), graphify

### Community 9 - "Lecture Content Model"
Cohesion: 0.29
Nodes (3): CardViewerProps, DeepenResult, ErrorResponse

### Community 10 - "Lecture Completion"
Cohesion: 0.43
Nodes (5): globalForDb, init(), insertLectures(), seed(), SeedLecture

## Knowledge Gaps
- **65 isolated node(s):** `eslintConfig`, `nextConfig`, `geistSans`, `geistMono`, `metadata` (+60 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getClass()` connect `API Endpoints & Page Map` to `Companion Agent Core`, `App Shell & Chat Panel`, `Content Creation (Lectures & Cards)`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `getDb()` connect `Companion Agent Core` to `App Shell & Chat Panel`, `Lecture Completion`, `API Endpoints & Page Map`, `Content Creation (Lectures & Cards)`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `geistSans` to the rest of the system?**
  _65 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Card Viewer & Data Storage` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Companion Agent Core` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Should `App Shell & Chat Panel` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Should `Browsing Pages & Queries` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._