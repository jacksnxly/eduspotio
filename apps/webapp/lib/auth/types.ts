import { auth } from "./index";

export type Session = typeof auth.$Infer.Session;
export type AuthenticatedSession = NonNullable<Session>;
