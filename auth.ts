import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { getOrCreateUser, isEmailAllowed, isOwnerEmail } from "@/lib/data";

// Our internal numeric user id is exposed as a dedicated session field (the
// base user.id is a string, so we don't overload it). isOwner gates /admin.
declare module "next-auth" {
  interface Session {
    userId?: number;
    isOwner?: boolean;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  callbacks: {
    // Invite-only: owner, env ALLOWED_EMAILS, or the runtime allowlist (/admin).
    signIn({ user }) {
      return isEmailAllowed(user.email);
    },
    // Runs in the Node runtime only (sign-in + auth() in server code), so it's
    // safe to hit SQLite. Upsert the user once at sign-in and cache the id on
    // the token (uid isn't in the base JWT type, hence the cast).
    jwt({ token, user }) {
      if (user?.email) {
        (token as { uid?: number }).uid = getOrCreateUser(
          user.email,
          user.name ?? "",
          user.image ?? "",
        );
      }
      return token;
    },
    session({ session, token }) {
      const uid = (token as { uid?: number }).uid;
      if (typeof uid === "number") {
        (session as { userId?: number }).userId = uid;
      }
      session.isOwner = isOwnerEmail(session.user?.email);
      return session;
    },
  },
});
