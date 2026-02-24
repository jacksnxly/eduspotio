import { withCommunity } from "@/lib/auth/with-community";
import { z } from "zod";

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
            plan: community.plan,
          },
          membership: { id: membership.id, role: membership.role },
          hasRateLimitHeaders: Object.keys(rateLimitHeaders).length > 0,
        });
      },
    );

const testBodySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

export const POST = isProduction
  ? () => new Response("Not Found", { status: 404 })
  : withCommunity(
      async ({ session, community, body }) => {
        return Response.json({
          success: true,
          communityId: community.id,
          userId: session.user.id,
          receivedBody: body,
        });
      },
      {
        requiredPermissions: { community: ["delete"] },
        bodySchema: testBodySchema,
      },
    );
