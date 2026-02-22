import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/app/components/ThemeProvider";

export const metadata: Metadata = {
  title: "מנהל הבית",
  description: "ניהול בית חכם",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "מנהל הבית",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem("theme")||"dark";if(t==="dark")document.documentElement.classList.add("dark");else document.documentElement.classList.remove("dark");})();`,
          }}
        />
      </head>
      <body className="antialiased bg-surface text-primary">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
