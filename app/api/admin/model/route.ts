import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { setAgentModel, isOwnerEmail } from "@/lib/data";

// Only the owner may change the agent model.
async function requireOwner(): Promise<boolean> {
  const session = await auth();
  return isOwnerEmail(session?.user?.email);
}

export async function POST(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { model } = await req.json();
  if (typeof model !== "string") {
    return NextResponse.json({ error: "Invalid model" }, { status: 400 });
  }
  try {
    setAgentModel(model);
  } catch {
    return NextResponse.json({ error: "Unknown model" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
