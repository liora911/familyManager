import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow cron endpoint without auth (secured by CRON_SECRET inside the route)
  if (pathname === "/api/cron") {
    return NextResponse.next();
  }

  // Allow login page, select page, and auth API
  if (pathname === "/login" || pathname === "/select" || pathname === "/api/auth") {
    return NextResponse.next();
  }

  // Check the signed session cookie
  const authCookie = request.cookies.get(SESSION_COOKIE);
  if (!(await verifySessionToken(authCookie?.value))) {
    // API callers get a JSON 401 so the UI can send the user to login
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check user selection cookie (skip for API routes — they read it themselves)
  if (!pathname.startsWith("/api/")) {
    const userCookie = request.cookies.get("home-manager-user");
    if (!userCookie?.value) {
      return NextResponse.redirect(new URL("/select", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|icon-.*\\.png|manifest\\.json).*)"],
};
