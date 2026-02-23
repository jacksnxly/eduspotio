import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { ApiError, handleApiError } from "../errors";
import { auth } from "./index";
import type { AuthenticatedSession } from "./types";

export type WithSessionContext = {
  req: NextRequest;
  session: AuthenticatedSession;
};

type WithSessionHandler = (ctx: WithSessionContext) => Promise<Response>;

export function withSession(handler: WithSessionHandler) {
  return async (
    req: NextRequest,
    _ctx: { params: Promise<Record<string, string>> },
  ) => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session) {
        throw new ApiError({
          code: "unauthorized",
          message: "You must be logged in to perform this action.",
        });
      }

      return await handler({ req, session });
    } catch (error) {
      return handleApiError(error, {
        method: req.method,
        path: new URL(req.url).pathname,
      });
    }
  };
}
