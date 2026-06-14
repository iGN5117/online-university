import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import MuiLink from "@mui/material/Link";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import { getSchool, listClasses } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SchoolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  const school = getSchool(numId);

  if (!school) {
    notFound();
  }

  const classes = listClasses(numId);

  return (
    <Stack spacing={4}>
      <Breadcrumbs sx={{ fontSize: "0.875rem" }}>
        <MuiLink href="/" underline="hover" color="text.secondary">
          Home
        </MuiLink>
        <Typography color="text.primary" sx={{ fontSize: "0.875rem" }}>
          {school.name}
        </Typography>
      </Breadcrumbs>

      <Stack spacing={1}>
        <Typography sx={{ fontSize: "2.25rem", lineHeight: 1 }}>
          {school.emoji}
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
          {school.name}
        </Typography>
        <Typography color="text.secondary" sx={{ fontSize: "1.125rem" }}>
          {school.description}
        </Typography>
      </Stack>

      {classes.length === 0 ? (
        <Box sx={{ py: 6, textAlign: "center" }}>
          <Typography color="text.secondary" sx={{ fontSize: "1.125rem" }}>
            No classes yet — ask the companion (✨ bottom-right) to add one.
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
          }}
        >
          {classes.map((cls) => (
            <Card key={cls.id} variant="outlined" sx={{ height: "100%" }}>
              <CardActionArea
                href={`/class/${cls.id}`}
                sx={{ height: "100%" }}
              >
                <CardContent>
                  <Stack spacing={1.5}>
                    <Typography sx={{ fontSize: "1.875rem", lineHeight: 1 }}>
                      {cls.emoji}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {cls.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {cls.description}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 600, pt: 1 }}
                    >
                      {cls.completedCount}/{cls.lectureCount} lectures
                    </Typography>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}
    </Stack>
  );
}
