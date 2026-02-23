import { auth } from "./index";

export type Session = Awaited<ReturnType<typeof auth.api.getSession>>;
export type AuthenticatedSession = NonNullable<Session>;
