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
            __html: `
(function(){
  var t=localStorage.getItem("theme")||"dark";
  if(t==="dark") document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
})();
if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
if(window.matchMedia("(display-mode: standalone)").matches){
  document.body.classList.add("pwa");
  document.addEventListener("contextmenu",function(e){
    if(e.shiftKey) return;
    if(e.target.matches("a,img,textarea:not([disabled]),input[type=text]:not([disabled])")) return;
    var s=window.getSelection();
    if(s&&s.toString().length>0) return;
    e.preventDefault();
  });
}`,
          }}
        />
      </head>
      <body className="antialiased bg-surface text-primary">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
