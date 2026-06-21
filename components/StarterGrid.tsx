"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Button from "@mui/material/Button";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { STARTER_TEMPLATES, openBuilder } from "@/lib/templates";

// Home empty state for a brand-new user (no schools yet). Replaces the bare
// "use the chat button" text with one-tap starting points and a direct CTA, so
// the first move is obvious. Each opens the Course Builder with the goal filled
// in (the chat then asks level + depth before building).
export default function StarterGrid() {
  return (
    <Stack spacing={3}>
      <Typography color="text.secondary" sx={{ fontSize: "1.125rem" }}>
        Pick something to start — or tell me your own goal.
      </Typography>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          },
        }}
      >
        {STARTER_TEMPLATES.map((t) => (
          <Card key={t.title} variant="outlined" sx={{ height: "100%" }}>
            <CardActionArea
              onClick={() => openBuilder(t.goal)}
              sx={{ height: "100%" }}
            >
              <CardContent>
                <Stack spacing={1}>
                  <Typography sx={{ fontSize: "1.75rem", lineHeight: 1 }}>
                    {t.emoji}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {t.title}
                  </Typography>
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>

      <Box>
        <Button
          variant="contained"
          size="large"
          startIcon={<AutoAwesomeIcon />}
          onClick={() => openBuilder()}
        >
          Tell me what you want to learn
        </Button>
      </Box>
    </Stack>
  );
}
