import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_PATHS = ["/api/auth", "/login", "/signup", "/verify-email", "/test"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // IMPORTANT: This is an OPTIMISTIC check only. It verifies cookie existence,
  // NOT session validity. Expired, revoked, or tampered cookies pass this check.
  // All protected API routes and pages MUST independently validate sessions via
  // auth.api.getSession(). See: https://nextjs.org/docs/app/guides/authentication
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
