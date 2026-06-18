import { NextResponse } from "next/server";
import { deepenClass } from "@/lib/agent";
import { auth } from "@/auth";
import { OwnershipError } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (typeof session?.userId !== "number") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server.",
      },
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
    const result = await deepenClass(body.classId, session.userId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof OwnershipError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("[/api/deepen] failed:", err);
    const message = err instanceof Error ? err.message : "Deepen request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
