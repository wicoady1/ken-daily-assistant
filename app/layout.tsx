import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Reminder",
  description: "Capture notes and get daily AI-powered reminders",
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
