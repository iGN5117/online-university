import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import MuiLink from "@mui/material/Link";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import LinearProgress from "@mui/material/LinearProgress";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { getClass, getSchool, listLectures } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import type { Difficulty } from "@/lib/types";
import DeepenButton from "@/components/DeepenButton";

export const dynamic = "force-dynamic";

// Difficulty tiers double as milestone bands on the roadmap ("the basics" →
// "mastery"), so the class reads as a journey with checkpoints rather than a
// flat pile of lessons.
const BAND_LABEL: Record<Difficulty, string> = {
  Beginner: "The basics",
  Intermediate: "Putting it to use",
  Advanced: "Going deeper",
  Expert: "Mastery",
};

type RoadmapEntry =
  | {
      kind: "built";
      n: number;
      title: string;
      summary: string;
      difficulty?: Difficulty;
      cards: number;
      completed: boolean;
      href: string;
    }
  | {
      kind: "upcoming";
      n: number;
      title: string;
      summary: string;
      difficulty: Difficulty;
    };

export default async function ClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireUser();
  const { id } = await params;
  const numId = Number(id);
  const cls = getClass(numId, userId);

  if (!cls) {
    notFound();
  }

  const school = getSchool(cls.school_id, userId);
  const lectures = listLectures(numId, userId);

  const builtCount = lectures.length;
  const plannedTotal = cls.syllabus.length;
  const hasPlan = plannedTotal > 0;
  // The plan is the finish line: progress is measured against the full planned
  // count, not the lessons built so far (which used to make the bar un-fillable).
  // Never dip below what's actually built; legacy classes (no plan) fall back to
  // the built count, preserving today's behavior.
  const denominator = Math.max(plannedTotal, builtCount);
  const progress = denominator > 0 ? (cls.completedCount / denominator) * 100 : 0;
  const isComplete = denominator > 0 && cls.completedCount >= denominator;
  const hasMoreToBuild = hasPlan ? builtCount < plannedTotal : true;
  const remaining = Math.max(plannedTotal - builtCount, 0);

  // One ordered roadmap: the built lectures (clickable) followed by the planned
  // lessons not yet built (shown greyed, as the path ahead).
  const upcoming = plannedTotal > builtCount ? cls.syllabus.slice(builtCount) : [];
  const roadmap: RoadmapEntry[] = [
    ...lectures.map(
      (l, i): RoadmapEntry => ({
        kind: "built",
        n: i + 1,
        title: l.title,
        summary: l.summary,
        difficulty: l.content.difficulty,
        cards: l.content.cards?.length || 0,
        completed: l.completed,
        href: `/lecture/${l.id}`,
      }),
    ),
    ...upcoming.map(
      (s, i): RoadmapEntry => ({
        kind: "upcoming",
        n: builtCount + i + 1,
        title: s.title,
        summary: s.summary,
        difficulty: s.difficulty,
      }),
    ),
  ];

  const caption =
    cls.completedCount === 0
      ? "Complete a lesson to unlock the test."
      : isComplete
        ? "You've finished the class — revisit any lesson or test what you know."
        : !hasMoreToBuild
          ? `All ${plannedTotal} lessons added — finish them all to complete the class.`
          : hasPlan
            ? `${remaining} ${remaining === 1 ? "lesson" : "lessons"} left to build in your plan — or test what you know.`
            : "Add the next, harder lesson — or test what you know.";

  return (
    <Stack spacing={4}>
      <Breadcrumbs sx={{ fontSize: "0.875rem" }}>
        <MuiLink href="/" underline="hover" color="text.secondary">
          Home
        </MuiLink>
        {school && (
          <MuiLink
            href={`/school/${school.id}`}
            underline="hover"
            color="text.secondary"
          >
            {school.name}
          </MuiLink>
        )}
        <Typography color="text.primary" sx={{ fontSize: "0.875rem" }}>
          {cls.name}
        </Typography>
      </Breadcrumbs>

      <Stack spacing={1}>
        <Typography sx={{ fontSize: "2.25rem", lineHeight: 1 }}>
          {cls.emoji}
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
          {cls.name}
        </Typography>
        <Typography color="text.secondary" sx={{ fontSize: "1.125rem" }}>
          {cls.description}
        </Typography>
        {cls.objective && (
          <Typography variant="body2" color="text.secondary" sx={{ pt: 0.5 }}>
            🎯 Goal: {cls.objective}
          </Typography>
        )}
      </Stack>

      <Stack spacing={1}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
          {cls.completedCount} of {denominator}{" "}
          {denominator === 1 ? "lesson" : "lessons"} complete
        </Typography>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ height: 8, borderRadius: 999 }}
        />
      </Stack>

      {isComplete && (
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          🎓 You&apos;ve completed {cls.name}
          {cls.objective ? ` — you've covered everything in: ${cls.objective}` : "."}
        </Alert>
      )}

      {roadmap.length === 0 ? (
        <Box sx={{ py: 6, textAlign: "center" }}>
          <Typography color="text.secondary" sx={{ fontSize: "1.125rem" }}>
            No lectures yet.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {roadmap.map((entry, idx) => {
            // Milestone band header whenever the difficulty tier changes. Only
            // for planned classes; legacy classes render a flat list as before.
            const prev = roadmap[idx - 1];
            const showBand =
              hasPlan &&
              !!entry.difficulty &&
              entry.difficulty !== prev?.difficulty;
            return (
              <Box key={`${entry.kind}-${entry.n}`}>
                {showBand && entry.difficulty && (
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{
                      display: "block",
                      mt: idx === 0 ? 0 : 1.5,
                      mb: 0.5,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                    }}
                  >
                    {BAND_LABEL[entry.difficulty]}
                  </Typography>
                )}
                {entry.kind === "built" ? (
                  <Card variant="outlined">
                    <CardActionArea href={entry.href}>
                      <CardContent>
                        <Stack
                          direction="row"
                          spacing={2}
                          sx={{
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                          }}
                        >
                          <Box sx={{ flex: 1 }}>
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ alignItems: "baseline" }}
                            >
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontWeight: 700 }}
                              >
                                {entry.n}.
                              </Typography>
                              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                {entry.title}
                              </Typography>
                            </Stack>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 0.5 }}
                            >
                              {entry.summary}
                            </Typography>
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ alignItems: "center", mt: 1 }}
                            >
                              <Typography variant="caption" color="text.secondary">
                                {entry.cards} cards
                              </Typography>
                              {entry.difficulty && (
                                <Chip
                                  label={entry.difficulty}
                                  size="small"
                                  variant="outlined"
                                  color="secondary"
                                />
                              )}
                            </Stack>
                          </Box>
                          {entry.completed && (
                            <CheckCircleIcon color="primary" titleAccess="Completed" />
                          )}
                        </Stack>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ) : (
                  <Card
                    variant="outlined"
                    sx={{ opacity: 0.55, borderStyle: "dashed" }}
                  >
                    <CardContent>
                      <Stack
                        direction="row"
                        spacing={2}
                        sx={{
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: "baseline" }}
                          >
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontWeight: 700 }}
                            >
                              {entry.n}.
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              {entry.title}
                            </Typography>
                          </Stack>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.5 }}
                          >
                            {entry.summary}
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: "center", mt: 1 }}
                          >
                            <Chip
                              label="Upcoming"
                              size="small"
                              variant="outlined"
                            />
                            <Chip
                              label={entry.difficulty}
                              size="small"
                              variant="outlined"
                              color="secondary"
                            />
                          </Stack>
                        </Box>
                        <LockOutlinedIcon
                          fontSize="small"
                          color="disabled"
                          titleAccess="Not built yet"
                        />
                      </Stack>
                    </CardContent>
                  </Card>
                )}
              </Box>
            );
          })}
        </Stack>
      )}

      <Box>
        <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", gap: 2 }}>
          {hasMoreToBuild && (
            <DeepenButton
              classId={numId}
              mode="refresh"
              label={hasPlan ? "✨ Build the next lessons" : "✨ Go deeper"}
            />
          )}
          {cls.completedCount === 0 ? (
            <Tooltip title="Complete a lecture first">
              <span>
                <Button variant="outlined" size="large" disabled>
                  📝 Take a test
                </Button>
              </span>
            </Tooltip>
          ) : (
            <Button href={`/class/${numId}/test`} variant="outlined" size="large">
              📝 Take a test
            </Button>
          )}
        </Stack>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 1 }}
        >
          {caption}
        </Typography>
      </Box>
    </Stack>
  );
}
