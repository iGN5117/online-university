import { redirect } from "next/navigation";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { auth } from "@/auth";
import {
  listAllowedEmails,
  listSchools,
  listClasses,
  isOwnerEmail,
  getAgentModel,
  AGENT_MODELS,
} from "@/lib/data";
import AllowedEmailsManager from "./AllowedEmailsManager";
import AgentModelManager from "./AgentModelManager";
import RoadmapBackfill from "./RoadmapBackfill";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!isOwnerEmail(session?.user?.email)) redirect("/");
  if (typeof session?.userId !== "number") redirect("/");

  const emails = listAllowedEmails();
  const ownerEmail = session.user!.email!;
  const agentModel = getAgentModel();

  // Legacy classes (no syllabus) the owner can backfill a roadmap onto.
  const userId = session.userId;
  const legacyClasses = listSchools(userId).flatMap((s) =>
    listClasses(s.id, userId)
      .filter((c) => c.syllabus.length === 0)
      .map((c) => ({
        id: c.id,
        name: c.name,
        emoji: c.emoji,
        schoolName: s.name,
        lectureCount: c.lectureCount,
      })),
  );

  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography
          variant="h3"
          sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}
        >
          Access control
        </Typography>
        <Typography color="text.secondary">
          Add or remove who can sign in. You ({ownerEmail}) and anyone listed in
          the server&apos;s <code>ALLOWED_EMAILS</code> are always allowed and
          aren&apos;t shown here.
        </Typography>
      </Stack>

      <AllowedEmailsManager initialEmails={emails} />

      <Stack spacing={1}>
        <Typography
          variant="h3"
          sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}
        >
          Agent model
        </Typography>
        <Typography color="text.secondary">
          Which Claude model the agents run on. Overrides the{" "}
          <code>AGENT_MODEL</code> env var.
        </Typography>
      </Stack>

      <AgentModelManager models={AGENT_MODELS} current={agentModel} />

      <Stack spacing={1}>
        <Typography
          variant="h3"
          sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}
        >
          Class roadmaps
        </Typography>
        <Typography color="text.secondary">
          Legacy classes made before roadmaps existed. Generating one (a single
          cheap model call) builds a finite syllabus — keeping the lessons
          already built first, then planning the path to finish — which unlocks
          the roadmap, milestone bands, and progress-to-done view. New classes
          get this automatically.
        </Typography>
      </Stack>

      <RoadmapBackfill classes={legacyClasses} />
    </Stack>
  );
}
