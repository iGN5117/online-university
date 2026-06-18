import { notFound } from "next/navigation";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import MuiLink from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import { getLecture, getClass, listLectures } from "@/lib/data";
import LectureCards from "@/components/LectureCards";
import TeacherChat from "@/components/TeacherChat";

export const dynamic = "force-dynamic";

export default async function LecturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  const lecture = getLecture(numId);

  if (!lecture) {
    notFound();
  }

  const cls = getClass(lecture.class_id);
  if (!cls) {
    notFound();
  }

  // Get all lectures in this class to find next/prev
  const classLectures = listLectures(lecture.class_id);
  const currentIndex = classLectures.findIndex((l) => l.id === numId);
  const nextLecture =
    currentIndex >= 0 && currentIndex < classLectures.length - 1
      ? classLectures[currentIndex + 1]
      : null;

  return (
    <>
    <Stack spacing={3}>
      <Breadcrumbs sx={{ fontSize: "0.875rem" }}>
        <MuiLink href="/" underline="hover" color="text.secondary">
          Home
        </MuiLink>
        <MuiLink
          href={`/class/${lecture.class_id}`}
          underline="hover"
          color="text.secondary"
        >
          {cls.name}
        </MuiLink>
        <Typography color="text.primary" sx={{ fontSize: "0.875rem" }}>
          {lecture.title}
        </Typography>
      </Breadcrumbs>

      {lecture.format === "reading" && lecture.content.body_md ? (
        <Stack spacing={2}>
          {lecture.content.body_md.split("\n").map(
            (para, i) =>
              para.trim() && (
                <Typography
                  key={i}
                  sx={{ fontSize: "1.0625rem", lineHeight: 1.7 }}
                  color="text.primary"
                >
                  {para}
                </Typography>
              ),
          )}
        </Stack>
      ) : lecture.format === "video" && lecture.content.url ? (
        <Paper variant="outlined" sx={{ overflow: "hidden" }}>
          <Box
            component="a"
            href={lecture.content.url}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              aspectRatio: "16 / 9",
              bgcolor: "action.hover",
              fontSize: "2.25rem",
              textDecoration: "none",
              transition: "background-color 0.2s",
              "&:hover": { bgcolor: "action.selected" },
            }}
          >
            ▶️
          </Box>
        </Paper>
      ) : (
        <LectureCards
          lecture={lecture}
          classId={lecture.class_id}
          nextLectureId={nextLecture?.id}
        />
      )}
    </Stack>
    <TeacherChat lectureId={lecture.id} lectureTitle={lecture.title} />
    </>
  );
}
