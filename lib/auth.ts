import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Server-component helper: return the signed-in user's internal id, or redirect
 * to /login if there's no session. Middleware already gates pages, so this also
 * gives every page a typed userId to scope its data calls.
 */
export async function requireUser(): Promise<number> {
  const session = await auth();
  if (typeof session?.userId !== "number") redirect("/login");
  return session.userId;
}
