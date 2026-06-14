import { NextResponse } from "next/server";
import { deepenClass } from "@/lib/agent";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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
    const result = await deepenClass(body.classId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/deepen] failed:", err);
    const message = err instanceof Error ? err.message : "Deepen request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
