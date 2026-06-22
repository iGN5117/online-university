"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import CircularProgress from "@mui/material/CircularProgress";

interface LegacyClass {
  id: number;
  name: string;
  emoji: string;
  schoolName: string;
  lectureCount: number;
}

export default function RoadmapBackfill({
  classes,
}: {
  classes: LegacyClass[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function generate(classId: number) {
    setBusyId(classId);
    setError(null);
    try {
      const res = await fetch("/api/admin/syllabus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Something went wrong.");
        return;
      }
      // The class now has a syllabus, so it drops off the list on refresh.
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusyId(null);
    }
  }

  if (classes.length === 0) {
    return (
      <Typography color="text.secondary">
        Every class already has a roadmap. 🎓
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}
      <Paper variant="outlined">
        <List disablePadding>
          {classes.map((c, i) => (
            <ListItem
              key={c.id}
              divider={i < classes.length - 1}
              secondaryAction={
                <Button
                  size="small"
                  variant="outlined"
                  disabled={busyId !== null}
                  onClick={() => generate(c.id)}
                  startIcon={
                    busyId === c.id ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : undefined
                  }
                >
                  {busyId === c.id ? "Generating…" : "Generate roadmap"}
                </Button>
              }
            >
              <ListItemText
                primary={`${c.emoji} ${c.name}`}
                secondary={`${c.schoolName} · ${c.lectureCount} lesson${
                  c.lectureCount === 1 ? "" : "s"
                } built`}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Stack>
  );
}
