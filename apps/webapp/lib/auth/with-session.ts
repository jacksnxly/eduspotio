import { headers } from "next/headers";
import { after, NextRequest } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/axiom";
import { ApiError, handleApiError } from "../errors";
import { rateLimit } from "../rate-limit";
import { auth } from "./index";
import { parseRequestBody } from "./parse-body";
import type { AuthenticatedSession } from "./types";

export type WithSessionContext<TBody = undefined> = {
  req: NextRequest;
  session: AuthenticatedSession;
  body: TBody;
  rateLimitHeaders: HeadersInit;
};

type WithSessionHandler<TBody> = (
  ctx: WithSessionContext<TBody>,
) => Promise<Response>;

type WithSessionOptions<TBody> = {
  bodySchema?: z.ZodType<TBody>;
};

export function withSession<TBody = undefined>(
  handler: WithSessionHandler<TBody>,
  opts?: WithSessionOptions<TBody>,
) {
  return async (
    req: NextRequest,
    _ctx: { params: Promise<Record<string, string>> },
  ) => {
    try {
      const startTime = Date.now();

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

      const body = (
        opts?.bodySchema
          ? await parseRequestBody(req, opts.bodySchema)
          : undefined
      ) as TBody;

      const response = await handler({ req, session, body, rateLimitHeaders });

      // Merge rate limit headers into the handler's response
      const mergedHeaders = new Headers(response.headers);
      for (const [key, value] of Object.entries(rateLimitHeaders)) {
        mergedHeaders.set(key, String(value));
      }

      const finalResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: mergedHeaders,
      });

      // Log after response is sent to avoid adding latency to the client
      after(() => {
        logger.info("request", {
          type: "request",
          method: req.method,
          path: new URL(req.url).pathname,
          userId: session.user.id,
          status: finalResponse.status,
          durationMs: Date.now() - startTime,
        });
      });

      return finalResponse;
    } catch (error) {
      return handleApiError(error, {
        method: req.method,
        path: new URL(req.url).pathname,
      });
    }
  };
}
