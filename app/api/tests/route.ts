import { NextRequest, NextResponse } from "next/server";
import { recordTestAttempt } from "@/lib/data";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { classId, score, total, detail } = body;

    // Validate input
    if (
      typeof classId !== "number" ||
      typeof score !== "number" ||
      typeof total !== "number"
    ) {
      return NextResponse.json(
        { error: "Invalid input: classId, score, and total must be numbers" },
        { status: 400 }
      );
    }

    if (score < 0 || score > total || total <= 0) {
      return NextResponse.json(
        { error: "Invalid input: score must be between 0 and total" },
        { status: 400 }
      );
    }

    // Record the attempt
    recordTestAttempt(classId, score, total, detail);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error recording test attempt:", error);
    return NextResponse.json(
      { error: "Failed to record test attempt" },
      { status: 500 }
    );
  }
}
