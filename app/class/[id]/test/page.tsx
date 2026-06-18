import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import MuiLink from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import { getClass, getTestQuestions, listTestAttempts } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import TestRunner from "@/components/TestRunner";

export const dynamic = "force-dynamic";

export default async function TestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireUser();
  const { id } = await params;
  const classId = Number(id);
  const cls = getClass(classId, userId);

  if (!cls) {
    notFound();
  }

  const questions = getTestQuestions(classId, userId);
  const attempts = listTestAttempts(classId, userId);

  // Shuffle and cap at 10 questions per sitting
  const shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, 10);

  return (
    <Stack spacing={4}>
      <Breadcrumbs sx={{ fontSize: "0.875rem" }}>
        <MuiLink href="/" underline="hover" color="text.secondary">
          Home
        </MuiLink>
        <MuiLink
          href={`/class/${classId}`}
          underline="hover"
          color="text.secondary"
        >
          {cls.name}
        </MuiLink>
        <Typography color="text.primary" sx={{ fontSize: "0.875rem" }}>
          Test
        </Typography>
      </Breadcrumbs>

      <Typography variant="h3" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
        📝 Test: {cls.name}
      </Typography>

      {shuffled.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary" sx={{ fontSize: "1.125rem", mb: 2 }}>
            Nothing to test yet — complete a lecture first.
          </Typography>
          <Button href={`/class/${classId}`} variant="contained">
            Back to class
          </Button>
        </Paper>
      ) : (
        <Stack spacing={4}>
          <TestRunner classId={classId} questions={shuffled} />

          {attempts.length > 0 && (
            <Stack spacing={2}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Past attempts
              </Typography>
              <Stack spacing={1}>
                {attempts.map((attempt) => (
                  <Paper key={attempt.id} variant="outlined" sx={{ p: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography sx={{ fontWeight: 700 }}>
                        {attempt.score}/{attempt.total}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(attempt.taken_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            </Stack>
          )}
        </Stack>
      )}
    </Stack>
  );
}
