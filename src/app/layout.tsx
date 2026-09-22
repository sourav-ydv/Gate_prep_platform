import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GATE Prep Hub",
  description:
    "One place for lectures, PYQs, mock tests, and doubt-clearing — built for GATE 2027 prep.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
