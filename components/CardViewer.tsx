"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckIcon from "@mui/icons-material/Check";
import DeepenButton from "@/components/DeepenButton";
import type { Lecture } from "@/lib/types";

interface CardViewerProps {
  lecture: Lecture;
  classId: number;
  nextLectureId?: number;
}

export default function CardViewer({
  lecture,
  classId,
  nextLectureId,
}: CardViewerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [completed, setCompleted] = useState(false);

  const cards = lecture.content.cards || [];

  const currentCard = cards[currentIndex];
  const isLastCard = currentIndex === cards.length - 1;

  const handleNext = () => {
    if (isLastCard) return;
    setCurrentIndex(currentIndex + 1);
    setRevealed(false);
  };

  const handlePrev = () => {
    if (currentIndex === 0) return;
    setCurrentIndex(currentIndex - 1);
    setRevealed(false);
  };

  const handleReveal = () => {
    setRevealed(!revealed);
  };

  const handleFinish = async () => {
    try {
      const res = await fetch("/api/lectures/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lectureId: lecture.id }),
      });

      if (res.ok) {
        setCompleted(true);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to mark lecture complete:", error);
    }
  };

  const handleCardClick = () => {
    if (!revealed) {
      setRevealed(true);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (completed) return;

      // Don't hijack keys while the user is typing in a field (e.g. the
      // companion chat box), otherwise Space/Enter/arrows get stolen.
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleReveal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, revealed, completed, isLastCard]);

  if (cards.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 6 }}>
        <Typography color="text.secondary" sx={{ fontSize: "1.125rem" }}>
          No cards in this lecture.
        </Typography>
      </Box>
    );
  }

  if (completed) {
    return (
      <Stack spacing={3} sx={{ alignItems: "center", justifyContent: "center", py: 8, textAlign: "center" }}>
        <Typography sx={{ fontSize: "3.75rem" }}>🎉</Typography>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Lecture complete!
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2 }}>
          <Button component={Link} href={`/class/${classId}`} variant="contained" size="large">
            Back to class
          </Button>
          {nextLectureId ? (
            <Button
              component={Link}
              href={`/lecture/${nextLectureId}`}
              variant="outlined"
              size="large"
            >
              Next lecture →
            </Button>
          ) : (
            <DeepenButton classId={classId} mode="open" label="Go deeper →" variant="outlined" />
          )}
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <LinearProgress
        variant="determinate"
        value={((currentIndex + 1) / cards.length) * 100}
        sx={{ height: 6, borderRadius: 999 }}
      />

      <Paper
        variant="outlined"
        onClick={handleCardClick}
        sx={{
          minHeight: 384,
          p: { xs: 4, md: 6 },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "box-shadow 0.2s",
          "&:hover": { boxShadow: 3 },
        }}
      >
        <Box sx={{ textAlign: "center", width: "100%" }}>
          {!revealed ? (
            <Stack spacing={2} sx={{ alignItems: "center" }}>
              <Typography
                sx={{
                  fontSize: { xs: "1.5rem", md: "2.25rem" },
                  fontWeight: 700,
                  lineHeight: 1.2,
                }}
              >
                {currentCard.front}
              </Typography>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReveal();
                }}
                size="small"
                sx={{ mt: 2 }}
              >
                Reveal
              </Button>
            </Stack>
          ) : (
            <Stack spacing={3}>
              <Typography
                sx={{ fontSize: { xs: "1.125rem", md: "1.5rem" }, lineHeight: 1.6 }}
              >
                {currentCard.back}
              </Typography>
              {currentCard.diagram && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    color: "text.primary",
                    // iOS Safari collapses viewBox-only inline SVGs to zero
                    // width in flexbox; an explicit width makes it size from
                    // the viewBox aspect ratio.
                    "& svg": { display: "block", width: "100%", maxWidth: 420, height: "auto" },
                  }}
                  // SVG is generated by our own Haiku agent (not user input);
                  // single-user app, so injection risk is low.
                  dangerouslySetInnerHTML={{ __html: currentCard.diagram }}
                />
              )}
              {currentCard.example && (
                <Box
                  sx={{
                    borderLeft: 4,
                    borderColor: "secondary.main",
                    bgcolor: "action.hover",
                    py: 1.5,
                    px: 2,
                    borderRadius: 1,
                    textAlign: "left",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 700, display: "block", mb: 1 }}
                  >
                    💡 Real-world example
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {currentCard.example}
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </Box>
      </Paper>

      <Stack spacing={2}>
        <Stack direction="row" spacing={1.5} sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <Button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            variant="outlined"
            startIcon={<ArrowBackIcon />}
          >
            Back
          </Button>

          <Typography variant="body2" color="text.secondary">
            {currentIndex + 1} / {cards.length}
          </Typography>

          {isLastCard ? (
            <Button onClick={handleFinish} variant="contained" endIcon={<CheckIcon />}>
              Finish
            </Button>
          ) : (
            <Button onClick={handleNext} variant="contained" endIcon={<ArrowForwardIcon />}>
              Next
            </Button>
          )}
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
          Space to reveal • Arrow keys to navigate
        </Typography>
      </Stack>
    </Stack>
  );
}
