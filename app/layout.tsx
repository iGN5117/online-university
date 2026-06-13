import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-black/10 dark:border-white/15">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
            <Link href="/" className="font-semibold text-lg tracking-tight">
              🎓 Online University
            </Link>
            <span className="text-sm opacity-60 hidden sm:inline">
              learn anything, one card at a time
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 py-6 flex-1">
          {children}
        </main>
        <AgentChat />
      </body>
    </html>
  );
}
