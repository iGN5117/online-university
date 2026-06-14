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
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { getClass, getSchool, listLectures } from "@/lib/data";
import DeepenButton from "@/components/DeepenButton";

export const dynamic = "force-dynamic";

export default async function ClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  const cls = getClass(numId);

  if (!cls) {
    notFound();
  }

  const school = getSchool(cls.school_id);
  const lectures = listLectures(numId);
  const progress =
    cls.lectureCount > 0 ? (cls.completedCount / cls.lectureCount) * 100 : 0;

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
      </Stack>

      <Stack spacing={1}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
          Progress: {cls.completedCount} / {cls.lectureCount} lectures
        </Typography>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ height: 8, borderRadius: 999 }}
        />
      </Stack>

      {lectures.length === 0 ? (
        <Box sx={{ py: 6, textAlign: "center" }}>
          <Typography color="text.secondary" sx={{ fontSize: "1.125rem" }}>
            No lectures yet.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {lectures.map((lecture, index) => (
            <Card key={lecture.id} variant="outlined">
              <CardActionArea href={`/lecture/${lecture.id}`}>
                <CardContent>
                  <Stack
                    direction="row"
                    spacing={2}
                    sx={{ justifyContent: "space-between", alignItems: "flex-start" }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontWeight: 700 }}
                        >
                          {index + 1}.
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {lecture.title}
                        </Typography>
                      </Stack>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                      >
                        {lecture.summary}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: "center", mt: 1 }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {lecture.content.cards?.length || 0} cards
                        </Typography>
                        {lecture.content.difficulty && (
                          <Chip
                            label={lecture.content.difficulty}
                            size="small"
                            variant="outlined"
                            color="secondary"
                          />
                        )}
                      </Stack>
                    </Box>
                    {lecture.completed && (
                      <CheckCircleIcon color="primary" titleAccess="Completed" />
                    )}
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}

      <Box>
        <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", gap: 2 }}>
          <DeepenButton classId={numId} mode="refresh" label="✨ Go deeper" />
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
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          {cls.completedCount === 0
            ? "Complete a lecture to unlock the test."
            : "Add the next, harder lesson — or test what you know."}
        </Typography>
      </Box>
    </Stack>
  );
}
