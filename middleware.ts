import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow cron endpoint without auth (secured by CRON_SECRET inside the route)
  if (pathname === "/api/cron") {
    return NextResponse.next();
  }

  // Allow login page, select page, and auth API
  if (pathname === "/login" || pathname === "/select" || pathname === "/api/auth") {
    return NextResponse.next();
  }

  // Check auth cookie
  const authCookie = request.cookies.get("home-manager-auth");
  if (authCookie?.value !== "authenticated") {
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
