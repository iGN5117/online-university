"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

type DeepenResult =
  | { status: "added"; lectureId: number; title: string; difficulty: string }
  | { status: "complete"; reason: string };

interface ErrorResponse {
  error: string;
}

export default function DeepenButton({
  classId,
  mode,
  label = "✨ Go deeper",
  variant = "contained",
}: {
  classId: number;
  // "refresh" stays on the page and re-renders; "open" jumps into the new lesson.
  mode: "refresh" | "open";
  label?: string;
  variant?: "contained" | "outlined";
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const handleClick = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/deepen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId }),
      });
      const data = (await res.json()) as DeepenResult | ErrorResponse;
      if (!res.ok) {
        setError((data as ErrorResponse).error || "Couldn't add a lesson — try again.");
        return;
      }
      const result = data as DeepenResult;
      if (result.status === "complete") {
        setDone(result.reason);
        return;
      }
      if (mode === "open") {
        router.push(`/lecture/${result.lectureId}`);
      } else {
        router.refresh();
      }
    } catch {
      setError("Couldn't add a lesson — try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      <Button
        onClick={handleClick}
        disabled={isLoading}
        variant={variant}
        size="large"
        startIcon={
          isLoading ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            <AutoAwesomeIcon />
          )
        }
      >
        {isLoading ? "Adding a deeper lesson…" : label}
      </Button>
      {error && (
        <Typography variant="caption" color="error" sx={{ display: "block", mt: 1 }}>
          {error}
        </Typography>
      )}
      {done && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 1 }}
        >
          🎉 {done}
        </Typography>
      )}
    </Box>
  );
}
