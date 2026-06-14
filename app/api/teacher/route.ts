import { NextResponse } from "next/server";
import { runTeacherTurn } from "@/lib/agent";

export const dynamic = "force-dynamic";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

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

  let body: { lectureId?: number; messages?: ChatTurn[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.lectureId !== "number") {
    return NextResponse.json({ error: "lectureId is required" }, { status: 400 });
  }

  const messages: ChatTurn[] = (body.messages ?? [])
    .filter(
      (m): m is ChatTurn =>
        (m?.role === "user" || m?.role === "assistant") &&
        typeof m?.content === "string" &&
        m.content.trim().length > 0,
    )
    .map((m) => ({ role: m.role, content: m.content }));

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return NextResponse.json(
      { error: "messages must end with a user turn" },
      { status: 400 },
    );
  }

  try {
    const result = await runTeacherTurn(body.lectureId, messages);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/teacher] turn failed:", err);
    const message = err instanceof Error ? err.message : "Teacher request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
