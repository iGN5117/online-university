import NextAuth from "next-auth";
import authConfig from "./auth.config";

// Next 16 renamed the "middleware" file convention to "proxy". Edge-runtime
// auth instance (no DB callbacks) — just validates the session cookie and
// redirects anyone not signed in to /login.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (!req.auth) {
    const url = new URL("/login", req.nextUrl.origin);
    return Response.redirect(url);
  }
});

// Run on everything except the auth endpoints, the login page, Next internals,
// and the PWA icon/manifest metadata routes (which must stay public).
export const config = {
  matcher: [
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest).*)",
  ],
};
