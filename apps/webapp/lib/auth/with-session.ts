import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { ApiError, handleApiError } from "../errors";
import { rateLimit } from "../rate-limit";
import { auth } from "./index";
import type { AuthenticatedSession } from "./types";

export type WithSessionContext = {
  req: NextRequest;
  session: AuthenticatedSession;
  rateLimitHeaders: HeadersInit;
};

type WithSessionHandler = (ctx: WithSessionContext) => Promise<Response>;

export function withSession(handler: WithSessionHandler) {
  return async (
    req: NextRequest,
    _ctx: { params: Promise<Record<string, string>> },
  ) => {
    try {
      // Rate limit by IP before session check (cheaper first)
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
      const { success, headers: rateLimitHeaders } = await rateLimit(
        `ip:${ip}`,
      );

      if (!success) {
        throw new ApiError({
          code: "rate_limit_exceeded",
          message: "Too many requests. Please try again later.",
          headers: rateLimitHeaders,
        });
      }

      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session) {
        throw new ApiError({
          code: "unauthorized",
          message: "You must be logged in to perform this action.",
        });
      }

      return await handler({ req, session, rateLimitHeaders });
    } catch (error) {
      return handleApiError(error, {
        method: req.method,
        path: new URL(req.url).pathname,
      });
    }
  };
}
