import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import { listSchools } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import StarterGrid from "@/components/StarterGrid";

export const dynamic = "force-dynamic";

export default async function Home() {
  const userId = await requireUser();
  const schools = listSchools(userId);

  return (
    <Stack spacing={4}>
      <Typography variant="h3" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
        {schools.length === 0
          ? "What do you want to learn?"
          : "Pick a school. Learn one card at a time."}
      </Typography>

      {schools.length === 0 ? (
        <StarterGrid />
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, 1fr)",
              lg: "repeat(3, 1fr)",
            },
          }}
        >
          {schools.map((school) => (
            <Card key={school.id} variant="outlined" sx={{ height: "100%" }}>
              <CardActionArea
                href={`/school/${school.id}`}
                sx={{ height: "100%" }}
              >
                <CardContent>
                  <Stack spacing={1.5}>
                    <Typography sx={{ fontSize: "2.25rem", lineHeight: 1 }}>
                      {school.emoji}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {school.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {school.description}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 600, pt: 1 }}
                    >
                      {school.classCount} class
                      {school.classCount !== 1 ? "es" : ""}
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
