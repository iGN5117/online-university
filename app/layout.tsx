import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import ThemeRegistry from "@/components/ThemeRegistry";
import Header from "@/components/Header";
import AgentChat from "@/components/AgentChat";
import { auth } from "@/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Online University",
  description: "Learn anything in bite-size cards.",
  // Full-screen, native-feeling launch from the iOS home screen.
  appleWebApp: { capable: true, title: "University", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#2f8f86",
  // Extend behind the notch so the reel's safe-area insets do the spacing.
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <InitColorSchemeScript attribute="class" defaultMode="system" />
        <ThemeRegistry>
          <SessionProvider session={session}>
            {session ? (
              <>
                <Box
                  sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}
                >
                  <Header />
                  <Container
                    component="main"
                    maxWidth="lg"
                    sx={{ flex: 1, width: "100%", py: 4 }}
                  >
                    {children}
                  </Container>
                </Box>
                <AgentChat />
              </>
            ) : (
              // Logged-out (e.g. /login) renders without the app chrome.
              children
            )}
          </SessionProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
