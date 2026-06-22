import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isOwnerEmail, OwnershipError } from "@/lib/data";
import { generateClassSyllabus } from "@/lib/agent";

export const dynamic = "force-dynamic";

// Owner-only roadmap backfill: generate and persist a finite syllabus for a
// legacy class that has none. Scoped to the owner's own content via userId.
export async function POST(req: Request) {
  const session = await auth();
  if (!isOwnerEmail(session?.user?.email) || typeof session?.userId !== "number") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart." },
      { status: 500 },
    );
  }

  let body: { classId?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.classId !== "number") {
    return NextResponse.json({ error: "classId is required" }, { status: 400 });
  }

  try {
    const syllabus = await generateClassSyllabus(body.classId, session.userId);
    return NextResponse.json({ ok: true, count: syllabus.length });
  } catch (err) {
    if (err instanceof OwnershipError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("[/api/admin/syllabus] failed:", err);
    const message = err instanceof Error ? err.message : "Roadmap generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
