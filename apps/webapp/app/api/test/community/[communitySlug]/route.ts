import { withCommunity } from "@/lib/auth/with-community";

const isProduction = process.env.NODE_ENV === "production";

export const GET = isProduction
  ? () => new Response("Not Found", { status: 404 })
  : withCommunity(
      async ({ session, community, membership, rateLimitHeaders }) => {
        return Response.json({
          user: { id: session.user.id, email: session.user.email },
          community: {
            id: community.id,
            slug: community.slug,
            name: community.name,
          },
          membership: { id: membership.id, role: membership.role },
          hasRateLimitHeaders: Object.keys(rateLimitHeaders).length > 0,
        });
      },
    );

export const POST = isProduction
  ? () => new Response("Not Found", { status: 404 })
  : withCommunity(
      async ({ session, community }) => {
        return Response.json({
          success: true,
          communityId: community.id,
          userId: session.user.id,
        });
      },
      { requiredPermissions: { community: ["delete"] } },
    );
