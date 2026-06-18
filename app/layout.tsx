import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import ThemeRegistry from "@/components/ThemeRegistry";
import Header from "@/components/Header";
import AgentChat from "@/components/AgentChat";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <InitColorSchemeScript attribute="class" defaultMode="system" />
        <ThemeRegistry>
          <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
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
        </ThemeRegistry>
      </body>
    </html>
  );
}
