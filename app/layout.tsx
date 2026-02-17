import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "מנהל הבית",
  description: "ניהול בית חכם",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
