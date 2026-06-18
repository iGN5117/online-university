import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Edge-safe config shared with middleware: providers + the sign-in page, but
// NONE of the callbacks that touch better-sqlite3 (those live in auth.ts and
// only run in the Node runtime). Google credentials are auto-read from
// AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET.
export default {
  providers: [Google],
  pages: { signIn: "/login" },
  // Self-hosted behind a reverse proxy (Fly/Docker): trust the forwarded host
  // so Auth.js builds correct callback/session URLs. (On Vercel this is
  // automatic; off-Vercel it must be explicit.)
  trustHost: true,
} satisfies NextAuthConfig;
