import { NextResponse } from "next/server";
import { markLectureComplete } from "@/lib/data";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { lectureId } = body;

    // Validate lectureId is a number
    if (typeof lectureId !== "number" || lectureId <= 0) {
      return NextResponse.json(
        { error: "Invalid lectureId" },
        { status: 400 }
      );
    }

    markLectureComplete(lectureId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error marking lecture complete:", error);
    return NextResponse.json(
      { error: "Failed to mark lecture complete" },
      { status: 500 }
    );
  }
}
