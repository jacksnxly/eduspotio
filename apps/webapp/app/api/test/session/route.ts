import { withSession } from "@/lib/auth/with-session";

export const GET = withSession(async ({ req, session, rateLimitHeaders }) => {
  return Response.json({
    user: { id: session.user.id, email: session.user.email },
    method: req.method,
    hasRateLimitHeaders: Object.keys(rateLimitHeaders).length > 0,
  });
});
