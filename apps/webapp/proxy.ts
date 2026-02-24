import { NextRequest, NextResponse, NextFetchEvent } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { transformMiddlewareRequest } from "@axiomhq/nextjs";
import { logger } from "@/lib/axiom";

const PUBLIC_PATHS = ["/api/auth", "/api/test", "/login", "/signup", "/verify-email", "/reset-password", "/forgot-password"];

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  let response: NextResponse;

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    response = NextResponse.next();
  } else {
    // IMPORTANT: This is an OPTIMISTIC check only. It verifies cookie existence,
    // NOT session validity. Expired, revoked, or tampered cookies pass this check.
    // All protected API routes and pages MUST independently validate sessions via
    // auth.api.getSession(). See: https://nextjs.org/docs/app/guides/authentication
    const sessionCookie = getSessionCookie(request);

    if (!sessionCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      response = NextResponse.redirect(loginUrl);
    } else {
      response = NextResponse.next();
    }
  }

  logger.info(...transformMiddlewareRequest(request));
  event.waitUntil(logger.flush());

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
