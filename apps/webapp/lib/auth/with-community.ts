import { type TenantDatabase, tenantDB } from "@eduspot/db/helpers";
import { headers } from "next/headers";
import { after, NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError } from "../errors";
import { rateLimit } from "../rate-limit";
import { auth } from "./index";
import { parseRequestBody } from "./parse-body";
import { hasPermission, roles, type PermissionRequest, type Role } from "./permissions";
import { COMMUNITY_PLANS, type CommunityPlan } from "./plans";
import type { AuthenticatedSession } from "./types";

export type WithCommunityContext<TBody = undefined> = {
  req: NextRequest;
  params: Record<string, string>;
  searchParams: Record<string, string>;
  session: AuthenticatedSession;
  body: TBody;
  community: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    metadata: string | null;
    plan: CommunityPlan;
    createdAt: Date;
  };
  membership: {
    id: string;
    role: Role;
    userId: string;
    organizationId: string;
    createdAt: Date;
  };
  db: TenantDatabase;
  rateLimitHeaders: HeadersInit;
};

type WithCommunityHandler<TBody> = (
  ctx: WithCommunityContext<TBody>,
) => Promise<Response>;

type WithCommunityOptions<TBody> = {
  requiredPermissions?: PermissionRequest;
  requiredPlan?: CommunityPlan[];
  bodySchema?: z.ZodType<TBody>;
};

function isRole(value: string): value is Role {
  return value in roles;
}

function isCommunityPlan(value: unknown): value is CommunityPlan {
  return typeof value === "string" && value in COMMUNITY_PLANS;
}

export function withCommunity<TBody = undefined>(
  handler: WithCommunityHandler<TBody>,
  opts?: WithCommunityOptions<TBody>,
) {
  return async (
    req: NextRequest,
    { params: initialParams }: { params: Promise<Record<string, string>> },
  ) => {
    const errorContext: { method: string; path: string; userId?: string; communitySlug?: string } = {
      method: req.method,
      path: new URL(req.url).pathname,
    };

    try {
      const startTime = Date.now();
      const params = (await initialParams) || {};
      const searchParams = Object.fromEntries(
        new URL(req.url).searchParams.entries(),
      );
      const reqHeaders = await headers();

      // 1. Validate session
      const session = await auth.api.getSession({
        headers: reqHeaders,
      });

      if (!session) {
        throw new ApiError({
          code: "unauthorized",
          message: "You must be logged in to perform this action.",
        });
      }

      errorContext.userId = session.user.id;

      // 2. Parse request body if schema provided
      const body = (
        opts?.bodySchema
          ? await parseRequestBody(req, opts.bodySchema)
          : undefined
      ) as TBody;

      // 3. Resolve community from URL param (slug or ID)
      const communitySlug = params.communitySlug || params.slug;
      errorContext.communitySlug = communitySlug;

      if (!communitySlug) {
        throw new ApiError({
          code: "bad_request",
          message: "Community slug is required.",
        });
      }

      // TODO: getFullOrganization loads all members — optimize with a targeted membership query for large communities
      // BetterAuth throws (instead of returning null) when the org doesn't exist,
      // so we catch and convert to our ApiError.
      let org: Awaited<ReturnType<typeof auth.api.getFullOrganization>>;
      try {
        org = await auth.api.getFullOrganization({
          headers: reqHeaders,
          query: { organizationSlug: communitySlug },
        });
      } catch (error) {
        // BetterAuth throws (not returns null) for non-existent or non-member slugs.
        // Only treat known "not found" errors as 404; propagate everything else.
        if (
          error instanceof Error &&
          (error.message.includes("not found") ||
           error.message.includes("Organization not found"))
        ) {
          org = null;
        } else {
          console.error("[with-community] Unexpected error from getFullOrganization:", {
            communitySlug,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      }

      if (!org) {
        throw new ApiError({
          code: "not_found",
          message: "Community not found.",
        });
      }

      // 4. Resolve community plan and enforce plan gate
      const rawPlan = (org as Record<string, unknown>).plan;
      let plan: CommunityPlan;
      if (isCommunityPlan(rawPlan)) {
        plan = rawPlan;
      } else {
        if (rawPlan !== undefined) {
          console.warn(
            JSON.stringify({
              level: "warn",
              type: "invalid_community_plan",
              communityId: org.id,
              communitySlug: org.slug,
              rawPlan: String(rawPlan),
              fallback: "free",
            }),
          );
        }
        plan = "free";
      }

      if (opts?.requiredPlan && !opts.requiredPlan.includes(plan)) {
        throw new ApiError({
          code: "forbidden",
          message: "Your community plan does not support this feature.",
        });
      }

      // 5. Rate limit by userId (global across all communities) using plan-based limits
      const planConfig = COMMUNITY_PLANS[plan];
      const { success: rateLimitSuccess, headers: rateLimitHeaders } =
        await rateLimit(`user:${session.user.id}`, {
          limit: planConfig.rateLimit,
          window: planConfig.rateLimitWindow,
        });

      if (!rateLimitSuccess) {
        throw new ApiError({
          code: "rate_limit_exceeded",
          message: "Too many requests. Please try again later.",
          headers: rateLimitHeaders,
        });
      }

      // 6. Check membership
      const membership = org.members.find((m) => m.userId === session.user.id);

      if (!membership) {
        throw new ApiError({
          code: "forbidden",
          message: "You are not a member of this community.",
        });
      }

      // 7. Check required permissions via role.authorize()
      if (!isRole(membership.role)) {
        console.error(
          `Invalid role "${membership.role}" for userId=${session.user.id} orgId=${org.id}`,
        );
        throw new ApiError({
          code: "forbidden",
          message: "Invalid role.",
        });
      }

      const userRole = membership.role;

      if (opts?.requiredPermissions && !hasPermission(userRole, opts.requiredPermissions)) {
        throw new ApiError({
          code: "forbidden",
          message: "You don't have permission to perform this action.",
        });
      }

      // 8. Execute within RLS tenant context
      const response = await tenantDB(org.id, async (tx) => {
        return handler({
          req,
          params,
          searchParams,
          session,
          body,
          community: {
            id: org.id,
            name: org.name,
            slug: org.slug,
            logo: org.logo ?? null,
            metadata: org.metadata ?? null,
            plan,
            createdAt: org.createdAt,
          },
          membership: {
            id: membership.id,
            role: userRole,
            userId: membership.userId,
            organizationId: membership.organizationId,
            createdAt: membership.createdAt,
          },
          db: tx,
          rateLimitHeaders,
        });
      });

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
        try {
          console.info(
            JSON.stringify({
              level: "info",
              type: "request",
              method: req.method,
              path: new URL(req.url).pathname,
              userId: session.user.id,
              communitySlug,
              status: finalResponse.status,
              durationMs: Date.now() - startTime,
            }),
          );
        } catch (err) {
          console.error("[after] Request logging failed:", err);
        }
      });

      return finalResponse;
    } catch (error) {
      return handleApiError(error, errorContext);
    }
  };
}
