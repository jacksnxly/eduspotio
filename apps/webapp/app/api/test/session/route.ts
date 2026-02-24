import { withSession } from "@/lib/auth/with-session";

const isProduction = process.env.NODE_ENV === "production";

export const GET = isProduction
  ? () => new Response("Not Found", { status: 404 })
  : withSession(async ({ req, session, rateLimitHeaders }) => {
      return Response.json({
        user: { id: session.user.id, email: session.user.email },
        method: req.method,
        hasRateLimitHeaders: Object.keys(rateLimitHeaders).length > 0,
      });
    });
