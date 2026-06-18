"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckIcon from "@mui/icons-material/Check";
import DeepenButton from "@/components/DeepenButton";
import type { Lecture } from "@/lib/types";

interface ReelViewerProps {
  lecture: Lecture;
  classId: number;
  nextLectureId?: number;
}

// Full-screen, vertically-swipeable reel of a lecture's cards (mobile).
// Rendered as a fixed overlay so it escapes the app's AppBar + padded
// Container. Swiping is native CSS scroll-snap — no gesture library.
export default function ReelViewer({
  lecture,
  classId,
  nextLectureId,
}: ReelViewerProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [completed, setCompleted] = useState(false);

  const cards = lecture.content.cards || [];

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    if (idx !== activeIndex) setActiveIndex(idx);
  };

  const toggleReveal = (i: number) =>
    setRevealed((prev) => ({ ...prev, [i]: !prev[i] }));

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

  const overlaySx = {
    position: "fixed" as const,
    inset: 0,
    height: "100dvh",
    width: "100vw",
    bgcolor: "background.default",
    zIndex: 1300,
  };

  if (cards.length === 0) {
    return (
      <Box sx={{ ...overlaySx, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Typography color="text.secondary">No cards in this lecture.</Typography>
      </Box>
    );
  }

  if (completed) {
    return (
      <Box sx={{ ...overlaySx, display: "flex", alignItems: "center", justifyContent: "center", p: 4 }}>
        <Stack spacing={3} sx={{ alignItems: "center", textAlign: "center" }}>
          <Typography sx={{ fontSize: "3.75rem" }}>🎉</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Lecture complete!
          </Typography>
          <Stack spacing={2} sx={{ width: "100%", maxWidth: 280 }}>
            <Button component={Link} href={`/class/${classId}`} variant="contained" size="large">
              Back to class
            </Button>
            {nextLectureId ? (
              <Button component={Link} href={`/lecture/${nextLectureId}`} variant="outlined" size="large">
                Next lecture →
              </Button>
            ) : (
              <DeepenButton classId={classId} mode="open" label="Go deeper →" variant="outlined" />
            )}
          </Stack>
        </Stack>
      </Box>
    );
  }

  const isLast = activeIndex === cards.length - 1;

  return (
    <Box sx={overlaySx}>
      {/* Top: back button + progress, inside the notch safe area */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 2,
          pt: "max(env(safe-area-inset-top), 12px)",
          px: 2,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <IconButton
          component={Link}
          href={`/class/${classId}`}
          aria-label="Back to class"
          sx={{ bgcolor: "action.hover", backdropFilter: "blur(8px)" }}
        >
          <ArrowBackIcon />
        </IconButton>
        <LinearProgress
          variant="determinate"
          value={((activeIndex + 1) / cards.length) * 100}
          sx={{ flex: 1, height: 6, borderRadius: 999 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 36, textAlign: "right" }}>
          {activeIndex + 1}/{cards.length}
        </Typography>
      </Box>

      {/* Swipeable panels */}
      <Box
        ref={scrollRef}
        onScroll={handleScroll}
        sx={{
          height: "100%",
          overflowY: "scroll",
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
          // hide scrollbar for a clean reel
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {cards.map((card, i) => {
          const isRevealed = !!revealed[i];
          return (
            <Box
              key={i}
              onClick={() => toggleReveal(i)}
              sx={{
                height: "100%",
                scrollSnapAlign: "start",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                px: 3,
                pt: "max(env(safe-area-inset-top), 64px)",
                pb: "max(env(safe-area-inset-bottom), 32px)",
                cursor: "pointer",
              }}
            >
              {!isRevealed ? (
                <Stack spacing={3} sx={{ alignItems: "center" }}>
                  <Typography sx={{ fontSize: "1.875rem", fontWeight: 700, lineHeight: 1.25 }}>
                    {card.front}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tap to reveal
                  </Typography>
                </Stack>
              ) : (
                <Stack spacing={3} sx={{ alignItems: "center", maxWidth: 520, width: "100%" }}>
                  <Typography sx={{ fontSize: "1.25rem", lineHeight: 1.6 }}>{card.back}</Typography>
                  {card.diagram && (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        color: "text.primary",
                        "& svg": { maxWidth: "100%", height: "auto" },
                      }}
                      // SVG is generated by our own Haiku agent (not user input);
                      // single-user app, so injection risk is low.
                      dangerouslySetInnerHTML={{ __html: card.diagram }}
                    />
                  )}
                  {card.example && (
                    <Box
                      sx={{
                        borderLeft: 4,
                        borderColor: "secondary.main",
                        bgcolor: "action.hover",
                        py: 1.5,
                        px: 2,
                        borderRadius: 1,
                        textAlign: "left",
                        width: "100%",
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
                        {card.example}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              )}

              {isLast && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFinish();
                  }}
                  variant="contained"
                  endIcon={<CheckIcon />}
                  sx={{ mt: 5 }}
                >
                  Finish
                </Button>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Swipe hint on the first card */}
      {activeIndex === 0 && cards.length > 1 && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            position: "absolute",
            bottom: "max(env(safe-area-inset-bottom), 16px)",
            left: 0,
            right: 0,
            textAlign: "center",
          }}
        >
          Swipe up for the next card ↑
        </Typography>
      )}
    </Box>
  );
}
