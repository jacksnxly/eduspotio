import { type TenantDatabase, tenantDB } from "@eduspot/db/helpers";
import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { ApiError, handleApiError } from "../errors";
import { rateLimit } from "../rate-limit";
import { auth } from "./index";
import { hasPermission, roles, type PermissionRequest, type Role } from "./permissions";
import type { AuthenticatedSession } from "./types";

export type WithCommunityContext = {
  req: NextRequest;
  params: Record<string, string>;
  searchParams: Record<string, string>;
  session: AuthenticatedSession;
  community: {
    id: string;
    name: string;
    slug: string;
    logo: string | null | undefined;
    metadata: string | null | undefined;
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

type WithCommunityHandler = (ctx: WithCommunityContext) => Promise<Response>;

type WithCommunityOptions = {
  requiredPermissions?: PermissionRequest;
};

function isRole(value: string): value is Role {
  return value in roles;
}

export function withCommunity(
  handler: WithCommunityHandler,
  opts?: WithCommunityOptions,
) {
  return async (
    req: NextRequest,
    { params: initialParams }: { params: Promise<Record<string, string>> },
  ) => {
    try {
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

      // 2. Rate limit by userId (after session check)
      const { success: rateLimitSuccess, headers: rateLimitHeaders } =
        await rateLimit(`user:${session.user.id}`);

      if (!rateLimitSuccess) {
        throw new ApiError({
          code: "rate_limit_exceeded",
          message: "Too many requests. Please try again later.",
          headers: rateLimitHeaders,
        });
      }

      // 3. Resolve community from URL param (slug or ID)
      const communitySlug = params.communitySlug || params.slug;
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
      } catch {
        // getFullOrganization throws for non-existent slugs
        org = null;
      }

      if (!org) {
        throw new ApiError({
          code: "not_found",
          message: "Community not found.",
        });
      }

      // 4. Check membership
      const membership = org.members.find((m) => m.userId === session.user.id);

      if (!membership) {
        throw new ApiError({
          code: "forbidden",
          message: "You are not a member of this community.",
        });
      }

      // 5. Check required permissions via role.authorize()
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

      // 6. Execute within RLS tenant context
      return await tenantDB(org.id, async (tx) => {
        return handler({
          req,
          params,
          searchParams,
          session,
          community: {
            id: org.id,
            name: org.name,
            slug: org.slug,
            logo: org.logo,
            metadata: org.metadata,
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
    } catch (error) {
      return handleApiError(error, {
        method: req.method,
        path: new URL(req.url).pathname,
      });
    }
  };
}
