"use client";

import { useEffect, useState } from "react";
import CardViewer from "@/components/CardViewer";
import ReelViewer from "@/components/ReelViewer";
import type { Lecture } from "@/lib/types";

interface LectureCardsProps {
  lecture: Lecture;
  classId: number;
  nextLectureId?: number;
}

// Picks the card experience by device: the full-screen swipeable reel on
// phones, the original click-to-reveal CardViewer on larger screens.
export default function LectureCards(props: LectureCardsProps) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Avoid a hydration mismatch / flash: the viewport is only known on the client.
  if (isMobile === null) return null;

  return isMobile ? <ReelViewer {...props} /> : <CardViewer {...props} />;
}
