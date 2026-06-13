"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
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
      showResults();
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

  const showResults = () => {
    setTestState("results");
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
  const handleKeyDown = (e: KeyboardEvent) => {
    if (testState === "results") return;

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

  // Attach keyboard listener
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", handleKeyDown);
  }

  if (testState === "results") {
    const percentage = Math.round((score / questions.length) * 100);
    let encouragement = "Good start — review the cards and retry";
    if (percentage >= 80) {
      encouragement = "Excellent!";
    } else if (percentage >= 50) {
      encouragement = "Solid — keep going";
    }

    return (
      <div className="flex flex-col gap-8">
        {/* Results card */}
        <div className="rounded-2xl border border-black/10 dark:border-white/15 p-8 bg-black/[.03] dark:bg-white/[.06]">
          <div className="text-center">
            <div className="text-6xl font-bold mb-2">
              {score} / {questions.length}
            </div>
            <div className="text-2xl mb-4">{percentage}%</div>
            <div className="text-lg text-foreground/70">{encouragement}</div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleRetake}
            className="flex-1 rounded-2xl border border-black dark:border-white px-6 py-3 font-semibold hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            Retake
          </button>
          <a
            href={`/class/${classId}`}
            className="flex-1 rounded-2xl bg-black dark:bg-white text-white dark:text-black px-6 py-3 font-semibold text-center hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            Back to class
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Progress */}
      <div className="flex flex-col gap-2">
        <div className="text-sm font-medium text-foreground/70">
          Question {progress} of {questions.length}
        </div>
        <div className="h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-black dark:bg-white transition-all"
            style={{
              width: `${(progress / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-2xl border border-black/10 dark:border-white/15 p-8 bg-black/[.03] dark:bg-white/[.06]">
        {/* Question prompt */}
        <h2 className="text-2xl md:text-3xl font-bold mb-8">
          {currentQuestion.prompt}
        </h2>

        {/* Options */}
        <div className="flex flex-col gap-3 mb-6">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedOption === index;
            const isCorrect = index === currentQuestion.answer_index;
            const shouldShowCorrect = answered && isCorrect;
            const shouldShowWrong = answered && isSelected && !isCorrect;

            let buttonClass =
              "rounded-xl border px-6 py-4 text-left font-semibold transition-all cursor-pointer";

            if (!answered) {
              buttonClass +=
                " border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white hover:shadow-md hover:-translate-y-0.5";
            } else if (shouldShowCorrect) {
              buttonClass +=
                " border-green-600 bg-green-600/15 text-green-900 dark:text-green-100";
            } else if (shouldShowWrong) {
              buttonClass +=
                " border-red-600 bg-red-600/15 text-red-900 dark:text-red-100";
            } else {
              buttonClass += " border-black/10 dark:border-white/10";
            }

            return (
              <button
                key={index}
                onClick={() => handleSelectOption(index)}
                disabled={answered}
                className={buttonClass}
              >
                {option}
              </button>
            );
          })}
        </div>

        {/* Explanation (shown after answering) */}
        {answered && (
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/[.02] dark:bg-white/[.04] p-4 mb-6">
            <p className="text-sm text-foreground/80">
              {currentQuestion.explanation}
            </p>
          </div>
        )}

        {/* Next button (shown after answering) */}
        {answered && (
          <button
            onClick={handleNext}
            className="w-full rounded-2xl bg-black dark:bg-white text-white dark:text-black px-6 py-3 font-semibold hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            {isLastQuestion ? "See results" : "Next →"}
          </button>
        )}
      </div>
    </div>
  );
}
