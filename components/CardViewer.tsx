"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

  if (cards.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-foreground/70">
          No cards in this lecture.
        </p>
      </div>
    );
  }

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
  }, [currentIndex, revealed, completed, isLastCard]);

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
        <div className="text-6xl">🎉</div>
        <h2 className="text-2xl font-bold">Lecture complete!</h2>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Link
            href={`/class/${classId}`}
            className="rounded-2xl px-6 py-3 font-semibold bg-black dark:bg-white text-white dark:text-black hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            Back to class
          </Link>
          {nextLectureId && (
            <Link
              href={`/lecture/${nextLectureId}`}
              className="rounded-2xl px-6 py-3 font-semibold bg-black/10 dark:bg-white/10 text-foreground hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              Next lecture →
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Progress bar */}
      <div className="h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-black dark:bg-white transition-all"
          style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
        />
      </div>

      {/* Main card */}
      <div
        className="min-h-96 rounded-2xl border border-black/10 dark:border-white/15 p-8 md:p-12 flex items-center justify-center cursor-pointer hover:shadow-md transition-shadow bg-white dark:bg-black/30 card-container"
        onClick={handleCardClick}
      >
        <div className="text-center">
          {!revealed ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-2xl md:text-4xl font-bold leading-tight">
                {currentCard.front}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReveal();
                }}
                className="text-sm text-foreground/60 hover:text-foreground transition-colors mt-4 underline"
              >
                Reveal
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-lg md:text-2xl leading-relaxed">
                  {currentCard.back}
                </p>
              </div>
              {currentCard.example && (
                <div className="border-l-4 border-black/20 dark:border-white/20 pl-4 bg-black/5 dark:bg-white/5 py-3 px-4 rounded-lg text-left">
                  <p className="text-xs font-semibold text-foreground/60 mb-2">
                    💡 Real-world example
                  </p>
                  <p className="text-sm text-foreground/80">
                    {currentCard.example}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4">
        {/* Navigation buttons */}
        <div className="flex justify-between gap-3">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex-1 sm:flex-none px-6 py-2 rounded-2xl border border-black/10 dark:border-white/15 font-medium transition-all disabled:opacity-40 hover:shadow-md hover:-translate-y-0.5"
          >
            ← Back
          </button>

          <div className="flex-1 text-center text-sm text-foreground/70 flex items-center justify-center">
            {currentIndex + 1} / {cards.length}
          </div>

          {isLastCard ? (
            <button
              onClick={handleFinish}
              className="flex-1 sm:flex-none px-6 py-2 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-medium hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              Finish ✓
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={currentIndex === cards.length - 1}
              className="flex-1 sm:flex-none px-6 py-2 rounded-2xl border border-black/10 dark:border-white/15 font-medium transition-all disabled:opacity-40 hover:shadow-md hover:-translate-y-0.5"
            >
              Next →
            </button>
          )}
        </div>

        {/* Keyboard hints */}
        <div className="text-xs text-foreground/50 text-center">
          Space to reveal • Arrow keys to navigate
        </div>
      </div>
    </div>
  );
}
