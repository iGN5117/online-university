<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


<claude-mem-context>
# Memory Context

# [Online_University] recent context, 2026-06-21 8:59pm EDT

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (27,197t read) | 2,136,957t work | 99% savings

### Jun 20, 2026
S114 User shared an external product-manager review of the self-directed learning app and asked for a reaction/critique of that review's recommendations. (Jun 20 at 2:45 PM)
S115 User asked "what's left?" on the Tier 1/Tier 2 product-review-driven implementation (finite syllabus + onboarding) for the Online University learning app. (Jun 20 at 9:25 PM)
### Jun 21, 2026
529 12:42a 🟣 New authorPlannedLessons() function builds lecture content strictly from the class syllabus plan
530 " 🟣 deepenClass() now branches to follow the class syllabus when one exists, completing finite "Go deeper"
531 12:44a 🟣 Class page rewritten to show finite roadmap with milestone bands and a real completion state
532 " ✅ Typecheck reconfirmed clean after class roadmap UI rewrite
533 12:46a 🟣 New lib/templates.ts adds starter learning templates and structured intake for onboarding
534 " 🟣 New StarterGrid component replaces bare empty-state text with clickable starter templates
535 12:47a 🟣 Home page wired to new StarterGrid empty state and goal-oriented heading
536 " ✅ Imported templates module into AgentChat ahead of structured intake wiring
537 " 🟣 AgentChat replaces flat starter suggestions with level/depth intake option lists
538 " 🟣 AgentChat now listens for OPEN_BUILDER_EVENT to auto-open and prefill the Course Builder chat
539 " 🟣 AgentChat gains handleBuild() to compose and send the intake-derived first message
540 12:48a 🟣 AgentChat empty state now renders full structured intake UI: goal field, level/depth chips, build button
541 " 🔄 AgentChat input row now hidden on the empty state to avoid duplicate input controls
542 " 🔵 Shell glob expansion broke eslint invocation on bracketed Next.js dynamic route path
544 " 🔵 Confirmed AgentChat lint issues predate the onboarding feature work
545 " ✅ Graphify knowledge graph refreshed to reflect Tier 1/2 codebase changes
S117 User reported three post-testing issues: (1) Course Builder/Teacher CRUD functionality appears broken, (2) consider eager syllabus generation at class creation instead of on-demand "Go deeper" if cost allows, (3) bias the model toward adding more inline SVG graphics to lessons. (Jun 21 at 12:48 AM)
543 " 🔵 ESLint flags pre-existing setState-in-effect error and unused variable in AgentChat.tsx
546 12:49a 🔴 User reports CRUD functionality regression in Course Builder/Teacher agents after Tier 1/2 changes
S118 Following the PM-review-driven Tier 1/Tier 2 work, the user reported three live-testing issues to fix: (1) agent CRUD (edit/delete) had stopped working, (2) evaluate whether generating the full syllabus upfront is cost-comparable to lazy "Go deeper" and switch if so, (3) bias the model to add more inline SVG graphics to lessons. (Jun 21 at 11:25 AM)
S116 User reported three issues/requests after live testing: (1) Course Builder/Teacher agent CRUD functionality appears broken and needs fixing, (2) consider generating the full syllabus eagerly at class creation instead of waiting for "Go deeper" if cost allows, (3) bias the model toward adding more inline SVG graphics to lessons. (Jun 21 at 11:25 AM)
547 11:32a 🔵 wantsManagement() regex misses many common edit/delete phrasings, root-causing the "lost CRUD" bug report
548 11:34a 🔴 CRUD regression fixed: management tools now always attached instead of keyword-gated
549 " 🔄 systemPrompt() simplified to drop includeManagement parameter, making CRUD instructions always present
550 " 🔴 runAgentTurn() updated to always attach MANAGEMENT_TOOLS, completing the CRUD regression fix
551 " 🔴 runTeacherTurn() also updated to always attach edit/delete tools, completing the CRUD fix across both agents
552 11:35a 🟣 CARD_SCHEMA diagram field rewritten to bias toward generating SVG diagrams on most cards
553 " 🟣 All four content-generation prompts in lib/agent.ts now bias toward inline SVG diagrams
554 " 🔴 CRUD always-on fix verified clean: no leftover wantsManagement/includeManagement references, typecheck passes
555 11:36a 🟣 create_class tool description updated to reflect automatic eager lesson building from the syllabus
556 11:39a 🟣 create_lecture description reworded to forbid use on brand-new classes; eager-build logic implemented in create_class's executeTool case
557 11:41a 🔴 systemPrompt() course-builder rules updated to match eager-build behavior; typecheck/lint pass clean
558 " 🔴 Final typecheck and graph refresh confirm eager-syllabus-generation change set is complete and clean
S119 Commit all uncommitted session work (finite syllabus, CRUD fix, eager first-batch generation, onboarding/templates, graphics bias) and write a handoff document for a new session to implement streaming and backfill existing legacy lessons with the new syllabus/graphics features. (Jun 21 at 11:42 AM)
559 11:46a 🔵 Pre-commit inspection finds large uncommitted change set across 17 files plus untracked new files and a stray .codex directory
560 5:50p 🔵 Existing HANDOFF.md found stale, describing a prior completed multi-user/auth migration rather than current syllabus/onboarding work
561 " 🔵 Untracked .codex/hooks.json implements a PreToolUse hook nudging toward graphify before raw grep/find searches
562 5:52p ✅ Staged the full session's working-tree changes for commit, discarding the trivial AGENTS.md whitespace diff
563 " ✅ Committed all session work as ee84b6a: finite syllabus, reliable agent CRUD, graphics bias
564 5:54p ✅ HANDOFF.md fully rewritten with streaming and backfill todos for the next session
565 " ✅ Committed updated HANDOFF.md as e25b2a2, working tree fully clean
S120 Familiarize with the Online University project and its session handoff before continuing work. (Jun 21 at 5:55 PM)
566 8:14p 🔵 Online University graphify report reveals core architecture
567 8:15p 🔵 HANDOFF.md defines pending work: streaming fix and backfill for legacy classes
568 " 🔵 README.md is stale relative to HANDOFF.md on auth model
S121 Implement HANDOFF.md todo 1 — convert the non-streaming lesson-generation calls in lib/agent.ts to streaming and raise the output token budget. (Jun 21 at 8:15 PM)
569 " 🔵 lib/agent.ts internals: tool definitions, agent loop, and deepen pipeline confirmed
570 8:16p 🔵 Confirmed Anthropic SDK version for streaming API compatibility
571 " ✅ DEEPEN_MAX_TOKENS raised from 16384 to 32000 in lib/agent.ts
572 " 🟣 Converted both deepenClass model calls to streaming via Anthropic SDK
573 8:17p 🔵 Typecheck run after streaming conversion produced no errors
575 " 🔵 Knowledge graph refreshed; dev server down; one class has more built lectures than its syllabus plans
576 " 🔵 Root cause found for "how far do you want to go" always-selected bug
S122 Fix a bug in the Course Builder chat intake: the "how far do you want to go" (depth) selector always requires one option selected, with no way to unselect it — needed so the agent can be used for edit/delete requests without forcing a depth choice. Requested before moving to todo 2a (syllabus backfill). (Jun 21 at 8:17 PM)
574 " 🔵 Typecheck confirmed clean after streaming conversion (exit 0)
577 8:23p 🔴 Made the depth selector in Course Builder intake deselectable
578 8:24p 🔵 Depth-unselect bugfix verified clean via typecheck and graph refresh
S123 Fix a bug where the Course Builder chat intake's "how far do you want to go" depth selector always required one value, preventing it from being unselected for edit/delete requests where depth doesn't apply. (Jun 21 at 8:24 PM)
**Investigated**: Read lib/templates.ts and components/AgentChat.tsx to trace how the depth intake field was modeled, compared it against the already-working "Your level" field's nullable toggle pattern, and confirmed via grep that composeBuilderPrompt has exactly one caller (AgentChat.tsx's handleBuild).

**Learned**: The bug's root cause was a type/UI asymmetry: Depth was a required, non-nullable union with no toggle-off click handler, while the adjacent Level field already supported toggling to null. The fix is a direct mirror of that existing, proven pattern. One residual caveat surfaced after implementing the fix: the empty-state intake always wraps the goal text in "I want to learn {goal}." before sending, so even with depth cleared, an edit/delete-style goal (e.g. "delete the Cricket class") would still be sent wrapped as "I want to learn delete the Cricket class." — the depth toggle fix addresses only the depth phrase, not this wrapper sentence, which the user may want addressed separately if raw unwrapped instructions are needed.

**Completed**: Widened Depth to `Depth | null` in lib/templates.ts's composeBuilderPrompt signature, with the depth phrase now conditionally included only when non-null (mirroring the existing level-phrase pattern). Updated components/AgentChat.tsx: intakeDepth state retyped to `Depth | null` (still defaulting to "solid"), and the depth chip's onClick handler now toggles to null when the already-selected chip is clicked again, matching the Level chip's existing toggle behavior. Verified with npx tsc --noEmit (exit 0, no type errors) and refreshed the graphify knowledge graph to reflect the change.

**Next Steps**: Awaiting user decision on whether the wrapper sentence ("I want to learn {goal}.") needs to be addressed for raw edit/delete instructions sent through the empty-state intake, then planning to move on to todo 2a (legacy class syllabus backfill) per the original HANDOFF.md priority list.


Access 2137k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>