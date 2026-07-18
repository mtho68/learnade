import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Learnade — Learning that works for your brain",
  description: "Turn study materials into accessible reading, focus sessions, flashcards, quizzes, and more.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
