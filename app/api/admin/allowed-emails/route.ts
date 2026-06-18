import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { addAllowedEmail, removeAllowedEmail, isOwnerEmail } from "@/lib/data";

// Only the owner may manage the invite allowlist.
async function requireOwner(): Promise<boolean> {
  const session = await auth();
  return isOwnerEmail(session?.user?.email);
}

export async function POST(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { email } = await req.json();
  if (typeof email !== "string" || !email.includes("@") || email.length > 320) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  addAllowedEmail(email);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { email } = await req.json();
  if (typeof email !== "string") {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  removeAllowedEmail(email);
  return NextResponse.json({ ok: true });
}
