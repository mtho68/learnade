import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://learnade.hannahandmattthorsen.chatgpt.site"),
  title: "Learnade: Learning that works for your brain",
  description: "Turn study materials into accessible reading, focus sessions, flashcards, quizzes, and more.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Learnade: Learning that works for your brain",
    description: "Turn study materials into accessible reading, focus sessions, flashcards, quizzes, and more.",
    images: [{ url: "/learnade-social-preview.png", width: 1680, height: 943, alt: "Study materials branching into flexible learning modes" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Learnade: Learning that works for your brain",
    description: "Turn study materials into accessible reading, focus sessions, flashcards, quizzes, and more.",
    images: ["/learnade-social-preview.png"],
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
