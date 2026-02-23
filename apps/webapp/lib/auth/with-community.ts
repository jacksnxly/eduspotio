import { type Database } from "@eduspot/db";
import { tenantDB } from "@eduspot/db/helpers";
import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { ApiError, handleApiError } from "../errors";
import { auth } from "./index";
import { roles, type PermissionRequest, type Role } from "./permissions";

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export type WithCommunityContext = {
  req: NextRequest;
  params: Record<string, string>;
  searchParams: Record<string, string>;
  session: Session;
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
  db: Database;
};

type WithCommunityHandler = (ctx: WithCommunityContext) => Promise<Response>;

type WithCommunityOptions = {
  requiredPermissions?: PermissionRequest;
};

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

      // 1. Validate session
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session) {
        throw new ApiError({
          code: "unauthorized",
          message: "You must be logged in to perform this action.",
        });
      }

      // 2. Resolve community from URL param (slug or ID)
      const communitySlug = params.communitySlug || params.slug;
      if (!communitySlug) {
        throw new ApiError({
          code: "bad_request",
          message: "Community slug is required.",
        });
      }

      const org = await auth.api.getFullOrganization({
        headers: await headers(),
        query: { organizationSlug: communitySlug },
      });

      if (!org) {
        throw new ApiError({
          code: "not_found",
          message: "Community not found.",
        });
      }

      // 3. Check membership
      const membership = org.members.find((m) => m.userId === session.user.id);

      if (!membership) {
        throw new ApiError({
          code: "forbidden",
          message: "You are not a member of this community.",
        });
      }

      // 4. Check required permissions via role.authorize()
      const userRole = membership.role as Role;
      const roleDefinition = roles[userRole];

      if (!roleDefinition) {
        throw new ApiError({
          code: "forbidden",
          message: "Invalid role.",
        });
      }

      if (opts?.requiredPermissions) {
        const authorize = roleDefinition.authorize as (
          request: PermissionRequest,
        ) => { success: boolean; error?: string };
        const result = authorize(opts.requiredPermissions);
        if (!result.success) {
          throw new ApiError({
            code: "forbidden",
            message: "You don't have permission to perform this action.",
          });
        }
      }

      // 5. Execute within RLS tenant context
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
        });
      });
    } catch (error) {
      return handleApiError(error);
    }
  };
}
