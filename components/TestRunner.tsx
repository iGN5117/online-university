"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Alert from "@mui/material/Alert";
import type { Question } from "@/lib/types";

interface TestRunnerProps {
  classId: number;
  questions: Question[];
}

interface TestDetail {
  questionId: number;
  picked: number;
  correct: boolean;
}

type TestState = "running" | "results";

export default function TestRunner({ classId, questions }: TestRunnerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [testState, setTestState] = useState<TestState>("running");
  const [score, setScore] = useState(0);
  const [detail, setDetail] = useState<TestDetail[]>([]);
  const postedRef = useRef(false);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const progress = currentIndex + 1;

  const handleSelectOption = (index: number) => {
    if (answered) return;

    setSelectedOption(index);
    setAnswered(true);

    const isCorrect = index === currentQuestion.answer_index;
    if (isCorrect) {
      setScore((s) => s + 1);
    }

    setDetail((d) => [
      ...d,
      {
        questionId: currentQuestion.id,
        picked: index,
        correct: isCorrect,
      },
    ]);
  };

  const handleNext = () => {
    if (isLastQuestion) {
      setTestState("results");
    } else {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setAnswered(false);
    }
  };

  const handleRetake = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setAnswered(false);
    setTestState("running");
    setScore(0);
    setDetail([]);
    postedRef.current = false;
  };

  // Post to API when results first show
  if (testState === "results" && !postedRef.current) {
    postedRef.current = true;
    fetch("/api/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId,
        score,
        total: questions.length,
        detail,
      }),
    })
      .then(() => {
        router.refresh();
      })
      .catch((error) => {
        console.error("Failed to record test attempt:", error);
      });
  }

  // Keyboard support: 1-4 select options, Enter advances
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (testState === "results") return;

      // Don't hijack keys while the user is typing in a field (e.g. the
      // companion chat box), otherwise digit/Enter keys get stolen.
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "enter") {
        e.preventDefault();
        handleNext();
      } else if (["1", "2", "3", "4"].includes(key)) {
        e.preventDefault();
        const optionIndex = parseInt(key) - 1;
        if (optionIndex < currentQuestion.options.length) {
          handleSelectOption(optionIndex);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testState, currentIndex, answered, currentQuestion]);

  if (testState === "results") {
    const percentage = Math.round((score / questions.length) * 100);
    let encouragement = "Good start — review the cards and retry";
    if (percentage >= 80) {
      encouragement = "Excellent!";
    } else if (percentage >= 50) {
      encouragement = "Solid — keep going";
    }

    return (
      <Stack spacing={4}>
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h2" sx={{ fontWeight: 700, mb: 1 }}>
            {score} / {questions.length}
          </Typography>
          <Typography variant="h5" sx={{ mb: 2 }}>
            {percentage}%
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: "1.125rem" }}>
            {encouragement}
          </Typography>
        </Paper>

        <Stack direction="row" spacing={2}>
          <Button onClick={handleRetake} variant="outlined" fullWidth size="large">
            Retake
          </Button>
          <Button
            component="a"
            href={`/class/${classId}`}
            variant="contained"
            fullWidth
            size="large"
          >
            Back to class
          </Button>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
          Question {progress} of {questions.length}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={(progress / questions.length) * 100}
          sx={{ height: 8, borderRadius: 999 }}
        />
      </Stack>

      <Paper variant="outlined" sx={{ p: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
          {currentQuestion.prompt}
        </Typography>

        <Stack spacing={1.5} sx={{ mb: 3 }}>
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedOption === index;
            const isCorrect = index === currentQuestion.answer_index;
            const shouldShowCorrect = answered && isCorrect;
            const shouldShowWrong = answered && isSelected && !isCorrect;

            const color = shouldShowCorrect
              ? "success"
              : shouldShowWrong
                ? "error"
                : "primary";

            return (
              <Button
                key={index}
                onClick={() => handleSelectOption(index)}
                disabled={answered}
                variant={shouldShowCorrect || shouldShowWrong ? "contained" : "outlined"}
                color={color}
                disableElevation
                sx={{
                  justifyContent: "flex-start",
                  textAlign: "left",
                  px: 3,
                  py: 2,
                  fontSize: "1rem",
                  // Keep correct/wrong answers visually distinct even when disabled
                  "&.Mui-disabled": {
                    color:
                      shouldShowCorrect || shouldShowWrong
                        ? "common.white"
                        : undefined,
                    borderColor:
                      shouldShowCorrect || shouldShowWrong ? "transparent" : undefined,
                    backgroundColor: shouldShowCorrect
                      ? "success.main"
                      : shouldShowWrong
                        ? "error.main"
                        : undefined,
                    opacity: 1,
                  },
                }}
              >
                {option}
              </Button>
            );
          })}
        </Stack>

        {answered && (
          <Alert severity="info" sx={{ mb: 3 }}>
            {currentQuestion.explanation}
          </Alert>
        )}

        {answered && (
          <Button onClick={handleNext} variant="contained" fullWidth size="large">
            {isLastQuestion ? "See results" : "Next →"}
          </Button>
        )}
      </Paper>
    </Stack>
  );
}
