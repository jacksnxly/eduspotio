import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { ApiError, handleApiError } from "../errors";
import { auth } from "./index";

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

export type WithSessionContext = {
  req: NextRequest;
  session: NonNullable<Session>;
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
      return handleApiError(error);
    }
  };
}
