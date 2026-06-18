import { NextResponse } from "next/server";
import { markLectureComplete, OwnershipError } from "@/lib/data";
import { auth } from "@/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (typeof session?.userId !== "number") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    markLectureComplete(session.userId, lectureId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof OwnershipError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Error marking lecture complete:", error);
    return NextResponse.json(
      { error: "Failed to mark lecture complete" },
      { status: 500 }
    );
  }
}
